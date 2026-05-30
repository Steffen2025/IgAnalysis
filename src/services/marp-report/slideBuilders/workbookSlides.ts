import type { ReportData, ReportCompetitor } from "../../report/reportDataAssembler.js";
import { isAllowedReferenceMarketLabel } from "../../audit/referenceMarkets.js";
import { isExpandedLocalMarket } from "../../audit/geoMarketExpansion.js";
import { recommendCadence, ctaForKind } from "../../audit/categoryCopy.js";

function e(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function n(value: number | null | undefined): number {
  return value ?? 0;
}

function compact(value: number | null | undefined): string {
  const num = n(value);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatReviewDate(data: ReportData): string {
  const auditDate = data.audit.created_at ? new Date(data.audit.created_at) : new Date();
  const review = new Date(auditDate);
  review.setDate(review.getDate() + 30);
  return review.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function postsPerWeek(data: ReportData): string {
  const now = data.audit.created_at ? new Date(data.audit.created_at) : new Date();
  const postsInLast30Days = data.client.posts.filter((post) => {
    if (!post.posted_at) return false;
    const ageDays = (now.getTime() - new Date(post.posted_at).getTime()) / 86400000;
    return ageDays >= 0 && ageDays <= 30;
  }).length;
  return ((postsInLast30Days / 30) * 7).toFixed(1);
}

function scoreBand(value: number): "high" | "mid" | "low" {
  if (value >= 71) return "high";
  if (value >= 41) return "mid";
  return "low";
}

function localCompetitors(data: ReportData): ReportCompetitor[] {
  return data.competitors
    .filter((c) => c.competitor_type === "local_intel")
    .sort((a, b) => n(b.follower_count) - n(a.follower_count));
}

function referenceCompetitors(data: ReportData): ReportCompetitor[] {
  return data.competitors
    .filter((c) => c.competitor_type === "reference_model" && isAllowedReferenceMarketLabel(c.geographic_market))
    .sort((a, b) => n(b.follower_count) - n(a.follower_count));
}

/** Cover snapshot — IG-style profile card, big stat strip, review date. */
export function workbookCoverSlide(
  data: ReportData,
  avatarUrl?: string | null,
  avatarInitials?: string,
): string {
  const ctx = data.reportContext;
  const overall = n(data.scores.overall);
  const followers = compact(data.client.profile?.follower_count);
  const posts = compact(data.client.profile?.post_count);
  const reviewDate = formatReviewDate(data);

  const avatar = avatarUrl
    ? `<img class="cover-avatar" src="${e(avatarUrl)}" alt="@${e(ctx.handle)}">`
    : `<div class="cover-avatar cover-avatar-fallback">${e(avatarInitials ?? ctx.handle.slice(0, 2).toUpperCase())}</div>`;

  return `<!-- _class: cover -->

<img class="brand-mark" src="../../BotLogix Master Logo.png" alt="BotLogix">

<span class="eyebrow">30-Day Instagram Action Workbook</span>

<div class="cover-profile-card">
  ${avatar}
  <div class="cover-profile-id">
    <div class="cover-profile-name">${e(ctx.displayName)}</div>
    <div class="cover-profile-handle">@${e(ctx.handle)}</div>
    <div class="cover-profile-market">${e(ctx.localMarketLabel)}</div>
  </div>
</div>

<div class="cover-hero-stats cover-hero-stats-4">
  <div class="hero-stat">
    <div class="hero-num accent-text">${overall}</div>
    <div class="hero-label">Baseline</div>
  </div>
  <div class="hero-stat">
    <div class="hero-num">${followers}</div>
    <div class="hero-label">Followers</div>
  </div>
  <div class="hero-stat">
    <div class="hero-num">${posts}</div>
    <div class="hero-label">Posts</div>
  </div>
  <div class="hero-stat">
    <div class="hero-num">${postsPerWeek(data)}</div>
    <div class="hero-label">Posts / wk</div>
  </div>
</div>

<div class="cover-promise">You have to be relevant to stay relevant. Follow this workbook for 30 days, then come back on <strong>${e(reviewDate)}</strong> to measure what moved.</div>

<div class="footer-row">
  <span>Action-first · Copy-paste ready · Built for ${e(ctx.localMarketLabel)}</span>
  <span>botlogix.ca</span>
</div>`;
}

/** Jump map — workbook section order, skimmable numbered rows. */
export function workbookJumpMapSlide(): string {
  const rows = [
    ["01", "Start here", "Checkboxes for this week — no theory."],
    ["02", "Today's baseline", "Your starting numbers in one glance."],
    ["03", "Five moves", "Highest-leverage actions ranked for you."],
    ["04", "30-day sprint", "Week-by-week rhythm for the full month."],
    ["05", "Week 1 timeline", "Daily actions, 15–30 minutes each."],
    ["06", "Local unlock", "Where to add city signals on Instagram."],
    ["07", "You vs market", "How your posting compares to competitors."],
    ["08", "Competitor cheat sheet", "What to borrow — and what to avoid."],
    ["09", "Hashtags · toolkit · prompts", "Copy-paste blocks for content."],
    ["10", "Checkpoints · day 30", "What to measure and when to return."],
  ];

  return `<span class="eyebrow">How to use this workbook</span>

# Jump map

<p><strong>Start at page 2.</strong> Execute first. Reference the market pages when you need context — not before you act.</p>

<div class="jump-list workbook-jump">
${rows
  .map(
    ([num, title, copy]) => `<div class="jump-row">
  <div class="jump-num">${num}</div>
  <div>
    <div class="jump-title">${title}</div>
    <div class="jump-copy">${copy}</div>
  </div>
</div>`,
  )
  .join("\n")}
</div>`;
}

/** Score bubbles — short baseline, no long scoreboard prose. */
export function todayBaselineSlide(data: ReportData): string {
  const overall = n(data.scores.overall);
  const dims: Array<[string, number]> = [
    ["Profile", n(data.scores.profile_conversion)],
    ["Content", n(data.scores.content_performance)],
    ["Local", n(data.scores.local_visibility)],
    ["Sales", n(data.scores.sales_readiness)],
    ["Market", n(data.scores.competitor_gap)],
  ];

  const bubbles = dims
    .map(
      ([label, value]) => `<div class="score-bubble ${scoreBand(value)}">
  <div class="bubble-num">${value}</div>
  <div class="bubble-label">${e(label)}</div>
</div>`,
    )
    .join("\n");

  const headline =
    overall <= 50
      ? "Your account is <strong>present but underpowered</strong> — the opportunity is consistency and local signals, not starting over."
      : overall <= 70
        ? "You have a <strong>working foundation</strong> — this sprint tightens rhythm and local visibility."
        : "You are <strong>ahead of many peers</strong> — optimize what already works and measure on day 30.";

  const localVal = n(data.scores.local_visibility);
  const meaning = (label: string, value: number): string => {
    switch (label) {
      case "Local":
        return value <= 40 ? "Under-labeled locally — not invisible, just unlabeled." : "Local signals are landing.";
      case "Profile":
        return value <= 40 ? "Bio and links aren't converting visitors yet." : "Profile gives visitors a clear next step.";
      case "Content":
        return value <= 40 ? "Posting rhythm is the gap, not creativity." : "Content cadence is working.";
      case "Sales":
        return value <= 40 ? "Few clear paths from post to enquiry." : "Posts point people toward buying.";
      default:
        return value <= 40 ? "Behind active competitors on visibility." : "Holding your own against the market.";
    }
  };
  const meanings = dims
    .map(([label, value]) => `<div class="score-meaning"><span class="sm-label">${e(label)}</span><span class="sm-copy">${e(meaning(label, label === "Local" ? localVal : value))}</span></div>`)
    .join("\n");

  return `<span class="eyebrow">Today's baseline</span>

# Your numbers today

<div class="score-bubble-hero">
  <div class="score-bubble overall ${scoreBand(overall)}">
    <div class="bubble-num-lg">${overall}</div>
    <div class="bubble-label">Overall / 100</div>
  </div>
</div>

<div class="score-bubble-row">${bubbles}</div>

<div class="score-meanings">${meanings}</div>

<p class="baseline-oneliner">${headline}</p>

<div class="guide-card full">
  <div class="kicker">Rhythm snapshot</div>
  <div class="copy"><strong>${postsPerWeek(data)} posts/week</strong> in the last 30 days · <strong>${compact(data.client.profile?.follower_count)}</strong> followers · Review on <strong>${e(formatReviewDate(data))}</strong></div>
</div>`;
}

/** You vs market — comparison table only. */
export function youVsMarketSlide(data: ReportData): string {
  const cat = data.patterns.category;
  const clientCaption = Math.round(data.client.feature_summary.avg_caption_length);
  const clientTags = data.client.feature_summary.avg_hashtag_count.toFixed(1);
  const clientCadence = postsPerWeek(data);
  const marketCaption = Math.round(cat.caption.avgLength);
  const marketTags = cat.hashtags.avgCountPerPost.toFixed(1);
  const topFormat =
    Object.entries(cat.postTypes.distribution).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, " ") ?? "mixed";
  const yourFormat =
    Object.keys(data.client.feature_summary.post_type_distribution)[0]?.replace(/_/g, " ") ?? "—";

  // Metric-aware recommendation: never tell a high-cadence account to "post
  // more". Estimate the market rate from category cadence when available.
  const marketPerWeek = (cat as { postFrequency?: { avgPerWeek?: number } }).postFrequency?.avgPerWeek ?? null;
  const cadence = recommendCadence({ postsPerWeek: parseFloat(clientCadence), marketPerWeek });
  const cta = ctaForKind(data.reportContext.categoryKind ?? "generic");
  const marketCadenceLabel = marketPerWeek ? `~${marketPerWeek.toFixed(1)}/wk` : "~2+ typical";
  const action =
    cadence.verdict === "increase"
      ? "lift your posting rhythm toward the market rate"
      : cadence.verdict === "refine"
        ? "keep the volume but sharpen hooks, positioning, and CTA"
        : "hold your cadence and tighten content quality";

  return `<span class="eyebrow">You vs the market</span>

# How you compare

<p>Same category, real competitor posts. Use this to adjust rhythm — not to copy creative.</p>

<div class="compare-table workbook-compare">
  <div class="compare-row compare-head"><span>Metric</span><span>You</span><span>Market avg</span></div>
  <div class="compare-row"><span>Posts / week (30d)</span><span><strong>${clientCadence}</strong></span><span>${marketCadenceLabel}</span></div>
  <div class="compare-row"><span>Avg caption length</span><span>${clientCaption} chars</span><span>${marketCaption} chars</span></div>
  <div class="compare-row"><span>Avg hashtags / post</span><span>${clientTags}</span><span>${marketTags}</span></div>
  <div class="compare-row"><span>Top format</span><span>${e(yourFormat)}</span><span>${e(topFormat)}</span></div>
</div>

<div class="guide-card full">
  <div class="kicker">${e(cadence.headline)}</div>
  <div class="copy">${e(cadence.detail)} Match caption discipline, ${action}, use the market's top format weekly, and make every post end in one clear CTA (${e(cta.action)}).</div>
</div>`;
}

function cheatCard(data: ReportData, comp: ReportCompetitor | undefined, index: number, kind: string): string {
  if (!comp) {
    return `<div class="cheat-card cheat-card-empty">
  <div class="cheat-handle">Slot ${index}</div>
  <div class="cheat-line"><strong>Does well:</strong> —</div>
  <div class="cheat-line"><strong>Borrow:</strong> Run another audit when more local accounts are found.</div>
  <div class="cheat-line"><strong>Avoid:</strong> —</div>
</div>`;
  }
  const top = comp.top_posts[0];
  const doesWell =
    n(comp.follower_count) > 8000
      ? `Strong audience (${compact(comp.follower_count)}) with repeatable ${top?.post_type ?? "content"}.`
      : top?.hook_type === "question"
        ? "Question hooks that invite comments."
        : `Clear ${top?.post_type ?? "format"} mix that's easy to scan.`;
  const borrow =
    kind === "local"
      ? `Structure: ${top?.post_type ?? "post"} + ${top?.hook_type ?? "hook"} hook. Write in your voice.`
      : `Study their ${top?.post_type ?? "format"} pacing — borrow layout, not brand.`;
  const marketLabel =
    comp.competitor_type === "local_intel" && isExpandedLocalMarket(comp.geographic_market)
      ? "Nearby peer"
      : kind === "local"
        ? "Local"
        : "Reference";
  return `<div class="cheat-card">
  <div class="cheat-head"><span class="cheat-badge">${e(marketLabel)}</span><span class="cheat-handle">@${e(comp.username)}</span></div>
  <div class="cheat-stats">${compact(comp.follower_count)} followers · ${compact(comp.post_count)} posts</div>
  <div class="cheat-line"><strong>Does well:</strong> ${e(doesWell)}</div>
  <div class="cheat-line"><strong>Borrow:</strong> ${e(borrow)}</div>
  <div class="cheat-line"><strong>Avoid:</strong> Copying their exact creative or voice.</div>
</div>`;
}

/** Simplified 3+3 competitor cheat sheet. */
export function competitorCheatSheetSlide(data: ReportData): string {
  const local = localCompetitors(data).slice(0, 3);
  const reference = referenceCompetitors(data).slice(0, 3);
  const market = data.reportContext.localMarketLabel;

  return `<span class="eyebrow">Competitor cheat sheet</span>

# Who to watch (and what to steal)

<p>Three <strong>local</strong> accounts near ${e(market)} and three <strong>reference</strong> accounts that show what already works in your category.</p>

<div class="cheat-columns">
  <div class="cheat-column">
    <div class="column-title">Local — ${e(market)}</div>
    ${[0, 1, 2].map((i) => cheatCard(data, local[i], i + 1, "local")).join("\n")}
  </div>
  <div class="cheat-column">
    <div class="column-title">Reference models</div>
    ${[0, 1, 2].map((i) => cheatCard(data, reference[i], i + 1, "reference")).join("\n")}
  </div>
</div>`;
}

/** Phone-style local unlock diagram. */
export function localUnlockDiagramSlide(data: ReportData): string {
  const market = data.reportContext.localMarketLabel;
  const city = data.reportContext.businessLocation.city;

  return `<span class="eyebrow">Local visibility unlock</span>

# Where to add ${e(city)} signals

<div class="phone-diagram">
  <div class="phone-side left">
    <div class="phone-callout"><strong>Bio</strong> — city + offer + CTA</div>
    <div class="phone-callout"><strong>Captions</strong> — ${e(city)} in line 1–2</div>
    <div class="phone-callout"><strong>Hashtags</strong> — 3 local tags every post</div>
  </div>
  <div class="phone-frame">
    <div class="phone-notch"></div>
    <div class="phone-screen">
      <div class="phone-label">Instagram profile</div>
      <div class="phone-field">Name · Bio · Link</div>
      <div class="phone-field highlight">Highlights · Posts · Reels</div>
      <div class="phone-field">Location tag on posts</div>
    </div>
  </div>
  <div class="phone-side right">
    <div class="phone-callout"><strong>Reels</strong> — city on screen text</div>
    <div class="phone-callout"><strong>Geotags</strong> — every local post</div>
    <div class="phone-callout"><strong>Comments</strong> — 5 local accounts/week</div>
  </div>
</div>

<div class="guide-card full">
  <div class="copy">Local score today: <strong>${n(data.scores.local_visibility)}/100</strong>. You are not invisible — you are under-labeled for ${e(market)}.</div>
</div>`;
}
