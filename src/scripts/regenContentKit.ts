import "dotenv/config";
import { and, eq, like } from "drizzle-orm";
import { db } from "../db/index.js";
import { report_sections, llm_cache } from "../db/schema.js";
import { assembleReportData } from "../services/report/reportDataAssembler.js";
import { generateContentExecutionKit } from "../services/report/sections/contentExecutionKit.js";
import { writeFileSync, readFileSync } from "node:fs";

const AUDIT_ID = 14;

// 1. Clear the persisted section so the orchestrator regenerates it
const r1 = db.delete(report_sections)
  .where(and(eq(report_sections.audit_id, AUDIT_ID), eq(report_sections.section_key, "content_kit")))
  .run();
console.log(`report_sections cleared: ${r1.changes} row(s)`);

// 2. Clear LLM cache entries whose prompt contains the content kit fingerprint
//    (the prompt includes "Content Execution Kit" as a unique phrase)
const allCache = db.select().from(llm_cache).all();
let cacheCleared = 0;
for (const row of allCache) {
  if (row.prompt.includes("Content Execution Kit")) {
    db.delete(llm_cache).where(eq(llm_cache.id, row.id)).run();
    cacheCleared++;
  }
}
console.log(`llm_cache cleared: ${cacheCleared} row(s)`);

// 3. Regenerate just this section
console.log("\nRegenerating content_kit with Contrast Formula...");
const data = await assembleReportData(AUDIT_ID);
const newContent = await generateContentExecutionKit(data);

console.log(`\nGenerated: ${newContent.split(/\s+/).filter(Boolean).length} words\n`);
console.log("─".repeat(60));
console.log(newContent);
console.log("─".repeat(60));

// 4. Patch the existing saved report file
const reportPath = "reports/14-botlogix.md";
const existing = readFileSync(reportPath, "utf-8");
const updated = existing.replace(
  /## Content Execution Kit\n\n[\s\S]*?(?=\n---\n\n## Do This Next)/,
  `## Content Execution Kit\n\n${newContent}\n`,
);
writeFileSync(reportPath, updated, "utf-8");
console.log(`\nReport file updated: ${reportPath}`);
