/**
 * Competitor relevance scoring.
 *
 * Discovery casts a wide net and (when the seed category was junk) drags in
 * irrelevant accounts — musicians, tattoo artists, event pages. This module is
 * the gate that decides which discovered accounts are credible enough to show
 * a client, and records a human-readable reason for every keep/reject.
 *
 * The board should never show an obviously-irrelevant account. When nothing
 * clears the bar, the caller renders a clean "no strong matches" state — that
 * is more trustworthy than padding the page with noise.
 */

import type { ReportCompetitor } from "../report/reportDataAssembler.js";
import type { CategoryKind } from "../audit/categoryNormalizer.js";

export type SelectionReasonCode =
  | "selected_category_match"
  | "selected_location_match"
  | "selected_keyword_match"
  | "selected_recent_activity"
  | "rejected_category_mismatch"
  | "rejected_location_only_but_wrong_industry"
  | "rejected_random_high_follower_account"
  | "rejected_missing_relevance"
  | "rejected_known_invalid";

export interface RelevanceResult {
  /** -100..100. >= keepThreshold is shown. */
  score: number;
  keep: boolean;
  /** Machine-readable code for logs/debug reports. */
  code: SelectionReasonCode;
  /** Human-readable explanation. */
  reason: string;
}

/**
 * Handles confirmed by review to be invalid for this product, regardless of
 * score (poisoned-discovery leftovers + a building-products brand that is not a
 * moving/home-inventory peer). Lowercased, no @.
 */
const KNOWN_INVALID_HANDLES = new Set([
  "fredagainagainagainagainagain",
  "none_like_mine",
  "none_tattooer",
  "windsorone",
  "devwindsor",
]);

/** Expose for validation layers that scan rendered output. */
export function isKnownInvalidHandle(handle: string | null | undefined): boolean {
  return KNOWN_INVALID_HANDLES.has((handle ?? "").replace(/^@/, "").toLowerCase());
}

/** Category buckets → the keyword vocabulary that signals a real match. */
const RELEVANCE_KEYWORDS: Record<string, string[]> = {
  moving: ["moving", "movers", "mover", "relocation", "pack", "packing", "box", "boxes", "declutter", "organize", "organizing", "organisation", "organization", "storage", "tidy", "home", "household", "apartment", "condo", "renter", "homeowner", "move"],
  app: ["app", "ios", "android", "download", "tech", "startup", "saas", "software", "digital", "platform", "tool"],
  service: ["service", "local", "pro", "professional", "company", "studio", "clinic", "shop"],
};

/** Hard-reject vocabulary: clearly outside any plausible business reference. */
const REJECT_KEYWORDS: Array<{ term: string; label: string }> = [
  { term: "tattoo", label: "tattoo artist" },
  { term: "tattooer", label: "tattoo artist" },
  { term: "musician", label: "musician" },
  { term: "dj ", label: "DJ / music" },
  { term: "rapper", label: "musician" },
  { term: "band", label: "music band" },
  { term: "concert", label: "music/events" },
  { term: "tour dates", label: "music/events" },
  { term: "artist管理", label: "artist" },
  { term: "nightclub", label: "nightlife" },
  { term: "onlyfans", label: "adult creator" },
  { term: "model", label: "personal/model account" },
];

/** Handles that are tell-tale junk from a poisoned "none,*" discovery query. */
const SUSPICIOUS_HANDLE = /(^|_)none(_|$)|fredagain|tattoo|_dj_|official(dj|band)/i;

function haystackOf(comp: ReportCompetitor): string {
  return [comp.full_name, comp.username, comp.bio, comp.category, comp.geographic_market]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function vocabularyFor(kind: CategoryKind, categoryLabel: string): string[] {
  const label = categoryLabel.toLowerCase();
  const vocab = new Set<string>();
  if (/mov|box|storage|organi|home|pack|declutter/.test(label)) {
    RELEVANCE_KEYWORDS.moving.forEach((t) => vocab.add(t));
  }
  if (kind === "app") RELEVANCE_KEYWORDS.app.forEach((t) => vocab.add(t));
  if (kind === "service" || kind === "professional" || kind === "retail") {
    RELEVANCE_KEYWORDS.service.forEach((t) => vocab.add(t));
  }
  // Always include the meaningful words of the category label itself.
  label
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4 && !["app", "software", "business", "local"].includes(w))
    .forEach((w) => vocab.add(w));
  return [...vocab];
}

