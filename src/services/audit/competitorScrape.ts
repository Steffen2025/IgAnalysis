import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  competitor_posts,
  competitor_profiles,
  competitors,
} from "../../db/schema.js";
import {
  ACTORS,
  INPUT_TEMPLATES,
  normalizePost,
  normalizeProfile,
  runActorAndGetData,
  type NormalizedPost,
  type NormalizedProfile,
} from "../apify/index.js";
import {
  TTL_POSTS,
  TTL_PROFILE,
  getCached,
  makeCacheKey,
  setCached,
} from "../cache/cacheService.js";
import { evaluateCompetitorConfidence } from "./confidenceGate.js";

export interface CompetitorScrapeResult {
  scraped: number;
  cacheHits: number;
  deepScraped: boolean;
}

interface Params {
  auditId: number;
  competitorId: number;
  username: string;
  initialLimit?: number;
  deepLimit?: number;
}

function profileUrl(username: string): string {
  return `https://www.instagram.com/${username}/`;
}

export async function scrapeCompetitorProfileAndPosts(
  params: Params,
): Promise<CompetitorScrapeResult> {
  const {
    auditId,
    competitorId,
    username,
    initialLimit = 10,
    deepLimit = 40,
  } = params;
  let scraped = 0;
  let cacheHits = 0;

  // ---- Profile ----
  const profileKey = makeCacheKey("instagram_profile", username);
  let profile: NormalizedProfile | null = getCached<NormalizedProfile>(profileKey);
  if (profile) {
    console.log(`Cache hit: competitor profile @${username}`);
    cacheHits += 1;
  } else {
    console.log(`Cache miss: scraping competitor profile @${username}`);
    const { items } = await runActorAndGetData({
      actorId: ACTORS.INSTAGRAM.id,
      actorLabel: `Competitor profile @${username}`,
      auditId,
      input: {
        ...INPUT_TEMPLATES.INSTAGRAM_PROFILE_LOOKUP,
        directUrls: [profileUrl(username)],
      },
    });
    if (items.length === 0) {
      throw new Error(`No profile data for @${username}`);
    }
    profile = normalizeProfile(items[0]);
    scraped += items.length;
    setCached(profileKey, profile, TTL_PROFILE);
  }

  db.insert(competitor_profiles)
    .values({
      competitor_id: competitorId,
      audit_id: auditId,
      follower_count: profile.follower_count,
      following_count: profile.following_count,
      post_count: profile.post_count,
      is_business: profile.is_business,
      bio: profile.bio,
      category: profile.category,
      raw_json: profile.raw_json,
    })
    .run();

  // ---- Initial posts ----
  const initialKey = makeCacheKey("instagram_posts", `${username}:${initialLimit}`);
  let initialPosts: NormalizedPost[] | null = getCached<NormalizedPost[]>(initialKey);
  if (initialPosts) {
    console.log(`Cache hit: competitor posts @${username} (initial ${initialLimit})`);
    cacheHits += 1;
  } else {
    console.log(`Cache miss: scraping competitor posts @${username} (initial ${initialLimit})`);
    const { items } = await runActorAndGetData({
      actorId: ACTORS.INSTAGRAM.id,
      actorLabel: `Competitor posts @${username} (${initialLimit})`,
      auditId,
      input: {
        ...INPUT_TEMPLATES.INSTAGRAM_POSTS_FOR_PROFILE,
        directUrls: [profileUrl(username)],
        resultsLimit: initialLimit,
      },
    });
    initialPosts = items.map((it) => normalizePost(it));
    scraped += items.length;
    setCached(initialKey, initialPosts, TTL_POSTS);
  }

  if (initialPosts.length > 0) {
    db.insert(competitor_posts)
      .values(
        initialPosts.map((p) => ({
          competitor_id: competitorId,
          audit_id: auditId,
          post_type: p.post_type,
          caption: p.caption,
          like_count: p.like_count,
          comment_count: p.comment_count,
          play_count: p.play_count,
          posted_at: p.posted_at,
          hashtags: p.hashtags,
          location_name: p.location_name,
          hook_text: p.hook_text,
          has_cta: p.has_cta,
          raw_json: p.raw_json,
        })),
      )
      .run();
  }

  // ---- Confidence gate ----
  const confidence = await evaluateCompetitorConfidence(competitorId);
  let deepScraped = false;

  if (confidence.shouldDeepScrape && deepLimit > 0) {
    const totalLimit = initialLimit + deepLimit;
    const deepKey = makeCacheKey("instagram_posts", `${username}:${totalLimit}`);
    let combined: NormalizedPost[] | null = getCached<NormalizedPost[]>(deepKey);
    if (combined) {
      console.log(`Cache hit: competitor posts @${username} (deep ${totalLimit})`);
      cacheHits += 1;
    } else {
      console.log(`Cache miss: deep scraping @${username} (total ${totalLimit})`);
      const { items } = await runActorAndGetData({
        actorId: ACTORS.INSTAGRAM.id,
        actorLabel: `Deep posts @${username} (${totalLimit})`,
        auditId,
        input: {
          ...INPUT_TEMPLATES.INSTAGRAM_POSTS_FOR_PROFILE,
          directUrls: [profileUrl(username)],
          resultsLimit: totalLimit,
        },
      });
      combined = items.map((it) => normalizePost(it));
      scraped += items.length;
      setCached(deepKey, combined, TTL_POSTS);
    }

    // Append any rows we don't already have (de-dupe by shortcode-equivalent: hook_text+posted_at).
    const seen = new Set(initialPosts.map((p) => `${p.posted_at}|${p.hook_text}`));
    const incremental = combined.filter(
      (p) => !seen.has(`${p.posted_at}|${p.hook_text}`),
    );
    if (incremental.length > 0) {
      db.insert(competitor_posts)
        .values(
          incremental.map((p) => ({
            competitor_id: competitorId,
            audit_id: auditId,
            post_type: p.post_type,
            caption: p.caption,
            like_count: p.like_count,
            comment_count: p.comment_count,
            play_count: p.play_count,
            posted_at: p.posted_at,
            hashtags: p.hashtags,
            location_name: p.location_name,
            hook_text: p.hook_text,
            has_cta: p.has_cta,
            raw_json: p.raw_json,
          })),
        )
        .run();
    }

    db.update(competitors)
      .set({ deep_scraped: true })
      .where(eq(competitors.id, competitorId))
      .run();
    deepScraped = true;

    const row = db
      .select({ competitor_type: competitors.competitor_type })
      .from(competitors)
      .where(eq(competitors.id, competitorId))
      .limit(1)
      .all()[0];
    console.log(
      `Deep scraped @${username} (confidence ${confidence.score}, type ${row?.competitor_type ?? "?"})`,
    );
  } else {
    const skipReason = confidence.reasons[0] ?? "low_confidence";
    console.log(`Skipped deep scrape for @${username} (reason: ${skipReason})`);
  }

  return { scraped, cacheHits, deepScraped };
}
