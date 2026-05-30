import { count, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { scrape_jobs } from "../../db/schema.js";

const DEFAULT_MAX_RUNS = Number(process.env.APIFY_MAX_RUNS_PER_AUDIT ?? "48");

export async function countApifyRuns(auditId: number): Promise<number> {
  const row = await db
    .select({ n: count() })
    .from(scrape_jobs)
    .where(eq(scrape_jobs.audit_id, auditId));
  return Number(row[0]?.n ?? 0);
}

export async function canSpendApifyRun(
  auditId: number,
  runsNeeded = 1,
  maxRuns = DEFAULT_MAX_RUNS,
): Promise<boolean> {
  const used = await countApifyRuns(auditId);
  return used + runsNeeded <= maxRuns;
}

export function maxApifyRunsPerAudit(): number {
  return DEFAULT_MAX_RUNS;
}
