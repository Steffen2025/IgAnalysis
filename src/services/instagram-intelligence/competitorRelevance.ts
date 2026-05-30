/**
 * Competitor relevance engine (intelligence pipeline).
 *
 * Two-track, signature-aware, band-aware scoring:
 *   - LOCAL track  → same-city peers, recency-weighted, NO follower gate.
 *   - REFERENCE track → aspirational accounts, follower-band HARD gate
 *     (successful-but-reachable), engagement/recency weighted, location optional.
 *
 * Relevance blends (best available):
 *   semantic embedding similarity  (primary, when provided)
 *   category keyword overlap
 *   client content-signature overlap (the client's own post themes)
 *
 * Everything is config-driven; no client-specific logic is baked in here.
 */

import type { ReportCompetitor } from "../report/reportDataAssembler.js";
import type {
  CompetitorCard,
  CompetitorDebug,
  CompetitorDecision,
  CompetitorTrack,
  SelectionReasonCode,
} from "./goldMasterSchema.js";
import type { ClientConfig } from "./clientConfig.js";
import type { ClientSignature } from "./clientSignature.js";
import { contentOverlapScore } from "./clientSignature.js";
import {
  followerBandFit,
  inReferenceBand,
  referenceFollowerBand,
  type FollowerBand,
} from "./referenceConfig.js";

export interface RelevanceContext {
  categoryLabel: string;
  categoryKind: string;
  city: string;
  /** Lowercased category keyword vocabulary (from search terms + label). */
  vocabulary: string[];
  config: ClientConfig;
  /** Client content signature for overlap scoring. */
  signature?: ClientSignature;
  /** handle → semantic similarity 0..100 (embeddings). Optional. */
  embeddingScores?: Map<string, number>;
  /** Follower band for reference-model gating. */
  band?: FollowerBand;
}

const GLOBAL_REJECT_TERMS: Array<{ term: string; label: string }> = [
  { term: "tattoo", label: "tattoo artist" },
  { term: "musician", label: "musician" },
  { term: "rapper", label: "musician" },
  { term: "band", label: "music band" },
  { term: "dj ", label: "DJ / music" },
  { term: "concert", label: "music/events" },
  { term: "nightclub", label: "nightlife" },
  { term: "onlyfans", label: "adult creator" },
];

