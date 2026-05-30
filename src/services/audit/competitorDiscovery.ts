import { db } from "../../db/index.js";
import { competitors, type Audit } from "../../db/schema.js";
import {
  ACTORS,
  INPUT_TEMPLATES,
  normalizeGoogleResult,
  runActorAndGetData,
} from "../apify/index.js";
import {
  TTL_GOOGLE,
  TTL_HASHTAG,
  TTL_POSTS,
  getCached,
  makeCacheKey,
  setCached,
} from "../cache/cacheService.js";
import {
  formatMarketLabel,
  resolveReferenceMarkets,
} from "./referenceMarkets.js";
import { normalizeCategory } from "./categoryNormalizer.js";

/**
 * Resolve a clean, search-safe category for discovery queries. Guards against
 * a stale junk value ("None,Software") leaking into Google/Apify queries and
 * matching irrelevant accounts (music/tattoo/event handles containing "none").
 */
function discoveryCategory(audit: Audit): string {
  return normalizeCategory({
    rawCategory: audit.business_category,
    fullName: audit.business_name,
    handle: audit.instagram_url,
  }).label;
}
import {
  buildGeoMarkets,
  tierRank,
  type GeoMarket,
  type MarketTier,
} from "./geoMarketExpansion.js";
import { canSpendApifyRun } from "./apifyBudget.js";
import { runProfileGate } from "./competitorProfileGate.js";

const IG_HANDLE_RE = /instagram\.com\/([A-Za-z0-9._]+)(?:\/|$|\?)/i;
const HANDLE_SKIP = new Set([
  "p",
  "reel",
  "reels",
  "explore",
  "stories",
  "tv",
  "accounts",
  "about",
  "directory",
  "developer",
  "legal",
]);

/** Minimum locals we want before stopping geo expansion. */
const MIN_LOCAL_PRESENTATION = 3;
/** Pool size — scrape/confidence picks the best for the deck. */
const LOCAL_DISCOVERY_TARGET = 14;
const REFERENCE_PER_MARKET = 3;
const MIXED_LOCAL_INSERT = 6;
const MIXED_REFERENCE_INSERT = 6;

const JUNK_URL_PATTERNS =
  /\/(p|reel|reels|explore|stories|tv|accounts|about|legal|directory)\//i;

function clientHandle(audit: Audit): string | null {
  const m = (audit.instagram_url ?? "").match(IG_HANDLE_RE);
  return m ? m[1].toLowerCase() : null;
}

function isExcludedHandle(handle: string, audit: Audit): boolean {
  const client = clientHandle(audit);
  if (client && handle === client) return true;
  if (handle === "botlogix" || handle.startsWith("botlogix")) return true;
  return false;
}

function categorySearchPhrases(category: string): string[] {
  const c = category.trim();
  const lower = c.toLowerCase();
  const out = new Set<string>([c]);
  if (/marketing|digital|social media|agency|advertis/.test(lower)) {
    out.add("marketing agency");
    out.add("digital marketing agency");
    out.add("social media marketing agency");
    out.add("social media agency");
  }
  if (/real estate|realtor/.test(lower)) {
    out.add("realtor");
    out.add("real estate agent");
  }
  if (/dental|dentist/.test(lower)) {
    out.add("dentist");
    out.add("dental clinic");
  }
  if (/fitness|gym|personal train/.test(lower)) {
    out.add("personal trainer");
    out.add("gym");
  }
  if (/restaurant|cafe|food/.test(lower)) {
    out.add("restaurant");
    out.add("local restaurant");
  }
  return [...out];
}

function scoreGoogleRelevance(
  title: string | null,
  description: string | null,
  category: string,
): number {
  const text = `${title ?? ""} ${description ?? ""}`.toLowerCase();
  let score = 1;
  if (/wikipedia|pinterest|facebook\.com|linkedin\.com|youtube\.com/.test(text)) {
    score -= 8;
  }
  if (/top \d+ |best \d+ |list of |directory/.test(text)) {
    score -= 3;
  }
  for (const phrase of categorySearchPhrases(category)) {
    const token = phrase.toLowerCase().split(/\s+/)[0];
    if (token.length > 3 && text.includes(token)) score += 2;
  }
  if (/instagram/.test(text)) score += 1;
  return score;
}

