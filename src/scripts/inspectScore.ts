import "dotenv/config";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits, scores } from "../db/schema.js";
import {
  SCORE_CATEGORIES,
  type ScoreCategory,
  type ScoreResult,
} from "../services/scoring/types.js";

function parseCategory(raw: string | undefined): ScoreCategory {
  if (!raw) {
    throw new Error(
      `Usage: tsx src/scripts/inspectScore.ts <category>\nCategories: ${SCORE_CATEGORIES.join(", ")}`,
    );
  }
  const norm = raw.toLowerCase() as ScoreCategory;
  if (!SCORE_CATEGORIES.includes(norm)) {
    throw new Error(
      `Unknown category "${raw}". Categories: ${SCORE_CATEGORIES.join(", ")}`,
    );
  }
  return norm;
}

function main() {
  const category = parseCategory(process.argv[2]);
  const auditIdArg = process.argv[3] ? Number(process.argv[3]) : null;

  let row;
  if (auditIdArg) {
    row = db.select().from(scores).where(eq(scores.audit_id, auditIdArg)).all()[0];
    if (!row) throw new Error(`No scores row for audit ${auditIdArg}`);
  } else {
    row = db.select().from(scores).orderBy(desc(scores.calculated_at)).limit(1).all()[0];
    if (!row) throw new Error("No scores rows in database — run testScoring first");
  }

  const audit = db.select().from(audits).where(eq(audits.id, row.audit_id)).all()[0];
  const map = JSON.parse(row.score_explanations ?? "{}") as Record<string, ScoreResult>;
  const r = map[category];
  if (!r) {
    throw new Error(`No "${category}" score on audit ${row.audit_id}`);
  }

  console.log(`Audit ${row.audit_id}: ${audit.business_name} (${audit.city})`);
  console.log(`Category: ${category}`);
  console.log(`Score: ${r.score === null ? "n/a" : `${r.score}/100`}`);
  console.log(`Explanation: ${r.explanation}\n`);

  if (r.signals.length === 0) {
    console.log("(no signals — score likely n/a or input missing)");
    return;
  }

  console.log("Signals:");
  console.log(
    `  ${"key".padEnd(32)} ${"fired".padEnd(6)} ${"earned/weight".padEnd(15)} value`,
  );
  console.log("  " + "─".repeat(80));
  for (const s of r.signals) {
    const fired = s.fired ? "✅" : "⬜";
    const score = `${s.earned}/${s.weight}`;
    const v = JSON.stringify(s.value);
    console.log(
      `  ${s.key.padEnd(32)} ${fired.padEnd(6)} ${score.padEnd(15)} ${v}${s.note ? "  // " + s.note : ""}`,
    );
  }

  const totalEarned = r.signals.reduce((s, x) => s + x.earned, 0);
  const totalWeight = r.signals.reduce((s, x) => s + x.weight, 0);
  console.log(
    `\n  Totals: earned ${totalEarned.toFixed(1)} of ${totalWeight} possible weight units`,
  );
}

main();
