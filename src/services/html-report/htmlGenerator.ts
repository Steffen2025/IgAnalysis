import { assembleReportData } from "../report/reportDataAssembler.js";
import { db } from "../../db/index.js";
import { report_sections } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { STYLES } from "./styles.js";
import { renderCoverPage } from "./components/coverPage.js";
import { renderActDivider } from "./components/actDivider.js";
import { renderOpeningNarrative } from "./components/openingNarrative.js";
import { renderBattlePlan } from "./components/battlePlan.js";
import { renderScoreCard } from "./components/scoreCard.js";
import { renderTop5Fixes } from "./components/fixCard.js";
import { renderNext7Days } from "./components/dayBlock.js";
import { renderPatternSection } from "./components/patternSection.js";
import { renderAudienceVoice } from "./components/audienceVoice.js";
import { renderLocalPlan } from "./components/localPlan.js";
import { renderToolkitSection } from "./components/toolkitSection.js";
import { renderDoThisNext } from "./components/doThisNext.js";
import { renderFooter } from "./components/footer.js";
import { escapeHTML } from "./components/utils.js";

async function loadSections(auditId: number): Promise<Record<string, string>> {
  const rows = await db.select().from(report_sections).where(eq(report_sections.audit_id, auditId));
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.section_key] = row.content_markdown ?? "";
  }
  return map;
}

export async function generateHTMLReport(auditId: number): Promise<string> {
  const data = await assembleReportData(auditId);
  const s = await loadSections(auditId);

  const businessName = escapeHTML(data.audit.business_name ?? "Instagram Growth Report");

  // Section key aliases
  const battlePlanMd = s["battle_plan"] ?? s["one_page_battle_plan"] ?? "";
  const snapshotMd   = s["account_snapshot"] ?? "";
  const patternMd    = s["pattern_analysis"] ?? s["pattern_analysis_narrative"] ?? "";
  const audienceMd   = s["audience_voice"] ?? "";
  const localMd      = s["local_visibility"] ?? s["local_visibility_plan"] ?? "";
  const fixesMd      = s["top_5_fixes"] ?? "";
  const daysMd       = s["next_7_days"] ?? "";
  const kitMd        = s["content_kit"] ?? "";
  const nextMd       = s["do_this_next"] ?? "";

  // Page order per spec
  const pages = [
    renderCoverPage(data),

    renderActDivider(1, "Where You Are"),
    renderOpeningNarrative(data),
    renderBattlePlan(battlePlanMd),

    renderActDivider(2, "The Reality"),
    renderScoreCard(data, snapshotMd),
    renderPatternSection(patternMd, data),
    renderAudienceVoice(audienceMd, data),
    renderLocalPlan(localMd, data),

    renderActDivider(3, "The Street Ahead"),
    renderTop5Fixes(fixesMd),
    renderNext7Days(daysMd),
    renderToolkitSection(data, localMd, kitMd),
    renderDoThisNext(nextMd),

    renderFooter(data),
  ].join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName} — Instagram Growth Intelligence</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="report-wrapper">
    ${pages}
  </div>
</body>
</html>`;
}
