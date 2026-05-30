/**
 * Teardown text-intelligence analysis — Milestone 3.
 *
 * Re-runs M3 analysis (comment capture + deterministic analyzers + LLM
 * synthesis + report.md) on an ALREADY-CAPTURED teardown, without re-scraping
 * the profile/content. Safe to run repeatedly: comment scraping is idempotent,
 * cached, and budget-gated; LLM calls are cached by prompt hash.
 *
 * Run:
 *   npx tsx src/scripts/teardownAnalyze.ts <teardownId>
 *   npx tsx src/scripts/teardownAnalyze.ts <teardownId> --no-comments
 *   npx tsx src/scripts/teardownAnalyze.ts latest
 */
import "dotenv/config";
import { desc } from "drizzle-orm";
import { db, sqlClient } from "../db/index.js";
import { teardowns } from "../db/schema.js";
import { runTeardownAnalysis } from "../services/teardown/analysisRunner.js";

const ARG = process.argv[2];
const NO_COMMENTS = process.argv.includes("--no-comments");

async function resolveTeardownId(): Promise<number> {
  if (ARG === "latest") {
    const rows = await db
      .select({ id: teardowns.id })
      .from(teardowns)
      .orderBy(desc(teardowns.id))
      .limit(1);
    if (!rows[0]) throw new Error("No teardowns found");
    return rows[0].id;
  }
  const id = Number(ARG);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Usage: tsx src/scripts/teardownAnalyze.ts <teardownId|latest> [--no-comments]");
  }
  return id;
}

async function main(): Promise<void> {
  const teardownId = await resolveTeardownId();
  console.log(`\n═══ TEARDOWN ANALYSIS (M3) — #${teardownId} ═══`);
  console.log(`comments: ${NO_COMMENTS ? "skipped" : "enabled"}\n`);

  const result = await runTeardownAnalysis(teardownId, { scrapeComments: !NO_COMMENTS });

  console.log("\n═══ DONE ═══");
  console.log(`Teardown #${result.teardownId}`);
  console.log(`Report:        ${result.reportPath}`);
  console.log(`Comments saved: ${result.commentsStored}`);
  console.log(`LLM calls:      ${result.llmOk}/${result.llmCalls} ok`);
  if (result.errors.length > 0) {
    console.log(`Notes:          ${result.errors.join(" | ")}`);
  }
}

main()
  .catch((err) => {
    console.error("\nTeardown analysis failed:", err);
    process.exitCode = 1;
  })
  .finally(() => sqlClient.end({ timeout: 5 }));
