import "dotenv/config";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits } from "../db/schema.js";
import { generateReport } from "../services/report/reportOrchestrator.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Find the most recent @botlogix audit
const auditRow = db
  .select()
  .from(audits)
  .where(eq(audits.instagram_url, "https://www.instagram.com/botlogix/"))
  .orderBy(desc(audits.id))
  .limit(1)
  .get();

if (!auditRow) {
  console.error("No @botlogix audit found. Run runBotlogixAudit.ts first.");
  process.exit(1);
}

const auditId = auditRow.id;
console.log(`\n📊 Generating report for @botlogix — Audit #${auditId}\n`);

const result = await generateReport(auditId);

// Save to file
mkdirSync("reports", { recursive: true });
const slug = "botlogix";
const outPath = join("reports", `${auditId}-${slug}.md`);
writeFileSync(outPath, result.compiledMarkdown, "utf-8");

// Print stats
const HR = "═".repeat(60);
console.log(`\n${HR}`);
console.log(`  REPORT STATS — @botlogix Audit #${auditId}`);
console.log(HR);

for (const [key, content] of Object.entries(result.sections)) {
  const words = content.split(/\s+/).filter(Boolean).length;
  console.log(`  ${key.padEnd(26)} ${String(words).padStart(5)} words`);
}

console.log(`\n  Cache stats: ${result.cacheStats.cached} cached / ${result.cacheStats.fresh} generated fresh`);
console.log(`  Generated at: ${result.generatedAt.toISOString()}`);
console.log(`  Report saved: ${outPath}`);

// Rough cost estimate: ~2000 input tokens/section + output tokens per word count
const avgInputTokens = 2000;
const sections = Object.values(result.sections);
const totalOutputTokens = sections.reduce((sum, s) => sum + Math.round(s.length / 4), 0);
// Sonnet: $3/1M input, $15/1M output; Opus: $5/$25 (1 section)
const sonnetSections = sections.length - 1;
const inputCost = (sonnetSections * avgInputTokens * 3 + avgInputTokens * 5) / 1_000_000;
const outputCost = (totalOutputTokens * 15) / 1_000_000;
const freshCost = result.cacheStats.fresh > 0
  ? ((result.cacheStats.fresh * avgInputTokens * 3 + (result.sections["battle_plan"] ? avgInputTokens * 5 : 0)) / 1_000_000)
  : 0;

console.log(`  Est. total cost (if all fresh): ~$${(inputCost + outputCost).toFixed(4)}`);
console.log(`  Est. this run cost:              ~$${result.cacheStats.fresh === 0 ? "0.0000 (all cached)" : `${freshCost.toFixed(4)}`}`);

if (result.errors.length > 0) {
  console.log(`\n  Errors:`);
  for (const e of result.errors) console.log(`    ❌ ${e}`);
}

console.log(`\n${HR}\n`);
