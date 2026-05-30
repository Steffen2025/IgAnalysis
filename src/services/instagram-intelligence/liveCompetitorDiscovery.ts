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

import { and, eq } from "drizzle-orm";
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

export interface LiveDiscoveryResult {
  searchTerms: string[];
  hashtags: string[];
  candidateHandles: string[];
  candidatesBySource: { hashtag: number; google: number };
  profilesScraped: number;
  persisted: Array<{ handle: string; followers: number | null; market: string; source: "hashtag" | "google" }>;
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
    searchTerms, hashtags, candidateHandles: [], candidatesBySource: { hashtag: 0, google: 0 },
    profilesScraped: 0, persisted: [], rejected: [], apifyRuns: 0, status: "complete",
  };

  // Source of each candidate handle, so persistence can record provenance and we
  // can rank hashtag-sourced (engagement-proven) candidates ahead of SEO hits.
  const handleSource = new Map<string, "hashtag" | "google">();
  const handles: string[] = [];
  const addCandidate = (h: string, source: "hashtag" | "google") => {
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

  // ── 3) Band + relevance gate ──
  const survivors: NormalizedProfile[] = [];
  for (const p of profiles) {
    const h = (p.username ?? "").toLowerCase();
    if (!h) continue;
    const bandState = inReferenceBand(p.follower_count, band);
    if (bandState === "out") { result.rejected.push({ handle: h, reason: `followers ${p.follower_count} out of ${band.min}-${band.max} band` }); continue; }
    if (bandState === "unknown") { result.rejected.push({ handle: h, reason: "follower count unavailable" }); continue; }
    if (!profileRelevant(p, vocab)) { result.rejected.push({ handle: h, reason: "no category relevance in bio" }); continue; }
    survivors.push(p);
  }
  // Rank hashtag-sourced (engagement-proven) survivors first, then by followers.
  const srcRank = (p: NormalizedProfile) => (handleSource.get((p.username ?? "").toLowerCase()) === "hashtag" ? 1 : 0);
  survivors.sort((a, b) => srcRank(b) - srcRank(a) || (b.follower_count ?? 0) - (a.follower_count ?? 0));
  const keep = survivors.slice(0, maxPersisted);
  if (keep.length === 0) { result.status = handles.length ? "partial" : "no_candidates"; return result; }

  // ── 4) Persist competitors + profiles (idempotent: clear prior live refs) ──
  const market = referenceMarkets()[0] ?? "national";
  await db.delete(competitors).where(and(eq(competitors.audit_id, auditId), eq(competitors.source, "reference_search")));
  const compIdByHandle = new Map<string, number>();
  for (const p of keep) {
    const h = (p.username ?? "").toLowerCase();
    const [comp] = await db.insert(competitors).values({
      audit_id: auditId, username: h, source: "reference_search", competitor_type: "reference_model",
      geographic_market: market, discovery_keyword: `${norm.label} reference`, discovery_query: searchTerms[0] ?? norm.label,
      confidence_score: 80, deep_scraped: true,
    }).returning({ id: competitors.id });
    compIdByHandle.set(h, comp.id);
    await db.insert(competitor_profiles).values({
      competitor_id: comp.id, audit_id: auditId, follower_count: p.follower_count, following_count: p.following_count,
      post_count: p.post_count, is_business: p.is_business, bio: p.bio, category: p.category, raw_json: p.raw_json,
    });
    result.persisted.push({ handle: h, followers: p.follower_count, market, source: handleSource.get(h) ?? "google" });
  }

  // ── 5) Batched posts scrape for survivors (1 run, cached) ──
  if (await canSpendApifyRun(auditId, 1)) {
    const postKey = makeCacheKey("ig_posts_ref", keep.map((p) => p.username).join(","));
    let posts = await getCached<ReturnType<typeof normalizePost>[]>(postKey);
    if (!posts) {
      const { items } = await runActorAndGetData({
        actorId: ACTORS.INSTAGRAM.id, actorLabel: `Reference posts ×${keep.length}`, auditId,
        input: { ...INPUT_TEMPLATES.INSTAGRAM_POSTS_FOR_PROFILE, directUrls: keep.map((p) => profileUrl(p.username ?? "")), resultsLimit: keep.length * postsPerProfile },
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
