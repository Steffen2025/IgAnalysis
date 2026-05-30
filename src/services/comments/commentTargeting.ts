import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { competitors, competitor_posts, posts, profiles } from "../../db/schema.js";
import { content_patterns } from "../../db/schema.js";
import { isAllowedReferenceMarketLabel } from "../audit/referenceMarkets.js";

export interface TargetPost {
  sourceTable: "posts" | "competitor_posts";
  rowId: number;
  shortcode: string;
  url: string;
  username: string;
  competitorType: string | null;
  engagementRate: number;
  reason: "client_top" | "reference_model_top";
}

/**
 * Returns up to ~12 target posts for comment scraping:
 *   - top 3 reference_model competitor posts by engagement rate (deep-scraped only)
 *   - top 3 client posts by engagement rate
 *
 * Posts with null shortcode or null engagement_rate are excluded.
 */
export async function findTargetPostsForComments(auditId: number): Promise<TargetPost[]> {
  const targets: TargetPost[] = [];

  // ── Reference model competitor posts ─────────────────────────────────────
  // Load pattern result to get topPostExamples from reference_model competitors
  const patternRows = await db
    .select({ patterns_json: content_patterns.patterns_json })
    .from(content_patterns)
    .where(and(eq(content_patterns.audit_id, auditId), eq(content_patterns.scope, "category_corpus")))
    .limit(1);

  const referenceCompetitorIds = new Set<number>();

  if (patternRows.length > 0) {
    try {
      const pat = JSON.parse(patternRows[0].patterns_json) as {
        topPostExamples?: Array<{ competitorId?: number; competitorType?: string }>;
      };
      for (const ex of pat.topPostExamples ?? []) {
        if (ex.competitorType === "reference_model" && ex.competitorId != null) {
          referenceCompetitorIds.add(ex.competitorId);
        }
      }
    } catch { /* skip */ }
  }

  // Fallback: pull all reference_model competitors for this audit if pattern data empty
  if (referenceCompetitorIds.size === 0) {
    const refComps = await db
      .select({ id: competitors.id, geographic_market: competitors.geographic_market })
      .from(competitors)
      .where(
        and(
          eq(competitors.audit_id, auditId),
          eq(competitors.competitor_type, "reference_model"),
          eq(competitors.deep_scraped, true),
        ),
      );
    for (const c of refComps) {
      if (isAllowedReferenceMarketLabel(c.geographic_market)) referenceCompetitorIds.add(c.id);
    }
  }

  // For each reference competitor, get their posts sorted by ER
  const competitorUsernames: Record<number, string> = {};
  const refCompRows = await db
    .select({ id: competitors.id, username: competitors.username })
    .from(competitors)
    .where(eq(competitors.audit_id, auditId));
  for (const r of refCompRows) competitorUsernames[r.id] = r.username;

  for (const compId of referenceCompetitorIds) {
    const topPosts = (await db
      .select()
      .from(competitor_posts)
      .where(
        and(
          eq(competitor_posts.competitor_id, compId),
          eq(competitor_posts.audit_id, auditId),
          isNotNull(competitor_posts.engagement_rate),
        ),
      ))
      .filter((p) => p.shortcode != null)
      .sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0))
      .slice(0, 3);

    for (const p of topPosts) {
      targets.push({
        sourceTable: "competitor_posts",
        rowId: p.id,
        shortcode: p.shortcode!,
        url: `https://www.instagram.com/p/${p.shortcode}/`,
        username: competitorUsernames[compId] ?? `competitor_${compId}`,
        competitorType: "reference_model",
        engagementRate: p.engagement_rate ?? 0,
        reason: "reference_model_top",
      });
    }
  }

  // ── Client posts ──────────────────────────────────────────────────────────
  const profileRow = await db
    .select({ username: profiles.username })
    .from(profiles)
    .where(eq(profiles.audit_id, auditId))
    .limit(1);

  const clientUsername = profileRow[0]?.username ?? "client";

  const clientPosts = (await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.audit_id, auditId),
        isNotNull(posts.engagement_rate),
      ),
    ))
    .filter((p) => p.shortcode != null)
    .sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0))
    .slice(0, 3);

  for (const p of clientPosts) {
    targets.push({
      sourceTable: "posts",
      rowId: p.id,
      shortcode: p.shortcode!,
      url: `https://www.instagram.com/p/${p.shortcode}/`,
      username: clientUsername,
      competitorType: null,
      engagementRate: p.engagement_rate ?? 0,
      reason: "client_top",
    });
  }

  return targets;
}
