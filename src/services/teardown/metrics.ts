// Deterministic engagement + momentum analysis over a teardown's captured
// content. No LLM, no fabrication: every number here is computed straight from
// teardown_content rows. The LLM layers (caption system, comment drivers,
// success thesis) consume the structured summary this produces, so the facts
// stay grounded.

import type { TeardownContent } from "../../db/schema.js";

export interface PerfRow {
  shortcode: string | null;
  content_type: string;
  posted_at: string | null;
  like_count: number | null;
  comment_count: number | null;
  play_count: number | null;
  engagement_rate: number | null;
}

export interface TypeStat {
  type: string;
  count: number;
  pct: number;
  avgLikes: number;
  medianLikes: number;
  avgComments: number;
  avgPlays: number | null;
  avgEngagementRate: number | null;
}

export interface MomentumWindow {
  label: string;
  items: number;
  avgLikes: number;
  avgComments: number;
  avgEngagementRate: number | null;
}

export interface TeardownMetrics {
  total: number;
  dateRange: { first: string | null; last: string | null; spanDays: number | null };
  cadence: { postsPerWeek: number | null; medianGapDays: number | null };
  formatMix: TypeStat[];
  overall: {
    avgLikes: number;
    medianLikes: number;
    avgComments: number;
    medianComments: number;
    avgPlays: number | null;
    avgEngagementRate: number | null;
    medianEngagementRate: number | null;
    commentToLikeRatio: number | null; // sum(comments)/sum(likes) — CTA-driven signal
  };
  momentum: {
    recent: MomentumWindow;
    prior: MomentumWindow;
    likeDirection: "up" | "down" | "flat";
    pctChangeLikes: number | null;
  };
  topByLikes: PerfRow[];
  topByComments: PerfRow[];
  topByPlays: PerfRow[];
  topByEngagementRate: PerfRow[];
  outliers: PerfRow[]; // likes >= 2.5x median (viral hits)
}

