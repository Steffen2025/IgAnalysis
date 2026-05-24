import { assembleReportData } from "../report/reportDataAssembler.js";
import { db } from "../../db/index.js";
import { report_sections } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { STYLES } from "./styles.js";
import { renderCoverPage } from "./components/coverPage.js";
import { renderBattlePlan } from "./components/battlePlan.js";
import { renderScoreCard } from "./components/scoreCard.js";
import { renderTop5Fixes } from "./components/fixCard.js";
import { renderNext7Days } from "./components/dayBlock.js";
import { renderPatternSection } from "./components/patternSection.js";
import { renderAudienceVoice } from "./components/audienceVoice.js";
import { renderLocalPlan } from "./components/localPlan.js";
import { renderContentKit } from "./components/contentKit.js";
import { renderDoThisNext } from "./components/doThisNext.js";
import { renderFooter } from "./components/footer.js";
import { escapeHTML } from "./components/utils.js";

function loadSections(auditId: number): Record<string, string> {
  const rows = db.select().from(report_sections).where(eq(report_sections.audit_id, auditId)).all();
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.section_key] = row.content_markdown;
  }
  return map;
}

export async function generateHTMLReport(auditId: number): Promise<string> {
  const data = await assembleReportData(auditId);
  const sections = loadSections(auditId);

  const businessName = escapeHTML(data.audit.business_name ?? "Instagram Growth Report");

  const cover = renderCoverPage(data, sections);
  const battlePlan = renderBattlePlan(sections["battle_plan"] ?? sections["one_page_battle_plan"] ?? "");
  const scoreCard = renderScoreCard(data, sections["account_snapshot"] ?? "");
  const fixes = renderTop5Fixes(sections["top_5_fixes"] ?? "");
  const days = renderNext7Days(sections["next_7_days"] ?? "");
  const patterns = renderPatternSection(sections["pattern_analysis"] ?? sections["pattern_analysis_narrative"] ?? "", data);
  const audience = renderAudienceVoice(sections["audience_voice"] ?? "", data);
  const local = renderLocalPlan(sections["local_visibility"] ?? sections["local_visibility_plan"] ?? "", data);
  const kit = renderContentKit(sections["content_kit"] ?? "");
  const next = renderDoThisNext(sections["do_this_next"] ?? "");
  const footer = renderFooter(data);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName} — Instagram Growth Intelligence Report</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="report-wrapper">
    ${cover}
    ${battlePlan}
    ${scoreCard}
    ${fixes}
    ${days}
    ${patterns}
    ${audience}
    ${local}
    ${kit}
    ${next}
    ${footer}
  </div>
</body>
</html>`;
}
