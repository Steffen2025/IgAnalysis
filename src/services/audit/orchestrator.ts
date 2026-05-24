import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  audits,
  competitors,
  posts,
  profiles,
  scrape_jobs,
  type Audit,
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
import { AuditPhase, getPhase, setPhase } from "./auditState.js";
import { discoverCompetitors } from "./competitorDiscovery.js";
import { scrapeCompetitorProfileAndPosts } from "./competitorScrape.js";
import {
  collectTopHashtags,
  scrapeHashtagPosts,
} from "./hashtagAnalysis.js";

export interface RunAuditResult {
  auditId: number;
  tier: "preview" | "full";
  finalPhase: AuditPhase;
  itemsScraped: number;
  cacheHits: number;
  errors: string[];
}

interface Ctx {
  auditId: number;
  tier: "preview" | "full";
  itemsScraped: number;
  cacheHits: number;
  errors: string[];
}

function loadAudit(auditId: number): Audit {
  const rows = db.select().from(audits).where(eq(audits.id, auditId)).limit(1).all();
  if (rows.length === 0) throw new Error(`Audit ${auditId} not found`);
  return rows[0];
}

export function usernameFromUrl(url: string | null | undefined): string {
  if (!url) throw new Error("instagram_url is missing");
  const cleaned = url.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
  const parts = cleaned
    .split("/")
    .filter((p) => p && p !== "www.instagram.com" && p !== "instagram.com");
  if (parts.length === 0) throw new Error(`Cannot derive username from URL: ${url}`);
  return parts[0].toLowerCase();
}

async function doClientProfile(ctx: Ctx, audit: Audit): Promise<void> {
  const username = usernameFromUrl(audit.instagram_url);
  const key = makeCacheKey("instagram_profile", username);
  const cached = getCached<NormalizedProfile>(key);

  let normalized: NormalizedProfile;
  if (cached) {
    console.log(`Cache hit: client profile (${username})`);
    normalized = cached;
    ctx.cacheHits += 1;
  } else {
    console.log(`Cache miss: scraping client profile (${username})`);
    const { items } = await runActorAndGetData({
      actorId: ACTORS.INSTAGRAM.id,
      actorLabel: "Client profile lookup",
      auditId: ctx.auditId,
      input: {
        ...INPUT_TEMPLATES.INSTAGRAM_PROFILE_LOOKUP,
        directUrls: [audit.instagram_url!],
      },
    });
    if (items.length === 0) throw new Error("Profile scrape returned no items");
    normalized = normalizeProfile(items[0]);
    ctx.itemsScraped += items.length;
    setCached(key, normalized, TTL_PROFILE);
  }

  db.insert(profiles).values({ audit_id: ctx.auditId, ...normalized }).run();
  setPhase(ctx.auditId, AuditPhase.CLIENT_PROFILE);
}

async function doClientPosts(ctx: Ctx, audit: Audit): Promise<void> {
  const username = usernameFromUrl(audit.instagram_url);
  const postsLimit = ctx.tier === "preview" ? 10 : 50;
  const key = makeCacheKey("instagram_posts", `${username}:${postsLimit}`);

  const profileRows = db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.audit_id, ctx.auditId))
    .limit(1)
    .all();
  if (profileRows.length === 0) throw new Error("No profile row for audit — cannot link posts");
  const profileId = profileRows[0].id;

  const cached = getCached<NormalizedPost[]>(key);
  let normalized: NormalizedPost[];
  if (cached) {
    console.log(`Cache hit: client posts (${username}, limit=${postsLimit})`);
    normalized = cached;
    ctx.cacheHits += 1;
  } else {
    console.log(`Cache miss: scraping client posts (${username}, limit=${postsLimit})`);
    const { items } = await runActorAndGetData({
      actorId: ACTORS.INSTAGRAM.id,
      actorLabel: `Client posts (limit ${postsLimit})`,
      auditId: ctx.auditId,
      input: {
        ...INPUT_TEMPLATES.INSTAGRAM_POSTS_FOR_PROFILE,
        directUrls: [audit.instagram_url!],
        resultsLimit: postsLimit,
      },
    });
    normalized = items.map((it) => normalizePost(it));
    ctx.itemsScraped += items.length;
    setCached(key, normalized, TTL_POSTS);
  }

  if (normalized.length > 0) {
    db.insert(posts)
      .values(
        normalized.map((p) => ({
          audit_id: ctx.auditId,
          profile_id: profileId,
          ...p,
        })),
      )
      .run();
  }

  setPhase(ctx.auditId, AuditPhase.CLIENT_POSTS);
}

async function doReferenceDiscovery(ctx: Ctx, audit: Audit): Promise<void> {
  // Unified discovery: local + reference passes with the "local wins" dedup rule.
  // Resumable: if competitors already exist for this audit, skip re-discovery.
  const existing = db
    .select({ id: competitors.id })
    .from(competitors)
    .where(eq(competitors.audit_id, ctx.auditId))
    .all();

  if (existing.length === 0) {
    const { inserted, counts } = await discoverCompetitors(audit);
    ctx.itemsScraped += counts.scraped;
    ctx.cacheHits += counts.cacheHits;
    const localCount = inserted.filter((c) => c.competitor_type === "local_intel").length;
    const referenceCount = inserted.filter((c) => c.competitor_type === "reference_model").length;
    console.log(
      `Discovered ${localCount} local_intel, ${referenceCount} reference_model`,
    );
  } else {
    console.log(`Skipping discovery — ${existing.length} competitors already on audit`);
  }
  setPhase(ctx.auditId, AuditPhase.REFERENCE_DISCOVERY);
}

