import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { competitor_posts, competitor_profiles, competitors } from "../../db/schema.js";

export interface ConfidenceResult {
  score: number;
  shouldDeepScrape: boolean;
  reasons: string[];
}

const DAY_MS = 24 * 3600 * 1000;

export async function evaluateCompetitorConfidence(
  competitorId: number,
): Promise<ConfidenceResult> {
  const profile = db
    .select()
    .from(competitor_profiles)
    .where(eq(competitor_profiles.competitor_id, competitorId))
    .orderBy(desc(competitor_profiles.scraped_at))
    .limit(1)
    .all()[0];

  const posts = db
    .select()
    .from(competitor_posts)
    .where(eq(competitor_posts.competitor_id, competitorId))
    .orderBy(desc(competitor_posts.posted_at))
    .limit(10)
    .all();

  const reasons: string[] = [];
  let score = 0;

  if (posts.length === 0) {
    const result: ConfidenceResult = {
      score: 0,
      shouldDeepScrape: false,
      reasons: ["no_posts"],
    };
    persistResult(competitorId, result);
    return result;
  }

  const mostRecent = posts
    .map((p) => (p.posted_at ? new Date(p.posted_at).getTime() : 0))
    .reduce((a, b) => Math.max(a, b), 0);
  const isActive = mostRecent > 0 && Date.now() - mostRecent < 30 * DAY_MS;
  if (isActive) score += 30;
  else reasons.push("inactive: no posts in 30 days");

  if (posts.length >= 5) score += 20;
  else reasons.push("low_volume");

  const followers = profile?.follower_count ?? 0;
  const avgLikes =
    posts.reduce((sum, p) => sum + (p.like_count ?? 0), 0) / posts.length;
  const engagementThreshold = followers * 0.005;
  if (followers > 0 && avgLikes > engagementThreshold) score += 25;
  else reasons.push("low_engagement");

  const withCaptions = posts.filter((p) => (p.caption ?? "").trim().length > 0).length;
  if (withCaptions >= 7) score += 15;
  else reasons.push("few_captions");

  const distinctTypes = new Set(posts.map((p) => p.post_type)).size;
  if (distinctTypes >= 2) score += 10;
  else reasons.push("single_format");

  const shouldDeepScrape = score >= 60;
  const result: ConfidenceResult = { score, shouldDeepScrape, reasons };
  persistResult(competitorId, result);
  return result;
}

function persistResult(competitorId: number, r: ConfidenceResult): void {
  db.update(competitors)
    .set({
      confidence_score: r.score,
      skip_reason: r.shouldDeepScrape ? null : (r.reasons[0] ?? "low_confidence"),
    })
    .where(eq(competitors.id, competitorId))
    .run();
}
