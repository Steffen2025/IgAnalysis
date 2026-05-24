import type { ReportData } from "../../report/reportDataAssembler.js";
import { formatDate, addReauditDate, escapeHTML } from "./utils.js";

export function renderFooter(data: ReportData): string {
  const { audit, scores } = data;
  const profile = data.client?.profile;

  const followers = profile?.follower_count ?? 0;
  const posts = profile?.post_count ?? 0;
  const engRate = "—";

  const auditDate = audit.created_at ? new Date(audit.created_at) : new Date();
  const dateStr = formatDate(auditDate);
  const reauditStr = addReauditDate(auditDate);
  const businessName = escapeHTML(audit.business_name ?? "");

  return `
<section class="footer-page page">
  <div class="section-label">Baseline Snapshot</div>
  <h2>Metrics at audit date</h2>

  <div class="kpi-grid">
    <div class="kpi-cell">
      <div class="kpi-value">${followers.toLocaleString()}</div>
      <div class="kpi-label">Followers</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-value">${posts.toLocaleString()}</div>
      <div class="kpi-label">Total Posts</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-value">${engRate}</div>
      <div class="kpi-label">Avg Engagement Rate</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-value">${scores.overall}</div>
      <div class="kpi-label">Overall Score</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-value">${dateStr}</div>
      <div class="kpi-label">Audit Date</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-value">Audit #${audit.id}</div>
      <div class="kpi-label">Reference</div>
    </div>
  </div>

  <div class="reaudit-banner">
    Re-audit recommended: ${reauditStr} — run the same audit to measure what moved.
  </div>

  <div class="footer-disclaimer">
    Prepared by BotLogix Growth Intelligence for ${businessName}.<br>
    Data sourced from public Instagram profile, posts, and comparable-account benchmarks collected at the time of audit. Engagement rates are calculated from publicly visible likes and comments. Competitor data reflects accounts in the same category and geography active on Instagram. This report is for internal strategic planning and is not for redistribution.
  </div>
</section>`;
}
