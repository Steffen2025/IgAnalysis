import type { ReportData } from "../../report/reportDataAssembler.js";
import { scoreColor, scoreLabelClass, formatDate, escapeHTML } from "./utils.js";

function scoreSummaryLine(data: ReportData): string {
  const overall = data.scores.overall;
  const gaps = data.patterns?.gaps ?? [];

  if (gaps.length > 0) {
    const topGap = gaps[0];
    return `${overall}/100 overall — ${topGap.label ?? "posting frequency"} is your highest-leverage gap`;
  }

  if (overall >= 70) return `${overall}/100 — strong foundation, refine and scale`;
  if (overall >= 50) return `${overall}/100 — solid start, three clear gaps to close`;
  return `${overall}/100 — significant growth opportunities identified`;
}

export function renderCoverPage(data: ReportData, sections: Record<string, string>): string {
  const { audit, scores } = data;
  const overall = scores.overall;
  const color = scoreColor(overall);
  const label = scoreSummaryLine(data);
  const dateStr = audit.created_at
    ? formatDate(new Date(audit.created_at))
    : formatDate(new Date());

  const businessName = escapeHTML(audit.business_name ?? "Instagram Account");
  const handle = audit.instagram_url?.match(/instagram\.com\/([^/?]+)/)?.[1] ?? "";
  const handleStr = handle ? `@${escapeHTML(handle)}` : "";
  const category = escapeHTML(audit.business_category ?? "");
  const city = escapeHTML(audit.city ?? "");

  const subtitle = [handleStr, category, city].filter(Boolean).join(" · ");

  return `
<section class="cover-page page">
  <div class="cover-top">
    <span class="cover-top-label">Instagram Growth Intelligence</span>
    <span class="cover-audit-number">Audit #${audit.id}</span>
  </div>

  <div class="cover-center">
    <div class="cover-business-name">${businessName}</div>
    <div class="cover-handle">${subtitle}</div>

    <div class="cover-score-wrap">
      <span class="cover-score-number" style="color: ${color}">${overall}</span>
      <span class="cover-score-denom" style="color: ${color}">/100</span>
      <span class="cover-score-label">${escapeHTML(label)}</span>
    </div>
  </div>

  <div class="cover-bottom">
    <div class="cover-date">Audit completed ${dateStr}</div>
    <div class="cover-brand">Prepared by BotLogix Growth Intelligence</div>
  </div>
</section>`;
}
