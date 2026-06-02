/**
 * Blueprint data renderer — maps a GoldMasterIntelligence into the single
 * data object the "Instagram Growth Blueprint" template pack renders from.
 *
 * The template pack (templates/blueprint/) is a fixed, data-driven 20-page
 * design: blueprint.html loads `auto/data.js` (a `window.BLUEPRINT_DATA = {…}`
 * global) plus the render engine + page builders, and computes every chart
 * (radar, rings, opportunity ladder, posts/week bars, funnel, calendar) from
 * the scores. Our only job per client is to produce a new `auto/data.js`.
 *
 * This module is the bridge: GoldMasterIntelligence (our structured source of
 * truth) → the exact keys/cardinalities the schema requires
 * (templates/blueprint/docs/Blueprint - Data Schema.md). It is fully
 * deterministic and never throws: every field is defaulted so the 20 pages
 * always render. The figures that are inherently illustrative in the template
 * (format-mix split, funnel widths, gap-bar fills) are derived from the real
 * scores rather than invented.
 *
 * Hard cardinalities enforced here: pillars = 5 (fixed keys, in order),
 * chain = 5, competitors ≤ 5, cadence_slots = 3, offer_paths = 3,
 * four_week_arc = 4, calendar = 4 weeks × 3 posts, seven_day_plan = 7.
 */

import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { GoldMasterIntelligence, ScoreDiagnosis } from "./goldMasterSchema.js";
import { getClientConfig } from "./clientConfig.js";

