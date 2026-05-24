import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { comments } from "../../db/schema.js";
import { runActorAndGetData, ACTORS, normalizeComment } from "../apify/index.js";
import { getCached, setCached, makeCacheKey, TTL_COMMENTS } from "../cache/cacheService.js";
import type { TargetPost } from "./commentTargeting.js";

export interface CommentScrapeResult {
  scraped: number;
  cacheHits: number;
  postsProcessed: number;
  errors: string[];
}

export async function scrapeCommentsForTargets(
  auditId: number,
  targets: TargetPost[],
): Promise<CommentScrapeResult> {
  let scraped = 0;
  let cacheHits = 0;
  let postsProcessed = 0;
  const errors: string[] = [];

  for (const target of targets) {
    try {
      const cacheKey = makeCacheKey("instagram_comments", target.shortcode);

      // Check if comments already scraped for this post
      type CachedComment = {
        commenter_username: string | null;
        comment_text: string;
        comment_length: number;
        has_question: boolean;
        has_tag: boolean;
        emoji_count: number;
      };
      const cached = getCached<CachedComment[]>(cacheKey);

      let normalizedComments: CachedComment[];

      if (cached) {
        console.log(`  Cache hit: comments for ${target.shortcode} (@${target.username})`);
        cacheHits++;
        normalizedComments = cached;
      } else {
        console.log(`  Scraping comments for ${target.shortcode} (@${target.username})…`);
        const { items } = await runActorAndGetData({
          actorId: ACTORS.INSTAGRAM.id,
          actorLabel: `Comments: ${target.shortcode}`,
          auditId,
          input: {
            directUrls: [target.url],
            resultsType: "comments",
            resultsLimit: 30,
          },
        });
        normalizedComments = items.map(normalizeComment);
        setCached(cacheKey, normalizedComments, TTL_COMMENTS);
        console.log(`    → ${normalizedComments.length} comments scraped`);
      }

      // Insert into DB (delete existing first for idempotency)
      if (target.sourceTable === "posts") {
        db.delete(comments)
          .where(eq(comments.post_id, target.rowId))
          .run();
      } else {
        db.delete(comments)
          .where(eq(comments.competitor_post_id, target.rowId))
          .run();
      }

      for (const c of normalizedComments) {
        db.insert(comments)
          .values({
            audit_id: auditId,
            post_id: target.sourceTable === "posts" ? target.rowId : null,
            competitor_post_id: target.sourceTable === "competitor_posts" ? target.rowId : null,
            commenter_username: c.commenter_username,
            comment_text: c.comment_text,
            comment_length: c.comment_length,
            has_question: c.has_question,
            has_tag: c.has_tag,
            emoji_count: c.emoji_count,
          })
          .run();
      }

      scraped += normalizedComments.length;
      postsProcessed++;
    } catch (err) {
      const msg = `commentScrape(${target.shortcode}): ${(err as Error).message}`;
      errors.push(msg);
      console.error(`  ❌ ${msg}`);
    }
  }

  return { scraped, cacheHits, postsProcessed, errors };
}
