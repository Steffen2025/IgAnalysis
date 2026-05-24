import { eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { competitor_posts, competitors, posts } from "../../../db/schema.js";
import { signal, tallyScore, type ScoreResult } from "../types.js";

export const W = {
  POSTING_FREQUENCY_RATIO: 25,
  ENGAGEMENT_RATE_RATIO: 25,
  FORMAT_VARIETY_RATIO: 15,
  CAPTION_LENGTH_RATIO: 10,
  CTA_USAGE_RATIO: 15,
  HASHTAG_RECIPE_ADHERENCE: 10,
} as const;

const DAY_MS = 24 * 3600 * 1000;
const RECIPE_TOTAL_TARGET = 9; // mid-point of 8–10

interface Metrics {
  postsPerWeek: number;
  avgEngagementRate: number; // 0–1 fraction
  distinctFormats: number;
  avgCaptionLen: number;
  ctaRate: number; // 0–1
  avgHashtagsPerPost: number;
}

function parseJsonArray(blob: string | null | undefined): unknown[] {
  if (!blob) return [];
  try {
    const a = JSON.parse(blob);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function metricsForClient(auditId: number): Metrics | null {
  const all = db.select().from(posts).where(eq(posts.audit_id, auditId)).all();
  if (all.length === 0) return null;
  return aggregate(
    all.map((p) => ({
      posted_at: p.posted_at,
      post_type: p.post_type,
      caption: p.caption ?? "",
      has_cta: !!p.has_cta,
      engagement_rate: p.engagement_rate,
      hashtags: p.hashtags,
    })),
  );
}

function metricsForReferenceModels(auditId: number): Metrics | null {
  const refIds = db
    .select({ id: competitors.id })
    .from(competitors)
    .where(eq(competitors.audit_id, auditId))
    .all()
    .filter((r) => r) // already filtered below in query
    ;
  const refRows = db
    .select()
    .from(competitors)
    .where(eq(competitors.audit_id, auditId))
    .all()
    .filter((c) => c.competitor_type === "reference_model");
  if (refRows.length === 0) return null;

  const allPosts: {
    posted_at: string | null;
    post_type: string | null;
    caption: string;
    has_cta: boolean;
    engagement_rate: number | null;
    hashtags: string | null;
  }[] = [];
  for (const r of refRows) {
    const cp = db
      .select()
      .from(competitor_posts)
      .where(eq(competitor_posts.competitor_id, r.id))
      .all();
    for (const p of cp) {
      allPosts.push({
        posted_at: p.posted_at,
        post_type: p.post_type,
        caption: p.caption ?? "",
        has_cta: !!p.has_cta,
        engagement_rate: p.engagement_rate,
        hashtags: p.hashtags,
      });
    }
  }
  if (allPosts.length === 0) return null;
  void refIds;
  // For posting frequency, average per-competitor rate to avoid 6× weighting
  // against a single client. Engagement etc. averaged over all posts is fine.
  const perComp: number[] = [];
  for (const r of refRows) {
    const cp = db
      .select({ posted_at: competitor_posts.posted_at })
      .from(competitor_posts)
      .where(eq(competitor_posts.competitor_id, r.id))
      .all();
    const cutoff = Date.now() - 30 * DAY_MS;
    const recent = cp
      .map((x) => (x.posted_at ? new Date(x.posted_at).getTime() : NaN))
      .filter((t) => Number.isFinite(t) && t >= cutoff).length;
    perComp.push(recent / (30 / 7));
  }
  const agg = aggregate(allPosts);
  // Replace postsPerWeek with the per-competitor average.
  agg.postsPerWeek = perComp.length
    ? perComp.reduce((s, x) => s + x, 0) / perComp.length
    : agg.postsPerWeek;
  return agg;
}

function aggregate(
  rows: {
    posted_at: string | null;
    post_type: string | null;
    caption: string;
    has_cta: boolean;
    engagement_rate: number | null;
    hashtags: string | null;
  }[],
): Metrics {
  const cutoff = Date.now() - 30 * DAY_MS;
  const recentCount = rows
    .map((r) => (r.posted_at ? new Date(r.posted_at).getTime() : NaN))
    .filter((t) => Number.isFinite(t) && t >= cutoff).length;
  const postsPerWeek = recentCount / (30 / 7);

  const eng = rows
    .map((r) => r.engagement_rate)
    .filter((r): r is number => typeof r === "number" && Number.isFinite(r) && r >= 0);
  const avgEngagementRate = eng.length ? eng.reduce((s, r) => s + r, 0) / eng.length : 0;

  const distinctFormats = new Set(rows.map((r) => r.post_type).filter(Boolean)).size;

  const avgCaptionLen = rows.reduce((s, r) => s + r.caption.length, 0) / rows.length;

  const ctaRate = rows.filter((r) => r.has_cta).length / rows.length;

  const totalTags = rows.reduce(
    (s, r) => s + parseJsonArray(r.hashtags).length,
    0,
  );
  const avgHashtagsPerPost = totalTags / rows.length;

  return {
    postsPerWeek,
    avgEngagementRate,
    distinctFormats,
    avgCaptionLen,
    ctaRate,
    avgHashtagsPerPost,
  };
}

function ratioEarned(client: number, ref: number, weight: number): number {
  if (ref <= 0) return weight; // no reference benchmark, treat as full
  const ratio = Math.min(1, client / ref);
  return weight * ratio;
}

export function scoreCompetitorGap(auditId: number): ScoreResult {
  const clientM = metricsForClient(auditId);
  const refM = metricsForReferenceModels(auditId);

  if (!refM) {
    return {
      score: null,
      maxPossible: 100,
      signals: [],
      explanation: "Score not applicable — no reference competitors scraped.",
      computedAt: new Date(),
    };
  }
  if (!clientM) {
    return {
      score: 0,
      maxPossible: 100,
      signals: [],
      explanation: "No client posts to compare against reference models.",
      computedAt: new Date(),
    };
  }

  const signals = [];

  // Posting frequency
  const pfEarned = ratioEarned(clientM.postsPerWeek, refM.postsPerWeek, W.POSTING_FREQUENCY_RATIO);
  signals.push(
    signal(
      "posting_frequency_ratio",
      "Posting frequency vs reference average",
      clientM.postsPerWeek >= refM.postsPerWeek,
      Number((clientM.postsPerWeek / Math.max(0.0001, refM.postsPerWeek)).toFixed(2)),
      W.POSTING_FREQUENCY_RATIO,
      pfEarned,
      `client=${clientM.postsPerWeek.toFixed(2)}/wk  ref=${refM.postsPerWeek.toFixed(2)}/wk`,
    ),
  );

  // Engagement rate
  const erEarned = ratioEarned(clientM.avgEngagementRate, refM.avgEngagementRate, W.ENGAGEMENT_RATE_RATIO);
  signals.push(
    signal(
      "engagement_rate_ratio",
      "Engagement rate vs reference average",
      clientM.avgEngagementRate >= refM.avgEngagementRate,
      Number((clientM.avgEngagementRate / Math.max(0.0000001, refM.avgEngagementRate)).toFixed(2)),
      W.ENGAGEMENT_RATE_RATIO,
      erEarned,
      `client=${(clientM.avgEngagementRate * 100).toFixed(2)}%  ref=${(refM.avgEngagementRate * 100).toFixed(2)}%`,
    ),
  );

  // Format variety
  const fvEarned = ratioEarned(clientM.distinctFormats, refM.distinctFormats, W.FORMAT_VARIETY_RATIO);
  signals.push(
    signal(
      "format_variety_ratio",
      "Distinct formats vs reference",
      clientM.distinctFormats >= refM.distinctFormats,
      `${clientM.distinctFormats}/${refM.distinctFormats}`,
      W.FORMAT_VARIETY_RATIO,
      fvEarned,
    ),
  );

  // Caption length
  const clEarned = ratioEarned(clientM.avgCaptionLen, refM.avgCaptionLen, W.CAPTION_LENGTH_RATIO);
  signals.push(
    signal(
      "caption_length_ratio",
      "Avg caption length vs reference",
      clientM.avgCaptionLen >= refM.avgCaptionLen,
      Number((clientM.avgCaptionLen / Math.max(1, refM.avgCaptionLen)).toFixed(2)),
      W.CAPTION_LENGTH_RATIO,
      clEarned,
      `client=${clientM.avgCaptionLen.toFixed(0)}c  ref=${refM.avgCaptionLen.toFixed(0)}c`,
    ),
  );

  // CTA usage
  const cuEarned = ratioEarned(clientM.ctaRate, refM.ctaRate, W.CTA_USAGE_RATIO);
  signals.push(
    signal(
      "cta_usage_ratio",
      "CTA usage rate vs reference",
      clientM.ctaRate >= refM.ctaRate,
      Number((clientM.ctaRate / Math.max(0.0001, refM.ctaRate)).toFixed(2)),
      W.CTA_USAGE_RATIO,
      cuEarned,
      `client=${(clientM.ctaRate * 100).toFixed(0)}%  ref=${(refM.ctaRate * 100).toFixed(0)}%`,
    ),
  );

  // Hashtag recipe adherence — purely client-side: how close to 8–10 total?
  const avgT = clientM.avgHashtagsPerPost;
  let recipeEarned = 0;
  if (avgT >= 8 && avgT <= 10) recipeEarned = W.HASHTAG_RECIPE_ADHERENCE;
  else if (avgT >= 5 && avgT < 8) recipeEarned = W.HASHTAG_RECIPE_ADHERENCE * 0.7;
  else if (avgT > 10 && avgT <= 15) recipeEarned = W.HASHTAG_RECIPE_ADHERENCE * 0.5;
  else if (avgT > 0 && avgT < 5) recipeEarned = W.HASHTAG_RECIPE_ADHERENCE * 0.4;
  else if (avgT > 15) recipeEarned = W.HASHTAG_RECIPE_ADHERENCE * 0.2;
  signals.push(
    signal(
      "hashtag_recipe_adherence",
      `Avg hashtags per post vs ${RECIPE_TOTAL_TARGET}-tag recipe`,
      avgT >= 8 && avgT <= 10,
      Number(avgT.toFixed(2)),
      W.HASHTAG_RECIPE_ADHERENCE,
      recipeEarned,
    ),
  );

  const score = tallyScore(signals);
  const gaps = signals
    .filter((s) => s.earned < s.weight)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((s) => s.key);
  const explanation = `Competitor gap scored ${score}/100 vs reference models. ${
    gaps.length ? `Biggest gaps to close: ${gaps.join(", ")}.` : "Client is at or above reference on all dimensions."
  }`;

  return { score, maxPossible: 100, signals, explanation, computedAt: new Date() };
}
