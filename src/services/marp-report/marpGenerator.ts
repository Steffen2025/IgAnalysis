import { assembleReportData } from "../report/reportDataAssembler.js";
import { db } from "../../db/index.js";
import { report_sections } from "../../db/schema.js";
import { eq } from "drizzle-orm";

import { coverSlide }            from "./slideBuilders/coverSlide.js";
import { actDividerSlide }       from "./slideBuilders/actDividerSlide.js";
import { openingNarrativeSlide } from "./slideBuilders/openingNarrativeSlide.js";
import { battlePlanSlides }      from "./slideBuilders/battlePlanSlide.js";
import { scoreBreakdownSlide }   from "./slideBuilders/scoreBreakdownSlide.js";
import { patternsSlide }         from "./slideBuilders/patternsSlide.js";
import { audienceVoiceSlide }    from "./slideBuilders/audienceVoiceSlide.js";
import { localPlanSlide }        from "./slideBuilders/localPlanSlide.js";
import { top5FixesSlides }       from "./slideBuilders/top5FixesSlide.js";
import { sevenDayPlanSlides }    from "./slideBuilders/sevenDayPlanSlide.js";
import { toolkitIntroSlide }     from "./slideBuilders/toolkitIntroSlide.js";
import { postTemplateSlide }     from "./slideBuilders/postTemplateSlide.js";
import { hashtagSetsSlide }      from "./slideBuilders/hashtagSetsSlide.js";
import { aiPromptSlide }         from "./slideBuilders/aiPromptSlide.js";
import { doThisNextSlide }       from "./slideBuilders/doThisNextSlide.js";
import { closingSlide }          from "./slideBuilders/closingSlide.js";

function loadSections(auditId: number): Record<string, string> {
  const rows = db.select().from(report_sections).where(eq(report_sections.audit_id, auditId)).all();
  const map: Record<string, string> = {};
  for (const row of rows) map[row.section_key] = row.content_markdown;
  return map;
}

export async function generateMarpMarkdown(auditId: number): Promise<string> {
  const data = await assembleReportData(auditId);
  const s = loadSections(auditId);

  const battlePlanMd = s["battle_plan"] ?? s["one_page_battle_plan"] ?? "";
  const patternMd    = s["pattern_analysis"] ?? s["pattern_analysis_narrative"] ?? "";
  const audienceMd   = s["audience_voice"] ?? "";
  const localMd      = s["local_visibility"] ?? s["local_visibility_plan"] ?? "";
  const fixesMd      = s["top_5_fixes"] ?? "";
  const daysMd       = s["next_7_days"] ?? "";
  const nextMd       = s["do_this_next"] ?? "";

  const frontmatter = `---
marp: true
theme: botlogix
paginate: true
size: 16:9
html: true
---`;

  const slides: string[] = [
    coverSlide(data),

    actDividerSlide({ roman: "I",   title: "Where You Are",   intent: "The photograph of today — before anything changes." }),
    openingNarrativeSlide(data),
    ...battlePlanSlides(battlePlanMd, data.scores),

    actDividerSlide({ roman: "II",  title: "The Reality",     intent: "What the data actually shows — no interpretation yet." }),
    scoreBreakdownSlide(data.scores),
    patternsSlide(data, patternMd),
    audienceVoiceSlide(data, audienceMd),
    localPlanSlide(data, localMd),

    actDividerSlide({ roman: "III", title: "The Street Ahead", intent: "Where to go from here and what to do this week." }),
    ...top5FixesSlides(fixesMd),
    ...sevenDayPlanSlides(daysMd),

    toolkitIntroSlide(),
    postTemplateSlide(data, 1),
    postTemplateSlide(data, 2),
    postTemplateSlide(data, 3),
    postTemplateSlide(data, 4),
    hashtagSetsSlide(data, localMd),
    aiPromptSlide(data, 1),
    aiPromptSlide(data, 2),
    aiPromptSlide(data, 3),
    doThisNextSlide(nextMd),

    closingSlide(data),
  ];

  // Front-matter ends with ---; first slide follows directly (no extra separator).
  // Subsequent slides are separated by ---.
  return frontmatter + "\n\n" + slides.join("\n\n---\n\n");
}