function nums(values: Array<number | null | undefined>): number[] {
  return values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

function avg(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function toRow(c: TeardownContent): PerfRow {
  return {
    shortcode: c.shortcode,
    content_type: c.content_type,
    posted_at: c.posted_at,
    like_count: c.like_count,
    comment_count: c.comment_count,
    play_count: c.play_count,
    engagement_rate: c.engagement_rate,
  };
}

function topN(rows: PerfRow[], key: keyof PerfRow, n = 5): PerfRow[] {
  return [...rows]
    .filter((r) => typeof r[key] === "number")
    .sort((a, b) => (b[key] as number) - (a[key] as number))
    .slice(0, n);
}

function timeMs(s: string | null): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

export function computeMetrics(content: TeardownContent[]): TeardownMetrics {
  const total = content.length;
  const rows = content.map(toRow);

  // ── Date range + cadence ────────────────────────────────────────────────
  const times = nums(content.map((c) => timeMs(c.posted_at)));
  const firstMs = times.length ? Math.min(...times) : null;
  const lastMs = times.length ? Math.max(...times) : null;
  const spanDays =
    firstMs != null && lastMs != null ? (lastMs - firstMs) / 86_400_000 : null;
  const postsPerWeek =
    spanDays && spanDays > 0 ? total / (spanDays / 7) : null;

  const sortedTimes = [...times].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < sortedTimes.length; i++) {
    gaps.push((sortedTimes[i] - sortedTimes[i - 1]) / 86_400_000);
  }
  const medianGapDays = gaps.length ? median(gaps) : null;

  // ── Format mix + per-type stats ─────────────────────────────────────────
  const byType = new Map<string, TeardownContent[]>();
  for (const c of content) {
    const list = byType.get(c.content_type) ?? [];
    list.push(c);
    byType.set(c.content_type, list);
  }
  const formatMix: TypeStat[] = [...byType.entries()]
    .map(([type, items]) => {
      const likes = nums(items.map((i) => i.like_count));
      const ers = nums(items.map((i) => i.engagement_rate));
      const plays = nums(items.map((i) => i.play_count));
      return {
        type,
        count: items.length,
        pct: total ? items.length / total : 0,
        avgLikes: avg(likes),
        medianLikes: median(likes),
        avgComments: avg(nums(items.map((i) => i.comment_count))),
        avgPlays: plays.length ? avg(plays) : null,
        avgEngagementRate: ers.length ? avg(ers) : null,
      };
    })
    .sort((a, b) => b.count - a.count);

  // ── Overall engagement ──────────────────────────────────────────────────
  const allLikes = nums(content.map((c) => c.like_count));
  const allComments = nums(content.map((c) => c.comment_count));
  const allPlays = nums(content.map((c) => c.play_count));
  const allErs = nums(content.map((c) => c.engagement_rate));
  const sumLikes = allLikes.reduce((s, v) => s + v, 0);
  const sumComments = allComments.reduce((s, v) => s + v, 0);

  // ── Momentum: recent half vs prior half by post time ────────────────────
  const dated = content
    .filter((c) => timeMs(c.posted_at) != null)
    .sort((a, b) => (timeMs(a.posted_at) as number) - (timeMs(b.posted_at) as number));
  const half = Math.floor(dated.length / 2);
  const priorItems = dated.slice(0, half);
  const recentItems = dated.slice(half);
  const windowOf = (label: string, items: TeardownContent[]): MomentumWindow => {
    const ers = nums(items.map((i) => i.engagement_rate));
    return {
      label,
      items: items.length,
      avgLikes: avg(nums(items.map((i) => i.like_count))),
      avgComments: avg(nums(items.map((i) => i.comment_count))),
      avgEngagementRate: ers.length ? avg(ers) : null,
    };
  };
  const recent = windowOf("recent half", recentItems);
  const prior = windowOf("prior half", priorItems);
  const pctChangeLikes =
    prior.avgLikes > 0 ? (recent.avgLikes - prior.avgLikes) / prior.avgLikes : null;
  const likeDirection: "up" | "down" | "flat" =
    pctChangeLikes == null
      ? "flat"
      : pctChangeLikes > 0.1
        ? "up"
        : pctChangeLikes < -0.1
          ? "down"
          : "flat";

  // ── Outliers (viral hits) ───────────────────────────────────────────────
  const medLikes = median(allLikes);
  const outliers = rows
    .filter((r) => typeof r.like_count === "number" && medLikes > 0 && r.like_count >= medLikes * 2.5)
    .sort((a, b) => (b.like_count as number) - (a.like_count as number));

  return {
    total,
    dateRange: {
      first: firstMs != null ? new Date(firstMs).toISOString() : null,
      last: lastMs != null ? new Date(lastMs).toISOString() : null,
      spanDays: spanDays != null ? Math.round(spanDays * 10) / 10 : null,
    },
    cadence: {
      postsPerWeek: postsPerWeek != null ? Math.round(postsPerWeek * 10) / 10 : null,
      medianGapDays: medianGapDays != null ? Math.round(medianGapDays * 10) / 10 : null,
    },
    formatMix,
    overall: {
      avgLikes: Math.round(avg(allLikes)),
      medianLikes: Math.round(medLikes),
      avgComments: Math.round(avg(allComments)),
      medianComments: Math.round(median(allComments)),
      avgPlays: allPlays.length ? Math.round(avg(allPlays)) : null,
      avgEngagementRate: allErs.length ? avg(allErs) : null,
      medianEngagementRate: allErs.length ? median(allErs) : null,
      commentToLikeRatio: sumLikes > 0 ? sumComments / sumLikes : null,
    },
    momentum: { recent, prior, likeDirection, pctChangeLikes },
    topByLikes: topN(rows, "like_count"),
    topByComments: topN(rows, "comment_count"),
    topByPlays: topN(rows, "play_count"),
    topByEngagementRate: topN(rows, "engagement_rate"),
    outliers: outliers.slice(0, 10),
  };
}