/* ── small helpers ───────────────────────────────────────────────────────*/

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function leadNum(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = String(s).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
function findScore(scores: ScoreDiagnosis[], re: RegExp): ScoreDiagnosis | undefined {
  return scores.find((s) => re.test(s.dimension));
}
/** Compact follower formatting: 15234 → "15.2k", 980 → "980". */
function formatFollowers(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toLocaleString("en-US");
}
function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
/** Insert spaces at camelCase / letter-digit boundaries, then title-case. */
function prettifyName(raw: string): string {
  const spaced = String(raw)
    .replace(/[._-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  return titleCase(spaced);
}
/**
 * Client-facing display name. Priority: curated config name → a name that
 * already looks real (has spaces/capitals and isn't just the handle) →
 * prettified fallback. Avoids printing a bare lowercase handle on the cover.
 */
function clientDisplayName(gm: GoldMasterIntelligence): string {
  const handle = gm.meta.handle.replace(/^@/, "").toLowerCase();
  const configName = getClientConfig(gm.meta.handle).displayName;
  if (configName) return configName;
  const looksReal = (s: string | null | undefined): boolean =>
    !!s && /[A-Z ]/.test(s) && s.replace(/[^a-z0-9]/gi, "").toLowerCase() !== handle;
  if (looksReal(gm.account.displayName)) return gm.account.displayName;
  if (looksReal(gm.meta.account)) return gm.meta.account;
  return prettifyName(gm.meta.account || handle);
}
/** "Toronto, Ontario" — prefer a comma'd market label, else compose city+region. */
function regionDisplay(gm: GoldMasterIntelligence): string {
  const city = gm.meta.city?.trim() || "";
  const region = gm.meta.region?.trim() || "";
  const market = gm.meta.marketLabel?.trim() || "";
  if (market.includes(",")) return market;
  if (city && region && !new RegExp(`\\b${city}\\b`, "i").test(region)) return `${city}, ${region}`;
  return region || market || city || "—";
}
/** "2026-05-31T…" or "June 27, 2026" → "May 31, 2026". */
function longDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso; // already a display string
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
/** "May 31, 2026" → "May 31". */
function shortDate(display: string): string {
  return String(display).split(",")[0].trim();
}
function tagify(tags: string[]): string {
  return tags.map((t) => `#${String(t).replace(/^#/, "")}`).join(" ");
}

const STATUS_BANDS = ["Fix first", "Needs work", "Developing", "Strong"] as const;
function bandStatus(score: number): string {
  if (score < 40) return STATUS_BANDS[0];
  if (score < 55) return STATUS_BANDS[1];
  if (score < 70) return STATUS_BANDS[2];
  return STATUS_BANDS[3];
}
function pillarTone(score: number): "red" | "amber" | "brand" {
  if (score < 40) return "red";
  if (score < 68) return "amber";
  return "brand";
}
function chainTone(score: number): "red" | "amber" | "green" {
  if (score < 40) return "red";
  if (score < 70) return "amber";
  return "green";
}
function chainStatus(score: number): string {
  if (score < 40) return "Critical";
  if (score < 55) return "Needs work";
  if (score < 70) return "Developing";
  return "Strong";
}

/* ── the data shape (mirrors Blueprint - Data Schema.md) ─────────────────*/

export interface BlueprintData {
  [key: string]: unknown;
}

/* ── the mapping ─────────────────────────────────────────────────────────*/

const PILLAR_DEFS = [
  { key: "local_visibility", name: "Local visibility", eyebrow: "Pillar 01 · Get found", re: /local/i },
  { key: "profile_conversion", name: "Profile conversion", eyebrow: "Pillar 02 · Make sense fast", re: /profile|conversion/i },
  { key: "content_performance", name: "Content performance", eyebrow: "Pillar 03 · Be worth following", re: /content/i },
  { key: "sales_readiness", name: "Sales readiness", eyebrow: "Pillar 04 · Drive action", re: /sales|readiness/i },
  { key: "competitor_gap", name: "Competitor gap", eyebrow: "Pillar 05 · Stand out", re: /competitor/i },
] as const;

function oneLiner(key: string, score: number, isLowest: boolean): string {
  if (isLowest && score < 40) return "The single lowest score in the audit — and the highest-leverage thing to fix this week.";
  switch (key) {
    case "local_visibility":
      return score < 50 ? "If the right local people can't find you, nothing else you do here matters yet." : "You're discoverable — now press the local advantage harder.";
    case "profile_conversion":
      return score < 55 ? "A visitor decides in about three seconds whether to follow or bounce. Right now it's a coin-flip." : "Your profile mostly works — tighten it and more visits become follows.";
    case "content_performance":
      return score < 55 ? "The algorithm rewards saves and shares. A low-cadence, soft-hook feed caps your reach." : "Your content earns reach — now make the winning format your default.";
    case "sales_readiness":
      return score < 55 ? "Reach without a path to \"talk to us\" is vanity. Most posts end with a full stop, not a next step." : "There's a path to action — sharpen it and more attention converts.";
    case "competitor_gap":
      return score >= 60 ? "Your strongest score. The accounts beside you are beatable — they're just out-working you on cadence." : "You're behind the feed beside you, but the gap is consistency, not talent.";
    default:
      return "A pillar that decides whether attention turns into customers.";
  }
}

function buildPillars(gm: GoldMasterIntelligence) {
  const rest = gm.scores.filter((s) => !/overall/i.test(s.dimension));
  const lowest = [...rest].sort((a, b) => a.score - b.score)[0];
  const clientPPW = gm.account.postsPerWeek;
  const marketPPW = leadNum(gm.marketComparison.rows.find((r) => /week/i.test(r.metric))?.market);
  const localTags = gm.hashtags.find((h) => h.group === "local")?.tags ?? [];
  const bioWeak = gm.account.profileGaps.some((g) => /bio/i.test(g)) || (findScore(gm.scores, /profile/i)?.score ?? 0) < 60;
  const hasLink = !!gm.account.website;
  const ctaWeak = /weak|no obvious/i.test(gm.account.ctaStatus);

  return PILLAR_DEFS.map((def) => {
    const sc = findScore(gm.scores, def.re);
    const score = sc?.score ?? 0;
    const tone = pillarTone(score);
    const isLowest = sc?.dimension === lowest?.dimension;

    const base = {
      key: def.key,
      name: def.name,
      score,
      status: isLowest && score < 40 ? "Fix first" : bandStatus(score),
      eyebrow: def.eyebrow,
      chip_tone: tone,
      one_liner: oneLiner(def.key, score, isLowest),
      what_measured: sc?.whatWeSaw ?? "Scored from the audit's signal model.",
      why_matters: sc?.whyItMatters ?? "Contributes to discoverability and conversion.",
      what_next: sc?.nextMove ?? "Keep the momentum and measure on day 30.",
    };

    if (def.key === "local_visibility") {
      return {
        ...base,
        metrics: [
          { label: "Local visibility", value: `${score}/100`, target: "70+" },
          { label: "City in profile", value: /under|missing/i.test(gm.account.localSignalStatus) ? "Weak" : "Present", target: "Yes" },
          { label: "Local hashtag sets", value: localTags.length ? `${Math.min(localTags.length, 12)} tags` : "0", target: "3 sets" },
        ],
      };
    }
    if (def.key === "profile_conversion") {
      return {
        ...base,
        metrics: [
          { label: "Value-prop bio", value: bioWeak ? "Weak" : "Clear", tone: bioWeak ? "amber" : "green" },
          { label: "CTA link", value: hasLink ? "Present" : "Missing", tone: hasLink ? "green" : "red" },
          { label: "Highlights", value: "Add 3", tone: "amber" },
          { label: "Pinned posts", value: "0 / 3", tone: "red" },
        ],
      };
    }
    if (def.key === "content_performance") {
      const reels = clamp(Math.round(score * 0.2), 5, 30);
      const carousels = clamp(Math.round(score * 0.15), 5, 25);
      const staticPct = clamp(100 - reels - carousels, 25, 90);
      return {
        ...base,
        format_mix: {
          today: { reels, carousels, static: staticPct, saves: "few saves" },
          target: { reels: 40, carousels: 35, static: 25, saves: "30+ saves" },
        },
        metrics: [
          { label: "Posts / week", value: clientPPW != null ? clientPPW.toFixed(1) : "—", target: marketPPW != null ? marketPPW.toFixed(1) : "4.0" },
          { label: "Reels share", value: `${reels}%`, target: "40%" },
          { label: "Carousels", value: `${carousels}%`, target: "35%" },
          { label: "Static posts", value: `${staticPct}%`, target: "25%" },
        ],
      };
    }
    if (def.key === "sales_readiness") {
      const w1 = 100;
      const w2 = clamp(Math.round(45 + score * 0.3), 40, 75);
      const w3 = clamp(Math.round(18 + score * 0.3), 16, Math.max(18, w2 - 8));
      const w4 = clamp(Math.round(8 + score * 0.12), 8, Math.max(10, w3 - 6));
      return {
        ...base,
        funnel: [
          { label: "Reach earned by a post", width: w1 },
          { label: "Profile visit", width: w2 },
          { label: "Save / DM", width: w3 },
          { label: "Booked", width: w4 },
        ],
        metrics: [
          { label: "Posts w/ CTA", value: ctaWeak ? "~1 in 5" : "Most posts", tone: ctaWeak ? "amber" : "green" },
          { label: "Pinned offer", value: "Set one up", tone: "red" },
          { label: "Social proof", value: "Add proof", tone: "amber" },
          { label: "Lead path", value: hasLink ? "Link set" : "No link", tone: hasLink ? "green" : "red" },
        ],
      };
    }
    // competitor_gap
    return {
      ...base,
      metrics: [
        { label: "Posts / week", value: clientPPW != null ? clientPPW.toFixed(1) : "—", target: marketPPW != null ? marketPPW.toFixed(1) : "4.0" },
        { label: "Locality", value: "Generic", target: "Specific" },
      ],
    };
  });
}

function buildChain(gm: GoldMasterIntelligence) {
  const score = (re: RegExp) => findScore(gm.scores, re)?.score ?? 0;
  const stages = [
    { n: 1, name: "Get found", question: "Can the right local people discover you at all?", score: score(/local/i) },
    { n: 2, name: "Make sense fast", question: "In 3 seconds, do they get who you help?", score: score(/profile|conversion/i) },
    { n: 3, name: "Be worth following", question: "Does it earn the save and the share?", score: score(/content/i) },
    { n: 4, name: "Stand out", question: "Are you distinct from the feed beside you?", score: score(/competitor/i) },
    { n: 5, name: "Drive action", question: "Is there a clear next step to a conversation?", score: score(/sales|readiness/i) },
  ];
  const minScore = Math.min(...stages.map((s) => s.score));
  let flaggedBottleneck = false;
  return stages.map((s) => {
    const bottleneck = !flaggedBottleneck && s.score === minScore;
    if (bottleneck) flaggedBottleneck = true;
    return { ...s, status: chainStatus(s.score), tone: chainTone(s.score), ...(bottleneck ? { bottleneck: true } : {}) };
  });
}

function buildCompetitors(gm: GoldMasterIntelligence) {
  return gm.competitors.slice(0, 5).map((c) => {
    const metric = c.followers != null ? `${formatFollowers(c.followers)} followers`
      : c.latestPostType ? `Posts ${c.latestPostType}s`
      : c.activityStatus || "Active account";
    const kind = c.type === "reference" ? "Reference account" : "Local peer";
    const typeLine = c.latestPostType ? `${kind} · ${c.latestPostType}-led` : kind;
    return {
      handle: `@${c.handle.replace(/^@/, "")}`,
      type: typeLine,
      metric,
      does_well: c.whySelected || "Active, relevant account in your space.",
      borrow: c.borrow || "Borrow their cadence and best-performing format.",
    };
  });
}

function buildCadenceStandings(gm: GoldMasterIntelligence) {
  const clientPPW = gm.account.postsPerWeek ?? leadNum(gm.marketComparison.rows.find((r) => /week/i.test(r.metric))?.client) ?? 0;
  const marketPPW = leadNum(gm.marketComparison.rows.find((r) => /week/i.test(r.metric))?.market) ?? 4;
  const top = Math.max(marketPPW * 1.1, clientPPW + 1);
  const topComp = gm.competitors[0];
  return {
    top_performer: { label: topComp ? `Top performer · @${topComp.handle.replace(/^@/, "")}` : "Top performer", value: Number(top.toFixed(1)) },
    average: { label: `Market average`, value: Number(marketPPW.toFixed(1)) },
    you: { label: `You · @${gm.meta.handle.replace(/^@/, "")}`, value: Number(clientPPW.toFixed(1)) },
    target_line: Number(marketPPW.toFixed(1)),
    scale_max: Number(Math.max(top, clientPPW, marketPPW, 5).toFixed(1)),
  };
}

function buildDataGaps(gm: GoldMasterIntelligence, benchmarkCount: number) {
  const comps = gm.competitors.slice(0, 2);
  const columns = comps.length >= 2 ? comps.map((c) => `@${c.handle.replace(/^@/, "")}`)
    : comps.length === 1 ? [`@${comps[0].handle.replace(/^@/, "")}`, "Market avg"]
    : ["Top performer", "Market avg"];
  const rows = gm.marketComparison.rows.map((r) => ({
    metric: r.metric,
    you: r.client,
    comps: [r.market, r.market],
    target: r.market,
  }));

  const clientPPW = gm.account.postsPerWeek ?? 0;
  const marketPPW = leadNum(gm.marketComparison.rows.find((rr) => /week/i.test(rr.metric))?.market) ?? 4;
  const localScore = findScore(gm.scores, /local/i)?.score ?? 0;
  const contentScore = findScore(gm.scores, /content/i)?.score ?? 0;
  const volRatio = clientPPW > 0 ? Math.max(1, Math.round(marketPPW / clientPPW)) : Math.round(marketPPW);

  const gapCards = [
    { title: "The volume gap", value: `${volRatio}×`, unit: "less often", fill: clamp(Math.round((clientPPW / Math.max(marketPPW, 1)) * 100), 4, 90), target: 80, note: "Cadence is the cheapest lever — consistency, not budget." },
    { title: "The format gap", value: `${contentScore}/100`, unit: "reels + carousels", fill: clamp(contentScore, 4, 94), target: 94, note: "Reach lives in reels &amp; carousels, not statics." },
    { title: "The local gap", value: `${localScore}/100`, unit: "local signals", fill: clamp(Math.max(localScore, 2), 2, 100), target: 100, note: "Local signals are the fastest gap to close, with the highest payoff." },
  ];

  return {
    benchmark_label: `Benchmarked against ${benchmarkCount} regional account${benchmarkCount === 1 ? "" : "s"} · table shows the strongest`,
    columns,
    rows: rows.length ? rows : [{ metric: "Posts / week", you: clientPPW.toFixed(1), comps: [marketPPW.toFixed(1), marketPPW.toFixed(1)], target: marketPPW.toFixed(1) }],
    gap_cards: gapCards,
    quick_win: "<strong>The local signals are the easiest gap to close — they're a setting, not a skill.</strong> Most gaps take weeks of consistent posting; this one moves the moment you add a location and local tags. Start there and your visibility climbs from the very next post.",
  };
}

function parseMinutes(timeEstimate: string | undefined): number {
  const n = leadNum(timeEstimate);
  return n != null ? clamp(Math.round(n), 10, 60) : 20;
}

function buildSevenDayPlan(gm: GoldMasterIntelligence) {
  return gm.nextSevenDays.slice(0, 7).map((d, i) => {
    const day = i + 1;
    const out: Record<string, unknown> = {
      day,
      minutes: parseMinutes(d.timeEstimate),
      title: d.objective,
      desc: d.exactInstruction,
    };
    if (day >= 5 && d.outputByEndOfDay) out.output = d.outputByEndOfDay;
    return out;
  });
}

function buildWeek1Checklist(gm: GoldMasterIntelligence): string[] {
  const outs = gm.nextSevenDays.map((d) => d.outputByEndOfDay).filter((o): o is string => !!o && o.trim().length > 0);
  const unique = Array.from(new Set(outs)).slice(0, 6);
  while (unique.length < 6) {
    unique.push(["Profile signals fixed", "Highlights + link live", "Hashtag sets saved", "Pinned conversion posts", "First reel published", "First carousel published"][unique.length]);
  }
  return unique;
}

function buildCalendar(gm: GoldMasterIntelligence) {
  const city = gm.meta.city || gm.meta.marketLabel || "your area";
  const cat = gm.meta.normalizedCategory;
  return [
    { week: 1, theme: "Foundation", posts: [
      { format: "Carousel", title: "Who we help (pinned)", note: `The people you make a difference for in ${city}.` },
      { format: "Reel", title: "Founder intro", note: "Face to camera: why this business exists." },
      { format: "Static", title: "Local proof", note: `A ${city} result, geotagged.` } ] },
    { week: 2, theme: "Authority", posts: [
      { format: "Carousel", title: "Problem → 3 fixes", note: `The #1 thing buyers get wrong about ${cat}.` },
      { format: "Reel", title: "Myth-buster", note: "One thing local owners get wrong." },
      { format: "Static", title: "Behind the scenes", note: "How the work actually gets done." } ] },
    { week: 3, theme: "Proof", posts: [
      { format: "Carousel", title: "Case study", note: "Before → what we did → after." },
      { format: "Static", title: "Testimonial", note: "A real client quote, on brand." },
      { format: "Reel", title: "Before / after", note: "A visible transformation in 15s." } ] },
    { week: 4, theme: "Convert", posts: [
      { format: "Static", title: "The offer", note: "One clear thing to act on, pinned." },
      { format: "Carousel", title: "FAQ", note: "The 5 questions buyers ask before they commit." },
      { format: "Reel", title: "Local urgency", note: `Booking now for ${city} — CTA to the link.` } ] },
  ];
}

function buildCadenceSlots(gm: GoldMasterIntelligence) {
  const cat = gm.meta.normalizedCategory;
  return [
    { day: "Mon", purpose: "Educate", tone: "brand", format: "Carousel", window: "11:00–13:00", watch: "Saves", watch_tone: "brand", example: `“3 fixes most ${cat} buyers miss”` },
    { day: "Wed", purpose: "Connect", tone: "brand", format: "Reel", window: "17:00–19:00", watch: "Follows · visits", watch_tone: "brand", example: "Founder face-to-camera tip" },
    { day: "Fri", purpose: "Prove / Convert", tone: "green", format: "Static or reel", window: "12:00–14:00", watch: "DMs · link clicks", watch_tone: "green", example: "A client win, or the offer" },
  ];
}

function buildToolkit(gm: GoldMasterIntelligence) {
  const city = gm.meta.city || "your city";
  const cta = gm.category.ctaOptions[0] ?? "book";

  // Hook starters: prefer toolkit hooks (already [bracketed]), top up from immediateContent.
  const hookPool = [...gm.toolkit.hookFormulas, ...gm.immediateContent.hooks];
  const hookStarters = Array.from(new Set(hookPool)).slice(0, 5);
  while (hookStarters.length < 5) {
    hookStarters.push([
      `If you run a [business type] in ${city}, stop doing [common mistake].`,
      `3 reasons [local audience] aren't choosing you yet.`,
      `The ${city} [niche] playbook nobody hands you.`,
      `We took a [client type] from [before] to [after].`,
      `Save this if you [target action] in ${city}.`,
    ][hookStarters.length]);
  }

  const captionPool = gm.toolkit.captionFormulas;
  const captionFrameworks = [
    { name: "PAS", body: captionPool[0] ?? "Problem → Agitate → Solve → CTA. The default for a pain your audience feels." },
    { name: "Local proof", body: captionPool[1] ?? `Hook → mini case study → “we serve ${city}” → CTA.` },
    { name: "The list", body: captionPool[2] ?? "Hook → 3 numbered tips → “which are you trying?” → CTA. Perfect for carousels." },
  ];

  const hookAnatomy = {
    hook: `Stop losing ${city} customers`,
    body: " to a louder feed — three fixes most local owners miss. ",
    cta: `DM “${String(cta).toUpperCase()}”`,
    tail: " for a free look.",
    tags: ["Hook in the first 3 words", "Local specificity", "CTA = a clear next step"],
  };

  const ctaLadder = [
    { stage: "Awareness", line: `“Follow for [${city}] [niche] tips every week.”` },
    { stage: "Consideration", line: "“Save this for when you're ready to [outcome].”" },
    { stage: "Decision", line: `“${gm.category.ctaOptions[0] ?? "DM AUDIT"} for a free 15-min look at your account.”` },
    { stage: "Local urgency", line: `“Booking [month] for ${city} businesses — link in bio.”` },
  ];

  // Hashtag sets: fold the 6 groups into 3 copy-ready blocks.
  const grp = (g: string) => gm.hashtags.find((h) => h.group === g)?.tags ?? [];
  const setLocal = grp("local");
  const setNiche = [...grp("category"), ...grp("audience"), ...grp("authority")];
  const setCommunity = [...grp("branded"), ...grp("test")];
  const hashtagSets = [
    { name: "SET A · LOCAL", tags: tagify(setLocal.length ? setLocal : [(city || "local").replace(/[^a-z0-9]/gi, "").toLowerCase()]) },
    { name: "SET B · NICHE", tags: tagify(setNiche.length ? setNiche : ["smallbusiness", "tips"]) },
    { name: "SET C · COMMUNITY", tags: tagify(setCommunity.length ? setCommunity : ["shoplocal", "supportsmallbiz"]) },
  ];

  return { hookStarters, captionFrameworks, hookAnatomy, ctaLadder, hashtagSets };
}

function buildNarrative(gm: GoldMasterIntelligence, current: number, target: number) {
  const rest = gm.scores.filter((s) => !/overall/i.test(s.dimension));
  const weakest = [...rest].sort((a, b) => a.score - b.score)[0];
  const strongest = [...rest].sort((a, b) => b.score - a.score)[0];
  const topFix = gm.fixes[0];
  const fastWin = gm.fixes.find((f) => f.effort === "low") ?? topFix;
  const handle = `@${gm.meta.handle.replace(/^@/, "")}`;
  const city = gm.meta.city || gm.meta.marketLabel || "your market";
  const weakName = weakest?.dimension ?? "Local visibility";
  const strongName = strongest?.dimension ?? "Competitor gap";

  return {
    cover_lead: `A full diagnostic of <strong style="color:#fff;">${handle}</strong> — where you're invisible, where you're leaking attention, and the exact moves to fix it. Read it in ten minutes. Act on it Monday.`,
    cover_powerline: "A long way from invisible to in-demand — and the climb is faster than you think.",
    hook_headline_unbuilt: 'Not broken — <span style="color:var(--brand-300);">unbuilt.</span>',
    hook_para_1: `The building blocks of a converting Instagram presence are mostly in place — what's missing is the order to do them in. <strong style="color:#fff;">This document is that order.</strong>`,
    hook_para_2: `Your weakest pillar is <strong style="color:var(--danger);">${weakName} at ${weakest?.score ?? 0}</strong>. Fix it first and the score moves more in a week than the rest will move in a month.`,
    hook_cards: [
      { tone: "red", label: "Where you stand", text: `${weakName} is your lowest score — the right people struggle to find or follow you.` },
      { tone: "amber", label: "Where you leak", text: "Visitors arrive, hesitate, and bounce without an obvious next step." },
      { tone: "brand", label: "Where you win", text: `${strongName} is your strongest score — and the gap to competitors is beatable.` },
    ],
    hook_quote: "Something you can act on Monday — not a 60-page deck.",
    dashboard_cards: [
      { tone: "brand", label: "Biggest opportunity", title: topFix?.title ?? "Switch on local visibility", desc: topFix?.whyItMatters ?? "The one lever with the most headroom right now." },
      { tone: "danger", label: "Biggest weakness", title: `${weakName} — <span class="sev-red">${weakest?.score ?? 0}/100</span>`, desc: weakest?.whatWeSaw ?? "The single biggest constraint on your growth right now." },
      { tone: "warning", label: "Fastest win", title: fastWin?.title ?? "Rewrite the bio + pin one post", desc: fastWin?.exactAction ?? "A small, high-leverage fix you can finish today." },
      { tone: "success", label: "30-day target", title: `Power level <span class="sev-green">${current} → ${target}</span>`, desc: `Clear the weakest pillar, a conversion-ready profile, and a repeatable posting rhythm you can keep.` },
    ],
    dashboard_note: "<strong>Read this like a map, not a report card.</strong> The score is a starting coordinate, not a judgement. The fixes are ordered so the earliest moves unlock the rest — clear the bottom rung and every rung above climbs faster.",
    accountability_intro: `A plan with no checkpoint is a wish. Thirty days from today we re-run this exact audit and watch the numbers move. Same five pillars, same scoring — so the progress is undeniable, not a vibe.`,
    accountability_review: `On <strong style="color:#fff;">${shortDate(longDate(gm.meta.reviewDate))}</strong> we'll review: did the weakest pillar climb? Is the profile converting? Is the posting rhythm holding? Then we set the next 30-day target together.`,
    checkpoint_metrics: ["Local visibility", "Profile conversion", "Content cadence", "CTA usage", "Saves · DMs · profile visits"],
    close_headline: "You have the map.<br>Want us to drive?",
    close_lead: `Everything in here is yours to run solo — that's the point. But if you'd rather spend your time on ${city} customers than on captions, we'll execute the whole 30 days for you and report the score on ${shortDate(longDate(gm.meta.reviewDate))}.`,
  };
}

/** Map a GoldMasterIntelligence into the full BLUEPRINT_DATA object. */
export function buildBlueprintData(gm: GoldMasterIntelligence): BlueprintData {
  const overall = gm.scores.find((s) => /overall/i.test(s.dimension));
  const current = overall?.score ?? gm.scores[0]?.score ?? 0;
  const lift = clamp(Math.round((100 - current) * 0.42), 12, 28);
  const target = Math.min(current + lift, 92);

  const preparedDate = longDate(gm.meta.generatedAt);
  const checkpointDate = longDate(gm.meta.reviewDate);
  const city = gm.meta.city || gm.meta.marketLabel || "your area";
  const benchmarkCount = gm.competitors.length;
  const ctaLink = gm.meta.website ? String(gm.meta.website).replace(/^https?:\/\//, "").replace(/\/$/, "") : "link in bio";

  const toolkit = buildToolkit(gm);

  return {
    /* 1 · META */
    client_name: clientDisplayName(gm),
    handle: `@${gm.meta.handle.replace(/^@/, "")}`,
    client_descriptor: titleCase(gm.meta.normalizedCategory),
    city,
    region: regionDisplay(gm),
    cta_link: ctaLink,
    prepared_by: "Steffen deGraaf · BotLogix",
    prepared_date: preparedDate,
    checkpoint_date: checkpointDate,
    checkpoint_short: shortDate(checkpointDate),
    current_score: current,
    target_score: target,
    score_delta: `+${target - current}`,
    profile_stats: { posts: gm.account.postCount, followers: formatFollowers(gm.account.followerCount), following: null },
    profile_bio: gm.account.bio ?? "",

    /* 2 · PILLARS */
    pillars: buildPillars(gm),

    /* 3 · CHAIN */
    chain: buildChain(gm),
    chain_note: (() => {
      const c = buildChain(gm).find((s) => (s as { bottleneck?: boolean }).bottleneck);
      const name = c?.name ?? "Get found";
      return `Attention only flows one way. <strong>Stage 0${c?.n ?? 1} — ${name} — is the bottleneck:</strong> almost nobody reaches the stages after it, so improving them changes little. Fix it first and you raise the ceiling on every stage downstream — which is why the 7-day plan attacks it on Day 1.`;
    })(),

    /* 4 · COMPETITORS & DATA GAPS */
    benchmark_count: benchmarkCount,
    competitors: buildCompetitors(gm),
    cadence_standings: buildCadenceStandings(gm),
    data_gaps: buildDataGaps(gm, benchmarkCount),

    /* 5 · 7-DAY PLAN */
    seven_day_plan: buildSevenDayPlan(gm),
    week1_done_checklist: buildWeek1Checklist(gm),
    week1_score_move: { from: current, to: Math.min(current + Math.round((target - current) * 0.35), target) },

    /* 6 · CALENDAR, CADENCE & RHYTHM */
    calendar: buildCalendar(gm),
    cadence_slots: buildCadenceSlots(gm),
    four_week_arc: [
      { n: 1, name: "Foundation", desc: "Tell people who you help and prove you're real and local. Build the trust floor." },
      { n: 2, name: "Authority", desc: "Teach. Every post leaves them smarter and positions you as the obvious choice." },
      { n: 3, name: "Proof", desc: "Show results. Case studies and testimonials turn interest into belief." },
      { n: 4, name: "Convert", desc: "Make the ask. A clear offer and local urgency turn a warm audience into enquiries.", highlight: true },
    ],
    weekly_workflow: [
      { step: "Sun", label: "Choose topics" },
      { step: "Mon", label: "Publish carousel" },
      { step: "Wed", label: "Publish reel" },
      { step: "Fri", label: "Proof / offer" },
      { step: "Weekly", label: "Check saves · DMs · visits", green: true },
    ],

    /* 7 · TOOLKIT */
    hook_starters: toolkit.hookStarters,
    caption_frameworks: toolkit.captionFrameworks,
    hook_anatomy: toolkit.hookAnatomy,
    cta_ladder: toolkit.ctaLadder,
    hashtag_sets: toolkit.hashtagSets,
    hashtag_how_to: "Mix <strong>~10–15 tags per post</strong> — a few from each set. Rotate them so you never repeat the exact same block, and always include at least three <strong>local</strong> tags to keep feeding your visibility.",

    /* 8 · OFFER & CONTACT */
    offer_paths: [
      { name: "Do it yourself", desc: "Follow the 7-day plan and the calendar. Everything you need is already in these pages." },
      { name: "Done with you", desc: "We build the systems, you make the content. A weekly 30-min working session keeps it on track.", popular: true },
      { name: "Done for you", desc: "We run the full 30 days end to end. You just show up for the founder reels." },
    ],
    contact: { name: "Steffen deGraaf · BotLogix", site: "botlogix.ca · Burlington, Ontario" },

    /* 9 · NARRATIVE */
    narrative: buildNarrative(gm, current, target),
  };
}

/** Render the per-client `auto/data.js` file content (a JS global assignment). */
export function renderBlueprintDataJs(gm: GoldMasterIntelligence): string {
  const data = buildBlueprintData(gm);
  return [
    "/* ============================================================================",
    " * Instagram Growth Blueprint — CLIENT DATA (auto-generated)",
    " * ----------------------------------------------------------------------------",
    ` * Client: ${data.client_name} · ${data.handle}`,
    ` * Generated by the BotLogix IG intelligence engine from audit ${gm.meta.auditId}.`,
    " * Do not hand-edit — regenerate by re-running the intelligence pipeline.",
    " * Field contract: templates/blueprint/docs/Blueprint - Data Schema.md",
    " * ==========================================================================*/",
    "",
    `window.BLUEPRINT_DATA = ${JSON.stringify(data, null, 2)};`,
    "",
  ].join("\n");
}

export interface BlueprintWriteResult {
  blueprintDir: string;
  blueprintHtml: string;
  blueprintPrintHtml: string;
  dataJs: string;
}

/**
 * Write a self-contained, ready-to-open Blueprint for one client into
 * `<outDir>/blueprint/`: copies the fixed template layer (engine, page
 * builders, HTML shells, brand assets) and writes the per-client `auto/data.js`.
 * Open `blueprint/blueprint.html` to view, or `blueprint-print.html` to PDF.
 *
 * `templateDir` defaults to the repo's `templates/blueprint`. Throws only if
 * the template layer is missing (a real install error worth surfacing).
 */
export function writeBlueprint(
  gm: GoldMasterIntelligence,
  outDir: string,
  templateDir = path.resolve("templates", "blueprint"),
): BlueprintWriteResult {
  if (!existsSync(path.join(templateDir, "blueprint.html"))) {
    throw new Error(`Blueprint template missing at ${templateDir} (expected blueprint.html). Vendor templates/blueprint/ first.`);
  }
  const blueprintDir = path.join(outDir, "blueprint");
  // Fresh copy of the fixed layer each run so template fixes propagate.
  rmSync(blueprintDir, { recursive: true, force: true });
  mkdirSync(blueprintDir, { recursive: true });

  // Copy only the runtime files the two HTML shells load (skip docs + example).
  cpSync(path.join(templateDir, "blueprint.html"), path.join(blueprintDir, "blueprint.html"));
  cpSync(path.join(templateDir, "blueprint-print.html"), path.join(blueprintDir, "blueprint-print.html"));
  cpSync(path.join(templateDir, "assets"), path.join(blueprintDir, "assets"), { recursive: true });
  mkdirSync(path.join(blueprintDir, "auto"), { recursive: true });
  for (const f of ["engine.js", "pages-1.js", "pages-2.js", "pages-3.js"]) {
    cpSync(path.join(templateDir, "auto", f), path.join(blueprintDir, "auto", f));
  }

  const dataJs = path.join(blueprintDir, "auto", "data.js");
  writeFileSync(dataJs, renderBlueprintDataJs(gm), "utf-8");

  return {
    blueprintDir,
    blueprintHtml: path.join(blueprintDir, "blueprint.html"),
    blueprintPrintHtml: path.join(blueprintDir, "blueprint-print.html"),
    dataJs,
  };
}
