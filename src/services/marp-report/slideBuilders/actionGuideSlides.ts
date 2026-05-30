import type { ReportData, ReportCompetitor } from "../../report/reportDataAssembler.js";
import { isAllowedReferenceMarketLabel } from "../../audit/referenceMarkets.js";
import { isExpandedLocalMarket } from "../../audit/geoMarketExpansion.js";

type ReportScores = ReportData["scores"];

function e(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function n(value: number | null | undefined): number {
  return value ?? 0;
}

function pct(value: number | null | undefined): string {
  return `${Math.round(n(value))}%`;
}

function compact(value: number | null | undefined): string {
  const num = n(value);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function dims(scores: ReportScores): Array<[string, number]> {
  return [
    ["Profile", n(scores.profile_conversion)],
    ["Content", n(scores.content_performance)],
    ["Local", n(scores.local_visibility)],
    ["Sales", n(scores.sales_readiness)],
    ["Competitor", n(scores.competitor_gap)],
  ];
}

const SCORE_ROW_META: Record<
  string,
  { meaning: string; care: string; signalKey: keyof ReportScores["signals"] }
> = {
  Profile: {
    meaning: "How clear the account looks when someone lands on your page.",
    care: "If the profile does not quickly explain who you help, visitors leave before they follow or message.",
    signalKey: "profile_conversion",
  },
  Content: {
    meaning: "How consistently your posts create engagement and recognition.",
    care: "Without a steady rhythm and clear topics, the algorithm has less to work with.",
    signalKey: "content_performance",
  },
  Local: {
    meaning: "How visible you are to people searching in your city and region.",
    care: "Local buyers often choose whoever shows up first in their area — not whoever posts the most.",
    signalKey: "local_visibility",
  },
  Sales: {
    meaning: "How easy it is to turn attention into DMs, calls, or bookings.",
    care: "Great content still fails if the next step is unclear.",
    signalKey: "sales_readiness",
  },
  Competitor: {
    meaning: "How your account compares to others winning attention nearby.",
    care: "You do not need to copy competitors — you need to know what the market already rewards.",
    signalKey: "competitor_gap",
  },
};

function scoreReason(data: ReportData, label: string, value: number): string {
  const meta = SCORE_ROW_META[label];
  if (!meta) return "Based on profile, content, and competitor signals from this audit.";
  const unfired = (data.scores.signals[meta.signalKey] ?? []).filter((s) => !s.fired).slice(0, 2);
  if (unfired.length > 0) {
    return unfired.map((s) => s.note ?? s.label).join(" · ");
  }
  if (value >= 71) return "Core signals in this area are firing consistently.";
  if (value >= 51) return "Foundation is present; tighten consistency to push this higher.";
  if (value >= 26) return "Several important signals are missing or inconsistent.";
  return "This area needs focused work before growth compounds.";
}

const IG_ICON = `<svg class="ig-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zM18 6.2a1.2 1.2 0 1 1-1.2 1.2 1.2 1.2 0 0 1 1.2-1.2z"/></svg>`;

function meter(label: string, value: number): string {
  const width = Math.max(0, Math.min(100, Math.round(value)));
  return `<div class="score-meter">
  <div class="meter-top"><span>${e(label)}</span><span>${width}/100</span></div>
  <div class="meter-track"><div class="meter-fill meter-width-${width}" style="width: ${width}%"></div></div>
</div>`;
}

function meterStyles(values: number[]): string {
  const unique = Array.from(new Set(values.map((value) => Math.max(0, Math.min(100, Math.round(value))))));
  return `<style>
${unique.map((value) => `.meter-fill.meter-width-${value} { width: ${value}%; }`).join("\n")}
</style>`;
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

function topSignals(scores: ReportScores, key: keyof ReportScores["signals"], limit = 3): string[] {
  return (scores.signals[key] ?? [])
    .filter((signal) => !signal.fired)
    .slice(0, limit)
    .map((signal) => `${signal.label}: ${signal.note ?? "missing"}`);
}

function avgClientHashtags(data: ReportData): string {
  return data.client.feature_summary.avg_hashtag_count.toFixed(1);
}

function localMarketSortRank(label: string | null | undefined): number {
  const text = (label ?? "").toLowerCase();
  if (text.includes("expanded search")) return 2;
  if (text.includes("nearby market")) return 1;
  return 0;
}

function localCompetitors(data: ReportData): ReportCompetitor[] {
  return data.competitors
    .filter((c) => c.competitor_type === "local_intel")
    .sort((a, b) => {
      const tier = localMarketSortRank(a.geographic_market) - localMarketSortRank(b.geographic_market);
      if (tier !== 0) return tier;
      return n(b.follower_count) - n(a.follower_count);
    });
}

function referenceCompetitors(data: ReportData): ReportCompetitor[] {
  return data.competitors.filter((c) => c.competitor_type === "reference_model" && isAllowedReferenceMarketLabel(c.geographic_market));
}

function marketName(data: ReportData): string {
  return data.reportContext.localMarketLabel;
}

function businessType(data: ReportData): string {
  return data.reportContext.businessClassification;
}

function businessTypeNoun(data: ReportData): string {
  return businessType(data).toLowerCase().replace(/^(a|an|the)\s+/i, "");
}

function buyerFacingType(data: ReportData): string {
  const noun = businessTypeNoun(data);
  if (noun.endsWith("marketing")) return `${noun} provider`;
  if (noun.endsWith("agency")) return noun;
  if (noun.endsWith("service")) return `${noun} provider`;
  return noun;
}

function competitorMarket(data: ReportData, comp: ReportCompetitor): string {
  const currentMarket = (comp.geographic_market ?? "").trim();
  if (comp.competitor_type === "local_intel") {
    const auditMarket = marketName(data);
    if (!currentMarket || currentMarket.toLowerCase() === auditMarket.toLowerCase()) {
      return auditMarket;
    }
  }
  return currentMarket || "market unknown";
}

function competitorLabel(comp: ReportCompetitor): string {
  if (comp.competitor_type === "local_intel" && isExpandedLocalMarket(comp.geographic_market)) {
    return "Nearby / regional peer";
  }
  return comp.competitor_type === "local_intel" ? "Local competitor" : "Canadian reference model";
}

function competitorWhyIncluded(data: ReportData, comp: ReportCompetitor): string {
  if (comp.competitor_type === "local_intel") {
    const market = (comp.geographic_market ?? "").trim();
    if (market.toLowerCase().includes("expanded search")) {
      return `Included from a wider regional search (${market.replace(/\s*·\s*expanded search/i, "")}) because few accounts in ${marketName(data)} met discovery thresholds.`;
    }
    if (market.toLowerCase().includes("nearby market")) {
      return `Included from a nearby market (${market.replace(/\s*·\s*nearby market/i, "")}) — same category, adjacent geography.`;
    }
    return `Included because it competes in or around ${marketName(data)}.`;
  }
  return "Included because it shows how the same category performs in another Ontario market.";
}

function competitorBorrow(comp: ReportCompetitor): string {
  const top = comp.top_posts[0];
  const type = top?.post_type ?? "format";
  const hook = top?.hook_type ?? "hook";
  const tone = top?.tone ?? "tone";
  return `${type}, ${hook}, and ${tone} are the mechanics to borrow ethically.`;
}

function competitorAvoid(comp: ReportCompetitor): string {
  return comp.competitor_type === "local_intel"
    ? "Do not copy the creative exactly. Use it as market context only."
    : "Do not copy the account voice or visual identity exactly. Borrow structure, not style.";
}

function competitorRows(data: ReportData, comps: ReportCompetitor[]): string {
  return comps
    .slice()
    .sort((a, b) => n(b.follower_count) - n(a.follower_count))
    .map((comp, index) => `<div class="leader-row">
  <div class="leader-rank">${index + 1}</div>
  <div>
    <div class="leader-name">@${e(comp.username)}</div>
    <div class="leader-meta">${e(competitorMarket(data, comp))} · ${e(comp.competitor_type?.replace("_", " ") ?? "competitor")} · confidence ${n(comp.confidence_score)}</div>
  </div>
  <div class="leader-stat">${compact(comp.follower_count)}</div>
</div>`)
    .join("\n");
}

function patternLine(comp: ReportCompetitor): string {
  const top = comp.top_posts[0];
  const type = top?.post_type ?? "content";
  const hook = top?.hook_type ?? "clear hook";
  const tone = top?.tone ?? "consistent tone";
  return `${type} led by ${hook} hooks, ${tone} tone`;
}

function doingRight(comp: ReportCompetitor): string {
  const postTypes = Array.from(new Set(comp.top_posts.map((post) => post.post_type).filter(Boolean))).join(" + ");
  const hasQuestion = comp.top_posts.some((post) => post.hook_type === "question");
  if (n(comp.follower_count) > 10000) return `They have audience gravity: ${compact(comp.follower_count)} followers and repeatable ${postTypes || "content"} formats.`;
  if (hasQuestion) return `They use question hooks that create a cleaner opening for comments and DMs.`;
  if (postTypes) return `They keep the format simple: ${postTypes}. That makes the account easy to scan.`;
  return "They give the market another visible option. Study the positioning gap.";
}

function topPostSnippet(comp: ReportCompetitor): string {
  const caption = comp.top_posts[0]?.caption ?? "";
  const cleaned = caption.replace(/\s+/g, " ").trim();
  return cleaned.length > 96 ? `${cleaned.slice(0, 96)}...` : cleaned;
}

function competitorSlot(
  data: ReportData,
  comp: ReportCompetitor | undefined,
  index: number,
  kind: "local" | "reference",
): string {
  if (!comp) {
    return `<div class="competitor-slot competitor-slot-empty">
  <div class="slot-num">${index}</div>
  <div class="slot-title">More data needed</div>
  <div class="slot-copy">Add another ${kind} account in the same category to strengthen this comparison.</div>
</div>`;
  }
  const learn =
    comp.competitor_type === "local_intel"
      ? doingRight(comp)
      : `Study their ${patternLine(comp)} — borrow structure, not voice.`;
  return `<div class="competitor-slot">
  <div class="slot-head"><span class="slot-num">${index}</span><span class="slot-handle">@${e(comp.username)}</span></div>
  <div class="slot-stats">${compact(comp.follower_count)} followers · ${compact(comp.post_count)} posts</div>
  <div class="slot-copy"><strong>Does well:</strong> ${e(doingRight(comp))}</div>
  <div class="slot-copy"><strong>Learn:</strong> ${e(learn)}</div>
</div>`;
}

function competitorColumn(
  data: ReportData,
  title: string,
  subtitle: string,
  comps: ReportCompetitor[],
  maxSlots: number,
  kind: "local" | "reference",
): string {
  const slots = Array.from({ length: maxSlots }, (_, i) => competitorSlot(data, comps[i], i + 1, kind));
  return `<div class="competitor-column">
  <div class="column-title">${e(title)}</div>
  <div class="column-sub">${e(subtitle)}</div>
  ${slots.join("\n")}
</div>`;
}

function distributionRows(title: string, values: Record<string, number>, total: number): string {
  const rows = Object.entries(values)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => `<div class="mini-row">
  <div class="mini-label">${e(label.replace(/_/g, " "))}</div>
  <div class="mini-value">${value}/${total} posts · ${Math.round((value / Math.max(total, 1)) * 100)}%</div>
</div>`)
    .join("\n");
  return `<div class="guide-card full">
  <div class="kicker">${e(title)}</div>
  <div class="mini-table">${rows}</div>
</div>`;
}

export function actionCoverSlide(data: ReportData): string {
  const ctx = data.reportContext;
  const businessName = ctx.displayName;
  const market = marketName(data);
  const profile = data.client.profile;
  const followerCount = profile?.follower_count ?? 0;
  const postCount = profile?.post_count ?? 0;
  const longestChunk = businessName.split(/\s+/).reduce((max, chunk) => Math.max(max, chunk.length), 0);
  const titleClass = businessName.length > 42 || longestChunk > 26
    ? "cover-title cover-title-xs"
    : businessName.length > 32 || longestChunk > 20
      ? "cover-title cover-title-sm"
      : businessName.length > 24 || longestChunk > 15
        ? "cover-title cover-title-md"
        : "cover-title";
  const bio = ctx.businessDescriptionFromInstagramBio || profile?.bio || "Bio not available in this audit.";
  const category = profile?.category ?? ctx.businessClassification;
  const website = profile?.external_url_in_bio ?? profile?.website_url ?? data.audit.website_url ?? "";
  const subtitle = `${e(businessType(data))}, ${e(market)} at ${e(ctx.businessName)}`;

  return `<!-- _class: cover -->

<img class="brand-mark" src="../../BotLogix Master Logo.png" alt="BotLogix">
<span class="eyebrow">Competitive Instagram Action Guide</span>

<h1 class="${titleClass}">${e(businessName)}</h1>

<p class="sub cover-subtitle">${subtitle}</p>

<div class="profile-preview">
  <div class="profile-preview-head">${IG_ICON}<span>Instagram snapshot</span></div>
  <div class="profile-preview-row"><span class="pp-label">Account</span><span class="pp-value">${e(profile?.full_name ?? businessName)}</span></div>
  <div class="profile-preview-row"><span class="pp-label">Handle</span><span class="pp-value">@${e(ctx.handle)}</span></div>
  <div class="profile-preview-row"><span class="pp-label">Category</span><span class="pp-value">${e(category)}</span></div>
  <div class="profile-preview-row"><span class="pp-label">Location</span><span class="pp-value">${e(market)}</span></div>
  ${website ? `<div class="profile-preview-row"><span class="pp-label">Link</span><span class="pp-value pp-mono">${e(website)}</span></div>` : ""}
  <div class="profile-preview-row"><span class="pp-label">Followers</span><span class="pp-value">${compact(followerCount)} · ${compact(postCount)} posts</span></div>
  <div class="profile-preview-bio">${e(bio)}</div>
</div>

<div class="stat-row cover-stats">
  <div class="stat-card">
    <div class="num accent-text">${n(data.scores.overall)}<span class="suffix">/100</span></div>
    <div class="label">Today's baseline</div>
    <div class="stat-note">Your starting point before this growth sprint.</div>
  </div>
  <div class="stat-card">
    <div class="num">${compact(followerCount)}</div>
    <div class="label">Current followers</div>
    <div class="stat-note">Audience you can activate with clearer local content.</div>
  </div>
</div>

<div class="cover-summary">This guide shows where the account stands today, what local competitors are doing, and exactly what to improve first.</div>

<div class="footer-row">
  <span>Practical moves · Plain English · Built for ${e(market)}</span>
  <span>botlogix.ca</span>
</div>`;
}

export function jumpMapSlide(data: ReportData): string {
  const market = marketName(data);
  const rows = [
    ["01", "Scoreboard", "Where the account stands today and which areas need the most work.", "Why it matters: You need a clear starting line before changing content."],
    ["02", "Competitor intel", "What local competitors and stronger Canadian reference accounts are already doing.", "Why it matters: You cannot out-position a market you have not studied."],
    ["03", "Market signals", "Post types, captions, hashtags, and patterns the market already rewards.", "Why it matters: Copy what works structurally — not creatively."],
    ["04", "Local growth plan", `How to become more visible in ${market} and nearby areas.`, "Why it matters: Local buyers choose accounts that look local."],
    ["05", "First 7 days", "A practical daily plan you can execute without a marketing team.", "Why it matters: Small daily moves beat one big burst."],
    ["06", "Content toolkit", "Post formats, hooks, hashtags, prompts, and a tear-off action sheet.", "Why it matters: You should leave with content you can publish immediately."],
  ];
  return `<span class="eyebrow">How to use this guide</span>

# Jump map

<p><strong>Tell them what they will get.</strong> This report is built to move fast: diagnose the account, compare the market, then turn findings into a first-week action plan.</p>

<p><strong>Use it in order once, then jump around.</strong> Each section ends with something you can do — not just something to know.</p>

<div class="jump-list">
${rows
  .map(
    ([num, title, copy, why]) => `<div class="jump-row">
  <div class="jump-num">${num}</div>
  <div>
    <div class="jump-title">${title}</div>
    <div class="jump-copy">${copy}</div>
    <div class="jump-why">${why}</div>
  </div>
</div>`,
  )
  .join("\n")}
</div>`;
}

export function scoreboardSlide(data: ReportData): string {
  const rows = dims(data.scores)
    .map(([label, value]) => {
      const meta = SCORE_ROW_META[label];
      return `<div class="score-row">
  <div class="score-row-top">
    <span class="score-row-label">${e(label)}</span>
    <span class="score-row-badge">${value}/100</span>
  </div>
  <div class="score-row-meaning">${e(meta?.meaning ?? "")}</div>
  <div class="score-row-care"><strong>Why care:</strong> ${e(meta?.care ?? "")}</div>
  <div class="score-row-reason"><strong>Your score:</strong> ${e(scoreReason(data, label, value))}</div>
</div>`;
    })
    .join("\n");

  return `<span class="eyebrow">01 · Scoreboard</span>

# Where the account sits today

<p>Five areas, plain English. Higher is better. This is your baseline — not a final grade.</p>

<div class="score-row-list">
${rows}
</div>`;
}

export function scoreRangesSlide(_data: ReportData): string {
  const ranges = [
    {
      range: "0–25",
      title: "Invisible or unclear",
      means: "The account is hard to find or does not explain the offer quickly.",
      causes: "Missing local signals, weak bio, or very low posting rhythm.",
      next: "Fix profile + one local post before anything else.",
    },
    {
      range: "26–50",
      title: "Present but underpowered",
      means: "You show up, but the message and rhythm are not consistent enough.",
      causes: "Irregular posting, generic captions, or weak calls to action.",
      next: "Pick two repeatable post formats and publish weekly.",
    },
    {
      range: "51–70",
      title: "Working but inconsistent",
      means: "Foundation is there; results depend on staying consistent.",
      causes: "Good ideas without a weekly system.",
      next: "Double down on what already gets saves or DMs.",
    },
    {
      range: "71–85",
      title: "Strong foundation",
      means: "The account is credible; optimization beats reinvention.",
      causes: "Clear offer, steady content, improving local signals.",
      next: "Test stronger hooks and proof posts.",
    },
    {
      range: "86–100",
      title: "Market leader",
      means: "You are setting the pace others study.",
      causes: "Consistent proof, local authority, and clear conversion path.",
      next: "Scale what works and document case studies.",
    },
  ];

  return `<span class="eyebrow">01 · How scoring works</span>

# What the scores actually mean

<p>The score is not a judgment. It is a starting point. Growth depends on consistency, local relevance, content quality, and clear calls to action.</p>

<div class="range-list">
${ranges
  .map(
    (r) => `<div class="range-row">
  <div class="range-badge">${e(r.range)}</div>
  <div class="range-body">
    <div class="range-title">${e(r.title)}</div>
    <div class="range-copy"><strong>Means:</strong> ${e(r.means)}</div>
    <div class="range-copy"><strong>Usually caused by:</strong> ${e(r.causes)}</div>
    <div class="range-copy"><strong>Do next:</strong> ${e(r.next)}</div>
  </div>
</div>`,
  )
  .join("\n")}
</div>`;
}

/** @deprecated Use scoreRangesSlide — kept for imports during transition */
export const signalPanelSlide = scoreRangesSlide;

export function competitorLeaderboardSlide(data: ReportData): string {
  const market = marketName(data);
  const local = localCompetitors(data).sort((a, b) => n(b.follower_count) - n(a.follower_count));
  const reference = referenceCompetitors(data).sort((a, b) => n(b.follower_count) - n(a.follower_count));
  const needMoreLocal = local.length < 3;
  const needMoreRef = reference.length < 3;

  return `<span class="eyebrow">02 · Competitor intel</span>

# Who we compared you against

<p>We look at <strong>local competitors</strong> to see who is winning nearby attention. We look at <strong>Canadian reference models</strong> to see what content patterns already work in similar markets.</p>

${needMoreLocal || needMoreRef ? `<div class="guide-card full"><div class="kicker">Data note</div><div class="copy">${needMoreLocal ? `Only ${local.length} local account(s) met confidence thresholds for ${e(market)}. ` : ""}${needMoreRef ? `Reference sample: ${reference.length} account(s). ` : ""}Empty slots show where more competitor data is needed — not a full market picture.</div></div>` : ""}

<div class="competitor-board">
${competitorColumn(data, "Local competitors", `Same city / service area · ${e(market)}`, local, 3, "local")}
${competitorColumn(data, "Canadian reference models", "Stronger accounts to study for structure", reference, 3, "reference")}
</div>`;
}

export function patternDashboardSlide(data: ReportData): string {
  const cat = data.patterns.category;
  const total = cat.postCount || 1;
  const clientPosts = data.client.profile?.post_count ?? data.client.posts.length;
  const clientCaption = data.client.feature_summary.avg_caption_length;
  const clientTags = avgClientHashtags(data);
  const clientCadence = postsPerWeek(data);
  const marketCaption = Math.round(cat.caption.avgLength);
  const marketTags = cat.hashtags.avgCountPerPost.toFixed(1);
  const topFormat = Object.entries(cat.postTypes.distribution).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, " ") ?? "mixed formats";

  return `<span class="eyebrow">03 · Market signals</span>

# What the market is already rewarding

<div class="compare-grid">
  <div class="guide-card"><div class="kicker">Your account</div><div class="big">${clientPosts}</div><div class="copy">Total posts on your profile</div></div>
  <div class="guide-card"><div class="kicker">Market studied</div><div class="big">${cat.postCount}</div><div class="copy">Competitor posts analyzed</div></div>
</div>

<div class="compare-table">
  <div class="compare-row compare-head"><span>Metric</span><span>You</span><span>Market avg</span></div>
  <div class="compare-row"><span>Avg caption length</span><span>${clientCaption} chars</span><span>${marketCaption} chars</span></div>
  <div class="compare-row"><span>Avg hashtags</span><span>${clientTags}</span><span>${marketTags}</span></div>
  <div class="compare-row"><span>Posts / week (30d)</span><span>${clientCadence}</span><span>varies by account</span></div>
  <div class="compare-row"><span>Top format</span><span>${e(Object.keys(data.client.feature_summary.post_type_distribution)[0]?.replace(/_/g, " ") ?? "—")}</span><span>${e(topFormat)}</span></div>
</div>

<div class="guide-card full">
  <div class="kicker">What this means for you</div>
  <div class="copy">You have enough post history (${clientPosts} posts) to spot patterns. The opportunity is tightening your message, improving local signals, and posting with a clearer weekly rhythm — not starting from zero.</div>
</div>

<div class="guide-card full">
  <div class="kicker">Change first</div>
  <div class="copy">Match market caption discipline, add local hashtags every post, and publish at least 3 times this week using the top market format: ${e(topFormat)}.</div>
</div>`;
}

export function contentPatternSlide(data: ReportData): string {
  const market = marketName(data);
  const type = buyerFacingType(data);
  const mechanics = [
    ["Strong first-line hooks", "Stops the scroll in the feed.", `Open with a ${market} buyer problem, not your company name.`, `"Most ${market} businesses miss this on Instagram…"`],
    ["Local proof", "Builds trust faster than generic tips.", "Use a real client story, neighbourhood, or result.", `"What we changed for a ${market} business this month"`],
    ["Before / after examples", "Makes the outcome tangible.", "Show one clear before/after in caption or carousel.", "Profile bio before vs after your fix"],
    ["Short educational posts", "Positions you as the guide.", "Answer one FAQ per post.", `"Should I boost posts or fix my profile first?"`],
    ["FAQ-based posts", "Matches how buyers search mentally.", "Turn DMs into content.", "Your 3 most-asked questions this week"],
    ["Founder / operator face", "Humanizes a service business.", "Film 15–30 sec talking to camera.", `"Here's what I'd do if I were you"`],
    ["Reels showing real work", "Proof beats polish for local services.", "Screen-record a dashboard or walk through a result.", "30-sec audit of an Instagram profile"],
    ["Simple caption CTA", "Turns views into conversations.", "One CTA per post — DM, book, or comment.", `"DM AUDIT for a free profile review"`],
  ];

  return `<span class="eyebrow">03 · Content mechanics</span>

# Content mechanics to borrow ethically

<p><strong>Steal the structure, not the content.</strong> Copy how competitors open, prove, and close — write in your own voice.</p>

<div class="mechanic-list">
${mechanics
  .map(
    ([name, why, how, example]) => `<div class="mechanic-row">
  <div class="mechanic-name">${e(name)}</div>
  <div class="mechanic-copy"><strong>Why:</strong> ${e(why)}</div>
  <div class="mechanic-copy"><strong>For ${e(type)}:</strong> ${e(how)}</div>
  <div class="mechanic-example">Example: ${e(example)}</div>
</div>`,
  )
  .join("\n")}
</div>`;
}

export function localTakeoverSlide(data: ReportData): string {
  const market = marketName(data);
  const city = data.reportContext.businessLocation.city;
  return `<span class="eyebrow">04 · Local growth plan</span>

# Make ${e(market)} impossible to miss

<p>Local Instagram growth is not only hashtags. It is <strong>where</strong> you say you operate and <strong>how often</strong> buyers see proof you serve their area.</p>

<div class="guide-card full">
  <div class="kicker">Local score today</div>
  <div class="big">${n(data.scores.local_visibility)}/100</div>
  <div class="copy">Add local signals in the places below — bio, captions, Reels, geotags, highlights, and comments.</div>
</div>

<div class="local-checklist">
  <div class="check-item"><span class="check-dot"></span><span><strong>Bio + name field:</strong> "Serving ${e(market)}" and who you help</span></div>
  <div class="check-item"><span class="check-dot"></span><span><strong>Captions:</strong> ${e(city)} in the first two lines when relevant</span></div>
  <div class="check-item"><span class="check-dot"></span><span><strong>Reels:</strong> on-screen text with city or neighbourhood</span></div>
  <div class="check-item"><span class="check-dot"></span><span><strong>Geotags:</strong> location on every local-facing post</span></div>
  <div class="check-item"><span class="check-dot"></span><span><strong>Hashtags:</strong> 3 local + 3 service tags (rotate daily)</span></div>
  <div class="check-item"><span class="check-dot"></span><span><strong>Highlights:</strong> "${e(city)} FAQs" or "Local proof"</span></div>
  <div class="check-item"><span class="check-dot"></span><span><strong>Comments:</strong> 5 useful replies on local business posts per week</span></div>
</div>

<div class="guide-card full">
  <div class="kicker">Positioning examples</div>
  <div class="copy">"Helping ${e(market)} businesses turn Instagram into a lead channel." · "Digital marketing for ${e(city)} owners who want clarity, not jargon." · "Ask us about growing locally on Instagram — DM AUDIT."</div>
</div>`;
}

export function actionMovesSlide(data: ReportData): string {
  const market = marketName(data);
  const type = buyerFacingType(data);
  return `<span class="eyebrow">05 · Action Kit</span>

# Your first 7 days to take ground

<div class="guide-grid">
  <div class="guide-card">
    <div class="kicker">Day 1</div>
    <div class="title">Put ${e(market)} in the bio</div>
    <div class="copy">Why: Profile conversion and local search both need the city signal. Time: 10 minutes.</div>
  </div>
  <div class="guide-card">
    <div class="kicker">Day 2</div>
    <div class="title">Build a local hashtag set</div>
    <div class="copy">Example: city + region + ${e(type)} buyer intent. Time: 15 minutes.</div>
  </div>
  <div class="guide-card">
    <div class="kicker">Day 3</div>
    <div class="title">Write one buyer-question post</div>
    <div class="copy">Example: "What should ${e(market)} buyers ask before choosing a ${e(type)}?" Time: 20 minutes.</div>
  </div>
  <div class="guide-card">
    <div class="kicker">Day 4</div>
    <div class="title">Comment on local business posts</div>
    <div class="copy">Leave 5 useful comments from the business account. Time: 15 minutes.</div>
  </div>
  <div class="guide-card full">
    <div class="kicker">Win condition</div>
    <div class="title">Turn competitor data into confidence, not imitation</div>
    <div class="copy">The point is to know the board better than they do. Then publish clearer, more local, more useful proof.</div>
  </div>
</div>`;
}

export function postingToolkitsSlide(data: ReportData): string {
  const market = marketName(data);
  const type = buyerFacingType(data);
  return `<span class="eyebrow">Posting toolkit</span>

# Formulas you can reuse

<div class="formula-grid">
  <div class="formula-card"><div class="formula-label">Hook</div><div class="formula-body">"Most ${e(market)} businesses…" · "Before you hire a ${e(type)}…" · "3 signs your feed…"</div></div>
  <div class="formula-card"><div class="formula-label">Caption</div><div class="formula-body">Problem → local example → fix → CTA</div></div>
  <div class="formula-card"><div class="formula-label">CTA</div><div class="formula-body">DM us · Book (link in bio) · Comment QUESTION · Save this</div></div>
  <div class="formula-card"><div class="formula-label">Formats</div><div class="formula-body">Local FAQ · Proof · Myth vs truth · Behind the work · Soft offer</div></div>
  <div class="formula-card"><div class="formula-label">Reels</div><div class="formula-body">Screen-record profile fix · "One thing I'd change" · Before/after bio</div></div>
  <div class="formula-card"><div class="formula-label">Carousels</div><div class="formula-body">5 local hashtags · 3 profile fixes · Client FAQ slides</div></div>
</div>`;
}

function chatGptPrompt(
  data: ReportData,
  title: string,
  task: string,
): string {
  const ctx = data.reportContext;
  const market = marketName(data);
  const type = buyerFacingType(data);
  const prompt = `Act as a social media strategist for a ${market} ${type} called ${ctx.businessName} (@${ctx.handle}). ${task} Use a clear hook, simple language, local angle for ${market}, and end with a CTA to start a conversation.`;
  return `<div class="ai-prompt compact-prompt">
  <div class="label">${e(title)}</div>
  <div class="prompt">${e(prompt)}</div>
</div>`;
}

export function immediateContentSlide(data: ReportData): string {
  return `<span class="eyebrow">Copy-ready AI prompts</span>

# Paste into ChatGPT

<p>Copy any prompt below into ChatGPT. Edit the output in your voice before posting.</p>

${chatGptPrompt(data, "Daily Instagram post", "Write one Instagram caption (under 120 words) for today.")}
${chatGptPrompt(data, "Carousel", "Write a 5-slide carousel outline with headline per slide.")}
${chatGptPrompt(data, "Reel script", "Write a 30-second Reel script with on-screen text suggestions.")}
${chatGptPrompt(data, "Local authority post", `Explain one way a ${marketName(data)} business can improve local visibility on Instagram.`)}
${chatGptPrompt(data, "Client pain-point post", "Address one common fear local business owners have about marketing on Instagram.")}
${chatGptPrompt(data, "FAQ post", "Answer one frequently asked question your clients ask before buying.")}`;
}
