import { assembleReportData } from "../report/reportDataAssembler.js";
import type { ReportData } from "../report/reportDataAssembler.js";
import type { WorkbookViewModel } from "./workbookViewModel.js";
import { db } from "../../db/index.js";
import { report_sections } from "../../db/schema.js";
import { eq } from "drizzle-orm";

import { postingToolkitsSlide, immediateContentSlide } from "./slideBuilders/actionGuideSlides.js";
import { fiveMovesWorkbookSlides } from "./slideBuilders/top5FixesSlide.js";
import { sevenDayPlanSlides } from "./slideBuilders/sevenDayPlanSlide.js";
import { hashtagSetsSlide } from "./slideBuilders/hashtagSetsSlide.js";
import { tearOffActionSheet } from "./slideBuilders/tearOffActionSheet.js";
import { checkpointsSlide } from "./slideBuilders/checkpointsSlide.js";
import { closingSlide } from "./slideBuilders/closingSlide.js";
import {
  thirtyDayPushSlide,
  thirtyDayReviewSlide,
} from "./slideBuilders/thirtyDayPushSlide.js";
import {
  workbookCoverSlide,
  workbookJumpMapSlide,
  todayBaselineSlide,
  youVsMarketSlide,
  localUnlockDiagramSlide,
} from "./slideBuilders/workbookSlides.js";
import {
  competitorRelevanceSlide,
  competitorCheatSheetSlideVM,
} from "./slideBuilders/competitorRelevanceSlide.js";
import { buildWorkbookViewModel } from "./workbookViewModel.js";
import { scoreIndicatorsSlide, marketPatternsSlide } from "./slideBuilders/depthSlides.js";
import { assertValidWorkbook, assertRequiredSectionContent } from "./workbookManifest.js";

async function loadSections(auditId: number): Promise<Record<string, string>> {
  const rows = await db.select().from(report_sections).where(eq(report_sections.audit_id, auditId));
  const map: Record<string, string> = {};
  for (const row of rows) map[row.section_key] = row.content_markdown ?? "";
  return map;
}

/**
 * 30-Day Instagram Action Workbook — client-facing Marp deck.
 * Action-first order; audit/scoreboard slides are omitted from the main flow.
 */
export async function generateMarpMarkdown(
  auditId: number,
  theme: "dark" | "light" = "light",
): Promise<string> {
  const data = await assembleReportData(auditId);
  const vm = await buildWorkbookViewModel(data, auditId);
  const s = await loadSections(auditId);
  return composeWorkbookMarkdown(data, vm, s, theme);
}

/**
 * Pure composition step: turns already-loaded report data + view model +
 * section markdown into the final Marp document. Split out from
 * {@link generateMarpMarkdown} so fixtures can render without a live DB.
 */
export function composeWorkbookMarkdown(
  data: ReportData,
  vm: WorkbookViewModel,
  s: Record<string, string>,
  theme: "dark" | "light" = "light",
): string {
  // Integrity gate #1: required content-bearing sections must be present.
  // (This is the guard that would have caught the wiped Five Moves / Week 1.)
  assertRequiredSectionContent(s);

  const localMd = s["local_visibility"] ?? s["local_visibility_plan"] ?? "";
  const fixesMd = s["top_5_fixes"] ?? "";
  const daysMd = s["next_7_days"] ?? "";
  const nextMd = s["do_this_next"] ?? "";

  const frontmatter = `---
marp: true
theme: botlogix-${theme}
paginate: true
size: 9:16
html: true
---`;

  const slides: string[] = [
    // 1. Cover / snapshot — IG-style profile card + stat strip
    workbookCoverSlide(data, vm.clientProfile.cachedProfileImagePath, vm.clientProfile.initials),
    // 2. Start here — tear-off checklist (orientation built into jump map below)
    workbookJumpMapSlide(),
    tearOffActionSheet(data, fixesMd, nextMd),
    // 3. Today's baseline
    todayBaselineSlide(data),
    // 3b. Score indicators — restored depth (what we saw, dimension by dimension)
    scoreIndicatorsSlide(data),
    // 4. Five moves — ranked impact/effort card grid
    ...fiveMovesWorkbookSlides(fixesMd),
    // 5. 30-day sprint
    thirtyDayPushSlide(data),
    // 6. Week 1 timeline
    ...sevenDayPlanSlides(daysMd),
    // 7. Local visibility unlock
    localUnlockDiagramSlide(data),
    // 8. You vs the market
    youVsMarketSlide(data),
    // 8b. Market pattern dashboard — restored depth (cadence, hooks, elements)
    marketPatternsSlide(data),
    // 9. Competitor Relevance Board — proves the market is alive
    competitorRelevanceSlide(vm),
    // 10. Competitor cheat sheet — borrow / avoid / watch
    competitorCheatSheetSlideVM(vm),
    // 11. Hashtag ecosystem
    hashtagSetsSlide(data, localMd),
    // 12. Posting toolkit
    postingToolkitsSlide(data),
    // 13. Copy-ready AI prompts
    immediateContentSlide(data),
    // 14. Measurement checkpoints
    checkpointsSlide(data),
    // 15. Day 30 review appointment
    thirtyDayReviewSlide(data),
    // 16. Close / what to do next
    closingSlide(data),
  ];

  const markdown = frontmatter + "\n\n" + slides.join("\n\n---\n\n");
  // Trust gate: refuse to emit a deck containing malformed data tokens
  // ("none,software", "undefined", "[object Object]", clipped fragments…).
  assertValidWorkbook(markdown);
  return markdown;
}
