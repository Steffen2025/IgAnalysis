import "dotenv/config";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits, competitors, posts, scores } from "../db/schema.js";
import { runScoring } from "../services/scoring/scoringOrchestrator.js";

function pickPurePita(): number {
  // Most recent audit with deep-scraped reference comps AND posts — that's "full audit" data.
  const candidates = db
    .select({ id: audits.id, name: audits.business_name, status_detail: audits.status_detail })
    .from(audits)
    .where(eq(audits.status_detail, "READY_FOR_ANALYSIS"))
    .orderBy(desc(audits.id))
    .all();

  for (const c of candidates) {
    const postCount = db
      .select({ n: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.audit_id, c.id))
      .all()[0].n;
    const refCount = db
      .select({ n: sql<number>`count(*)` })
      .from(competitors)
      .where(
        and(
          eq(competitors.audit_id, c.id),
          eq(competitors.competitor_type, "reference_model"),
          eq(competitors.deep_scraped, true),
        ),
      )
      .all()[0].n;
    if (postCount >= 10 && refCount >= 1) return c.id;
  }
  if (candidates.length > 0) return candidates[0].id;
  throw new Error("No audit ready for scoring");
}

function printSignals(label: string, sigs: { fired: boolean; key: string; value: unknown; weight: number; earned: number; note?: string }[]) {
  const fired = sigs.filter((s) => s.fired).sort((a, b) => b.earned - a.earned);
  const missed = sigs.filter((s) => !s.fired).sort((a, b) => b.weight - a.weight);
  console.log(`  ${label}`);
  for (const s of fired.slice(0, 3)) {
    console.log(`    ✅ ${s.key.padEnd(30)} earned=${s.earned.toString().padStart(5)}/${s.weight}  value=${JSON.stringify(s.value)}${s.note ? "  // " + s.note : ""}`);
  }
  for (const s of missed.slice(0, 2)) {
    console.log(`    ❌ ${s.key.padEnd(30)} earned=${String(s.earned).padStart(5)}/${s.weight}  value=${JSON.stringify(s.value)}${s.note ? "  // " + s.note : ""}`);
  }
}

async function main() {
  const auditId = pickPurePita();
  const a = db.select().from(audits).where(eq(audits.id, auditId)).all()[0];
  console.log(`Scoring audit ${auditId}: "${a.business_name}" (${a.city}, mode=${a.mode})\n`);

  const result = await runScoring(auditId);

  console.log(`\n=== OVERALL: ${result.scores.overall.score} / 100 ===`);
  console.log(`  ${result.scores.overall.explanation}\n`);

  const order = [
    "profile_conversion",
    "content_performance",
    "local_visibility",
    "sales_readiness",
    "competitor_gap",
  ] as const;

  for (const key of order) {
    const r = result.scores[key];
    const score = r.score === null ? "n/a" : `${r.score}/100`;
    console.log(`--- ${key.toUpperCase()}: ${score} ---`);
    console.log(`  ${r.explanation}`);
    if (r.signals.length > 0) printSignals("signals:", r.signals);
    console.log("");
  }

  console.log(`totalSignalsFired=${result.totalSignalsFired}  errors=${result.errors.length}`);
  if (result.errors.length) console.log("errors:", result.errors);

  // Confirm DB persistence
  const row = db.select().from(scores).where(eq(scores.audit_id, auditId)).all()[0];
  console.log("\n=== scores row in DB ===");
  console.log(
    `  profile=${row.profile_conversion_score}  content=${row.content_performance_score}  local=${row.local_visibility_score}  sales=${row.sales_readiness_score}  gap=${row.competitor_gap_score}  overall=${row.overall_score}  at=${row.calculated_at}`,
  );

  const phaseRow = db
    .select({ status_detail: audits.status_detail, status: audits.status })
    .from(audits)
    .where(eq(audits.id, auditId))
    .all()[0];
  console.log(`  audit phase: ${phaseRow.status_detail} (status=${phaseRow.status})`);
}

main().catch((err) => {
  console.error("testScoring failed:", err);
  process.exit(1);
});
