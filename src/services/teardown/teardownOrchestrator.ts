import { count, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import {
  scrape_jobs,
  teardown_content,
  teardowns,
  type Teardown,
} from "../../db/schema.js";
import { ACTORS, INPUT_TEMPLATES, normalizeProfile } from "../apify/index.js";
import {
  TTL_POSTS,
  TTL_PROFILE,
  getCached,
  makeCacheKey,
  setCached,
} from "../cache/cacheService.js";
import { runTeardownActor } from "./teardownApify.js";
import {
  normalizeTeardownContent,
  type NormalizedTeardownContent,
} from "./teardownNormalizer.js";
import { exportTeardownData, type ExportResult } from "./exportData.js";
import { TeardownPhase, getTeardownPhase, setTeardownPhase } from "./teardownState.js";
import { runTeardownAnalysis } from "./analysisRunner.js";

const MAX_TEARDOWN_RUNS = Number(process.env.TEARDOWN_MAX_RUNS ?? "24");
const RUN_ANALYSIS = process.env.TEARDOWN_RUN_ANALYSIS !== "false";

export interface RunTeardownResult {
  teardownId: number;
  finalPhase: TeardownPhase;
  capturedCount: number;
  itemsScraped: number;
  cacheHits: number;
  errors: string[];
  export?: ExportResult;
}

interface Ctx {
  teardownId: number;
  itemsScraped: number;
  cacheHits: number;
  errors: string[];
  partialFlags: string[];
  export?: ExportResult;
}

export function handleFromUrl(url: string): string {
  const m = url.match(/instagram\.com\/([^/?#]+)/i);
  if (m?.[1]) return m[1].toLowerCase();
  const cleaned = url
    .replace(/^https?:\/\//, "")
    .replace(/\?.*$/, "")
    .replace(/\/+$/, "");
  const last = cleaned.split("/").filter(Boolean).pop();
  if (!last) throw new Error(`Cannot derive handle from URL: ${url}`);
  return last.toLowerCase();
}

async function loadTeardown(teardownId: number): Promise<Teardown> {
  const row = await first(
    db.select().from(teardowns).where(eq(teardowns.id, teardownId)).limit(1),
  );
  if (!row) throw new Error(`Teardown ${teardownId} not found`);
  return row;
}

async function countTeardownRuns(teardownId: number): Promise<number> {
  const row = await db
    .select({ n: count() })
    .from(scrape_jobs)
    .where(eq(scrape_jobs.teardown_id, teardownId));
  return Number(row[0]?.n ?? 0);
}

async function assertBudget(ctx: Ctx, runsNeeded: number): Promise<void> {
  const used = await countTeardownRuns(ctx.teardownId);
  if (used + runsNeeded > MAX_TEARDOWN_RUNS) {
    throw new Error(
      `Apify run budget exceeded for teardown ${ctx.teardownId} (used ${used}, need ${runsNeeded}, cap ${MAX_TEARDOWN_RUNS})`,
    );
  }
}

async function doTargetProfile(ctx: Ctx, teardown: Teardown): Promise<void> {
  const handle = handleFromUrl(teardown.target_url);
  const key = makeCacheKey("teardown_profile", handle);
  const cached = await getCached<ReturnType<typeof normalizeProfile>>(key);

  let normalized: ReturnType<typeof normalizeProfile>;
  if (cached) {
    console.log(`[teardown] cache hit: profile @${handle}`);
    normalized = cached;
    ctx.cacheHits += 1;
  } else {
    await assertBudget(ctx, 1);
    console.log(`[teardown] scraping profile @${handle}`);
    const { items, failed, error } = await runTeardownActor({
      actorId: ACTORS.INSTAGRAM.id,
      actorLabel: "Teardown profile lookup",
      teardownId: ctx.teardownId,
      input: {
        ...INPUT_TEMPLATES.INSTAGRAM_PROFILE_LOOKUP,
        directUrls: [teardown.target_url],
      },
    });
    if (failed) throw new Error(`Profile scrape failed: ${error}`);
    if (items.length === 0) throw new Error("Profile scrape returned no items");
    const raw = items[0] as { error?: unknown; errorDescription?: unknown };
    if (typeof raw.error === "string") {
      throw new Error(
        `Instagram profile lookup failed: ${
          typeof raw.errorDescription === "string" ? raw.errorDescription : raw.error
        }`,
      );
    }
    normalized = normalizeProfile(items[0]);
    ctx.itemsScraped += items.length;
    await setCached(key, normalized, TTL_PROFILE);
  }

  await db
    .update(teardowns)
    .set({
      target_handle: normalized.username ?? handle,
      full_name: normalized.full_name,
      bio: normalized.bio,
      follower_count: normalized.follower_count,
      following_count: normalized.following_count,
      post_count: normalized.post_count,
      is_business: normalized.is_business,
      is_verified: normalized.is_verified,
      category: normalized.category,
      external_url_in_bio: normalized.external_url_in_bio,
      highlight_titles: normalized.highlight_titles,
      profile_raw_json: normalized.raw_json,
    })
    .where(eq(teardowns.id, ctx.teardownId));

  await setTeardownPhase(ctx.teardownId, TeardownPhase.TARGET_PROFILE);
}

async function doTargetContent(ctx: Ctx, teardown: Teardown): Promise<void> {
  const handle = teardown.target_handle ?? handleFromUrl(teardown.target_url);
  const limit = teardown.content_window ?? 100;

  // Resumability: if content already captured for this teardown, don't re-scrape.
  const existing = await db
    .select({ n: count() })
    .from(teardown_content)
    .where(eq(teardown_content.teardown_id, ctx.teardownId));
  if (Number(existing[0]?.n ?? 0) > 0) {
    console.log(`[teardown] content already captured (${existing[0].n}) — skipping scrape`);
    await db
      .update(teardowns)
      .set({ requested_count: limit, captured_count: Number(existing[0].n) })
      .where(eq(teardowns.id, ctx.teardownId));
    await setTeardownPhase(ctx.teardownId, TeardownPhase.TARGET_CONTENT);
    return;
  }

  const key = makeCacheKey("teardown_content", `${handle}:${limit}`);
  let normalized: NormalizedTeardownContent[];
  const cached = await getCached<NormalizedTeardownContent[]>(key);
  if (cached) {
    console.log(`[teardown] cache hit: content @${handle} (limit ${limit})`);
    normalized = cached;
    ctx.cacheHits += 1;
  } else {
    await assertBudget(ctx, 1);
    console.log(`[teardown] scraping content @${handle} (limit ${limit})`);
    const { items, failed, error } = await runTeardownActor({
      actorId: ACTORS.INSTAGRAM.id,
      actorLabel: `Teardown content (limit ${limit})`,
      teardownId: ctx.teardownId,
      input: {
        ...INPUT_TEMPLATES.INSTAGRAM_POSTS_FOR_PROFILE,
        directUrls: [teardown.target_url],
        resultsLimit: limit,
      },
    });
    if (failed) throw new Error(`Content scrape failed: ${error}`);
    normalized = items.map((it) => normalizeTeardownContent(it, teardown.follower_count));
    ctx.itemsScraped += items.length;
    await setCached(key, normalized, TTL_POSTS);
  }

  // Hard dedup by shortcode before persist (data integrity).
  const seen = new Set<string>();
  const deduped: NormalizedTeardownContent[] = [];
  let dupes = 0;
  for (const item of normalized) {
    if (item.shortcode) {
      if (seen.has(item.shortcode)) {
        dupes += 1;
        continue;
      }
      seen.add(item.shortcode);
    }
    deduped.push(item);
  }
  if (dupes > 0) ctx.partialFlags.push(`deduped ${dupes} duplicate shortcode(s) on persist`);

  if (deduped.length > 0) {
    await db.insert(teardown_content).values(
      deduped.map((c) => ({
        teardown_id: ctx.teardownId,
        shortcode: c.shortcode,
        content_type: c.content_type,
        caption: c.caption,
        hashtags: JSON.stringify(c.hashtags),
        mentions: JSON.stringify(c.mentions),
        like_count: c.like_count,
        comment_count: c.comment_count,
        play_count: c.play_count,
        posted_at: c.posted_at,
        cover_url: c.cover_url,
        video_url: c.video_url,
        child_count: c.child_count,
        child_media: JSON.stringify(c.child_media),
        is_story: c.is_story,
        engagement_rate: c.engagement_rate,
        caption_length: c.caption_length,
        hashtag_count: c.hashtag_count,
        raw_json: c.raw_json,
      })),
    );
  }

  if (deduped.length === 0) {
    ctx.partialFlags.push("content scrape returned 0 items — possible private/blocked account");
  } else if (deduped.length < limit) {
    ctx.partialFlags.push(
      `captured ${deduped.length} of ${limit} requested (account may have fewer public posts)`,
    );
  }

  await db
    .update(teardowns)
    .set({ requested_count: limit, captured_count: deduped.length })
    .where(eq(teardowns.id, ctx.teardownId));

  await setTeardownPhase(ctx.teardownId, TeardownPhase.TARGET_CONTENT);
}

async function doHighlights(ctx: Ctx): Promise<void> {
  // Highlight titles are captured inline with the profile. Media-level highlight
  // capture is a later milestone; M1 just confirms the marker and moves on.
  await setTeardownPhase(ctx.teardownId, TeardownPhase.HIGHLIGHTS);
}

async function doExport(ctx: Ctx): Promise<void> {
  // Stamp completion time + partial flags before building the integrity report.
  await db
    .update(teardowns)
    .set({
      completed_at: new Date().toISOString(),
      partial_flags: JSON.stringify(ctx.partialFlags),
    })
    .where(eq(teardowns.id, ctx.teardownId));

  ctx.export = await exportTeardownData(ctx.teardownId);
  await setTeardownPhase(ctx.teardownId, TeardownPhase.DATA_EXPORTED);
}

function summarize(ctx: Ctx, finalPhase: TeardownPhase): RunTeardownResult {
  const captured = ctx.export?.integrity.content.captured ?? 0;
  console.log(
    `[teardown] ${ctx.teardownId}: phase=${finalPhase} captured=${captured} scraped=${ctx.itemsScraped} cached=${ctx.cacheHits} errors=${ctx.errors.length}`,
  );
  return {
    teardownId: ctx.teardownId,
    finalPhase,
    capturedCount: captured,
    itemsScraped: ctx.itemsScraped,
    cacheHits: ctx.cacheHits,
    errors: ctx.errors,
    export: ctx.export,
  };
}

export async function runTeardown(teardownId: number): Promise<RunTeardownResult> {
  const ctx: Ctx = {
    teardownId,
    itemsScraped: 0,
    cacheHits: 0,
    errors: [],
    partialFlags: [],
  };

  let teardown: Teardown;
  try {
    teardown = await loadTeardown(teardownId);
  } catch (err) {
    ctx.errors.push((err as Error).message);
    return summarize(ctx, TeardownPhase.FAILED);
  }

  await db
    .update(teardowns)
    .set({ started_at: teardown.started_at ?? new Date().toISOString() })
    .where(eq(teardowns.id, teardownId));

  let phase = await getTeardownPhase(teardownId);
  let guard = 0;

  while (phase !== TeardownPhase.COMPLETE && phase !== TeardownPhase.FAILED) {
    if (++guard > 20) {
      ctx.errors.push(`State machine guard tripped at phase=${phase}`);
      await setTeardownPhase(teardownId, TeardownPhase.FAILED);
      return summarize(ctx, TeardownPhase.FAILED);
    }

    try {
      switch (phase) {
        case TeardownPhase.CREATED:
          await doTargetProfile(ctx, teardown);
          break;
        case TeardownPhase.TARGET_PROFILE:
          await doTargetContent(ctx, teardown);
          break;
        case TeardownPhase.TARGET_CONTENT:
          await doHighlights(ctx);
          break;
        case TeardownPhase.HIGHLIGHTS:
          await doExport(ctx);
          break;
        case TeardownPhase.DATA_EXPORTED:
          // M3: run the text-intelligence analysis (comments + deterministic
          // analyzers + LLM synthesis + report.md). It internally advances
          // COMMENTS_DONE → … → MD_GENERATED; we then close to COMPLETE.
          if (RUN_ANALYSIS) {
            try {
              const a = await runTeardownAnalysis(teardownId);
              ctx.errors.push(...a.errors);
              console.log(
                `[teardown] analysis: report=${a.reportPath} comments=${a.commentsStored} llm=${a.llmOk}/${a.llmCalls}`,
              );
            } catch (err) {
              // Analysis failure must not discard a successful M1 capture.
              const msg = (err as Error).message ?? String(err);
              console.error(`[teardown] analysis failed (capture preserved):`, msg);
              ctx.partialFlags.push(`analysis failed: ${msg}`);
            }
          }
          await setTeardownPhase(teardownId, TeardownPhase.COMPLETE);
          break;
        case TeardownPhase.MD_GENERATED:
          await setTeardownPhase(teardownId, TeardownPhase.COMPLETE);
          break;
        default:
          // Any reserved future phase encountered → advance toward export.
          await setTeardownPhase(teardownId, TeardownPhase.DATA_EXPORTED);
          break;
      }
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      console.error(`[teardown] phase ${phase} failed:`, msg);
      ctx.errors.push(`${phase}: ${msg}`);
      await db
        .update(teardowns)
        .set({ error_message: msg, partial_flags: JSON.stringify(ctx.partialFlags) })
        .where(eq(teardowns.id, teardownId));
      await setTeardownPhase(teardownId, TeardownPhase.FAILED);
      return summarize(ctx, TeardownPhase.FAILED);
    }

    phase = await getTeardownPhase(teardownId);
    teardown = await loadTeardown(teardownId);
  }

  return summarize(ctx, phase);
}
