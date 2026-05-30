import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import {
  audits,
  competitor_posts,
  competitors,
  hashtags,
  posts,
} from "../../db/schema.js";
import {
  ACTORS,
  INPUT_TEMPLATES,
  runActorAndGetData,
} from "../apify/index.js";
import {
  TTL_HASHTAG,
  getCached,
  makeCacheKey,
  setCached,
} from "../cache/cacheService.js";
import { isAllowedReferenceMarketLabel } from "./referenceMarkets.js";
import { buildGeoTokens, isClientGeoTag, isGeoTag } from "./geoTagFilter.js";

export interface TopHashtags {
  /** Client's OWN city/region tags — claim these. e.g. #burlington, #burlingtonlife */
  branded_local: string[];
  /** Geo-neutral category tags — broad reach. e.g. #realtor, #foodphotography */
  strategic: string[];
  /** Other markets' geo tags — awareness only, never copy. e.g. #nycdining */
  local: string[];
}

/** Per-audit hashtag-library cap (rows persisted into the hashtags table). */
export const HASHTAG_LIBRARY_BUDGET = {
  branded_local: 4,
  strategic: 6,
  local_awareness: 2,
} as const;

/** Apify scraping cap (one row per scrape — keeps cost in check). */
export const HASHTAG_SCRAPE_BUDGET = {
  branded_local: 2,
  strategic: 3,
  local_awareness: 1,
} as const;

/** Suggested per-post hashtag recipe — surfaced by Step 5's report. */
export const PER_POST_RECIPE = {
  branded_local: 3,
  strategic: 5,
  niche_or_branded: 2,
  total_min: 8,
  total_max: 10,
} as const;

function parseTags(blob: string | null | undefined): string[] {
  if (!blob) return [];
  try {
    const arr = JSON.parse(blob) as unknown;
    if (Array.isArray(arr)) {
      return arr
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.toLowerCase().replace(/^#/, ""))
        .filter((t) => t.length > 0);
    }
  } catch {
    /* ignore */
  }
  return [];
}

function topN(counts: Map<string, number>, n: number): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([tag]) => tag);
}

export async function collectTopHashtags(auditId: number): Promise<TopHashtags> {
  const audit = await first(db
    .select({
      city: audits.city,
      service_area: audits.service_area,
      reference_markets: audits.reference_markets,
    })
    .from(audits)
    .where(eq(audits.id, auditId))
    .limit(1));

  const clientPosts = await db
    .select({ hashtags: posts.hashtags })
    .from(posts)
    .where(eq(posts.audit_id, auditId));

  const compRows = await db
    .select({
      hashtags: competitor_posts.hashtags,
      competitor_type: competitors.competitor_type,
      geographic_market: competitors.geographic_market,
    })
    .from(competitor_posts)
    .innerJoin(competitors, eq(competitor_posts.competitor_id, competitors.id))
    .where(eq(competitor_posts.audit_id, auditId));

  const strategicCounts = new Map<string, number>();
  const localCounts = new Map<string, number>();

  for (const p of clientPosts) {
    for (const t of parseTags(p.hashtags)) {
      strategicCounts.set(t, (strategicCounts.get(t) ?? 0) + 1);
    }
  }
  for (const r of compRows) {
    if (r.competitor_type === "reference_model" && !isAllowedReferenceMarketLabel(r.geographic_market)) {
      continue;
    }
    const target =
      r.competitor_type === "reference_model" ? strategicCounts : localCounts;
    for (const t of parseTags(r.hashtags)) {
      target.set(t, (target.get(t) ?? 0) + 1);
    }
  }

  // Three-way split:
  //   - client-geo (e.g. #burlington for a Burlington realtor) → CLAIMABLE  → branded_local
  //   - other-geo  (e.g. #nycdining for a Toronto restaurant)  → AWARENESS  → local
  //   - geo-neutral category tags                              → ACTIONABLE → strategic
  const geoTokens = buildGeoTokens(
    audit ?? { city: null, reference_markets: null, service_area: null },
  );

  const brandedCounts = new Map<string, number>();
  const dropped: { tag: string; count: number }[] = [];

  for (const [tag, count] of [...strategicCounts.entries()]) {
    if (isClientGeoTag(tag, geoTokens)) {
      // Promote from strategic → branded_local.
      brandedCounts.set(tag, (brandedCounts.get(tag) ?? 0) + count);
      strategicCounts.delete(tag);
    } else if (isGeoTag(tag, geoTokens)) {
      // Other markets' geo tags — quarantine into local awareness.
      localCounts.set(tag, (localCounts.get(tag) ?? 0) + count);
      strategicCounts.delete(tag);
      dropped.push({ tag, count });
    }
  }

  // Local intel tags from local_intel competitors: these are usually the
  // client's own city (since local_intel comps share the client's market).
  // Promote any of those into branded_local too.
  for (const [tag, count] of [...localCounts.entries()]) {
    if (isClientGeoTag(tag, geoTokens)) {
      brandedCounts.set(tag, (brandedCounts.get(tag) ?? 0) + count);
      localCounts.delete(tag);
    }
  }

  if (dropped.length > 0) {
    const preview = dropped
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((d) => `#${d.tag}(${d.count})`)
      .join(", ");
    console.log(
      `Geo-filter routed ${dropped.length} other-market tag(s) to local awareness: ${preview}`,
    );
  }

  const branded_local = topN(brandedCounts, HASHTAG_LIBRARY_BUDGET.branded_local);
  const strategic = topN(strategicCounts, HASHTAG_LIBRARY_BUDGET.strategic);
  const seen = new Set([...branded_local, ...strategic]);
  const local = topN(localCounts, HASHTAG_LIBRARY_BUDGET.local_awareness + 5)
    .filter((t) => !seen.has(t))
    .slice(0, HASHTAG_LIBRARY_BUDGET.local_awareness);

  return { branded_local, strategic, local };
}

