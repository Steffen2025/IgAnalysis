import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import {
  audits,
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
import { evaluateProfileGate } from "./competitorProfileGate.js";
import { canSpendApifyRun } from "./apifyBudget.js";

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

function nearbyMarketsFor(city: string): string[] {
  const key = city.trim().toLowerCase();
  const map: Record<string, string[]> = {
    waterdown: ["Waterdown", "Burlington", "Hamilton", "Oakville", "Halton", "Ancaster"],
    burlington: ["Burlington", "Waterdown", "Hamilton", "Oakville", "Halton"],
    hamilton: ["Hamilton", "Waterdown", "Burlington", "Oakville", "Ancaster", "Stoney Creek"],
    toronto: ["Toronto", "North York", "Mississauga", "Vaughan", "Etobicoke"],
    calgary: ["Calgary", "Airdrie", "Cochrane", "Okotoks"],
  };
  return map[key] ?? [];
}

function normalize(text: string | null | undefined): string {
  return (text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function hasLocalSignal(text: string, auditCity: string, serviceArea: string | null | undefined): boolean {
  const haystack = normalize(text);
  const signals = new Set([
    ...nearbyMarketsFor(auditCity),
    auditCity,
    serviceArea ?? "",
  ].map((value) => normalize(value)).filter(Boolean));
  for (const signal of signals) {
    if (signal && haystack.includes(signal)) return true;
  }
  return false;
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
  let profile: NormalizedProfile | null = await getCached<NormalizedProfile>(profileKey);
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
    await setCached(profileKey, profile, TTL_PROFILE);
  }

  const compMeta = await first(db
    .select({
      competitor_type: competitors.competitor_type,
    })
    .from(competitors)
    .where(eq(competitors.id, competitorId))
    .limit(1));
  const auditMeta = await first(db
    .select({ business_category: audits.business_category })
    .from(audits)
    .where(eq(audits.id, auditId))
    .limit(1));

  const gate = evaluateProfileGate(
    profile,
    compMeta?.competitor_type === "reference_model" ? "reference_model" : "local_intel",
    auditMeta?.business_category,
  );
  if (!gate.passed) {
    await db.update(competitors)
      .set({ skip_reason: `profile_gate: ${gate.reasons[0] ?? "failed"}` })
      .where(eq(competitors.id, competitorId));
    console.log(`Skipping post scrape @${username} — profile gate: ${gate.reasons.join(", ")}`);
    return { scraped, cacheHits, deepScraped: false };
  }

  await db.insert(competitor_profiles)
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
    });

  if (!(await canSpendApifyRun(auditId, 1))) {
    await db.update(competitors)
      .set({ skip_reason: "apify_budget_cap" })
      .where(eq(competitors.id, competitorId));
    return { scraped, cacheHits, deepScraped: false };
  }

  // ---- Initial posts ----
  const initialKey = makeCacheKey("instagram_posts", `${username}:${initialLimit}`);
  let initialPosts: NormalizedPost[] | null = await getCached<NormalizedPost[]>(initialKey);
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
    await setCached(initialKey, initialPosts, TTL_POSTS);
  }

  if (initialPosts.length > 0) {
    await db.insert(competitor_posts)
      .values(
        initialPosts.map((p) => ({
          competitor_id: competitorId,
          audit_id: auditId,
          post_type: p.post_type,
          shortcode: p.shortcode,
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
      );
  }

  const auditRow = await first(db
    .select({ city: audits.city, service_area: audits.service_area })
    .from(audits)
    .where(eq(audits.id, auditId))
    .limit(1));
  const combinedSignals = [
    profile.bio,
    profile.category,
    ...initialPosts.map((p) => `${p.location_name ?? ""} ${p.caption ?? ""}`),
  ].join(" ");
  const keepLocal = auditRow ? hasLocalSignal(combinedSignals, auditRow.city ?? "", auditRow.service_area) : false;
  if (!keepLocal) {
    const compRow = await first(db
      .select({ competitor_type: competitors.competitor_type })
      .from(competitors)
      .where(eq(competitors.id, competitorId))
      .limit(1));

    if (compRow?.competitor_type === "local_intel") {
      // Keep type + market so report local column still shows the account.
      await db.update(competitors)
        .set({ skip_reason: "weak_local_signal" })
        .where(eq(competitors.id, competitorId));
    } else {
      await db.update(competitors)
        .set({
          competitor_type: "reference_model",
          skip_reason: "reclassified_non_local",
        })
        .where(eq(competitors.id, competitorId));
    }
  }

  // ---- Confidence gate ----
  const confidence = await evaluateCompetitorConfidence(competitorId);
  let deepScraped = false;

  if (confidence.shouldDeepScrape && deepLimit > 0) {
    const totalLimit = initialLimit + deepLimit;
    const deepKey = makeCacheKey("instagram_posts", `${username}:${totalLimit}`);
    let combined: NormalizedPost[] | null = await getCached<NormalizedPost[]>(deepKey);
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
      await setCached(deepKey, combined, TTL_POSTS);
    }

    // Append any rows we don't already have (de-dupe by shortcode-equivalent: hook_text+posted_at).
    const seen = new Set(initialPosts.map((p) => `${p.posted_at}|${p.hook_text}`));
    const incremental = combined.filter(
      (p) => !seen.has(`${p.posted_at}|${p.hook_text}`),
    );
    if (incremental.length > 0) {
      await db.insert(competitor_posts)
        .values(
          incremental.map((p) => ({
            competitor_id: competitorId,
            audit_id: auditId,
            post_type: p.post_type,
            shortcode: p.shortcode,
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
        );
    }

    await db.update(competitors)
      .set({ deep_scraped: true })
      .where(eq(competitors.id, competitorId));
    deepScraped = true;

    const row = await first(db
      .select({ competitor_type: competitors.competitor_type })
      .from(competitors)
      .where(eq(competitors.id, competitorId))
      .limit(1));
    console.log(
      `Deep scraped @${username} (confidence ${confidence.score}, type ${row?.competitor_type ?? "?"})`,
    );
  } else {
    const skipReason = confidence.reasons[0] ?? "low_confidence";
    console.log(`Skipped deep scrape for @${username} (reason: ${skipReason})`);
  }

  return { scraped, cacheHits, deepScraped };
}
