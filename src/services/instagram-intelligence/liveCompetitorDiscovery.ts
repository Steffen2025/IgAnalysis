/**
 * Live competitor discovery (reference-model track) via Apify.
 *
 * Finds real, successful-but-reachable reference accounts for ANY business and
 * persists them so the intelligence pipeline picks them up. Flow:
 *   1. Generate reference search terms (category × major metros).
 *   2. Google search scraper → candidate Instagram handles.
 *   3. ONE batched Instagram profile scrape → followers + bio + category.
 *   4. Follower-band gate (20k–100k) + content/category relevance.
 *   5. Persist survivors as reference_model competitors (+ profiles).
 *   6. ONE batched posts scrape for survivors → competitor_posts.
 *
 * Cost-controlled: caps candidates, batches runs (≈3 actor runs total), caches
 * via cacheService, and respects the per-audit Apify budget. Paid — only runs
 * when invoked explicitly (CLI `intelligence:discover`).
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import { audits, competitors, competitor_profiles, competitor_posts } from "../../db/schema.js";
import {
  ACTORS,
  INPUT_TEMPLATES,
  runActorAndGetData,
  normalizeGoogleResult,
  normalizeProfile,
  normalizePost,
  type NormalizedProfile,
} from "../apify/index.js";
import { getCached, setCached, makeCacheKey, TTL_GOOGLE, TTL_HASHTAG, TTL_POSTS, TTL_PROFILE } from "../cache/cacheService.js";
import { canSpendApifyRun } from "../audit/apifyBudget.js";
import { normalizeCategory } from "../audit/categoryNormalizer.js";
import { getClientConfig } from "./clientConfig.js";
import { generateHashtags, generateReferenceSearchTerms, generateRegionalSearchTerms, generateSearchTerms } from "./competitorDiscovery.js";
import { referenceFollowerBand, inReferenceBand, referenceMarkets } from "./referenceConfig.js";

export interface LiveDiscoveryOptions {
  maxCandidates?: number;
  maxPersisted?: number;
  postsPerProfile?: number;
}

export type CandidateSource = "hashtag" | "google" | "related";

export interface LiveDiscoveryResult {
  searchTerms: string[];
  hashtags: string[];
  candidateHandles: string[];
  candidatesBySource: { hashtag: number; google: number; related: number };
  profilesScraped: number;
  persisted: Array<{ handle: string; followers: number | null; market: string; source: CandidateSource; successScore: number; type: "reference_model" | "local_intel" }>;
  rejected: Array<{ handle: string; reason: string }>;
  apifyRuns: number;
  status: "complete" | "partial" | "no_candidates" | "budget_exhausted";
}

const HANDLE_SKIP = new Set(["instagram", "explore", "reels", "p", "reel", "stories", "accounts", "about", "developer", "directory"]);

function profileUrl(handle: string): string {
  return `https://www.instagram.com/${handle.replace(/^@/, "")}/`;
}

function extractHandles(text: string): string[] {
  const out: string[] = [];
  const re = /instagram\.com\/([A-Za-z0-9._]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const h = m[1].toLowerCase();
    if (!HANDLE_SKIP.has(h) && !h.includes(".php")) out.push(h);
  }
  return out;
}

/** Relevance of a scraped profile to the client's category vocabulary. */
function profileRelevant(p: NormalizedProfile, vocab: string[]): boolean {
  const hay = `${p.full_name ?? ""} ${p.bio ?? ""} ${p.category ?? ""} ${p.username ?? ""}`.toLowerCase();
  return vocab.some((v) => v && hay.includes(v));
}

/**
 * Engagement-based success score (0-100) from the profile's inline latestPosts.
 *
 * This is the PRIMARY signal Phase 3 ranks on: a 4k-follower account with a 12%
 * engagement rate is a better model to study than a 60k account at 0.3%. The
 * follower band becomes a soft sanity bound; success is what actually ranks.
 * Returns 0 when no post engagement is available (falls back to source/size).
 */