export interface ScrapeHashtagPostsResult {
  scraped: number;
  cacheHits: number;
  rowsInserted: number;
}

export async function scrapeHashtagPosts(
  auditId: number,
  tags: TopHashtags,
): Promise<ScrapeHashtagPostsResult> {
  // Apify scraping budget — see HASHTAG_SCRAPE_BUDGET. Total cap = 6 hashtags.
  const branded = tags.branded_local.slice(0, HASHTAG_SCRAPE_BUDGET.branded_local);
  const strategic = tags.strategic.slice(0, HASHTAG_SCRAPE_BUDGET.strategic);
  const local = tags.local.slice(0, HASHTAG_SCRAPE_BUDGET.local_awareness);

  // Backfill unused slots from whichever bucket still has tags.
  const max =
    HASHTAG_SCRAPE_BUDGET.branded_local +
    HASHTAG_SCRAPE_BUDGET.strategic +
    HASHTAG_SCRAPE_BUDGET.local_awareness;
  let remaining = max - branded.length - strategic.length - local.length;
  while (remaining > 0) {
    const before = remaining;
    if (strategic.length < tags.strategic.length) {
      strategic.push(tags.strategic[strategic.length]);
      remaining--;
      if (remaining === 0) break;
    }
    if (branded.length < tags.branded_local.length) {
      branded.push(tags.branded_local[branded.length]);
      remaining--;
      if (remaining === 0) break;
    }
    if (local.length < tags.local.length) {
      local.push(tags.local[local.length]);
      remaining--;
    }
    if (remaining === before) break; // nothing left in any bucket
  }

  const capped: {
    tag: string;
    bucket: "strategic_research" | "local_awareness" | "branded_local";
  }[] = [
    ...branded.map((t) => ({ tag: t, bucket: "branded_local" as const })),
    ...strategic.map((t) => ({ tag: t, bucket: "strategic_research" as const })),
    ...local.map((t) => ({ tag: t, bucket: "local_awareness" as const })),
  ];

  let scraped = 0;
  let cacheHits = 0;
  let rowsInserted = 0;

  for (const { tag, bucket } of capped) {
    const key = makeCacheKey("instagram_hashtag", tag);
    const cached = await getCached<unknown[]>(key);
    let items: unknown[];
    if (cached) {
      console.log(`Cache hit: hashtag #${tag}`);
      items = cached;
      cacheHits += 1;
    } else {
      console.log(`Cache miss: scraping hashtag #${tag}`);
      const result = await runActorAndGetData({
        actorId: ACTORS.INSTAGRAM.id,
        actorLabel: `Hashtag #${tag}`,
        auditId,
        input: {
          ...INPUT_TEMPLATES.INSTAGRAM_HASHTAG_SEARCH,
          hashtags: [tag],
          resultsLimit: 20,
        },
      });
      items = result.items;
      scraped += items.length;
      await setCached(key, items, TTL_HASHTAG);
    }

    await db.insert(hashtags)
      .values({
        audit_id: auditId,
        hashtag: tag,
        source: bucket,
        post_count: items.length,
      });
    rowsInserted += 1;
  }

  return { scraped, cacheHits, rowsInserted };
}
