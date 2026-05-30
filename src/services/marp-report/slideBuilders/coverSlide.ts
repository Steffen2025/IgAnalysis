import type { ReportData } from "../../report/reportDataAssembler.js";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function e(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function coverSlide(data: ReportData): string {
  const { client, scores } = data;
  const ctx = data.reportContext;
  const rawBusinessName = ctx.displayName ?? "Instagram Growth Report";
  const businessName = e(rawBusinessName);
  const profile = client?.profile;
  const username = e(profile?.username ? `@${profile.username}` : "");
  const category = e(ctx.businessClassification ?? "");
  const city = e(ctx.localMarketLabel ?? "");
  const overall = scores.overall ?? 0;

  const dims: Array<[string, number]> = [
    ["Content Performance", scores.content_performance ?? 0],
    ["Local Visibility", scores.local_visibility ?? 0],
    ["Competitor Gap", scores.competitor_gap ?? 0],
    ["Sales Readiness", scores.sales_readiness ?? 0],
    ["Profile Conversion", scores.profile_conversion ?? 0],
  ];
  const lowestScore = dims.reduce((worst, d) => (d[1] < worst[1] ? d : worst), dims[0]);

  const followers = (ctx.followerCount ?? profile?.follower_count ?? 0).toLocaleString();
  const auditDate = ctx.generatedAt ? new Date(ctx.generatedAt) : new Date();
  const dateStr = formatDate(auditDate);
  const sub = [username, category, city].filter(Boolean).join(" · ");
  const longestChunk = rawBusinessName.split(/\s+/).reduce((max, chunk) => Math.max(max, chunk.length), 0);
  const titleClass = rawBusinessName.length > 42 || longestChunk > 26
    ? "cover-title cover-title-xs"
    : rawBusinessName.length > 32 || longestChunk > 20
    ? "cover-title cover-title-sm"
    : rawBusinessName.length > 24 || longestChunk > 15
    ? "cover-title cover-title-md"
    : "cover-title";

  return `<!-- _class: cover -->

<span class="brand-mark">BotLogix</span>

<span class="eyebrow">Instagram Growth Intelligence</span>

<h1 class="${titleClass}">${businessName}</h1>

<p class="sub">${sub}</p>

<div class="stat-row">
  <div class="stat-card">
    <div class="num accent-text">${overall}<span class="suffix">/100</span></div>
    <div class="label">Overall Score</div>
  </div>
  <div class="stat-card">
    <div class="lever-name">${e(lowestScore[0])}</div>
    <div class="label">Biggest Lever</div>
  </div>
  <div class="stat-card">
    <div class="num">${followers}</div>
    <div class="label">Current Followers</div>
  </div>
</div>

<div class="footer-row">
  <span>Audit completed ${dateStr}</span>
  <span>AI that works the day you turn it on — botlogix.ca</span>
</div>`;
}