function buildQueriesForMarket(
  category: string,
  geo: GeoMarket,
  clientCity: string,
): string[] {
  const phrases = categorySearchPhrases(category);
  const queries: string[] = [];
  for (const phrase of phrases) {
    queries.push(`${phrase} ${geo.searchTerm} instagram`);
    queries.push(`${phrase} ${geo.searchTerm} site:instagram.com`);
    if (geo.tier === "primary") {
      queries.push(`"${phrase}" "${clientCity}" instagram`);
    }
  }
  if (geo.tier === "primary") {
    queries.push(`best ${category} ${geo.searchTerm}`);
    queries.push(`${category} near ${clientCity} instagram`);
  }
  return [...new Set(queries)];
}

function localHashtagCandidates(city: string, category: string): string[] {
  const citySlug = city.toLowerCase().replace(/[^a-z0-9]/g, "");
  const catSlug = category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  const tags = new Set<string>();
  if (citySlug) {
    tags.add(`${citySlug}business`);
    tags.add(`${citySlug}local`);
    tags.add(`support${citySlug}`);
  }
  if (catSlug) tags.add(catSlug);
  if (/marketing|agency/.test(category.toLowerCase())) {
    tags.add("marketingagency");
    tags.add("socialmediamarketing");
  }
  return [...tags].slice(0, 5);
}

function handlesFromInstagramItems(items: unknown[]): string[] {
  const handles: string[] = [];
  for (const item of items) {
    const r = item as Record<string, unknown>;
    const candidates: string[] = [];
    if (typeof r.ownerUsername === "string") candidates.push(r.ownerUsername);
    if (typeof r.username === "string") candidates.push(r.username);
    if (typeof r.url === "string") {
      const m = r.url.match(IG_HANDLE_RE);
      if (m) candidates.push(m[1]);
    }
    for (const c of candidates) {
      const handle = c.toLowerCase();
      if (HANDLE_SKIP.has(handle)) continue;
      if (!handles.includes(handle)) handles.push(handle);
    }
  }
  return handles;
}

export interface DiscoveredCompetitor {
  username: string;
  competitor_type: "local_intel" | "reference_model";
  geographic_market: string;
  discovery_query: string;
  source: "google_maps" | "reference_search" | "instagram_search" | "hashtag_discovery";
  market_tier: MarketTier;
}

interface DiscoveryCounts {
  scraped: number;
  cacheHits: number;
}

interface GoogleHandleHit {
  handle: string;
  relevanceScore: number;
}

async function runGoogleQuery(
  auditId: number,
  query: string,
  category: string,
  counts: DiscoveryCounts,
  resultsPerPage: number,
): Promise<GoogleHandleHit[]> {
  const key = makeCacheKey("google_search", `${query}:${resultsPerPage}`);
  const cached = await getCached<unknown[]>(key);

  let results: unknown[];
  if (cached) {
    console.log(`Cache hit: google search ("${query}")`);
    results = cached;
    counts.cacheHits += 1;
  } else {
    console.log(`Cache miss: scraping google search ("${query}")`);
    const { items } = await runActorAndGetData({
      actorId: ACTORS.GOOGLE_SEARCH.id,
      actorLabel: `Google discovery: ${query}`,
      auditId,
      input: {
        ...INPUT_TEMPLATES.GOOGLE_LOCAL_COMPETITORS,
        queries: query,
        resultsPerPage,
      },
    });
    results = items.map((it) => normalizeGoogleResult(it));
    counts.scraped += items.length;
    await setCached(key, results, TTL_GOOGLE);
  }

  const byHandle = new Map<string, GoogleHandleHit>();

  const consider = (url: string, title: string | null, description: string | null) => {
    if (JUNK_URL_PATTERNS.test(url)) return;
    const m = url.match(IG_HANDLE_RE);
    if (!m) return;
    const handle = m[1].toLowerCase();
    if (HANDLE_SKIP.has(handle)) return;
    const relevanceScore = scoreGoogleRelevance(title, description, category);
    const existing = byHandle.get(handle);
    if (!existing || relevanceScore > existing.relevanceScore) {
      byHandle.set(handle, { handle, relevanceScore });
    }
  };

  for (const r of results) {
    const obj = r as { url?: string | null; title?: string | null; description?: string | null; raw_json?: string };
    if (obj.url) {
      consider(obj.url, obj.title ?? null, obj.description ?? null);
    }
    if (obj.raw_json) {
      try {
        const raw = JSON.parse(obj.raw_json) as { organicResults?: Array<{ url?: string; title?: string; description?: string }> };
        for (const o of raw.organicResults ?? []) {
          if (o.url) consider(o.url, o.title ?? null, o.description ?? null);
        }
      } catch {
        /* skip malformed cache */
      }
    }
  }

  return [...byHandle.values()].sort((a, b) => b.relevanceScore - a.relevanceScore);
}

