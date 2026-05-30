import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import { audits, competitors, competitor_posts, posts } from "../../db/schema.js";
import { isAllowedReferenceMarketLabel } from "../audit/referenceMarkets.js";

export type PatternScope = "category_corpus" | "client_only" | "reference_only" | "local_only";

export interface TopPostExample {
  sourceTable: "posts" | "competitor_posts";
  postId: number;
  username: string;
  competitorType: string | null;
  engagementRate: number;
  hookType: string;
  tone: string;
  captionExcerpt: string;
}

export interface PatternResult {
  scope: PatternScope;
  postCount: number;
  caption: {
    avgLength: number;
    distribution: { short: number; medium: number; long: number; very_long: number };
    avgEmojiCount: number;
    avgEmojiDensity: number;
  };
  hooks: {
    topHook: string;
    distribution: Record<string, number>;
    bestPerformingHookByEngagement: string | null;
  };
  tones: {
    topTone: string;
    distribution: Record<string, number>;
    bestPerformingToneByEngagement: string | null;
  };
  contentElements: {
    distribution: Record<string, number>;
    bestPerformingElementByEngagement: string | null;
  };
  postTypes: {
    distribution: Record<string, number>;
    bestPerformingByEngagement: { post_type: string; avgEngagementRate: number } | null;
  };
  hashtags: {
    avgCountPerPost: number;
    recommendedRange: [number, number];
  };
  topPostExamples: TopPostExample[];
}

// Minimum posts per group to trust "best performing" computation
const MIN_GROUP = 3;

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function topKey(dist: Record<string, number>): string {
  const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? "unknown";
}

function bestByEngagement(
  rows: Array<{ group: string; engRate: number }>,
  minGroup = MIN_GROUP,
): string | null {
  const grouped: Record<string, number[]> = {};
  for (const { group, engRate } of rows) {
    if (engRate == null || engRate < 0) continue;
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(engRate);
  }
  let best: string | null = null;
  let bestAvg = -1;
  for (const [k, vals] of Object.entries(grouped)) {
    if (vals.length < minGroup) continue;
    const a = avg(vals);
    if (a > bestAvg) { bestAvg = a; best = k; }
  }
  return best;
}

function captionBucket(len: number): "short" | "medium" | "long" | "very_long" {
  if (len < 80) return "short";
  if (len <= 250) return "medium";
  if (len <= 500) return "long";
  return "very_long";
}

function parseElements(json: string | null | undefined): string[] {
  if (!json) return [];
  try { return JSON.parse(json) as string[]; } catch { return []; }
}

/** Structured row ready for analysis — shared shape for posts + competitor_posts. */
interface AnalysisRow {
  id: number;
  caption_length: number | null;
  emoji_count: number | null;
  emoji_density: number | null;
  hook_type: string | null;
  tone: string | null;
  content_elements: string | null;
  hashtag_count: number | null;
  post_type: string | null;
  engagement_rate: number | null;
  caption: string | null;
  competitorType: string | null;
  username: string;
  source: "posts" | "competitor_posts";
}