async function doCompetitorScraping(ctx: Ctx): Promise<void> {
  const comps = db
    .select()
    .from(competitors)
    .where(eq(competitors.audit_id, ctx.auditId))
    .all();

  for (const c of comps) {
    // Resumability: skip competitors already deep-scraped, AND any whose first
    // pass already completed (scrape_jobs row tied to this audit + label).
    if (c.deep_scraped) {
      console.log(`Already deep_scraped @${c.username}, skipping`);
      continue;
    }
    const priorJobs = db
      .select({ id: scrape_jobs.id })
      .from(scrape_jobs)
      .where(
        and(
          eq(scrape_jobs.audit_id, ctx.auditId),
          eq(scrape_jobs.status, "complete"),
        ),
      )
      .all();
    const alreadyTouched = priorJobs.length > 0 && c.confidence_score !== null;
    if (alreadyTouched && !c.deep_scraped && c.skip_reason) {
      console.log(`Previously gated @${c.username} (skip_reason=${c.skip_reason}), not retrying`);
      continue;
    }

    try {
      const r = await scrapeCompetitorProfileAndPosts({
        auditId: ctx.auditId,
        competitorId: c.id,
        username: c.username,
        initialLimit: 10,
        deepLimit: 40,
      });
      ctx.itemsScraped += r.scraped;
      ctx.cacheHits += r.cacheHits;
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      console.error(`Competitor @${c.username} failed: ${msg}`);
      ctx.errors.push(`@${c.username}: ${msg}`);
      db.update(competitors)
        .set({ skip_reason: `scrape_error: ${msg.slice(0, 200)}` })
        .where(eq(competitors.id, c.id))
        .run();
    }
  }

  setPhase(ctx.auditId, AuditPhase.COMPETITORS_DONE);
}

async function doHashtagAnalysis(ctx: Ctx): Promise<void> {
  const top = await collectTopHashtags(ctx.auditId);
  console.log(
    `Branded-local: ${top.branded_local.join(", ") || "(none)"} | ` +
      `Strategic: ${top.strategic.join(", ") || "(none)"} | ` +
      `Local awareness: ${top.local.join(", ") || "(none)"}`,
  );
  const r = await scrapeHashtagPosts(ctx.auditId, top);
  ctx.itemsScraped += r.scraped;
  ctx.cacheHits += r.cacheHits;
  setPhase(ctx.auditId, AuditPhase.HASHTAGS_DONE);
}

function summary(ctx: Ctx, finalPhase: AuditPhase): RunAuditResult {
  console.log(
    `Audit ${ctx.auditId} (${ctx.tier}): phase=${finalPhase} scraped=${ctx.itemsScraped} cached=${ctx.cacheHits} errors=${ctx.errors.length}`,
  );
  return {
    auditId: ctx.auditId,
    tier: ctx.tier,
    finalPhase,
    itemsScraped: ctx.itemsScraped,
    cacheHits: ctx.cacheHits,
    errors: ctx.errors,
  };
}

export async function runAudit(params: {
  auditId: number;
  tier: "preview" | "full";
}): Promise<RunAuditResult> {
  const ctx: Ctx = {
    auditId: params.auditId,
    tier: params.tier,
    itemsScraped: 0,
    cacheHits: 0,
    errors: [],
  };

  let audit: Audit;
  try {
    audit = loadAudit(ctx.auditId);
  } catch (err) {
    ctx.errors.push((err as Error).message);
    return summary(ctx, AuditPhase.FAILED);
  }

  let phase = getPhase(ctx.auditId);
  let guard = 0;

  while (phase !== AuditPhase.READY_FOR_ANALYSIS && phase !== AuditPhase.FAILED) {
    if (++guard > 30) {
      ctx.errors.push(`State machine guard tripped at phase=${phase}`);
      setPhase(ctx.auditId, AuditPhase.FAILED);
      return summary(ctx, AuditPhase.FAILED);
    }

    try {
      switch (phase) {
        case AuditPhase.CREATED:
          await doClientProfile(ctx, audit);
          break;
        case AuditPhase.CLIENT_PROFILE:
          await doClientPosts(ctx, audit);
          if (ctx.tier === "preview") {
            setPhase(ctx.auditId, AuditPhase.READY_FOR_ANALYSIS);
            return summary(ctx, AuditPhase.READY_FOR_ANALYSIS);
          }
          break;
        case AuditPhase.CLIENT_POSTS:
          // LOCAL_DISCOVERY is now a transition marker; the unified
          // discoverCompetitors runs at the REFERENCE_DISCOVERY step.
          setPhase(ctx.auditId, AuditPhase.LOCAL_DISCOVERY);
          break;
        case AuditPhase.LOCAL_DISCOVERY:
          await doReferenceDiscovery(ctx, audit);
          break;
        case AuditPhase.REFERENCE_DISCOVERY:
          setPhase(ctx.auditId, AuditPhase.COMPETITORS_QUEUED);
          break;
        case AuditPhase.COMPETITORS_QUEUED:
          await doCompetitorScraping(ctx);
          break;
        case AuditPhase.COMPETITORS_DONE:
          await doHashtagAnalysis(ctx);
          break;
        case AuditPhase.HASHTAGS_DONE:
          setPhase(ctx.auditId, AuditPhase.READY_FOR_ANALYSIS);
          break;
        case AuditPhase.ANALYZING:
        case AuditPhase.COMPLETE:
          setPhase(ctx.auditId, AuditPhase.READY_FOR_ANALYSIS);
          break;
      }
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      console.error(`Phase ${phase} failed:`, msg);
      ctx.errors.push(`${phase}: ${msg}`);
      setPhase(ctx.auditId, AuditPhase.FAILED);
      return summary(ctx, AuditPhase.FAILED);
    }

    phase = getPhase(ctx.auditId);
  }

  return summary(ctx, phase);
}
