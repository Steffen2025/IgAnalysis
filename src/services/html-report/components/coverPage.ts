import type { ReportData } from "../../report/reportDataAssembler.js";
import { scoreColor, formatDate, escapeHTML } from "./utils.js";

function topOpportunityLabel(data: ReportData): { points: number; label: string } {
  const gaps = data.patterns?.gaps ?? [];
  if (gaps.length > 0) {
    return { points: gaps[0].weight ?? 25, label: gaps[0].label ?? "Posting frequency" };
  }
  return { points: 25, label: "Posting frequency" };
}

export function renderCoverPage(data: ReportData): string {
  const { audit, scores } = data;
  const overall = scores.overall ?? 0;
  const color = scoreColor(overall);

  const dateStr = audit.created_at
    ? formatDate(new Date(audit.created_at))
    : formatDate(new Date());

  const businessName = escapeHTML(audit.business_name ?? "Instagram Account");
  const handle = audit.instagram_url?.match(/instagram\.com\/([^/?]+)/)?.[1] ?? "";
  const handleStr = handle ? `@${escapeHTML(handle)}` : "";
  const category = escapeHTML(audit.business_category ?? "");
  const city = escapeHTML(audit.city ?? "");
  const subtitle = [handleStr, category, city].filter(Boolean).join(" · ");

  const { points, label } = topOpportunityLabel(data);

  return `
<section class="cover-page page">
  <div class="cover-meta-top">
    <span class="cover-wordmark">BotLogix</span>
    <span class="cover-audit-ref">Audit #${audit.id}</span>
  </div>

  <div class="cover-center">
    <div class="cover-business-name">${businessName}</div>
    <div class="cover-handle">${subtitle}</div>

    <div class="cover-stat-row">
      <div class="cover-stat-cell">
        <span class="cover-stat-label">Overall Score</span>
        <div class="cover-stat-value" style="color:${color}">
          ${overall}<span class="cover-stat-suffix">/100</span>
        </div>
        <div class="cover-stat-context">${overall < 50 ? "Significant headroom" : overall < 70 ? "Solid foundation" : "Strong position"}</div>
      </div>
      <div class="cover-stat-cell">
        <span class="cover-stat-label">Top Opportunity</span>
        <div class="cover-stat-value" style="color:var(--accent-warm)">
          +${points}<span class="cover-stat-suffix">pts</span>
        </div>
        <div class="cover-stat-context">${escapeHTML(label)}</div>
      </div>
      <div class="cover-stat-cell">
        <span class="cover-stat-label">Audit Completed</span>
        <div class="cover-stat-value" style="font-size:1.4rem;line-height:1.2;padding-top:4px">
          ${escapeHTML(dateStr)}
        </div>
        <div class="cover-stat-context">Instagram Growth Intelligence</div>
      </div>
    </div>
  </div>

  <div class="cover-bottom">
    <span class="cover-tagline">AI that works the day you turn it on — botlogix.ca</span>
    <span class="cover-date">Prepared by BotLogix Growth Intelligence</span>
  </div>
</section>`;
}