export async function analyzePatterns(auditId: number, scope: PatternScope): Promise<PatternResult> {
  const rows: AnalysisRow[] = [];

  // ── Pull client posts ──────────────────────────────────────────────────────
  if (scope === "client_only" || scope === "category_corpus") {
    const profileRow = await first(db
      .select({ id: audits.id, instagram_url: audits.instagram_url })
      .from(audits)
      .where(eq(audits.id, auditId))
      .limit(1));
    const username = profileRow?.instagram_url?.split("/").filter(Boolean).at(-1) ?? "client";

    const clientPosts = await db.select().from(posts).where(eq(posts.audit_id, auditId));
    for (const p of clientPosts) {
      rows.push({
        id: p.id,
        caption_length: p.caption_length,
        emoji_count: p.emoji_count,
        emoji_density: p.emoji_density,
        hook_type: p.hook_type,
        tone: p.tone,
        content_elements: p.content_elements,
        hashtag_count: p.hashtag_count,
        post_type: p.post_type,
        engagement_rate: p.engagement_rate,
        caption: p.caption,
        competitorType: null,
        username,
        source: "posts",
      });
    }
  }

  // ── Pull competitor posts ──────────────────────────────────────────────────
  if (scope !== "client_only") {
    const compFilter: ("local_intel" | "reference_model")[] =
      scope === "local_only"
        ? ["local_intel"]
        : scope === "reference_only"
        ? ["reference_model"]
        : ["local_intel", "reference_model"]; // category_corpus

    const comps = (await db
      .select()
      .from(competitors)
      .where(eq(competitors.audit_id, auditId)))
      .filter(
        (c) =>
          c.competitor_type != null &&
          compFilter.includes(c.competitor_type as "local_intel" | "reference_model") &&
          c.deep_scraped &&
          (c.competitor_type !== "reference_model" || isAllowedReferenceMarketLabel(c.geographic_market)),
      );

    for (const comp of comps) {
      const cposts = await db
        .select()
        .from(competitor_posts)
        .where(
          and(
            eq(competitor_posts.audit_id, auditId),
            eq(competitor_posts.competitor_id, comp.id),
          ),
        );

      for (const p of cposts) {
        rows.push({
          id: p.id,
          caption_length: p.caption_length,
          emoji_count: p.emoji_count,
          emoji_density: p.emoji_density,
          hook_type: p.hook_type,
          tone: p.tone,
          content_elements: p.content_elements,
          hashtag_count: p.hashtag_count,
          post_type: p.post_type,
          engagement_rate: p.engagement_rate,
          caption: p.caption,
          competitorType: comp.competitor_type,
          username: comp.username,
          source: "competitor_posts",
        });
      }
    }
  }

  const postCount = rows.length;

  // ── Caption stats ──────────────────────────────────────────────────────────
  const capLengths = rows.map((r) => r.caption_length ?? 0);
  const emojiCounts = rows.map((r) => r.emoji_count ?? 0);
  const emojiDensities = rows.map((r) => r.emoji_density ?? 0);

  const distribution = { short: 0, medium: 0, long: 0, very_long: 0 };
  for (const len of capLengths) distribution[captionBucket(len)]++;

  // ── Hook distribution ──────────────────────────────────────────────────────
  const hookDist: Record<string, number> = {};
  for (const r of rows) {
    const h = r.hook_type ?? "description";
    hookDist[h] = (hookDist[h] ?? 0) + 1;
  }

  const hookEngRows = rows.map((r) => ({ group: r.hook_type ?? "description", engRate: r.engagement_rate ?? -1 }));
  const bestHook = bestByEngagement(hookEngRows);

  // ── Tone distribution ──────────────────────────────────────────────────────
  const toneDist: Record<string, number> = {};
  for (const r of rows) {
    const t = r.tone ?? "mixed";
    toneDist[t] = (toneDist[t] ?? 0) + 1;
  }
  const toneEngRows = rows.map((r) => ({ group: r.tone ?? "mixed", engRate: r.engagement_rate ?? -1 }));
  const bestTone = bestByEngagement(toneEngRows);

  // ── Content element distribution ───────────────────────────────────────────
  const elemDist: Record<string, number> = {};
  const elemEngRows: Array<{ group: string; engRate: number }> = [];

  for (const r of rows) {
    const elems = parseElements(r.content_elements);
    for (const e of elems) {
      elemDist[e] = (elemDist[e] ?? 0) + 1;
      elemEngRows.push({ group: e, engRate: r.engagement_rate ?? -1 });
    }
  }
  const bestElem = bestByEngagement(elemEngRows);

  // ── Post type distribution ─────────────────────────────────────────────────
  const typeDist: Record<string, number> = {};
  const typeEngMap: Record<string, number[]> = {};
  for (const r of rows) {
    const t = r.post_type ?? "unknown";
    typeDist[t] = (typeDist[t] ?? 0) + 1;
    if (r.engagement_rate != null && r.engagement_rate >= 0) {
      if (!typeEngMap[t]) typeEngMap[t] = [];
      typeEngMap[t].push(r.engagement_rate);
    }
  }
  let bestType: { post_type: string; avgEngagementRate: number } | null = null;
  for (const [pt, vals] of Object.entries(typeEngMap)) {
    if (vals.length < MIN_GROUP) continue;
    const a = avg(vals);
    if (!bestType || a > bestType.avgEngagementRate) bestType = { post_type: pt, avgEngagementRate: a };
  }

  // ── Hashtag avg ────────────────────────────────────────────────────────────
  const hashCounts = rows.map((r) => r.hashtag_count ?? 0);
  const avgHashtags = avg(hashCounts);

  // ── Top post examples ──────────────────────────────────────────────────────
  const withEng = rows
    .filter((r) => r.engagement_rate != null && r.engagement_rate >= 0)
    .sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0));

  // Balance across types: pick up to 2 from each competitor_type bucket then fill
  const buckets: Record<string, TopPostExample[]> = {};
  for (const r of withEng) {
    const key = r.competitorType ?? "client";
    if (!buckets[key]) buckets[key] = [];
    if (buckets[key].length < 2) {
      buckets[key].push({
        sourceTable: r.source,
        postId: r.id,
        username: r.username,
        competitorType: r.competitorType,
        engagementRate: r.engagement_rate!,
        hookType: r.hook_type ?? "description",
        tone: r.tone ?? "mixed",
        captionExcerpt: (r.caption ?? "").slice(0, 200),
      });
    }
  }
  let topPostExamples = Object.values(buckets).flat();
  if (topPostExamples.length < 5) {
    // Fill from remaining
    for (const r of withEng) {
      if (topPostExamples.length >= 5) break;
      if (!topPostExamples.some((e) => e.postId === r.id && e.sourceTable === r.source)) {
        topPostExamples.push({
          sourceTable: r.source,
          postId: r.id,
          username: r.username,
          competitorType: r.competitorType,
          engagementRate: r.engagement_rate!,
          hookType: r.hook_type ?? "description",
          tone: r.tone ?? "mixed",
          captionExcerpt: (r.caption ?? "").slice(0, 200),
        });
      }
    }
  }
  topPostExamples = topPostExamples.slice(0, 5);

  return {
    scope,
    postCount,
    caption: {
      avgLength: avg(capLengths),
      distribution,
      avgEmojiCount: avg(emojiCounts),
      avgEmojiDensity: avg(emojiDensities),
    },
    hooks: {
      topHook: topKey(hookDist),
      distribution: hookDist,
      bestPerformingHookByEngagement: bestHook,
    },
    tones: {
      topTone: topKey(toneDist),
      distribution: toneDist,
      bestPerformingToneByEngagement: bestTone,
    },
    contentElements: {
      distribution: elemDist,
      bestPerformingElementByEngagement: bestElem,
    },
    postTypes: {
      distribution: typeDist,
      bestPerformingByEngagement: bestType,
    },
    hashtags: {
      avgCountPerPost: avgHashtags,
      recommendedRange: [8, 15],
    },
    topPostExamples,
  };
}
