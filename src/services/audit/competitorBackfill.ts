import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { competitors, type Audit } from "../../db/schema.js";
import { canSpendApifyRun } from "./apifyBudget.js";
import {
  discoverLocalCompetitors,
  type DiscoveredCompetitor,
} from "./competitorDiscovery.js";
import { runProfileGate } from "./competitorProfileGate.js";
import { scrapeCompetitorProfileAndPosts } from "./competitorScrape.js";

const MIN_PRESENTABLE_LOCAL = 3;
const PRESENTABLE_CONFIDENCE = 35;

export interface BackfillCounts {
  scraped: number;
  cacheHits: number;
  added: number;
}

export async function countPresentableLocalCompetitors(auditId: number): Promise<number> {
  const rows = await db
    .select({
      id: competitors.id,
      competitor_type: competitors.competitor_type,
      confidence_score: competitors.confidence_score,
      skip_reason: competitors.skip_reason,
      deep_scraped: competitors.deep_scraped,
    })
    .from(competitors)
    .where(eq(competitors.audit_id, auditId));

  return rows.filter((r) => {
    if (r.competitor_type !== "local_intel") return false;
    if (r.skip_reason?.startsWith("profile_gate")) return false;
    if (r.skip_reason === "scrape_error") return false;
    return (r.confidence_score ?? 0) >= PRESENTABLE_CONFIDENCE || r.deep_scraped;
  }).length;
}

async function insertGatedCompetitors(
  audit: Audit,
  candidates: DiscoveredCompetitor[],
  exclude: Set<string>,
): Promise<{ inserted: DiscoveredCompetitor[]; scraped: number; cacheHits: number }> {
  const inserted: DiscoveredCompetitor[] = [];
  let scraped = 0;
  let cacheHits = 0;

  for (const c of candidates) {
    if (exclude.has(c.username.toLowerCase())) continue;
    if (!(await canSpendApifyRun(audit.id, 1))) break;

    const gate = await runProfileGate(
      audit.id,
      c.username,
      c.competitor_type,
      audit.business_category,
    );
    scraped += gate.scraped;
    cacheHits += gate.cacheHits;

    if (!gate.passed) {
      console.log(`Profile gate rejected @${c.username}: ${gate.reasons.join(", ")}`);
      exclude.add(c.username.toLowerCase());
      continue;
    }

    await db.insert(competitors).values({
      audit_id: audit.id,
      username: c.username,
      source: c.source,
      discovery_keyword: c.discovery_query,
      competitor_type: c.competitor_type,
      geographic_market: c.geographic_market,
      discovery_query: c.discovery_query,
    });

    inserted.push(c);
    exclude.add(c.username.toLowerCase());
    if (inserted.length >= 4) break;
  }

  return { inserted, scraped, cacheHits };
}

export async function ensurePresentableLocalCompetitors(
  audit: Audit,
  ctx: { itemsScraped: number; cacheHits: number; errors: string[] },
): Promise<BackfillCounts> {
  const counts: BackfillCounts = { scraped: 0, cacheHits: 0, added: 0 };
  let presentable = await countPresentableLocalCompetitors(audit.id);
  if (presentable >= MIN_PRESENTABLE_LOCAL) {
    return counts;
  }

  const existing = await db
    .select({ username: competitors.username })
    .from(competitors)
    .where(eq(competitors.audit_id, audit.id));
  const exclude = new Set(existing.map((r) => r.username.toLowerCase()));

  for (let round = 0; round < 2 && presentable < MIN_PRESENTABLE_LOCAL; round += 1) {
    if (!(await canSpendApifyRun(audit.id, 3))) {
      console.warn(`Apify budget low — stopping competitor backfill for audit ${audit.id}`);
      break;
    }

    console.log(
      `Competitor backfill round ${round + 1}: ${presentable}/${MIN_PRESENTABLE_LOCAL} presentable locals`,
    );

    const discovery = await discoverLocalCompetitors(audit, {
      scraped: 0,
      cacheHits: 0,
    });
    ctx.itemsScraped += discovery.counts.scraped;
    ctx.cacheHits += discovery.counts.cacheHits;

    const { inserted, scraped, cacheHits } = await insertGatedCompetitors(
      audit,
      discovery.found,
      exclude,
    );
    counts.scraped += scraped;
    counts.cacheHits += cacheHits;
    counts.added += inserted.length;

    for (const c of inserted) {
      const row = await db
        .select({ id: competitors.id })
        .from(competitors)
        .where(
          and(
            eq(competitors.audit_id, audit.id),
            eq(competitors.username, c.username),
          ),
        )
        .limit(1);
      const compId = row[0]?.id;
      if (!compId) continue;

      try {
        const r = await scrapeCompetitorProfileAndPosts({
          auditId: audit.id,
          competitorId: compId,
          username: c.username,
          initialLimit: 10,
          deepLimit: 30,
        });
        ctx.itemsScraped += r.scraped;
        ctx.cacheHits += r.cacheHits;
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        ctx.errors.push(`backfill @${c.username}: ${msg}`);
        await db
          .update(competitors)
          .set({ skip_reason: `scrape_error: ${msg.slice(0, 200)}` })
          .where(eq(competitors.id, compId));
      }
    }

    presentable = await countPresentableLocalCompetitors(audit.id);
  }

  return counts;
}
