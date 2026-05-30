/**
 * Gold Master generator — the new intelligence foundation.
 *
 * Pipeline: load data → normalize category/CTA → build competitor search terms
 * → score competitors → assemble structured intelligence (deterministic core)
 * → optionally enrich via OpenRouter → render JSON + Markdown → validate →
 * write artifacts → return result (caller exits non-zero on blocking failure).
 *
 * Runs with NO API key: the deterministic core always produces a complete,
 * non-empty Gold Master from DB data; LLM enrichment is additive and any miss
 * is recorded as a data gap rather than faked.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { assembleReportData, type ReportData } from "../report/reportDataAssembler.js";
import { normalizeCategory } from "../audit/categoryNormalizer.js";
import { ctaForKind, recommendCadence } from "../audit/categoryCopy.js";
import { safeHashtagToken } from "../audit/categoryCopy.js";
import { getClientConfig } from "./clientConfig.js";
import { discoverCompetitors, generateComplementaryTerms } from "./competitorDiscovery.js";
import { buildClientSignature } from "./clientSignature.js";
import { buildLocalSignal } from "./localIntelligence.js";
import { renderGoldMasterMarkdown } from "./goldMasterMarkdown.js";
import { validateGoldMaster, renderValidationReport } from "./validateGoldMaster.js";
import { computeSectionConfidence, overallConfidence } from "./confidence.js";
import { LlmRunLog, runLlmTask, type LlmTask } from "../llm/llmClient.js";
import { isOpenRouterConfigured, getOpenRouterConfig } from "../llm/openRouterClient.js";
import {
  PROMPT_VERSION,
  buildTopFiveMovesPrompt,
  buildNextSevenDaysPrompt,
  buildHashtagStrategyPrompt,
  buildContentToolkitPrompt,
  type PromptClientContext,
} from "./instagramAnalysisPrompts.js";
import type {
  GoldMasterIntelligence,
  ScoreDiagnosis,
  ActionMove,
  DayAction,
  WeekPlan,
  MarketComparison,
  MarketPatterns,
  HashtagGroup,
  ToolkitSection,
  CategoryKind,
  CategoryDiagnosis,
  DataGap,
  EvidenceItem,
} from "./goldMasterSchema.js";

function num(v: number | null | undefined): number {
  return v ?? 0;
}

/** Tokens that mean a stored field was generated from poisoned data. */
const POISON_RE = /none\s*,|undefined|null|NaN|\[object Object\]/i;

/**
 * Coerce an LLM JSON payload to an array. JSON mode (`json_object`) cannot
 * return a bare array, so models wrap it (e.g. {"moves":[…]}). Accept a bare
 * array or the first array-valued property of an object.
 */
function asArray(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    const arr = Object.values(json as Record<string, unknown>).find((v) => Array.isArray(v));
    if (Array.isArray(arr)) return arr;
  }
  return null;
}

/** True only for a primitive string (not an object/array). */
function isStr(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Coerce to a clean string[] — drops objects/arrays so no "[object Object]". */
function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isStr).map((s) => s.trim());
}

/** A move is usable only if all its rendered fields are primitive strings. */
function isCleanMove(m: unknown): m is ActionMove {
  if (!m || typeof m !== "object") return false;
  const o = m as Record<string, unknown>;
  return ["title", "scoreArea", "whyItMatters", "exactAction", "timeRequired", "expectedLift", "evidence"].every((k) => isStr(o[k]));
}

function isCleanDay(d: unknown): d is DayAction {
  if (!d || typeof d !== "object") return false;
  const o = d as Record<string, unknown>;
  return ["objective", "action", "exactInstruction", "outputByEndOfDay", "whyItMatters"].every((k) => isStr(o[k]));
}

/**
 * Sanitize a possibly-poisoned stored free-text field (e.g. target_audience
 * was historically generated from a junk category → "...none,software help..").
 * Returns a clean fallback derived from the category when poisoned/empty.
 */
function cleanAudience(raw: string | null | undefined, category: string): string {
  const v = (raw ?? "").trim();
  if (!v || POISON_RE.test(v)) return `people who need ${category.toLowerCase()}`;
  return v;
}

function dist(d: Record<string, number> | undefined, max = 5): Array<{ label: string; pct: number }> {
  const entries = Object.entries(d ?? {}).filter(([k]) => k && k.toLowerCase() !== "unknown").sort((a, b) => b[1] - a[1]).slice(0, max);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  return entries.map(([label, v]) => ({ label: label.replace(/_/g, " "), pct: Math.round((v / total) * 100) }));
}

