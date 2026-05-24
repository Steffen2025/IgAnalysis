import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits } from "../db/schema.js";
import { runScoring } from "../services/scoring/scoringOrchestrator.js";

async function main() {
  const all = db
    .select({ id: audits.id, business_name: audits.business_name, mode: audits.mode })
    .from(audits)
    .all();

  console.log(`Rescoring ${all.length} audits (no Apify calls — DB reads only)\n`);
  const rows: {
    auditId: number;
    name: string;
    overall: number | null;
    weakest: string;
    err: number;
  }[] = [];

  for (const a of all) {
    process.stdout.write(`  audit ${a.id} (${a.business_name ?? "?"})... `);
    try {
      const r = await runScoring(a.id);
      const subs = Object.entries(r.scores).filter(([k]) => k !== "overall");
      const weak = subs
        .filter(([, v]) => v.score !== null)
        .sort((a, b) => (a[1].score ?? 0) - (b[1].score ?? 0))[0];
      rows.push({
        auditId: a.id,
        name: a.business_name ?? "?",
        overall: r.scores.overall.score ?? null,
        weakest: weak ? `${weak[0]} (${weak[1].score})` : "n/a",
        err: r.errors.length,
      });
      console.log(`overall=${r.scores.overall.score} errors=${r.errors.length}`);
    } catch (err) {
      console.log(`FAILED — ${(err as Error).message}`);
      rows.push({ auditId: a.id, name: a.business_name ?? "?", overall: null, weakest: "—", err: 1 });
    }
  }

  console.log("\n=== Summary ===");
  console.log(
    `  ${"audit".padEnd(7)} ${"business".padEnd(28)} ${"overall".padEnd(8)} ${"weakest area".padEnd(32)} errs`,
  );
  console.log("  " + "─".repeat(85));
  for (const r of rows) {
    console.log(
      `  ${String(r.auditId).padEnd(7)} ${(r.name ?? "—").slice(0, 28).padEnd(28)} ${String(r.overall ?? "—").padEnd(8)} ${r.weakest.padEnd(32)} ${r.err}`,
    );
  }
}

main().catch((err) => {
  console.error("rescoreAll failed:", err);
  process.exit(1);
});
