/**
 * Single-profile Instagram Success Teardown — Milestone 1 (data spine + integrity).
 *
 * Creates a dedicated teardown row, captures the target profile + up to N content
 * items (default 100), then exports dataset.json / content.csv / integrity.md.
 * No vision, transcription, comments, or markdown report yet — those are M3–M5.
 *
 * Run:
 *   npx tsx src/scripts/teardownRun.ts https://www.instagram.com/cooper.simson/
 *   npx tsx src/scripts/teardownRun.ts https://www.instagram.com/cooper.simson/ botlogix 100
 */
import "dotenv/config";
import { db, sqlClient } from "../db/index.js";
import { teardowns } from "../db/schema.js";
import { handleFromUrl, runTeardown } from "../services/teardown/teardownOrchestrator.js";

const TARGET_URL = process.argv[2];
const BUSINESS_UNIT = process.argv[3] as "botlogix" | "boxbuddy" | undefined;
const CONTENT_WINDOW = Number(process.argv[4] ?? "100");

async function main(): Promise<void> {
  if (!TARGET_URL) {
    console.error(
      "Usage: tsx src/scripts/teardownRun.ts <instagram_url> [botlogix|boxbuddy] [contentWindow]",
    );
    process.exit(1);
  }

  const handle = handleFromUrl(TARGET_URL);
  console.log(`\n═══ TEARDOWN (M1) — @${handle} ═══\n`);

  const [row] = await db
    .insert(teardowns)
    .values({
      target_url: TARGET_URL,
      target_handle: handle,
      business_unit:
        BUSINESS_UNIT === "botlogix" || BUSINESS_UNIT === "boxbuddy"
          ? BUSINESS_UNIT
          : null,
      content_window: Number.isFinite(CONTENT_WINDOW) ? CONTENT_WINDOW : 100,
      status: "queued",
    })
    .returning({ id: teardowns.id });

  console.log(`1) Created teardown id=${row.id}`);
  console.log(`2) Running capture + export…\n`);

  const result = await runTeardown(row.id);

  console.log("\n═══ DONE ═══");
  console.log(`Teardown #${result.teardownId} — @${handle}`);
  console.log(`Final phase:  ${result.finalPhase}`);
  console.log(`Captured:     ${result.capturedCount} content items`);
  console.log(`Apify items:  ${result.itemsScraped} (cache hits: ${result.cacheHits})`);
  if (result.errors.length > 0) {
    console.log(`Errors:       ${result.errors.join(" | ")}`);
  }
  if (result.export) {
    console.log(`\nArtifacts:`);
    console.log(`  JSON:      ${result.export.jsonPath}`);
    console.log(`  CSV:       ${result.export.csvPath}`);
    console.log(`  Integrity: ${result.export.integrityPath}`);
  }
}

main()
  .catch((err) => {
    console.error("\nTeardown run failed:", err);
    process.exitCode = 1;
  })
  .finally(() => sqlClient.end({ timeout: 5 }));
