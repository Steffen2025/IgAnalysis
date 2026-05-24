import "dotenv/config";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits } from "../db/schema.js";
import { generateReport } from "../services/report/reportOrchestrator.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const auditRow = db
  .select()
  .from(audits)
  .where(eq(audits.instagram_url, "https://www.instagram.com/purepita/"))
  .orderBy(desc(audits.id))
  .limit(1)
  .get()
  ?? db
    .select()
    .from(audits)
    .where(eq(audits.business_name, "Pure Pita"))
    .orderBy(desc(audits.id))
    .limit(1)
    .get();

if (!auditRow) {
  // Try any pita-related audit
  const fallback = db
    .select()
    .from(audits)
    .orderBy(desc(audits.id))
    .all()
    .find((a) => a.business_name?.toLowerCase().includes("pita") || a.instagram_url?.includes("pita"));

  if (!fallback) {
    console.error("No Pita audit found.");
    process.exit(1);
  }

  const result = await generateReport(fallback.id);
  mkdirSync("reports", { recursive: true });
  const outPath = join("reports", `${fallback.id}-pita.md`);
  writeFileSync(outPath, result.compiledMarkdown, "utf-8");
  console.log(`Report saved: ${outPath} | ${result.cacheStats.cached} cached / ${result.cacheStats.fresh} fresh`);
  process.exit(0);
}

const auditId = auditRow.id;
console.log(`\n📊 Generating report for ${auditRow.business_name} — Audit #${auditId}\n`);

const result = await generateReport(auditId);

mkdirSync("reports", { recursive: true });
const outPath = join("reports", `${auditId}-pita.md`);
writeFileSync(outPath, result.compiledMarkdown, "utf-8");

console.log(`Report saved: ${outPath}`);
console.log(`Cache: ${result.cacheStats.cached} cached / ${result.cacheStats.fresh} fresh`);
for (const [key, content] of Object.entries(result.sections)) {
  const words = content.split(/\s+/).filter(Boolean).length;
  console.log(`  ${key.padEnd(26)} ${words} words`);
}
if (result.errors.length) console.log("Errors:", result.errors);
