import type { ReportData } from "../../report/reportDataAssembler.js";

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
  const ctx = data.reportContext;
  const businessName = e(ctx.preparedForName);
  const overall = scores.overall ?? 0;
  const followers = (client?.profile?.follower_count ?? 0).toLocaleString();
  const postCount = client?.profile?.post_count ?? 0;
  const instagramUrl = audit.instagram_url ?? "";
  const websiteUrl = audit.website_url ?? client?.profile?.external_url_in_bio ?? client?.profile?.website_url ?? "";
  const auditDate = audit.created_at ? new Date(audit.created_at) : new Date();
  const reauditDate = addDays(auditDate, 30);
  const reauditStr = formatDate(reauditDate);

  const now = audit.created_at ? new Date(audit.created_at) : new Date();
  const postsInLast30Days = client?.posts?.filter((post) => {
    if (!post.posted_at) return false;
    const postedAt = new Date(post.posted_at);
    const ageDays = (now.getTime() - postedAt.getTime()) / 86400000;
    return ageDays >= 0 && ageDays <= 30;
  }).length ?? 0;
  const postsPerWeekStr = `${((postsInLast30Days / 30) * 7).toFixed(1)}/wk`;

  const market = e(ctx.localMarketLabel);
  const opportunity =
    (scores.local_visibility ?? 0) < 50
      ? `Your biggest opportunity is local visibility in ${market} — make the city obvious in bio, captions, and hashtags.`
      : (scores.content_performance ?? 0) < 55
        ? "Your biggest opportunity is posting with a clearer weekly rhythm and stronger hooks."
        : "Your biggest opportunity is turning attention into DMs and bookings with a clearer call to action.";

  return `<span class="eyebrow">What to do next</span>

# Your workbook in one glance

<p>You do not need to understand Instagram analytics. Follow this workbook for 30 days, then come back on <strong>${reauditStr}</strong>.</p>

<div class="closing-stats">
  <div class="stat-card">
    <div class="num accent-text">${overall}<span class="suffix">/100</span></div>
    <div class="label">Baseline today</div>
  </div>
  <div class="stat-card">
    <div class="num">${followers}</div>
    <div class="label">Followers</div>
  </div>
  <div class="stat-card">
    <div class="num">${postCount}</div>
    <div class="label">Posts</div>
  </div>
  <div class="stat-card">
    <div class="num">${postsPerWeekStr}</div>
    <div class="label">Posts / week</div>
  </div>
</div>

<p><strong>Bottom line:</strong> ${opportunity}</p>
<p><strong>Do today:</strong> Check off page 2, then publish one local post with ${market} in the caption.</p>
<p><strong>Day 30:</strong> Bring this workbook back — we compare scores, competitors, and what moved.</p>

<div class="guide-card full">
  <div class="kicker">Want the full growth system built for your business?</div>
  <div class="title">Turn this workbook into weekly execution.</div>
  <div class="copy">BotLogix turns competitor data, local signals, and your sprint plan into a repeatable system: profile fixes, content calendar, local engagement, and monthly measurement.</div>
</div>

<div class="url-grid">
  <div class="url-row">
    <div class="url-label">Instagram audited</div>
    <div class="url-value">${e(instagramUrl)}</div>
  </div>
  <div class="url-row">
    <div class="url-label">Website</div>
    <div class="url-value">${e(websiteUrl)}</div>
  </div>
</div>

<div class="closing-brand">
  <img src="../../BotLogix Master Logo.png" alt="BotLogix">
  <div>
    <div class="brand-text">BotLogix Growth Intelligence</div>
    <div class="brand-sub">botlogix.ca · @BotLogix</div>
  </div>
</div>

<p style="font-size:13px;margin-top:10px;color:var(--text-secondary)">Prepared for <strong>${businessName}</strong>. Execute the checklist, follow the sprint, measure on day 30.</p>
<p style="font-size:11px;color:var(--text-muted);margin-top:6px">For internal strategic planning only. Not for redistribution.</p>`;
}
