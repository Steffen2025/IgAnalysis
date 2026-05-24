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
  .orderBy(desc(audits.id))
  .all()
  .find(
    (a) =>
      a.business_name?.toLowerCase().includes("noelia") ||
      a.instagram_url?.includes("noelia") ||
      a.instagram_url?.includes("noeliamelo"),
  );

if (!auditRow) {
  console.error("No Noelia Melo audit found.");
  process.exit(1);
}

const auditId = auditRow.id;
console.log(`\n📊 Generating report for ${auditRow.business_name} — Audit #${auditId}\n`);

const result = await generateReport(auditId);

mkdirSync("reports", { recursive: true });
const outPath = join("reports", `${auditId}-noelia.md`);
writeFileSync(outPath, result.compiledMarkdown, "utf-8");

console.log(`Report saved: ${outPath}`);
console.log(`Cache: ${result.cacheStats.cached} cached / ${result.cacheStats.fresh} fresh`);
for (const [key, content] of Object.entries(result.sections)) {
  const words = content.split(/\s+/).filter(Boolean).length;
  console.log(`  ${key.padEnd(26)} ${words} words`);
}
if (result.errors.length) console.log("Errors:", result.errors);