function haystack(c: ReportCompetitor): string {
  return [c.full_name, c.username, c.bio, c.category, c.geographic_market]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function daysSince(date: string | null | undefined): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function avgEngagement(c: ReportCompetitor): number {
  const rates = (c.top_posts ?? []).map((p) => p.engagement_rate ?? 0).filter((r) => r > 0);
  if (rates.length === 0) return 0;
  const mean = rates.reduce((s, r) => s + r, 0) / rates.length;
  return Math.min(100, Math.round(mean * 1000)); // ~0.05 rate → 50
}

/**
 * "Doing well" score — the bar for inclusion isn't follower count, it's whether
 * the account is genuinely succeeding at spreading its message: strong
 * engagement, recent activity, and a real posting history. This lets a 30k
 * account that's winning outrank a sleepy 90k one.
 */
function successScoreOf(c: ReportCompetitor, recencyScore: number): number {
  const engagement = avgEngagement(c);                      // 0..100
  const consistency = Math.min(100, ((c.post_count ?? 0) / 300) * 100); // depth of history
  // Engagement dominates; recency + consistency confirm the account is alive.
  return Math.round(0.55 * engagement + 0.25 * recencyScore + 0.2 * consistency);
}

export function scoreCandidate(c: ReportCompetitor, ctx: RelevanceContext, track: CompetitorTrack): CompetitorDecision {
  const hay = haystack(c);
  const handle = (c.username ?? "").toLowerCase();
  const invalid = new Set((ctx.config.knownInvalidHandles ?? []).map((h) => h.toLowerCase()));
  const band = ctx.band ?? referenceFollowerBand();

  const embeddingScore = ctx.embeddingScores?.get(handle) ?? null;
  const content = ctx.signature ? contentOverlapScore(hay, ctx.signature) : { score: 0, matched: [] as string[] };
  const matched = ctx.vocabulary.filter((t) => t && hay.includes(t));
  const categoryMatchScore = Math.min(100, matched.length * 25);
  const cityLower = ctx.city.toLowerCase();
  const locationMatchScore = cityLower && hay.includes(cityLower) ? 60 : 0;
  const age = daysSince(c.latest_post?.posted_at);
  const recencyScore = age == null ? 0 : age <= 14 ? 100 : age <= 45 ? 60 : age <= 120 ? 30 : 10;
  const bandFit = followerBandFit(c.follower_count, band);
  const successScore = successScoreOf(c, recencyScore);

  const base = (code: SelectionReasonCode, reason: string, conf = 0): CompetitorDecision => ({
    handle: c.username ?? "(unknown)",
    track,
    code,
    reason,
    categoryMatchScore,
    contentMatchScore: content.score,
    locationMatchScore,
    recencyScore,
    embeddingScore,
    followerBandFit: bandFit,
    successScore,
    confidenceScore: conf,
  });

  // 0) Known-invalid for this client.
  if (invalid.has(handle)) return base("rejected_known_invalid", `Known invalid account for this client (@${handle})`);

  // 1) Reject wrong industries.
  const rejectTerms = [...GLOBAL_REJECT_TERMS, ...(ctx.config.rejectIndustries ?? []).map((t) => ({ term: t.toLowerCase(), label: t }))];
  for (const { term, label } of rejectTerms) {
    if (term && hay.includes(term)) return base("rejected_category_mismatch", `Category mismatch: ${label}`);
  }

  // Relevance core — semantic primary, else keyword+content blend.
  const relevanceCore = embeddingScore != null
    ? Math.round(0.65 * embeddingScore + 0.35 * Math.max(categoryMatchScore, content.score))
    : Math.round(0.6 * categoryMatchScore + 0.4 * content.score);

  // 2) Reference track: enforce the follower band BEFORE accepting.
  if (track === "reference") {
    const bandState = inReferenceBand(c.follower_count, band);
    if (bandState === "out") {
      const why = (c.follower_count ?? 0) > band.max ? "above" : "below";
      return base("rejected_followers_out_of_band", `Followers ${c.follower_count ?? "?"} ${why} the ${band.min}-${band.max} study band`);
    }
    if (bandState === "unknown") {
      return base("rejected_insufficient_data", "Follower count unavailable — cannot confirm it's a proven account");
    }
  }

  // 3) Must be on-topic.
  if (relevanceCore === 0) {
    if ((c.follower_count ?? 0) >= 5000) return base("rejected_random_high_follower_account", "High followers but no category/content relevance");
    if (locationMatchScore > 0) return base("rejected_location_only_but_wrong_industry", "Location matches but industry does not");
    return base("rejected_missing_relevance", "No category or content overlap");
  }

  // 4) Track-specific confidence blend. Reference models are judged heavily on
  // "doing well" (successScore); local peers on relevance + proximity + freshness.
  let confidenceScore: number;
  if (track === "reference") {
    confidenceScore = Math.round(relevanceCore * 0.45 + successScore * 0.3 + bandFit * 0.15 + (c.profile_pic_url ? 5 : 0));
  } else {
    confidenceScore = Math.round(relevanceCore * 0.5 + locationMatchScore * 0.2 + recencyScore * 0.2 + (c.profile_pic_url ? 10 : 0));
  }

  if (confidenceScore < 25) return base("rejected_low_confidence", `Low confidence (${confidenceScore})`, confidenceScore);

  // 5) Pick a positive reason code.
  let code: SelectionReasonCode;
  if (track === "reference") code = "selected_reference_model";
  else if (embeddingScore != null && embeddingScore >= 55) code = "selected_category_match";
  else if (content.score > 0 && content.score >= categoryMatchScore) code = "selected_content_overlap";
  else if (locationMatchScore > 0) code = "selected_location_match";
  else if (recencyScore >= 60) code = "selected_recent_activity";
  else code = "selected_category_match";

  const signals = [
    matched.length ? `category: ${matched.slice(0, 2).join(", ")}` : "",
    content.matched.length ? `content: ${content.matched.slice(0, 2).join(", ")}` : "",
    embeddingScore != null ? `semantic ${embeddingScore}` : "",
    track === "reference" ? `${c.follower_count ?? "?"} followers (in band), success ${successScore}` : "",
  ].filter(Boolean).join("; ");
  return base(code, signals || "Relevant, active account", confidenceScore);
}

function activityStatus(date: string | null | undefined): string {
  const age = daysSince(date);
  if (age == null) return "unknown";
  if (age <= 7) return "fresh";
  if (age <= 21) return "active";
  if (age <= 45) return "cooling";
  return "stale";
}

function toCard(c: ReportCompetitor, decision: CompetitorDecision): CompetitorCard {
  const top = c.top_posts?.[0];
  return {
    handle: c.username ?? "(unknown)",
    displayName: c.full_name?.trim() || `@${c.username}`,
    type: decision.track,
    followers: c.follower_count,
    posts: c.post_count,
    profileImageAvailable: !!c.profile_pic_url,
    latestPostAvailable: !!c.latest_post,
    latestPostDate: c.latest_post?.posted_at ?? null,
    activityStatus: activityStatus(c.latest_post?.posted_at),
    latestPostType: c.latest_post?.post_type ?? top?.post_type ?? null,
    latestPostHook: c.latest_post?.hook ?? c.latest_post?.caption?.slice(0, 90) ?? null,
    whySelected: decision.reason,
    borrow: `Their ${top?.post_type ?? "format"} + ${top?.hook_type ?? "hook"} structure — rewrite in your own voice.`,
    avoid: "Copying their exact creative or captions word-for-word.",
  };
}

export interface RelevanceOutput {
  cards: CompetitorCard[];
  debug: CompetitorDebug;
}

/** Live-discovery sources are already vetted for relevance + success. */
function isTrusted(c: ReportCompetitor): boolean {
  return c.source === "reference_search" || c.source === "hashtag_discovery";
}

/**
 * Two-track evaluation. `comps` is the full candidate pool; each candidate is
 * routed to local or reference based on its competitor_type, then scored with
 * that track's rules.
 *
 * Trusted rows (persisted by live discovery, which already applied an
 * engagement-success + relevance + soft-band gate) are believed: their
 * classification and success score flow straight through, with only the hard
 * safety rejects (known-invalid / wrong-industry) still able to drop them. This
 * keeps the report's competitor section in lockstep with what discovery found,
 * instead of re-deriving it with a stricter keyword gate that silently dropped
 * valid reference models. When NO trusted rows exist (legacy audits, offline
 * fixtures), the generic gate runs unchanged over the full pool.
 */
export function evaluateCompetitors(
  comps: ReportCompetitor[],
  ctx: RelevanceContext,
  searchTermsUsed: string[],
  maxCards = 6,
): RelevanceOutput {
  const trusted = comps.filter(isTrusted);
  const trustClassification = trusted.length > 0;
  // With trusted rows present, evaluate ONLY them — legacy/unvetted rows from
  // older runs are excluded so off-category leftovers can't leak into the report.
  const pool = trustClassification ? trusted : comps;

  const selected: CompetitorDecision[] = [];
  const rejected: CompetitorDecision[] = [];
  const picked: Array<{ card: CompetitorCard; track: CompetitorTrack; conf: number }> = [];

  for (const c of pool) {
    const track: CompetitorTrack = c.competitor_type === "reference_model" ? "reference" : "local";
    const decision = scoreCandidate(c, ctx, track);
    let finalDecision = decision;

    if (trustClassification) {
      // Hard safety rejects still win; otherwise believe the discovery verdict
      // and ALWAYS rank by the persisted success score so trusted rows share one
      // scale (mixing recomputed + persisted confidence corrupts the ordering).
      const hardReject = decision.code === "rejected_known_invalid" || decision.code === "rejected_category_mismatch";
      if (!hardReject) {
        const isSel = decision.code.startsWith("selected");
        finalDecision = {
          ...decision,
          code: isSel ? decision.code : (track === "reference" ? "selected_reference_model" : "selected_category_match"),
          confidenceScore: c.confidence_score ?? decision.confidenceScore,
          reason: isSel ? decision.reason : `Vetted by live discovery (success ${c.confidence_score ?? decision.successScore})`,
        };
      }
    }

    if (finalDecision.code.startsWith("selected")) {
      selected.push(finalDecision);
      picked.push({ card: toCard(c, finalDecision), track, conf: finalDecision.confidenceScore });
    } else {
      rejected.push(finalDecision);
    }
  }

  selected.sort((a, b) => b.confidenceScore - a.confidenceScore);

  let emptyReason: CompetitorDebug["emptyReason"] = "none";
  if (selected.length === 0) {
    if (comps.length === 0) emptyReason = "search_problem";
    else if (rejected.every((r) => r.recencyScore === 0)) emptyReason = "data_problem";
    else emptyReason = "relevance_filter";
  }

  const debug: CompetitorDebug = {
    searchTermsUsed,
    candidatesFound: comps.length,
    selected,
    rejected,
    emptyReason,
    recommendedSearchTerms: ctx.config.categorySearchTerms ?? ctx.vocabulary.slice(0, 16),
  };

  // Rank by confidence (success), but guarantee reference models aren't buried:
  // reserve up to half the slots for references when any were selected.
  const refs = picked.filter((p) => p.track === "reference").sort((a, b) => b.conf - a.conf);
  const locals = picked.filter((p) => p.track === "local").sort((a, b) => b.conf - a.conf);
  const refQuota = Math.min(refs.length, Math.ceil(maxCards / 2));
  const chosen = [...refs.slice(0, refQuota), ...locals]
    .concat(refs.slice(refQuota))
    .slice(0, maxCards)
    .sort((a, b) => b.conf - a.conf);
  const cards = chosen.map((p) => p.card);
  return { cards, debug };
}
