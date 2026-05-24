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
  getCached,
  makeCacheKey,
  setCached,
} from "../cache/cacheService.js";
import { resolveReferenceMarkets } from "./referenceMarkets.js";

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

export interface DiscoveredCompetitor {
  username: string;
  competitor_type: "local_intel" | "reference_model";
  geographic_market: string;
  discovery_query: string;
  source: "google_maps" | "reference_search";
}

interface DiscoveryCounts {
  scraped: number;
  cacheHits: number;
}

async function runGoogleQuery(
  auditId: number,
  query: string,
  counts: DiscoveryCounts,
): Promise<string[]> {
  const key = makeCacheKey("google_search", query);
  const cached = getCached<unknown[]>(key);

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
      },
    });
    results = items.map((it) => normalizeGoogleResult(it));
    counts.scraped += items.length;
    setCached(key, results, TTL_GOOGLE);
  }

  const urls: string[] = [];
  for (const r of results) {
    const obj = r as { url?: string | null; raw_json?: string };
    if (obj.url) urls.push(obj.url);
    if (obj.raw_json) {
      try {
        const raw = JSON.parse(obj.raw_json) as { organicResults?: unknown[] };
        for (const o of raw.organicResults ?? []) {
          const u = (o as { url?: string }).url;
          if (u) urls.push(u);
        }
      } catch {
        /* malformed cached raw_json — skip */
      }
    }
  }

  const handles: string[] = [];
  for (const url of urls) {
    const m = url.match(IG_HANDLE_RE);
    if (!m) continue;
    const handle = m[1].toLowerCase();
    if (HANDLE_SKIP.has(handle)) continue;
    if (!handles.includes(handle)) handles.push(handle);
  }
  return handles;
}

export async function discoverLocalCompetitors(
  audit: Audit,
  counts: DiscoveryCounts = { scraped: 0, cacheHits: 0 },
): Promise<{ found: DiscoveredCompetitor[]; counts: DiscoveryCounts }> {
  const category = audit.business_category ?? "";
  const city = audit.city ?? "";
  if (!category || !city) return { found: [], counts };

  const market = `${city}${audit.service_area ? `, ${extractRegion(audit.service_area) ?? ""}` : ""}`.replace(/, $/, "");
  const queries = [`${category} ${city} instagram`, `best ${category} ${city}`];

  const seen = new Set<string>();
  const found: DiscoveredCompetitor[] = [];

  for (const q of queries) {
    const handles = await runGoogleQuery(audit.id, q, counts);
    for (const h of handles) {
      if (seen.has(h)) continue;
      seen.add(h);
      found.push({
        username: h,
        competitor_type: "local_intel",
        geographic_market: market || city,
        discovery_query: q,
        source: "google_maps",
      });
      if (found.length >= 4) break;
    }
    if (found.length >= 4) break;
  }

  return { found, counts };
}

export async function discoverReferenceCompetitors(
  audit: Audit,
  counts: DiscoveryCounts = { scraped: 0, cacheHits: 0 },
): Promise<{ found: DiscoveredCompetitor[]; counts: DiscoveryCounts }> {
  const category = audit.business_category ?? "";
  if (!category) return { found: [], counts };

  const markets = resolveReferenceMarkets(audit);
  const seen = new Set<string>();
  const found: DiscoveredCompetitor[] = [];

  for (const market of markets) {
    const refCity = market.split(",")[0].trim();
    const query = `${category} ${refCity} instagram`;
    const handles = await runGoogleQuery(audit.id, query, counts);
    for (const h of handles) {
      if (seen.has(h)) continue;
      seen.add(h);
      found.push({
        username: h,
        competitor_type: "reference_model",
        geographic_market: market,
        discovery_query: query,
        source: "reference_search",
      });
      if (found.length >= 4) break;
    }
    if (found.length >= 4) break;
  }

  return { found, counts };
}

export async function discoverCompetitors(
  audit: Audit,
): Promise<{
  inserted: DiscoveredCompetitor[];
  counts: DiscoveryCounts;
  skippedDuplicates: string[];
}> {
  const counts: DiscoveryCounts = { scraped: 0, cacheHits: 0 };
  const mode = audit.mode ?? "mixed";

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

  // HARD RULE: local wins. Any handle that appears in both is local_intel only.
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
    // mixed: 3 + 3
    inserted = [...local.slice(0, 3), ...filteredReference.slice(0, 3)];
  }

  if (inserted.length > 0) {
    db.insert(competitors)
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
      )
      .run();
  }

  return { inserted, counts, skippedDuplicates };
}

function extractRegion(serviceArea: string | null): string | null {
  if (!serviceArea) return null;
  const m = serviceArea.match(/\b([A-Z]{2})\b/);
  return m ? m[1] : null;
}
