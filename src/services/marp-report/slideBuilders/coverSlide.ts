import type { ReportData } from "../../report/reportDataAssembler.js";

function scoreColor(n: number): string {
  if (n >= 70) return "#0F6E56";
  if (n >= 40) return "#B07D1E";
  return "#8B3A2E";
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function e(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function coverSlide(data: ReportData): string {
  const { audit, client, scores } = data;
  const businessName = e(audit.business_name ?? "Instagram Growth Report");
  const profile = client?.profile;
  const username = e(profile?.username ? `@${profile.username}` : "");
  const category = e(audit.business_category ?? "");
  const city = e(audit.city ?? "");
  const overall = scores.overall ?? 0;
  const color = scoreColor(overall);

  // Find biggest gap opportunity
  const dims: Array<[string, number]> = [
    ["Content Performance", scores.content_performance ?? 0],
    ["Local Visibility", scores.local_visibility ?? 0],
    ["Competitor Gap", scores.competitor_gap ?? 0],
    ["Sales Readiness", scores.sales_readiness ?? 0],
    ["Profile Conversion", scores.profile_conversion ?? 0],
  ];
  const maxGap = dims.reduce((best, d) => (100 - d[1] > 100 - best[1] ? d : best), dims[0]);
  const gapPts = Math.round(100 - maxGap[1]);

  const followers = (profile?.follower_count ?? 0).toLocaleString();
  const auditDate = audit.created_at ? new Date(audit.created_at) : new Date();
  const dateStr = formatDate(auditDate);
  const sub = [username, category, city].filter(Boolean).join(" · ");

  return `<!-- _class: cover -->

<span class="brand-mark">BotLogix</span>

<span class="cover-eyebrow">Instagram Growth Intelligence</span>

# ${businessName}

<p class="sub">${sub}</p>

<div class="stat-row">
  <div class="stat-cell">
    <div class="num" style="color:${color}">${overall}<span class="suffix">/100</span></div>
    <div class="label">Overall Score</div>
  </div>
  <div class="stat-cell">
    <div class="num" style="color:#B07D1E">+${gapPts}<span class="suffix"> pts</span></div>
    <div class="label">Top Opportunity</div>
  </div>
  <div class="stat-cell">
    <div class="num">${followers}</div>
    <div class="label">Followers Today</div>
  </div>
</div>

<div class="cover-footer">
  <span>Audit completed ${dateStr}</span>
  <span>AI that works the day you turn it on — botlogix.ca</span>
</div>`;
}