async function runInstagramPlaceSearch(
  auditId: number,
  placeQuery: string,
  counts: DiscoveryCounts,
): Promise<string[]> {
  const key = makeCacheKey("instagram_place", placeQuery);
  const cached = await getCached<unknown[]>(key);

  let items: unknown[];
  if (cached) {
    console.log(`Cache hit: instagram place ("${placeQuery}")`);
    items = cached;
    counts.cacheHits += 1;
  } else {
    console.log(`Cache miss: instagram place search ("${placeQuery}")`);
    const { items: scraped } = await runActorAndGetData({
      actorId: ACTORS.INSTAGRAM.id,
      actorLabel: `IG place: ${placeQuery}`,
      auditId,
      input: {
        ...INPUT_TEMPLATES.INSTAGRAM_LOCATION_SEARCH,
        searchQueries: [placeQuery],
        resultsLimit: 30,
      },
    });
    items = scraped;
    counts.scraped += scraped.length;
    await setCached(key, items, TTL_POSTS);
  }

  return handlesFromInstagramItems(items);
}

async function runInstagramHashtagSearch(
  auditId: number,
  hashtag: string,
  counts: DiscoveryCounts,
): Promise<string[]> {
  const tag = hashtag.replace(/^#/, "");
  const key = makeCacheKey("instagram_hashtag_discovery", tag);
  const cached = await getCached<unknown[]>(key);

  let items: unknown[];
  if (cached) {
    items = cached;
    counts.cacheHits += 1;
  } else {
    const { items: scraped } = await runActorAndGetData({
      actorId: ACTORS.INSTAGRAM.id,
      actorLabel: `IG hashtag discovery #${tag}`,
      auditId,
      input: {
        ...INPUT_TEMPLATES.INSTAGRAM_HASHTAG_SEARCH,
        hashtags: [tag],
        resultsLimit: 25,
      },
    });
    items = scraped;
    counts.scraped += scraped.length;
    await setCached(key, items, TTL_HASHTAG);
  }

  return handlesFromInstagramItems(items);
}

function pushHandle(
  audit: Audit,
  found: DiscoveredCompetitor[],
  seen: Set<string>,
  handle: string,
  entry: Omit<DiscoveredCompetitor, "username">,
): boolean {
  if (seen.has(handle) || isExcludedHandle(handle, audit)) return false;
  seen.add(handle);
  found.push({ username: handle, ...entry });
  return true;
}

function sortLocalPool(local: DiscoveredCompetitor[]): DiscoveredCompetitor[] {
  return [...local].sort((a, b) => {
    const tier = tierRank(a.market_tier) - tierRank(b.market_tier);
    if (tier !== 0) return tier;
    return a.username.localeCompare(b.username);
  });
}

export async function discoverLocalCompetitors(
  audit: Audit,
  counts: DiscoveryCounts = { scraped: 0, cacheHits: 0 },
): Promise<{ found: DiscoveredCompetitor[]; counts: DiscoveryCounts }> {
  const category = discoveryCategory(audit);
  const city = audit.city ?? "";
  if (!category || !city) return { found: [], counts };

  const geoMarkets = buildGeoMarkets(city, audit.service_area);
  const seen = new Set<string>();
  const found: DiscoveredCompetitor[] = [];

  const runGeoTier = async (tier: MarketTier) => {
    const tierMarkets = geoMarkets.filter((g) => g.tier === tier);
    const resultsPerPage = tier === "primary" ? 10 : 15;

    for (const geo of tierMarkets) {
      const queries = buildQueriesForMarket(category, geo, city);
      for (const q of queries) {
        const hits = await runGoogleQuery(audit.id, q, category, counts, resultsPerPage);
        for (const hit of hits) {
          if (hit.relevanceScore < 0) continue;
          pushHandle(audit, found, seen, hit.handle, {
            competitor_type: "local_intel",
            geographic_market: geo.label,
            discovery_query: q,
            source: "google_maps",
            market_tier: geo.tier,
          });
          if (found.length >= LOCAL_DISCOVERY_TARGET) return;
        }
      }
    }
  };

  await runGeoTier("primary");

  if (found.length < MIN_LOCAL_PRESENTATION) {
    console.log(
      `Local discovery thin (${found.length}/${MIN_LOCAL_PRESENTATION}) — expanding to nearby markets`,
    );
    await runGeoTier("nearby");
  }

  if (found.length < MIN_LOCAL_PRESENTATION) {
    console.log(
      `Local discovery still thin (${found.length}) — expanding to regional markets`,
    );
    await runGeoTier("regional");
  }

  if (found.length < LOCAL_DISCOVERY_TARGET) {
    const placeMarkets = geoMarkets.slice(0, 6);
    for (const geo of placeMarkets) {
      const handles = await runInstagramPlaceSearch(audit.id, geo.searchTerm, counts);
      for (const h of handles) {
        pushHandle(audit, found, seen, h, {
          competitor_type: "local_intel",
          geographic_market: geo.label,
          discovery_query: `instagram place: ${geo.searchTerm}`,
          source: "instagram_search",
          market_tier: geo.tier,
        });
        if (found.length >= LOCAL_DISCOVERY_TARGET) break;
      }
      if (found.length >= LOCAL_DISCOVERY_TARGET) break;
    }
  }

  if (found.length < MIN_LOCAL_PRESENTATION) {
    const tags = localHashtagCandidates(city, category);
    for (const tag of tags) {
      const handles = await runInstagramHashtagSearch(audit.id, tag, counts);
      const primaryLabel = formatMarketLabel(city, audit.service_area);
      for (const h of handles) {
        pushHandle(audit, found, seen, h, {
          competitor_type: "local_intel",
          geographic_market: primaryLabel,
          discovery_query: `hashtag #${tag}`,
          source: "hashtag_discovery",
          market_tier: "primary",
        });
        if (found.length >= LOCAL_DISCOVERY_TARGET) break;
      }
      if (found.length >= LOCAL_DISCOVERY_TARGET) break;
    }
  }

  const sorted = sortLocalPool(found);
  console.log(
    `Local discovery: ${sorted.length} handles (primary=${sorted.filter((c) => c.market_tier === "primary").length}, nearby=${sorted.filter((c) => c.market_tier === "nearby").length}, regional=${sorted.filter((c) => c.market_tier === "regional").length})`,
  );

  return { found: sorted, counts };
}

export async function discoverReferenceCompetitors(
  audit: Audit,
  counts: DiscoveryCounts = { scraped: 0, cacheHits: 0 },
): Promise<{ found: DiscoveredCompetitor[]; counts: DiscoveryCounts }> {
  const category = discoveryCategory(audit);
  if (!category) return { found: [], counts };

  const markets = resolveReferenceMarkets(audit);
  const seen = new Set<string>();
  const found: DiscoveredCompetitor[] = [];
  const phrases = categorySearchPhrases(category);

  for (const market of markets) {
    let marketCount = 0;
    const marketQueries = [
      ...phrases.map((p) => `${p} ${market} instagram`),
      ...phrases.map((p) => `${p} ${market} site:instagram.com`),
      `${category} ${market} marketing instagram`,
    ];

    for (const query of marketQueries) {
      const hits = await runGoogleQuery(audit.id, query, category, counts, 12);
      for (const hit of hits) {
        if (hit.relevanceScore < 0) continue;
        if (pushHandle(audit, found, seen, hit.handle, {
          competitor_type: "reference_model",
          geographic_market: market,
          discovery_query: query,
          source: "reference_search",
          market_tier: "primary",
        })) {
          marketCount += 1;
        }
        if (marketCount >= REFERENCE_PER_MARKET) break;
      }
      if (marketCount >= REFERENCE_PER_MARKET) break;
    }
  }

  return { found, counts };
}

export interface DiscoverCompetitorsOptions {
  /** Usernames already on the audit — supplementary runs skip these. */
  excludeUsernames?: Set<string>;
}

export async function discoverCompetitors(
  audit: Audit,
  options: DiscoverCompetitorsOptions = {},
): Promise<{
  inserted: DiscoveredCompetitor[];
  counts: DiscoveryCounts;
  skippedDuplicates: string[];
}> {
  const counts: DiscoveryCounts = { scraped: 0, cacheHits: 0 };
  const mode = audit.mode ?? "mixed";
  const exclude = options.excludeUsernames ?? new Set<string>();

  let local: DiscoveredCompetitor[] = [];
  let reference: DiscoveredCompetitor[] = [];

  if (mode === "local_only" || mode === "mixed") {
    const r = await discoverLocalCompetitors(audit, counts);
    local = r.found;
  }
  if (mode === "reference_only" || mode === "mixed") {
    const r = await discoverReferenceCompetitors(audit, counts);
    reference = r.found;
  }

  const localSet = new Set(local.map((c) => c.username));
  const skippedDuplicates: string[] = [];
  const filteredReference = reference.filter((c) => {
    if (localSet.has(c.username)) {
      console.log(`Skipped ${c.username} from reference (already in local intel)`);
      skippedDuplicates.push(c.username);
      return false;
    }
    return true;
  });

  let inserted: DiscoveredCompetitor[];
  if (mode === "local_only") {
    inserted = local.slice(0, 6);
  } else if (mode === "reference_only") {
    inserted = filteredReference.slice(0, 6);
  } else {
    inserted = [
      ...local.slice(0, MIXED_LOCAL_INSERT),
      ...filteredReference.slice(0, MIXED_REFERENCE_INSERT),
    ];
  }

  if (exclude.size > 0) {
    inserted = inserted.filter((c) => !exclude.has(c.username.toLowerCase()));
  }

  const gated: DiscoveredCompetitor[] = [];
  let gateRejected = 0;
  for (const c of inserted) {
    if (!(await canSpendApifyRun(audit.id, 1))) {
      console.warn(`Apify budget cap — stopping profile gate (${gated.length} passed so far)`);
      break;
    }
    const gate = await runProfileGate(
      audit.id,
      c.username,
      c.competitor_type,
      audit.business_category,
    );
    counts.scraped += gate.scraped;
    counts.cacheHits += gate.cacheHits;
    if (!gate.passed) {
      gateRejected += 1;
      console.log(`Profile gate skip @${c.username}: ${gate.reasons.join(", ")}`);
      continue;
    }
    gated.push(c);
  }
  inserted = gated;

  if (inserted.length > 0) {
    await db.insert(competitors)
      .values(
        inserted.map((c) => ({
          audit_id: audit.id,
          username: c.username,
          source: c.source,
          discovery_keyword: c.discovery_query,
          competitor_type: c.competitor_type,
          geographic_market: c.geographic_market,
          discovery_query: c.discovery_query,
        })),
      );
  }

  const expandedLocal = local.filter((c) => c.market_tier !== "primary").length;
  console.log(
    `Discovery pool: ${local.length} local (${expandedLocal} geo-expanded), ${filteredReference.length} reference → ${inserted.length} inserted (${gateRejected} gated out)`,
  );

  return { inserted, counts, skippedDuplicates };
}