/**
 * Score one discovered competitor against the client's category.
 *
 * @param categoryLabel normalized client category label
 * @param kind          coarse category bucket
 * @param keepThreshold minimum score to show (default 10)
 */
export function scoreCompetitorRelevance(
  comp: ReportCompetitor,
  categoryLabel: string,
  kind: CategoryKind,
  keepThreshold = 10,
): RelevanceResult {
  const hay = haystackOf(comp);

  // 0) Known-invalid handles — confirmed by review, reject regardless of score.
  if (isKnownInvalidHandle(comp.username)) {
    return { score: -100, keep: false, code: "rejected_known_invalid", reason: `Rejected — known invalid account for this category (@${comp.username})` };
  }

  // 1) Hard rejects — clearly off-topic creator/personal accounts.
  for (const { term, label } of REJECT_KEYWORDS) {
    if (hay.includes(term)) {
      return { score: -100, keep: false, code: "rejected_category_mismatch", reason: `Rejected — category mismatch: ${label}` };
    }
  }
  if (SUSPICIOUS_HANDLE.test(comp.username ?? "")) {
    return { score: -80, keep: false, code: "rejected_category_mismatch", reason: "Rejected — handle pattern from a low-quality discovery match" };
  }

  // 2) Keyword overlap with the category vocabulary.
  const vocab = vocabularyFor(kind, categoryLabel);
  const matched = vocab.filter((t) => hay.includes(t));
  let score = matched.length * 12;

  // 3) Activity / substance signals (only additive, never the sole reason).
  const hasActivity = !!comp.latest_post?.posted_at;
  const highFollowers = comp.follower_count != null && comp.follower_count >= 1000;
  if (highFollowers) score += 6;
  if (hasActivity) score += 6;
  if ((comp.top_posts?.length ?? 0) > 0) score += 4;
  if (comp.profile_pic_url) score += 2;

  const keep = score >= keepThreshold;
  if (keep) {
    const why = matched.slice(0, 3).join(", ");
    const code: SelectionReasonCode = matched.length > 0
      ? "selected_category_match"
      : hasActivity
        ? "selected_recent_activity"
        : "selected_keyword_match";
    return {
      score,
      keep,
      code,
      reason: why ? `Selected — matches category signals: ${why}` : "Selected — active account in the target market",
    };
  }
  // Rejected — distinguish "wrong industry but big" from "no signal at all".
  if (matched.length === 0 && highFollowers) {
    return { score, keep, code: "rejected_random_high_follower_account", reason: "Rejected — high follower count but no category relevance" };
  }
  if (matched.length === 0) {
    return { score, keep, code: "rejected_missing_relevance", reason: "Rejected — no category keyword overlap" };
  }
  return { score, keep, code: "rejected_location_only_but_wrong_industry", reason: `Weak match — only minor overlap (${matched.slice(0, 2).join(", ")})` };
}

export interface FilteredCompetitors<T> {
  kept: Array<T & { relevance: RelevanceResult }>;
  rejected: Array<{ username: string | null; code: SelectionReasonCode; reason: string; score: number }>;
}

/**
 * Partition competitors into kept/rejected with reasons. Logs the decision
 * table for debug/admin visibility.
 */
export function filterByRelevance(
  comps: ReportCompetitor[],
  categoryLabel: string,
  kind: CategoryKind,
  keepThreshold = 10,
): FilteredCompetitors<ReportCompetitor> {
  const kept: Array<ReportCompetitor & { relevance: RelevanceResult }> = [];
  const rejected: Array<{ username: string | null; code: SelectionReasonCode; reason: string; score: number }> = [];
  for (const comp of comps) {
    const relevance = scoreCompetitorRelevance(comp, categoryLabel, kind, keepThreshold);
    if (relevance.keep) kept.push({ ...comp, relevance });
    else rejected.push({ username: comp.username, code: relevance.code, reason: relevance.reason, score: relevance.score });
  }
  kept.sort((a, b) => b.relevance.score - a.relevance.score);
  console.log(
    `[competitor-relevance] "${categoryLabel}" → kept ${kept.length}/${comps.length}`,
  );
  for (const k of kept) console.log(`  ✓ @${k.username} [${k.relevance.code}] ${k.relevance.reason}`);
  for (const r of rejected) console.log(`  ✗ @${r.username} [${r.code}] ${r.reason}`);
  return { kept, rejected };
}