function successScoreFromProfile(p: NormalizedProfile): number {
  let eng = 0;
  let n = 0;
  try {
    const raw = JSON.parse(p.raw_json) as { latestPosts?: Array<{ likesCount?: number; commentsCount?: number }> };
    for (const post of raw.latestPosts ?? []) {
      const e = (post.likesCount ?? 0) + (post.commentsCount ?? 0) * 3;
      if (e > 0) { eng += e; n++; }
    }
  } catch { /* malformed payload */ }
  const followers = p.follower_count ?? 0;
  if (n === 0 || followers <= 0) return 0;
  const rate = (eng / n) / followers;               // engagement rate
  const rateScore = Math.min(100, rate * 1000);      // 0.10 ER → 100
  const magnitude = Math.min(20, Math.log10(Math.max(followers, 1)) * 4); // small size bonus
  return Math.round(Math.min(100, rateScore * 0.85 + magnitude));
}

export async function discoverAndPersistReferences(
  auditId: number,
  opts: LiveDiscoveryOptions = {},
): Promise<LiveDiscoveryResult> {
  const maxCandidates = opts.maxCandidates ?? 40;
  const maxPersisted = opts.maxPersisted ?? 8;
  const postsPerProfile = opts.postsPerProfile ?? 6;

  const audit = await first(db.select().from(audits).where(eq(audits.id, auditId)).limit(1));
  if (!audit) throw new Error(`Audit ${auditId} not found`);

  const config = getClientConfig(audit.instagram_url ?? "");
  const norm = normalizeCategory({ rawCategory: config.businessType ?? audit.business_category, fullName: audit.business_name, handle: audit.instagram_url });
  const clientHandle = (audit.instagram_url ?? "").match(/instagram\.com\/([^/?]+)/i)?.[1]?.toLowerCase() ?? "";
  const invalid = new Set((config.knownInvalidHandles ?? []).map((h) => h.toLowerCase()));
  const band = referenceFollowerBand(norm.kind);
  const vocab = Array.from(new Set([
    ...(config.categorySearchTerms ?? []).flatMap((t) => t.toLowerCase().split(/[^a-z]+/)),
    ...norm.label.toLowerCase().split(/[^a-z]+/),
  ].filter((w) => w.length >= 4)));

  // Three rings of discovery: local (city) → regional (state/nearby) → national (metros).
  const ringInput = {
    auditId, handle: clientHandle, businessType: config.businessType ?? norm.label,
    normalizedCategory: norm.label, categoryKind: norm.kind, city: audit.city ?? undefined, region: audit.service_area ?? undefined,
  };
  const localTerms = generateSearchTerms(ringInput);
  const regionalTerms = generateRegionalSearchTerms(ringInput);
  const nationalTerms = generateReferenceSearchTerms(ringInput);
  const searchTerms = Array.from(new Set([...localTerms, ...regionalTerms, ...nationalTerms]));
  const hashtags = generateHashtags(ringInput);

  const result: LiveDiscoveryResult = {
    searchTerms, hashtags, candidateHandles: [], candidatesBySource: { hashtag: 0, google: 0, related: 0 },
    profilesScraped: 0, persisted: [], rejected: [], apifyRuns: 0, status: "complete",
  };

  // Source of each candidate handle, so persistence can record provenance and we
  // can rank hashtag-sourced (engagement-proven) candidates ahead of SEO hits.
  const handleSource = new Map<string, CandidateSource>();
  const handles: string[] = [];
  const addCandidate = (h: string, source: CandidateSource) => {
    if (!h || h === clientHandle || invalid.has(h) || HANDLE_SKIP.has(h) || handleSource.has(h)) return;
    handleSource.set(h, source);
    handles.push(h);
  };

  // ── 0) Hashtag TOP posts → engagement-ranked candidate owners (PRIMARY) ──
  // Owners of the most-engaged posts on category hashtags are successful by
  // construction — the population SEO-ranked Google results systematically miss.
  if (hashtags.length > 0) {
    const hKey = makeCacheKey("ig_hashtag_top", `${norm.label}:${hashtags.join(",")}`);
    let tagItems = await getCached<unknown[]>(hKey);
    if (!tagItems) {
      if (!(await canSpendApifyRun(auditId, 1))) { result.status = "budget_exhausted"; return result; }
      // The actor ignores a bare `hashtags` array ("Empty or private data");
      // it wants explore-tag PAGE URLs via directUrls with resultsType "posts".
      const { items } = await runActorAndGetData({
        actorId: ACTORS.INSTAGRAM.id, actorLabel: `Hashtag top posts ×${hashtags.length}`, auditId,
        input: {
          directUrls: hashtags.map((h) => `https://www.instagram.com/explore/tags/${h}/`),
          resultsType: "posts",
          resultsLimit: hashtags.length * 12,
        },
      });
      tagItems = items; result.apifyRuns++;
      await setCached(hKey, items, TTL_HASHTAG);
    }
    // Rank owners by their best observed engagement (comments weighted 3×).
    const ownerEng = new Map<string, number>();
    for (const it of tagItems) {
      const r = it as { ownerUsername?: string; likesCount?: number; commentsCount?: number };
      const h = (r.ownerUsername ?? "").toLowerCase();
      if (!h) continue;
      const eng = (r.likesCount ?? 0) + (r.commentsCount ?? 0) * 3;
      ownerEng.set(h, Math.max(ownerEng.get(h) ?? 0, eng));
    }
    // Cap hashtag's share so the curated Google net still contributes its
    // (often larger, well-known) reference accounts — the two are complementary.
    const hashtagCap = Math.ceil(maxCandidates * 0.6);
    for (const [h] of [...ownerEng.entries()].sort((a, b) => b[1] - a[1])) {
      addCandidate(h, "hashtag");
      if (handles.length >= hashtagCap) break;
    }
    result.candidatesBySource.hashtag = handles.length;
  }

  // ── 1) Google search → SUPPLEMENTARY candidate handles (1 run, cached) ──
  // Force site:instagram.com so Google returns IG profile/post URLs, not the
  // company websites that dominate organic results for local/B2B categories.
  // Skipped once the hashtag pool already fills the candidate cap.
  if (handles.length < maxCandidates) {
    const queries = searchTerms.slice(0, 12).map((t) => `${t} site:instagram.com`).join("\n");
    const gKey = makeCacheKey("reference_search", `${norm.label}:siteig:${referenceMarkets().join(",")}`);
    let googleItems = await getCached<unknown[]>(gKey);
    if (!googleItems) {
      if (!(await canSpendApifyRun(auditId, 1))) { result.status = "budget_exhausted"; return result; }
      const { items } = await runActorAndGetData({
        actorId: ACTORS.GOOGLE_SEARCH.id, actorLabel: `Reference discovery: ${norm.label}`, auditId,
        input: { ...INPUT_TEMPLATES.GOOGLE_LOCAL_COMPETITORS, queries, maxPagesPerQuery: 1, resultsPerPage: 10 },
      });
      googleItems = items; result.apifyRuns++;
      await setCached(gKey, items, TTL_GOOGLE);
    }
    // google-search-scraper returns one item per query, with results nested in
    // `organicResults[]`. Dig into each result's url/displayedUrl/description.
    const pushFrom = (text: string) => {
      for (const h of extractHandles(text)) {
        addCandidate(h, "google");
        if (handles.length >= maxCandidates) break;
      }
    };
    for (const it of googleItems) {
      const page = it as { organicResults?: Array<{ url?: string; displayedUrl?: string; description?: string; title?: string }> };
      for (const r of page.organicResults ?? []) {
        pushFrom(`${r.url ?? ""} ${r.displayedUrl ?? ""} ${r.description ?? ""} ${r.title ?? ""}`);
        if (handles.length >= maxCandidates) break;
      }
      // Fallback: also scan the flat normalized form (older actor outputs).
      if (handles.length === 0) { const g = normalizeGoogleResult(it); pushFrom(`${g.url ?? ""} ${g.description ?? ""}`); }
      if (handles.length >= maxCandidates) break;
    }
  }
  result.candidateHandles = handles;
  result.candidatesBySource.google = handles.length - result.candidatesBySource.hashtag;
  if (handles.length === 0) { result.status = "no_candidates"; return result; }

  // ── 2) Batched profile scrape (1 run, cached) ──
  const pKey = makeCacheKey("ig_profiles_ref", handles.join(","));
  let profiles = await getCached<NormalizedProfile[]>(pKey);
  if (!profiles) {
    if (!(await canSpendApifyRun(auditId, 1))) { result.status = "budget_exhausted"; return result; }
    const { items } = await runActorAndGetData({
      actorId: ACTORS.INSTAGRAM.id, actorLabel: `Reference profiles ×${handles.length}`, auditId,
      input: { ...INPUT_TEMPLATES.INSTAGRAM_PROFILE_LOOKUP, directUrls: handles.map(profileUrl), resultsLimit: handles.length },
    });
    profiles = items.map((it) => normalizeProfile(it)); result.apifyRuns++;
    await setCached(pKey, profiles, TTL_PROFILE);
  }
  result.profilesScraped = profiles.length;

  // ── 2b) relatedProfiles expansion (Instagram "similar accounts") ──
  // Anchor ONLY on already-on-topic scraped profiles, then pull Instagram's own
  // related-account suggestions from their payload. These are algorithmically
  // similar to confirmed-good accounts — high-precision expansion when present
  // (the field is often empty, so this is opportunistic and adds ≤1 run).
  const seen = new Set(handles);
  const relatedHandles: string[] = [];
  for (const p of profiles) {
    if (!profileRelevant(p, vocab)) continue;
    try {
      const raw = JSON.parse(p.raw_json) as { relatedProfiles?: Array<{ username?: string }> };
      for (const rp of raw.relatedProfiles ?? []) {
        const h = (rp.username ?? "").toLowerCase();
        if (!h || h === clientHandle || invalid.has(h) || HANDLE_SKIP.has(h) || seen.has(h)) continue;
        seen.add(h);
        relatedHandles.push(h);
      }
    } catch { /* malformed payload — skip */ }
  }
  const relatedToScrape = relatedHandles.slice(0, 20);
  if (relatedToScrape.length > 0 && (await canSpendApifyRun(auditId, 1))) {
    const rKey = makeCacheKey("ig_profiles_related", relatedToScrape.join(","));
    let relatedProfiles = await getCached<NormalizedProfile[]>(rKey);
    if (!relatedProfiles) {
      const { items } = await runActorAndGetData({
        actorId: ACTORS.INSTAGRAM.id, actorLabel: `Related profiles ×${relatedToScrape.length}`, auditId,
        input: { ...INPUT_TEMPLATES.INSTAGRAM_PROFILE_LOOKUP, directUrls: relatedToScrape.map(profileUrl), resultsLimit: relatedToScrape.length },
      });
      relatedProfiles = items.map((it) => normalizeProfile(it)); result.apifyRuns++;
      await setCached(rKey, relatedProfiles, TTL_PROFILE);
    }
    for (const h of relatedToScrape) { handleSource.set(h, "related"); handles.push(h); }
    profiles = profiles.concat(relatedProfiles);
    result.candidatesBySource.related = relatedToScrape.length;
    result.profilesScraped = profiles.length;
  }

  // ── 3) Soft band + relevance gate, ranked by engagement success ──
  // Phase 3: the follower band is a SANITY bound, not a hard floor. Relevance is
  // required; we hard-reject only the truly un-learnable extremes (negligibly
  // small, or national brands whose tactics won't transfer). Everything between
  // is kept and ranked by engagement success — in-band accounts become reference
  // models, below-band-but-relevant accounts become local peers (local_intel).
  const HARD_FLOOR = 500;            // too small to learn from
  const HARD_CEIL = band.max * 5;    // national-scale brand: tactics don't transfer
  type Survivor = { p: NormalizedProfile; success: number; type: "reference_model" | "local_intel" };
  const survivors: Survivor[] = [];
  for (const p of profiles) {
    const h = (p.username ?? "").toLowerCase();
    if (!h) continue;
    const fc = p.follower_count;
    if (fc == null) { result.rejected.push({ handle: h, reason: "follower count unavailable" }); continue; }
    if (!profileRelevant(p, vocab)) { result.rejected.push({ handle: h, reason: "no category relevance in bio" }); continue; }
    if (fc < HARD_FLOOR) { result.rejected.push({ handle: h, reason: `followers ${fc} below ${HARD_FLOOR} learn-floor` }); continue; }
    if (fc > HARD_CEIL) { result.rejected.push({ handle: h, reason: `followers ${fc} above ${HARD_CEIL} (national brand — tactics don't transfer)` }); continue; }
    const type = inReferenceBand(fc, band) === "in" ? "reference_model" : "local_intel";
    survivors.push({ p, success: successScoreFromProfile(p), type });
  }
  // Engagement success is the PRIMARY ranker; source proof and size break ties.
  const srcRank = (h: string) => { const s = handleSource.get(h); return s === "hashtag" || s === "related" ? 1 : 0; };
  survivors.sort((a, b) =>
    b.success - a.success ||
    srcRank((b.p.username ?? "").toLowerCase()) - srcRank((a.p.username ?? "").toLowerCase()) ||
    (b.p.follower_count ?? 0) - (a.p.follower_count ?? 0),
  );
  const keep = survivors.slice(0, maxPersisted);
  if (keep.length === 0) { result.status = handles.length ? "partial" : "no_candidates"; return result; }

  // ── 4) Persist competitors + profiles (idempotent: clear prior live refs) ──
  const market = referenceMarkets()[0] ?? "national";
  const sourceEnum = (h: string): "hashtag_discovery" | "reference_search" =>
    handleSource.get(h) === "hashtag" ? "hashtag_discovery" : "reference_search";
  await db.delete(competitors).where(and(
    eq(competitors.audit_id, auditId),
    inArray(competitors.source, ["reference_search", "hashtag_discovery"]),
  ));
  const compIdByHandle = new Map<string, number>();
  for (const { p, success, type } of keep) {
    const h = (p.username ?? "").toLowerCase();
    const geoMarket = type === "local_intel" ? (audit.city ?? market) : market;
    const [comp] = await db.insert(competitors).values({
      audit_id: auditId, username: h, source: sourceEnum(h), competitor_type: type,
      geographic_market: geoMarket, discovery_keyword: `${norm.label} ${type === "local_intel" ? "local peer" : "reference"}`,
      discovery_query: searchTerms[0] ?? norm.label, confidence_score: success, deep_scraped: true,
    }).returning({ id: competitors.id });
    compIdByHandle.set(h, comp.id);
    await db.insert(competitor_profiles).values({
      competitor_id: comp.id, audit_id: auditId, follower_count: p.follower_count, following_count: p.following_count,
      post_count: p.post_count, is_business: p.is_business, bio: p.bio, category: p.category, raw_json: p.raw_json,
    });
    result.persisted.push({ handle: h, followers: p.follower_count, market: geoMarket, source: handleSource.get(h) ?? "google", successScore: success, type });
  }

  // ── 5) Batched posts scrape for survivors (1 run, cached) ──
  if (await canSpendApifyRun(auditId, 1)) {
    const postKey = makeCacheKey("ig_posts_ref", keep.map(({ p }) => p.username).join(","));
    let posts = await getCached<ReturnType<typeof normalizePost>[]>(postKey);
    if (!posts) {
      const { items } = await runActorAndGetData({
        actorId: ACTORS.INSTAGRAM.id, actorLabel: `Reference posts ×${keep.length}`, auditId,
        input: { ...INPUT_TEMPLATES.INSTAGRAM_POSTS_FOR_PROFILE, directUrls: keep.map(({ p }) => profileUrl(p.username ?? "")), resultsLimit: keep.length * postsPerProfile },
      });
      posts = items.map((it) => normalizePost(it)); result.apifyRuns++;
      await setCached(postKey, posts, TTL_POSTS);
    }
    // Group posts by owner handle from raw_json ownerUsername.
    for (const post of posts) {
      const owner = ((JSON.parse(post.raw_json) as { ownerUsername?: string }).ownerUsername ?? "").toLowerCase();
      const compId = compIdByHandle.get(owner);
      if (!compId) continue;
      await db.insert(competitor_posts).values({
        competitor_id: compId, audit_id: auditId, post_type: post.post_type, shortcode: post.shortcode,
        caption: post.caption, like_count: post.like_count, comment_count: post.comment_count, play_count: post.play_count,
        posted_at: post.posted_at, hashtags: post.hashtags, location_name: post.location_name, hook_text: post.hook_text,
        has_cta: post.has_cta, raw_json: post.raw_json,
      });
    }
  }

  result.status = keep.length >= 3 ? "complete" : "partial";
  return result;
}