function reviewDate(data: ReportData): string {
  const base = data.audit.created_at ? new Date(data.audit.created_at) : new Date();
  const r = new Date(base);
  r.setDate(r.getDate() + 30);
  return r.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

const DIMENSION_META: Record<string, { whyItMatters: string; nextMoveLow: string; nextMoveHigh: string }> = {
  "Profile conversion": { whyItMatters: "A visitor decides in seconds whether to follow or leave.", nextMoveLow: "Rewrite the bio to state who you help, the one offer, and one CTA.", nextMoveHigh: "A/B test the link-in-bio destination and pinned posts." },
  "Content performance": { whyItMatters: "Saves and shares drive reach far more than likes.", nextMoveLow: "Lead posts with a strong first-line hook and a save-worthy takeaway.", nextMoveHigh: "Double down on your best format and cut low performers." },
  "Local visibility": { whyItMatters: "Discovery depends on clear category + location signals.", nextMoveLow: "Add city + category to the name field, captions, and geotags.", nextMoveHigh: "Expand to nearby-market tags and collabs." },
  "Sales readiness": { whyItMatters: "Attention is wasted without an obvious next step.", nextMoveLow: "Add one explicit CTA to every post and a clear link path.", nextMoveHigh: "Add proof posts and a pinned how-to-buy/how-to-start." },
  "Competitor gap": { whyItMatters: "You're judged against active accounts in your space.", nextMoveLow: "Match the market's top format at least once this week.", nextMoveHigh: "Differentiate with a signature format competitors don't use." },
};

function buildScores(data: ReportData): ScoreDiagnosis[] {
  const s = data.scores;
  const firstNote = (key: string): string => {
    const sig = (s.signals?.[key] ?? []).find((x) => x.note && x.note.trim());
    return sig?.note?.slice(0, 140) ?? "Scored from the audit's signal model.";
  };
  const rows: Array<{ dimension: string; score: number; key: string }> = [
    { dimension: "Overall", score: num(s.overall), key: "overall" },
    { dimension: "Profile conversion", score: num(s.profile_conversion), key: "profile_conversion" },
    { dimension: "Content performance", score: num(s.content_performance), key: "content_performance" },
    { dimension: "Local visibility", score: num(s.local_visibility), key: "local_visibility" },
    { dimension: "Sales readiness", score: num(s.sales_readiness), key: "sales_readiness" },
    { dimension: "Competitor gap", score: num(s.competitor_gap), key: "competitor_gap" },
  ];
  return rows.map((r) => {
    const meta = DIMENSION_META[r.dimension];
    return {
      dimension: r.dimension,
      score: r.score,
      whatWeSaw: r.dimension === "Overall" ? "Weighted blend of the five dimensions below." : firstNote(r.key),
      whyItMatters: meta?.whyItMatters ?? "Contributes to overall discoverability and conversion.",
      nextMove: meta ? (r.score < 50 ? meta.nextMoveLow : meta.nextMoveHigh) : "Keep the momentum and measure on day 30.",
    };
  });
}

/** Deterministic, category-aware Five Moves derived from the lowest scores. */
function buildDeterministicFixes(data: ReportData, kind: CategoryKind, category: string): ActionMove[] {
  const cta = ctaForKind(kind);
  const s = data.scores;
  const dims: Array<{ area: string; score: number }> = [
    { area: "Local visibility", score: num(s.local_visibility) },
    { area: "Profile conversion", score: num(s.profile_conversion) },
    { area: "Sales readiness", score: num(s.sales_readiness) },
    { area: "Content performance", score: num(s.content_performance) },
    { area: "Competitor gap", score: num(s.competitor_gap) },
  ].sort((a, b) => a.score - b.score);

  const city = data.reportContext.businessLocation.city || data.reportContext.localMarketLabel;
  const catalog: Record<string, ActionMove> = {
    "Local visibility": {
      title: `Add ${city} + category signals to your profile`,
      impact: "high", effort: "low", scoreArea: "Local visibility",
      whyItMatters: "Instagram needs explicit location + category text to surface you in discovery.",
      exactAction: `Put "${city}" and "${category}" in your name field and first caption line; geotag every post.`,
      timeRequired: "15 min", expectedLift: "+10–15 local visibility", evidence: `Local score is ${num(s.local_visibility)}/100.`,
    },
    "Profile conversion": {
      title: "Rewrite the bio for instant clarity",
      impact: "high", effort: "low", scoreArea: "Profile conversion",
      whyItMatters: "Visitors decide in seconds; an unclear bio loses follows.",
      exactAction: `Bio = what ${category} does + who it's for + one benefit + CTA "${cta.action}".`,
      timeRequired: "15 min", expectedLift: "+8–12 profile conversion", evidence: `Profile score is ${num(s.profile_conversion)}/100.`,
    },
    "Sales readiness": {
      title: `Make the "${cta.action}" path obvious`,
      impact: "high", effort: "low", scoreArea: "Sales readiness",
      whyItMatters: "Attention without a clear next step doesn't convert.",
      exactAction: `End every post with one CTA (${cta.caption}) and pin a how-to-start post.`,
      timeRequired: "20 min", expectedLift: "+8–10 sales readiness", evidence: `Sales score is ${num(s.sales_readiness)}/100.`,
    },
    "Content performance": {
      title: "Lead with hooks, design for saves",
      impact: "high", effort: "medium", scoreArea: "Content performance",
      whyItMatters: "Saves and shares drive reach more than likes.",
      exactAction: "Open posts with a question/number hook; end with a save-worthy tip.",
      timeRequired: "30 min/post", expectedLift: "+10 content performance", evidence: `Content score is ${num(s.content_performance)}/100.`,
    },
    "Competitor gap": {
      title: "Match the market's top format weekly",
      impact: "medium", effort: "medium", scoreArea: "Competitor gap",
      whyItMatters: "You're ranked against active accounts in your category.",
      exactAction: "Publish one post in the market's top-performing format this week.",
      timeRequired: "30 min", expectedLift: "+6–8 competitor gap", evidence: `Competitor score is ${num(s.competitor_gap)}/100.`,
    },
  };
  return dims.map((d) => catalog[d.area]);
}

function buildDeterministicSevenDays(kind: CategoryKind, category: string, city: string): DayAction[] {
  const cta = ctaForKind(kind);
  const mk = (day: number, objective: string, action: string, exact: string, output: string, why: string): DayAction => ({
    day, objective, action, timeEstimate: "15–30 min", exactInstruction: exact, outputByEndOfDay: output, whyItMatters: why,
  });
  return [
    mk(1, "Fix the bio", "Rewrite your bio", `State what ${category} does, who it's for, one benefit, and CTA "${cta.action}".`, "Updated bio live", "First impression drives the follow decision."),
    mk(2, "Set the link path", "Optimize link-in-bio", `Point the link to the single most valuable destination and label it clearly.`, "One clear link path", "A confusing link kills conversion."),
    mk(3, "Save highlights", "Create 3 Story highlights", "Add Services/What-it-does, Proof, and FAQ highlights.", "3 highlights saved", "Highlights answer questions before they're asked."),
    mk(4, "Local/category signal", "Publish a discovery post", `Post a "${city} + ${category}" piece with geotag and city in line 1.`, "1 discovery post live", "Explicit signals power Instagram discovery."),
    mk(5, "Hook practice", "Publish a hook-led post", "Open with a question or number hook; end with a save-worthy tip.", "1 hook-led post", "Hooks decide whether people stop scrolling."),
    mk(6, "Engage locally", "Comment on 5 relevant accounts", "Leave 5 real-sentence comments on category/local accounts.", "5 genuine comments", "Engagement seeds reach and relationships."),
    mk(7, "Measure", "Screenshot insights", "Record profile visits, reach, saves, and DMs for the week.", "Baseline screenshot", "You can't improve what you don't measure."),
  ];
}

function buildSprint(kind: CategoryKind, category: string): WeekPlan[] {
  const cta = ctaForKind(kind);
  return [
    { week: 1, goal: "Fix the foundation", actions: ["Rewrite bio + link path", "Save 3 highlights", "Add city/category signals"], output: "Conversion-ready profile", measure: "Profile visits → follows" },
    { week: 2, goal: "Post with a rhythm", actions: ["Publish 3–4 posts", "Use the market's top format once", "Add hooks + hashtags every post"], output: "Consistent week of content", measure: "Reach + saves per post" },
    { week: 3, goal: "Turn attention into action", actions: [`Add explicit "${cta.action}" CTA to every post`, "Reply to all comments < 2h", "Pin a how-to-start post"], output: "Clear conversion path", measure: "Link taps / DMs" },
    { week: 4, goal: "Measure & prepare review", actions: ["Screenshot 28-day insights", "List top 3 + worst 2 posts", "Note what to stop"], output: "Review-ready data", measure: "Trend vs week-1 baseline" },
  ];
}

function buildMarketComparison(data: ReportData): MarketComparison {
  const cat = data.patterns.category;
  const fs = data.client.feature_summary;
  const ppw = data.reportContext.postsPerWeek ?? null;
  // Market cadence from competitor-gap signal note when present (e.g. "ref=3.62/wk").
  const note = (data.scores.signals?.competitor_gap ?? []).map((s) => s.note ?? "").join(" ");
  const refMatch = note.match(/ref\s*=\s*([\d.]+)\s*\/?\s*wk/i);
  const marketPerWeek = refMatch ? parseFloat(refMatch[1]) : null;
  const cadence = recommendCadence({ postsPerWeek: ppw, marketPerWeek });
  const topFormat = dist(cat.postTypes.distribution, 1)[0]?.label ?? "mixed";
  const yourFormat = dist(fs.post_type_distribution, 1)[0]?.label ?? "—";
  return {
    rows: [
      { metric: "Posts / week", client: ppw != null ? ppw.toFixed(1) : "—", market: marketPerWeek != null ? marketPerWeek.toFixed(1) : "~2+ typical" },
      { metric: "Avg caption length", client: `${Math.round(fs.avg_caption_length)} chars`, market: `${Math.round(cat.caption.avgLength)} chars` },
      { metric: "Avg hashtags / post", client: fs.avg_hashtag_count.toFixed(1), market: cat.hashtags.avgCountPerPost.toFixed(1) },
      { metric: "Top format", client: yourFormat, market: topFormat },
    ],
    activityLevel: cadence.verdict === "refine" ? "Above market volume" : cadence.verdict === "increase" ? "Below market volume" : "On par with market",
    interpretation: `${cadence.headline}. ${cadence.detail}`,
    cadenceVerdict: cadence.verdict,
  };
}

/** Build observed competitor posts from real post-level data for selected accounts. */
function buildObservedPosts(data: ReportData, selectedHandles: Set<string>, kind: CategoryKind): import("./goldMasterSchema.js").ObservedPost[] {
  const out: import("./goldMasterSchema.js").ObservedPost[] = [];
  const adapt = kind === "app" ? "Recreate the angle as a tip that ends in an app-download CTA." : "Recreate the angle in your own voice with your local CTA.";
  for (const c of data.competitors) {
    if (!selectedHandles.has((c.username ?? "").toLowerCase())) continue;
    // Prefer the highest-engagement top post; fall back to latest.
    const top = c.top_posts?.[0];
    const lp = c.latest_post;
    const caption = top?.caption ?? lp?.caption ?? null;
    const postType = top?.post_type ?? lp?.post_type ?? "post";
    if (!caption && !lp) continue;
    const firstLine = caption ? caption.split(/\n|\.\s/)[0].slice(0, 100) : (lp?.hook ?? null);
    out.push({
      account: c.username ?? "(unknown)",
      postType,
      hook: (lp?.hook ?? firstLine ?? "").slice(0, 100) || "(caption captured)",
      date: lp?.posted_at ?? null,
      postUrl: lp?.post_url ?? null,
      captionFirstLine: firstLine,
      thumbnailAvailable: !!lp?.display_url,
      whyItWorks: top?.hook_type === "question" ? "Question hook invites comments and replies." : `Clear ${postType} format that's easy to scan and save.`,
      howToAdapt: adapt,
      evidenceIds: ["competitors.selected"],
    });
    if (out.length >= 6) break;
  }
  return out;
}

/** Derive content mechanics from market hook/format distributions. */
function buildContentMechanics(data: ReportData, kind: CategoryKind): import("./goldMasterSchema.js").ContentMechanic[] {
  const cat = data.patterns.category;
  const topHook = dist(cat.hooks.distribution, 1)[0]?.label;
  const topFormat = dist(cat.postTypes.distribution, 1)[0]?.label;
  const mechanics: import("./goldMasterSchema.js").ContentMechanic[] = [];
  const ctaLine = kind === "app" ? "end on an app-download CTA" : "end on your booking/contact CTA";
  if (topHook) mechanics.push({ pattern: `${topHook} hooks`, whyItWorks: `${topHook} openers are the most common high-performers in this market.`, howToAdapt: `Open posts with a ${topHook} line, then deliver one concrete takeaway.`, examplePostIdea: `A ${topHook}-style hook about your category, then 3 quick points, then ${ctaLine}.`, whatNotToCopy: "Their exact wording or branded creative." });
  if (topFormat) mechanics.push({ pattern: `${topFormat} format`, whyItWorks: `${topFormat} is the market's top-performing format.`, howToAdapt: `Publish at least one ${topFormat} per week in your own style.`, examplePostIdea: `A ${topFormat} showing a before/after or quick how-to, ${ctaLine}.`, whatNotToCopy: "Copying their footage or layout 1:1." });
  return mechanics;
}

function buildMarketPatterns(data: ReportData): MarketPatterns {
  const cat = data.patterns.category;
  return {
    postsStudied: cat.postCount,
    avgCaptionChars: Math.round(cat.caption.avgLength),
    avgHashtags: Number(cat.hashtags.avgCountPerPost.toFixed(1)),
    avgEmojis: cat.caption.avgEmojiCount ? Number(cat.caption.avgEmojiCount.toFixed(1)) : null,
    topFormats: dist(cat.postTypes.distribution),
    hookDistribution: dist(cat.hooks.distribution),
    contentElementDistribution: dist(cat.contentElements.distribution),
  };
}

function buildHashtags(category: string, city: string, kind: CategoryKind): HashtagGroup[] {
  const catToken = safeHashtagToken(category) || "business";
  const cityToken = safeHashtagToken(city);
  const base: HashtagGroup[] = [
    { group: "local", tags: [cityToken, `${cityToken}local`, `${cityToken}business`].filter(Boolean) },
    { group: "category", tags: [catToken.toLowerCase(), `${catToken.toLowerCase()}tips`].filter(Boolean) },
    { group: "audience", tags: ["smallbusiness", "entrepreneur"] },
    { group: "authority", tags: [`${catToken.toLowerCase()}expert`, "howto"] },
    { group: "branded", tags: [] },
    { group: "test", tags: ["reelsinstagram", "instadaily"] },
  ];
  // Strip empties + dedupe.
  return base.map((g) => ({ group: g.group, tags: Array.from(new Set(g.tags.filter((t) => t && t.length <= 28))) }));
}

function buildToolkit(kind: CategoryKind, category: string): ToolkitSection {
  const cta = ctaForKind(kind);
  return {
    hookFormulas: ["The mistake most [audience] make with [topic]", "[Number] things to do before [event]", "Stop doing [bad habit] — do this instead"],
    captionFormulas: ["Hook → 3 quick points → CTA", "Story → lesson → CTA", "Myth → truth → CTA"],
    ctaOptions: cta ? [cta.primary, cta.bioLine, cta.caption] : [],
    reelIdeas: [`A 15s "${category}" tip`, "Before/after transformation", "Common mistake + fix"],
    carouselIdeas: ["5-step how-to", "Checklist people will save", "Myth vs truth"],
    proofIdeas: ["Customer result screenshot", "Before/after", "Testimonial quote card"],
  };
}

function buildCategoryDiagnosis(norm: ReturnType<typeof normalizeCategory>, kind: CategoryKind): CategoryDiagnosis {
  const cta = ctaForKind(kind);
  return {
    normalizedCategory: norm.label,
    categoryKind: kind,
    confidence: norm.source === "raw" ? 90 : norm.source === "inferred" ? 70 : 40,
    source: norm.source === "raw" ? "raw" : norm.source === "inferred" ? "inferred" : "fallback",
    whatItSells: `Products/services in the "${norm.label}" space.`,
    likelyAudience: "People searching for help in this category.",
    contentThatWorks: kind === "app" ? "How-to tips, before/after, and use-case demos that lead to a download." : "Local proof, FAQs, and behind-the-scenes that build trust.",
    ctaType: cta.action,
    ctaOptions: [cta.primary, cta.bioLine, cta.caption, cta.action],
  };
}

export interface GoldMasterResult {
  gm: GoldMasterIntelligence;
  paths: { json: string; md: string; competitorDebug: string; validation: string; runLog: string };
  passed: boolean;
}

export async function generateGoldMaster(
  auditId: number,
  opts: { liveDiscovery?: boolean } = {},
): Promise<GoldMasterResult> {
  // Optional PAID step: run the 4-lane live competitor discovery first so the
  // report is built on freshly-discovered, vetted reference/local rows instead
  // of whatever happened to be in the DB. Gated by the caller (CLI --live).
  if (opts.liveDiscovery) {
    const { discoverAndPersistReferences } = await import("./liveCompetitorDiscovery.js");
    const disc = await discoverAndPersistReferences(auditId);
    console.log(`Live discovery: ${disc.persisted.length} persisted (${disc.status}) across ${disc.apifyRuns} Apify run(s).`);
  }
  const data = await assembleReportData(auditId);
  const ctx = data.reportContext;
  const config = getClientConfig(ctx.handle);
  const log = new LlmRunLog();

  // ── Category + CTA normalization (deterministic; user businessType wins) ──
  // Profile-first: the scraped bio/website/handle drive category inference; the
  // raw IG category is only a weak hint and config.businessType (fixtures/manual
  // override) is preferred only when explicitly supplied.
  const norm = normalizeCategory({
    rawCategory: config.businessType ?? data.audit.business_category,
    bio: data.client.profile?.bio,
    fullName: ctx.businessName,
    handle: ctx.handle,
    website: ctx.websiteUrl ?? data.client.profile?.external_url_in_bio,
  });
  const kind = norm.kind as CategoryKind;

  // ── Category confirmation gate ──
  // Business type is the strongest signal. If it was NOT user-provided AND the
  // inference is only a weak fallback, we flag for human confirmation instead of
  // auto-discovering competitors on a guess (a bad guess poisons everything).
  const businessTypeProvided = !!config.businessType;
  const categoryNeedsConfirmation = !businessTypeProvided && norm.source === "fallback";

  // ── Client content signature (the account's own post themes) ──
  const signature = buildClientSignature(data);

  // ── Competitor discovery (generic, two-track, signature + embeddings + library) ──
  const discovery = await discoverCompetitors(
    {
      auditId,
      handle: ctx.handle,
      businessName: ctx.businessName,
      city: ctx.businessLocation.city || "",
      region: ctx.businessLocation.region || "",
      businessType: config.businessType ?? norm.label,
      normalizedCategory: norm.label,
      categoryKind: kind,
      website: ctx.websiteUrl ?? undefined,
      targetAudience: data.audit.target_audience ?? undefined,
      competitorSeeds: config.competitorSeeds,
      categorySearchTerms: config.categorySearchTerms,
    },
    data.competitors,
    config,
    signature,
  );
  const cards = discovery.selected;
  const debug = discovery.debug;
  const searchTerms = discovery.searchTerms;

  // ── Deterministic core ──
  const audience = cleanAudience(data.audit.target_audience, norm.label);
  const promptCtx: PromptClientContext = {
    handle: ctx.handle, businessName: ctx.businessName, normalizedCategory: norm.label, categoryKind: kind,
    city: ctx.businessLocation.city || "", region: ctx.businessLocation.region || "", marketLabel: ctx.localMarketLabel,
    website: ctx.websiteUrl, bio: data.client.profile?.bio ?? null, targetAudience: audience,
    followerCount: ctx.followerCount, postCount: ctx.postCount, postsPerWeek: ctx.postsPerWeek, overallScore: data.scores.overall,
  };
  const city = ctx.businessLocation.city || ctx.localMarketLabel;

  let fixes = buildDeterministicFixes(data, kind, norm.label);
  let sevenDays = buildDeterministicSevenDays(kind, norm.label, city);
  let hashtags = buildHashtags(norm.label, city, kind);
  let toolkit = buildToolkit(kind, norm.label);
  const dataGaps: DataGap[] = [];

  // ── Optional LLM enrichment (additive; never destructive) ──
  let modelUsed = "deterministic";
  if (isOpenRouterConfigured()) {
    modelUsed = getOpenRouterConfig().modelFast;
    // Array tasks: validate against the unwrapped array AND element shape, so
    // malformed LLM output (nested objects → "[object Object]") is rejected and
    // we keep the deterministic version instead of shipping garbage.
    const ENRICH_MAX_TOKENS = 2500; // cap to prevent runaway generations
    const tryArray = async <T>(task: LlmTask, spec: { system: string; user: string }, minLen: number, clean: (v: unknown) => v is T): Promise<T[] | null> => {
      const r = await runLlmTask({
        task, system: spec.system, user: spec.user, responseFormat: "json", auditId, maxTokens: ENRICH_MAX_TOKENS,
        validate: (resp) => { const a = asArray(resp.json); return !!a && a.length >= minLen && a.slice(0, minLen).every(clean); },
      }, log);
      const a = r ? asArray(r.json) : null;
      return a ? (a.filter(clean) as T[]) : null;
    };
    const tryObject = async <T>(task: LlmTask, spec: { system: string; user: string }): Promise<T | null> => {
      const r = await runLlmTask({ task, system: spec.system, user: spec.user, responseFormat: "json", auditId, maxTokens: ENRICH_MAX_TOKENS, validate: (resp) => !!resp.json && typeof resp.json === "object" }, log);
      return (r?.json as T) ?? null;
    };

    const movesP = buildTopFiveMovesPrompt({ ctx: promptCtx, scoresJson: JSON.stringify(buildScores(data)) });
    const moves = await tryArray<ActionMove>("top_five_moves", movesP, 5, isCleanMove);
    if (moves && moves.length >= 5) fixes = moves.slice(0, 5);
    else dataGaps.push({ area: "Five Moves", severity: "low", detail: "LLM enrichment failed shape validation; used deterministic moves from scores.", recommendedFix: "Inspect llm-run-log.json; deterministic moves remain valid." });

    const daysP = buildNextSevenDaysPrompt({ ctx: promptCtx, movesJson: JSON.stringify(fixes) });
    const days = await tryArray<DayAction>("next_seven_days", daysP, 7, isCleanDay);
    if (days && days.length >= 7) sevenDays = days.slice(0, 7).map((d, i) => ({ ...d, day: typeof d.day === "number" ? d.day : i + 1 }));

    const ht = await tryObject<Record<string, unknown>>("hashtag_strategy", buildHashtagStrategyPrompt({ ctx: promptCtx }));
    if (ht) {
      const groups = (["local", "category", "audience", "authority", "branded", "test"] as const).map((g) => ({ group: g, tags: strArr(ht[g]).map((t) => t.replace(/^#/, "")).filter(Boolean).slice(0, 8) }));
      if (groups.some((g) => g.tags.length > 0)) hashtags = groups;
    }

    const tk = await tryObject<Record<string, unknown>>("content_toolkit", buildContentToolkitPrompt({ ctx: promptCtx }));
    if (tk && typeof tk === "object") {
      // Only accept string[] fields — drop any nested-object garbage.
      const merged: ToolkitSection = {
        hookFormulas: strArr(tk.hookFormulas).length ? strArr(tk.hookFormulas) : toolkit.hookFormulas,
        captionFormulas: strArr(tk.captionFormulas).length ? strArr(tk.captionFormulas) : toolkit.captionFormulas,
        ctaOptions: strArr(tk.ctaOptions).length ? strArr(tk.ctaOptions) : toolkit.ctaOptions,
        reelIdeas: strArr(tk.reelIdeas).length ? strArr(tk.reelIdeas) : toolkit.reelIdeas,
        carouselIdeas: strArr(tk.carouselIdeas).length ? strArr(tk.carouselIdeas) : toolkit.carouselIdeas,
        proofIdeas: strArr(tk.proofIdeas).length ? strArr(tk.proofIdeas) : toolkit.proofIdeas,
      };
      toolkit = merged;
    }
  } else {
    dataGaps.push({ area: "LLM enrichment", severity: "medium", detail: "OPENROUTER_API_KEY not set — report built from deterministic core only.", recommendedFix: "Add OPENROUTER_API_KEY to .env to enable LLM synthesis." });
  }

  if (categoryNeedsConfirmation) {
    dataGaps.push({ area: "Business category", severity: "high", detail: `Category could only be weakly inferred ("${norm.label}") and no business type was provided. Competitor discovery on a guessed category is unreliable.`, recommendedFix: "Provide an explicit businessType in the client input/config, then re-run." });
  }
  if (discovery.discoveryStatus === "not_configured") {
    dataGaps.push({ area: "Competitor discovery", severity: "high", detail: discovery.failureReason ?? "No candidate pool.", recommendedFix: `Run live discovery (Apify) with: ${discovery.referenceSearchTerms.concat(searchTerms).slice(0, 12).join(", ")}.` });
  } else if (cards.length === 0) {
    dataGaps.push({ area: "Competitor relevance", severity: "high", detail: `All ${data.competitors.length} candidates failed the relevance gate (${debug.emptyReason}). ${discovery.librarySeeds.length} vetted seed(s) available from prior audits.`, recommendedFix: `Re-run discovery with: ${discovery.referenceSearchTerms.concat(searchTerms).slice(0, 12).join(", ")}.` });
  } else if (discovery.discoveryStatus === "partial") {
    dataGaps.push({ area: "Competitor coverage", severity: "medium", detail: `Only ${cards.length} relevant competitor(s) selected.`, recommendedFix: `Expand discovery to reference markets (${discovery.referenceSearchTerms.slice(0, 6).join(", ")}).` });
  }

  const cta = ctaForKind(kind);
  const cadence = buildMarketComparison(data);

  // ── Local intelligence layer (success stories + mined local signal) ──
  const complementaryTerms = generateComplementaryTerms(
    { auditId, handle: ctx.handle, businessType: config.businessType ?? norm.label, normalizedCategory: norm.label, categoryKind: kind, city: ctx.businessLocation.city || "" },
    signature.keywords,
  );
  const localPool = data.competitors.filter((c) => c.competitor_type === "local_intel");
  const localSignal = buildLocalSignal(localPool, signature, complementaryTerms, ctx.handle, cards.length);
  // Merge mined local hashtags into the "local" hashtag group (cap 8).
  if (localSignal.localHashtags.length) {
    const localGroup = hashtags.find((g) => g.group === "local");
    if (localGroup) localGroup.tags = Array.from(new Set([...localGroup.tags, ...localSignal.localHashtags])).slice(0, 8);
  }

  // ── Observed posts + content mechanics from real competitor data ──
  const selectedHandles = new Set(cards.map((c) => c.handle.toLowerCase()));
  const observedPosts = buildObservedPosts(data, selectedHandles, kind);
  const contentMechanics = buildContentMechanics(data, kind);
  if (observedPosts.length === 0) {
    dataGaps.push({ area: "Observed competitor posts", severity: "medium", detail: cards.length === 0 ? "No competitors selected, so no posts to observe." : "Selected competitors have no post-level data (caption/url/timestamp) in the dataset.", recommendedFix: "Run competitor post scrape (fields: caption, displayUrl, url, timestamp, type) for the selected handles." });
  }

  // ── Source evidence index ──
  const evidence: EvidenceItem[] = [];
  const ev = (id: string, sourceType: EvidenceItem["sourceType"], label: string, value: string | number | boolean, confidence: number) =>
    evidence.push({ id, sourceType, label, value, confidence });
  ev("cat.source", "profile", "Category inference source", norm.source, norm.source === "raw" ? 90 : norm.source === "inferred" ? 70 : 45);
  if (data.client.profile?.bio) ev("profile.bio", "profile", "Bio present", true, 90);
  ev("profile.followers", "profile", "Follower count", ctx.followerCount ?? 0, ctx.followerCount != null ? 90 : 30);
  ev("score.overall", "score", "Overall score", num(data.scores.overall), 92);
  ev("score.local", "score", "Local visibility score", num(data.scores.local_visibility), 92);
  ev("score.sales", "score", "Sales readiness score", num(data.scores.sales_readiness), 92);
  ev("market.postsStudied", "market_pattern", "Category posts studied", data.patterns.category.postCount, data.patterns.category.postCount > 0 ? 85 : 20);
  ev("market.cadence", "score", "Client posts/week vs market", `${ctx.postsPerWeek?.toFixed(1) ?? "?"}/wk`, ctx.postsPerWeek != null ? 80 : 30);
  ev("competitors.candidates", "competitor", "Competitor candidates found", data.competitors.length, data.competitors.length ? 70 : 20);
  ev("competitors.selected", "competitor", "Competitors selected after relevance gate", cards.length, cards.length ? 80 : 40);

  const gm: GoldMasterIntelligence = {
    meta: {
      auditId, account: ctx.businessName, handle: ctx.handle, website: ctx.websiteUrl,
      rawCategory: data.audit.business_category, normalizedCategory: norm.label, categoryKind: kind,
      marketLabel: ctx.localMarketLabel, city, region: ctx.businessLocation.region || "",
      generatedAt: new Date().toISOString(), reviewDate: reviewDate(data),
      modelUsed, promptVersion: PROMPT_VERSION,
      dataConfidence: norm.source === "raw" ? 85 : norm.source === "inferred" ? 70 : 45,
    },
    account: {
      displayName: ctx.displayName, handle: ctx.handle, bio: data.client.profile?.bio ?? null,
      rawCategory: data.audit.business_category, normalizedBusinessType: norm.label, website: ctx.websiteUrl,
      followerCount: ctx.followerCount, postCount: ctx.postCount, postsPerWeek: ctx.postsPerWeek,
      profileGaps: [
        num(data.scores.profile_conversion) < 60 ? "Bio lacks a clear who/offer/CTA" : "",
        !ctx.websiteUrl ? "No link destination captured" : "",
        num(data.scores.local_visibility) < 50 ? "Missing city/category signals" : "",
      ].filter(Boolean),
      ctaStatus: num(data.scores.sales_readiness) < 50 ? "Weak — no obvious next step" : "Present",
      localSignalStatus: num(data.scores.local_visibility) < 50 ? "Under-labeled for the market" : "Adequate",
    },
    category: buildCategoryDiagnosis(norm, kind),
    scores: buildScores(data),
    fixes,
    nextSevenDays: sevenDays,
    sprint: buildSprint(kind, norm.label),
    marketComparison: cadence,
    marketPatterns: buildMarketPatterns(data),
    competitorDebug: debug,
    competitors: cards,
    localSignal,
    observedPosts,
    contentMechanics,
    visibilityStrategy: [
      { surface: "Name field", recommendation: `Include "${norm.label}" + city for search.` },
      { surface: "Bio", recommendation: `One-line value + CTA "${cta.action}".` },
      { surface: "Captions", recommendation: "City/category in the first line." },
      { surface: "Hashtags", recommendation: "3 local + 3 category tags per post." },
      { surface: kind === "app" ? "App download path" : "Link in bio", recommendation: kind === "app" ? "Make the store/download link the primary link." : "Point to the single highest-value action." },
    ],
    hashtags,
    toolkit,
    aiPrompts: [
      { label: "Daily post", prompt: `Write an Instagram caption for ${ctx.businessName}, a ${norm.label}. Hook in line 1, 3 quick points, end with CTA "${cta.action}".` },
      { label: "Carousel", prompt: `Outline a 5-slide carousel for a ${norm.label} teaching one useful thing to ${promptCtx.targetAudience ?? "our audience"}. End on CTA "${cta.action}".` },
      { label: "Reel", prompt: `Script a 15-second Reel for a ${norm.label}: hook, 3 beats, CTA "${cta.action}".` },
      { label: "FAQ", prompt: `Write an FAQ post answering the top question a ${norm.label} customer asks, ending with "${cta.action}".` },
      { label: "Authority post", prompt: `Write a ${city} + ${norm.label} authority post that builds trust and ends with "${cta.action}".` },
      { label: "CTA post", prompt: `Write a post whose single goal is to get the reader to ${cta.action.toLowerCase()} — no other ask.` },
    ],
    immediateContent: {
      hooks: [
        "The #1 mistake people make with [topic]",
        "Before you [action], read this",
        "[Number] things nobody tells you about [topic]",
        "Save this for your next [event]",
        "Stop doing [X]. Do [Y] instead.",
        "Here's what [audience] always gets wrong",
        "The fastest way to [outcome]",
        "If you only do one thing this week…",
        "[Topic] in 30 seconds",
        "What I wish I knew before [event]",
      ],
      captionTopics: ["A common mistake + fix", "A quick how-to", "A myth vs truth", "A behind-the-scenes", "A customer win", "An FAQ", "A seasonal tip"],
      carouselIdeas: ["5-step checklist", "Before/after", "Myth vs truth"],
      reelIdeas: ["Quick tip", "Transformation", "Common mistake"],
      storyIdeas: ["Poll a question", "Share a tip", "Repost a customer result"],
    },
    quickActions: [
      { when: "today", action: `Update bio with one benefit + CTA "${cta.action}".` },
      { when: "today", action: "Add city + category to your name field." },
      { when: "this_week", action: "Publish one hook-led post and one in the market's top format." },
      { when: "this_week", action: "Save 3 Story highlights (Services, Proof, FAQ)." },
      { when: "this_week", action: "Comment on 5 relevant accounts per day." },
      { when: "this_month", action: "Build a 4-post/week rhythm with hashtags every post." },
      { when: "this_month", action: "Add a pinned how-to-start/how-to-buy post." },
      { when: "this_month", action: "Test one new format and keep the winner." },
      { when: "in_30_days", action: "Screenshot 28-day insights and compare to baseline." },
      { when: "in_30_days", action: "Re-run this audit to measure movement." },
    ],
    measurement: [
      { dayMark: 7, measure: "Profile visits, reach, saves, DMs", goodSign: "Profile visits trending up", adjustIf: "No movement → sharpen hooks + bio" },
      { dayMark: 14, measure: "Saves/shares per post, follower delta", goodSign: "Saves rising on tip posts", adjustIf: "Flat saves → change formats" },
      { dayMark: 30, measure: "All KPIs vs baseline + score re-run", goodSign: "Overall score up 5+", adjustIf: "Stalled → revisit weakest dimension" },
    ],
    day30: {
      bringBack: ["28-day insights screenshots", "Top 3 + worst 2 posts", "Which fixes you completed"],
      whatWeCompare: ["Scores vs baseline", "Cadence + format mix", "Competitor movement"],
      whyMonthlyMatters: "Instagram shifts weekly; a monthly review turns guessing into a system with fresh data and new actions.",
      nextRunCta: "Re-run the audit on your review date to measure what moved.",
    },
    dataGaps,
    evidence,
    sectionConfidence: [],
    overallConfidence: 0,
    validation: { passed: true, blockingCount: 0, warningCount: 0, issues: [] },
  };

  // ── Confidence (evidence-backed; never a blanket 99.9%) ──
  gm.sectionConfidence = computeSectionConfidence(gm, evidence);
  const severeGaps = gm.dataGaps.some((g) => g.severity === "high");
  gm.overallConfidence = overallConfidence(gm.sectionConfidence, severeGaps);

  // ── Render + validate ──
  const markdown = renderGoldMasterMarkdown(gm);
  const summary = validateGoldMaster(gm, markdown, config);
  gm.validation = summary;
  // Re-render so the metadata/validation line reflects the final result.
  const finalMarkdown = renderGoldMasterMarkdown(gm);

  // ── Write artifacts ──
  const outDir = path.resolve("reports", "intelligence", String(auditId));
  mkdirSync(outDir, { recursive: true });
  const paths = {
    json: path.join(outDir, "gold-master.json"),
    md: path.join(outDir, "gold-master.md"),
    competitorDebug: path.join(outDir, "competitor-debug.md"),
    validation: path.join(outDir, "validation-report.md"),
    runLog: path.join(outDir, "llm-run-log.json"),
  };
  writeFileSync(paths.json, JSON.stringify(gm, null, 2), "utf-8");
  writeFileSync(paths.md, finalMarkdown, "utf-8");
  writeFileSync(paths.competitorDebug, renderCompetitorDebug(gm), "utf-8");
  writeFileSync(paths.validation, renderValidationReport(summary, auditId), "utf-8");
  writeFileSync(paths.runLog, JSON.stringify(log.toJSON(), null, 2), "utf-8");

  return { gm, paths, passed: summary.passed };
}

function renderCompetitorDebug(gm: GoldMasterIntelligence): string {
  const d = gm.competitorDebug;
  const rows = (list: typeof d.selected) => list.map((x) => `| @${x.handle} | ${x.track} | ${x.code} | ${x.categoryMatchScore} | ${x.contentMatchScore} | ${x.embeddingScore ?? "—"} | ${x.followerBandFit} | ${x.successScore} | ${x.confidenceScore} | ${x.reason} |`).join("\n");
  const head = "| Handle | Track | Code | Cat | Content | Semantic | Band | Success | Conf | Reason |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |";
  return `# Competitor Discovery Debug — audit ${gm.meta.auditId}

**Category:** ${gm.meta.normalizedCategory}
**Search terms used:** ${d.searchTermsUsed.join(", ") || "—"}
**Candidates found:** ${d.candidatesFound} · **Selected:** ${d.selected.length} · **Rejected:** ${d.rejected.length}
**Empty reason:** ${d.emptyReason ?? "none"}

## Selected
${d.selected.length ? head + "\n" + rows(d.selected) : "_None selected._"}

## Rejected
${d.rejected.length ? head + "\n" + rows(d.rejected) : "_None rejected._"}

## Recommended next search terms
${d.recommendedSearchTerms.map((t) => `- ${t}`).join("\n")}
`;
}
