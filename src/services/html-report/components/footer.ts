import type { ReportData } from "../../report/reportDataAssembler.js";
import { formatDate, addReauditDate, escapeHTML, scoreColor } from "./utils.js";

export function renderFooter(data: ReportData): string {
  const { audit, scores } = data;
  const profile = data.client?.profile;

  const followers = (profile?.follower_count ?? 0).toLocaleString();
  const postCount = profile?.post_count ?? 0;
  const overall = scores.overall ?? 0;

  const auditDate = audit.created_at ? new Date(audit.created_at) : new Date();
  const dateStr = formatDate(auditDate);
  const reauditStr = addReauditDate(auditDate);
  const businessName = escapeHTML(data.reportContext.preparedForName);

  // Posting freq from feature summary
  const postsPerWeek = (data.client as any)?.feature_summary?.posts_per_week;
  const postsPerWeekStr = postsPerWeek != null ? `${Number(postsPerWeek).toFixed(2)}/wk` : "—";

  return `
<section class="footer-page page">
  <span class="eyebrow">30 Days From Now</span>
  <h2 class="section-title">The baseline to beat</h2>

  <p style="font-size:1rem;color:var(--text-muted);line-height:1.65;max-width:560px;margin-bottom:32px">
    This report measures where ${businessName} stands today. Every score here is a baseline — not a verdict. Run the same audit in 30 days and compare each number to what you see below.
  </p>

  <div class="kpi-grid">
    <div class="kpi-cell">
      <div class="kpi-value" style="color:${scoreColor(overall)}">${overall}/100</div>
      <div class="kpi-label">Overall Score</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-value">${followers}</div>
      <div class="kpi-label">Followers</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-value">${postCount}</div>
      <div class="kpi-label">Total Posts</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-value">${postsPerWeekStr}</div>
      <div class="kpi-label">Posts per Week</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-value" style="font-size:1rem;line-height:1.3">${dateStr}</div>
      <div class="kpi-label">Audit Date</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-value" style="font-size:1rem;line-height:1.3">BotLogix</div>
      <div class="kpi-label">Growth Intelligence</div>
    </div>
  </div>

  <div class="reaudit-banner">
    Re-audit recommended: ${escapeHTML(reauditStr)} — run the same audit to see what moved.
  </div>

  <hr class="footer-hairline" />

  <div class="footer-brand">
    <span class="footer-brand-name">BotLogix Growth Intelligence</span>
    <span style="font-size:0.78rem;color:var(--text-muted);font-family:var(--font-mono)">botlogix.ca</span>
  </div>

  <p class="footer-disclaimer">
    Prepared by BotLogix Growth Intelligence for ${businessName}. Data sourced from public Instagram profile, posts, and comparable-account benchmarks collected at the time of audit. Engagement rates are calculated from publicly visible likes and comments. Competitor data reflects accounts in the same category and geography active on Instagram at audit time. This report is for internal strategic planning only — not for redistribution.
  </p>
</section>`;
}
