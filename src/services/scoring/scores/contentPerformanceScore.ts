import { desc, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { posts } from "../../../db/schema.js";
import { signal, tallyScore, type ScoreResult } from "../types.js";

export const W = {
  POSTING_FREQUENCY: 25,
  AVG_ENGAGEMENT_RATE: 25,
  FORMAT_VARIETY: 15,
  CTA_USAGE_RATE: 15,
  HOOK_QUALITY: 20,
} as const;

const DAY_MS = 24 * 3600 * 1000;

function postsPerWeekLast30Days(postedAtList: (string | null)[]): { count: number; rate: number } {
  const cutoff = Date.now() - 30 * DAY_MS;
  const recent = postedAtList
    .map((s) => (s ? new Date(s).getTime() : NaN))
    .filter((t) => Number.isFinite(t) && t >= cutoff);
  const weeks = 30 / 7;
  return { count: recent.length, rate: recent.length / weeks };
}

export async function scoreContentPerformance(auditId: number): Promise<ScoreResult> {
  const all = await db
    .select()
    .from(posts)
    .where(eq(posts.audit_id, auditId))
    .orderBy(desc(posts.posted_at));

  if (all.length === 0) {
    return {
      score: 0,
      maxPossible: 100,
      signals: [],
      explanation: "No client posts to score.",
      computedAt: new Date(),
    };
  }

  const recent = all.slice(0, 50);
  const signals = [];

  // Posting frequency (last 30d)
  const freq = postsPerWeekLast30Days(recent.map((p) => p.posted_at));
  let freqEarned = 0;
  if (freq.rate >= 3 && freq.rate <= 7) freqEarned = W.POSTING_FREQUENCY;
  else if (freq.rate >= 1 && freq.rate < 3) freqEarned = W.POSTING_FREQUENCY * 0.6;
  else if (freq.rate > 7) freqEarned = W.POSTING_FREQUENCY * 0.8;
  else freqEarned = 0;
  signals.push(
    signal(
      "posting_frequency",
      "Posts per week (last 30 days)",
      freq.rate >= 1,
      Number(freq.rate.toFixed(2)),
      W.POSTING_FREQUENCY,
      freqEarned,
      `${freq.count} posts in last 30 days (~${freq.rate.toFixed(2)}/wk)`,
    ),
  );

  // Average engagement rate (skip null/0 follower snapshots)
  const validEngagement = recent
    .map((p) => p.engagement_rate)
    .filter((r): r is number => typeof r === "number" && Number.isFinite(r) && r >= 0);
  const avgEng = validEngagement.length
    ? validEngagement.reduce((s, r) => s + r, 0) / validEngagement.length
    : 0;
  const avgPct = avgEng * 100;
  let engEarned = 0;
  if (avgPct > 5) engEarned = W.AVG_ENGAGEMENT_RATE;
  else if (avgPct >= 2) engEarned = W.AVG_ENGAGEMENT_RATE * 0.6;
  else if (avgPct >= 1) engEarned = W.AVG_ENGAGEMENT_RATE * 0.4;
  else if (avgPct > 0) engEarned = W.AVG_ENGAGEMENT_RATE * 0.2;
  signals.push(
    signal(
      "avg_engagement_rate",
      "Average engagement rate",
      avgPct >= 1,
      Number(avgPct.toFixed(3)),
      W.AVG_ENGAGEMENT_RATE,
      engEarned,
      `${avgPct.toFixed(2)}% across ${validEngagement.length} posts`,
    ),
  );

  // Format variety
  const types = new Set(recent.map((p) => p.post_type).filter(Boolean));
  let varEarned = 0;
  if (types.size >= 3) varEarned = W.FORMAT_VARIETY;
  else if (types.size === 2) varEarned = W.FORMAT_VARIETY * (2 / 3);
  else if (types.size === 1) varEarned = W.FORMAT_VARIETY * (1 / 3);
  signals.push(
    signal(
      "format_variety",
      "Distinct post formats used",
      types.size >= 2,
      types.size,
      W.FORMAT_VARIETY,
      varEarned,
      [...types].join(", "),
    ),
  );

  // CTA usage rate
  const ctas = recent.filter((p) => p.has_cta).length;
  const ctaPct = (ctas / recent.length) * 100;
  let ctaEarned = 0;
  if (ctaPct > 50) ctaEarned = W.CTA_USAGE_RATE;
  else if (ctaPct >= 25) ctaEarned = W.CTA_USAGE_RATE * (2 / 3);
  else if (ctaPct > 0) ctaEarned = W.CTA_USAGE_RATE * (1 / 3);
  signals.push(
    signal(
      "cta_usage_rate",
      "% of posts with a CTA",
      ctaPct >= 25,
      Number(ctaPct.toFixed(1)),
      W.CTA_USAGE_RATE,
      ctaEarned,
      `${ctas}/${recent.length} posts`,
    ),
  );

  // Hook quality
  const goodHooks = recent.filter((p) => {
    const len = (p.hook_text ?? "").length;
    return len >= 60 && len <= 125;
  }).length;
  const hookPct = (goodHooks / recent.length) * 100;
  let hookEarned = 0;
  if (hookPct > 50) hookEarned = W.HOOK_QUALITY;
  else if (hookPct >= 25) hookEarned = W.HOOK_QUALITY * (2 / 3);
  else if (hookPct > 0) hookEarned = W.HOOK_QUALITY * (1 / 3);
  signals.push(
    signal(
      "hook_quality",
      "% of posts with hook 60–125 chars",
      hookPct >= 25,
      Number(hookPct.toFixed(1)),
      W.HOOK_QUALITY,
      hookEarned,
      `${goodHooks}/${recent.length} posts`,
    ),
  );

  const score = tallyScore(signals);
  const weak = signals
    .sort((a, b) => a.earned / a.weight - b.earned / b.weight)
    .slice(0, 2)
    .map((s) => s.key);
  const explanation = `Content scored ${score}/100 across ${recent.length} posts. Weakest dimensions: ${weak.join(", ")}.`;

  return { score, maxPossible: 100, signals, explanation, computedAt: new Date() };
}
