// Teardown comment capture. Scrapes comments for the top-N posts by comment
// volume (where the comment-driver signal is strongest), persists to
// teardown_comments, and is fully idempotent + budget-gated + cached so
// re-running analysis never re-spends Apify runs.

import { count, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  scrape_jobs,
  teardown_comments,
  teardown_content,
  type TeardownContent,
} from "../../db/schema.js";
import { ACTORS, normalizeComment } from "../apify/index.js";
import { TTL_COMMENTS, getCached, makeCacheKey, setCached } from "../cache/cacheService.js";
import { runTeardownActor } from "./teardownApify.js";

const MAX_TEARDOWN_RUNS = Number(process.env.TEARDOWN_MAX_RUNS ?? "24");
const COMMENTS_PER_POST = Number(process.env.TEARDOWN_COMMENTS_PER_POST ?? "30");

export interface CommentCaptureResult {
  postsTargeted: number;
  postsScraped: number;
  cacheHits: number;
  commentsStored: number;
  skippedAlreadyHave: number;
  errors: string[];
  budgetStopped: boolean;
}

type CachedComment = ReturnType<typeof normalizeComment>;

function postUrl(shortcode: string): string {
  return `https://www.instagram.com/p/${shortcode}/`;
}

async function teardownRunsUsed(teardownId: number): Promise<number> {
  const row = await db
    .select({ n: count() })
    .from(scrape_jobs)
    .where(eq(scrape_jobs.teardown_id, teardownId));
  return Number(row[0]?.n ?? 0);
}

async function alreadyHasComments(contentId: number): Promise<boolean> {
  const row = await db
    .select({ n: count() })
    .from(teardown_comments)
    .where(eq(teardown_comments.content_id, contentId));
  return Number(row[0]?.n ?? 0) > 0;
}

export async function captureTopPostComments(
  teardownId: number,
  topN: number,
): Promise<CommentCaptureResult> {
  const result: CommentCaptureResult = {
    postsTargeted: 0,
    postsScraped: 0,
    cacheHits: 0,
    commentsStored: 0,
    skippedAlreadyHave: 0,
    errors: [],
    budgetStopped: false,
  };

  // Top posts by comment volume — that is where comment-driver mechanics show.
  const targets: TeardownContent[] = await db
    .select()
    .from(teardown_content)
    .where(eq(teardown_content.teardown_id, teardownId))
    .orderBy(desc(teardown_content.comment_count))
    .limit(topN);

  result.postsTargeted = targets.length;

  for (const post of targets) {
    if (!post.shortcode) {
      result.errors.push(`content ${post.id}: no shortcode, cannot scrape comments`);
      continue;
    }

    if (await alreadyHasComments(post.id)) {
      result.skippedAlreadyHave += 1;
      continue;
    }

    const cacheKey = makeCacheKey("teardown_comments", post.shortcode);
    let normalized = await getCached<CachedComment[]>(cacheKey);

    if (normalized) {
      result.cacheHits += 1;
    } else {
      const used = await teardownRunsUsed(teardownId);
      if (used + 1 > MAX_TEARDOWN_RUNS) {
        result.budgetStopped = true;
        result.errors.push(
          `Apify budget cap reached (${used}/${MAX_TEARDOWN_RUNS}) — stopped before scraping ${post.shortcode}`,
        );
        break;
      }
      const { items, failed, error } = await runTeardownActor({
        actorId: ACTORS.INSTAGRAM.id,
        actorLabel: `Teardown comments: ${post.shortcode}`,
        teardownId,
        input: {
          directUrls: [postUrl(post.shortcode)],
          resultsType: "comments",
          resultsLimit: COMMENTS_PER_POST,
        },
      });
      if (failed) {
        result.errors.push(`comments ${post.shortcode}: ${error}`);
        continue;
      }
      normalized = items.map(normalizeComment);
      await setCached(cacheKey, normalized, TTL_COMMENTS);
      result.postsScraped += 1;
    }

    if (normalized.length > 0) {
      // Idempotent: clear any prior rows for this content before inserting.
      await db.delete(teardown_comments).where(eq(teardown_comments.content_id, post.id));
      await db.insert(teardown_comments).values(
        normalized.map((c) => ({
          content_id: post.id,
          commenter_username: c.commenter_username,
          comment_text: c.comment_text,
          comment_length: c.comment_length,
          has_question: c.has_question,
          has_tag: c.has_tag,
          emoji_count: c.emoji_count,
        })),
      );
      result.commentsStored += normalized.length;
    }
  }

  return result;
}
