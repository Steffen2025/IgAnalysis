import type { ReportData } from "../../report/reportDataAssembler.js";

function scoreColor(n: number): string {
  if (n >= 70) return "#0F6E56";
  if (n >= 40) return "#B07D1E";
  return "#8B3A2E";
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function e(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function closingSlide(data: ReportData): string {
  const { audit, scores, client } = data;
  const businessName = e(audit.business_name ?? "");
  const overall = scores.overall ?? 0;
  const color = scoreColor(overall);
  const followers = (client?.profile?.follower_count ?? 0).toLocaleString();
  const postCount = client?.profile?.post_count ?? 0;
  const auditDate = audit.created_at ? new Date(audit.created_at) : new Date();
  const reauditDate = addDays(auditDate, 30);
  const reauditStr = formatDate(reauditDate);

  const postsPerWeek = (client as any)?.feature_summary?.posts_per_week;
  const postsPerWeekStr = postsPerWeek != null ? `${Number(postsPerWeek).toFixed(1)}/wk` : "—";

  return `<span class="eyebrow">30 Days From Now</span>

# The baseline to beat

<p style="font-size:18px;color:#5C5A52;max-width:640px;margin-bottom:20px">Every score in this report is a baseline, not a verdict. Run the same audit on <strong>${reauditStr}</strong> and compare each number to what's below.</p>

<div class="stat-row">
  <div class="stat-card">
    <div class="num" style="color:${color}">${overall}<span class="suffix">/100</span></div>
    <div class="label">Score Today</div>
  </div>
  <div class="stat-card">
    <div class="num">${followers}</div>
    <div class="label">Followers Today</div>
  </div>
  <div class="stat-card">
    <div class="num">${postCount}</div>
    <div class="label">Total Posts</div>
  </div>
  <div class="stat-card">
    <div class="num">${postsPerWeekStr}</div>
    <div class="label">Posts per Week</div>
  </div>
</div>

<div style="margin-top:28px;padding-top:18px;border-top:1px solid #E5E2D6;display:flex;justify-content:space-between;align-items:flex-end">
  <div>
    <div style="font-family:var(--font-serif);font-style:italic;font-size:20px;color:#1A2238">BotLogix Growth Intelligence</div>
    <div style="font-family:var(--font-mono);font-size:13px;color:#5C5A52">botlogix.ca · Audit #${audit.id}</div>
  </div>
  <div style="font-size:13px;color:#5C5A52;text-align:right;max-width:400px">Prepared for ${businessName}. For internal strategic planning only.<br>Not for redistribution.</div>
</div>`;
}
