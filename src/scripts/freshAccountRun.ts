/**
 * Full end-to-end audit for an arbitrary Instagram account.
 *
 * Generalized from freshBotlogixRun.ts — does NOT touch @botlogix data or
 * clear global caches. Set TARGET_IG below (or pass as argv[2]). Business
 * metadata is intentionally left blank: the scraper populates the real
 * profile, and we do not fabricate location/category details.
 *
 * Run: npx tsx src/scripts/freshAccountRun.ts https://www.instagram.com/boxbuddyapp/
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { desc, eq, like } from "drizzle-orm";
import { db, sqlClient } from "../db/index.js";
import { audits } from "../db/schema.js";
import { AuditPhase, setPhase } from "../services/audit/auditState.js";
import { runAudit } from "../services/audit/orchestrator.js";
import { runScoring } from "../services/scoring/scoringOrchestrator.js";
import { runPatternAnalysis } from "../services/patterns/patternOrchestrator.js";
import { runEnrichment } from "../services/comments/enrichmentOrchestrator.js";
import { generateReport } from "../services/report/reportOrchestrator.js";
import { generateHTMLReport } from "../services/html-report/htmlGenerator.js";
import { generateMarpMarkdown } from "../services/marp-report/marpGenerator.js";
import { convertDeck } from "../services/marp-report/marpConverter.js";

const TARGET_IG = process.argv[2] ?? "https://www.instagram.com/boxbuddyapp/";

function handleOf(url: string): string {
  const m = url.match(/instagram\.com\/([^/?]+)/i);
  return (m?.[1] ?? "account").toLowerCase();
}

async function createAudit(): Promise<number> {
  const [audit] = await db
    .insert(audits)
    .values({
      business_name: handleOf(TARGET_IG),
      instagram_url: TARGET_IG,
      report_type: "full_gtm",
      mode: "mixed",
      status: "queued",
    })
    .returning({ id: audits.id });
  return audit.id;
}

async function main(): Promise<void> {
  const handle = handleOf(TARGET_IG);
  console.log(`\n═══ FRESH RUN — @${handle} ═══\n`);

  // Reuse a recent prior audit for this handle if present? No — always fresh.
  const prior = await db
    .select({ id: audits.id })
    .from(audits)
    .where(like(audits.instagram_url, `%instagram.com/${handle}%`))
    .orderBy(desc(audits.id));
  if (prior.length > 0) {
    console.log(`  (note: ${prior.length} prior audit(s) for @${handle} exist; leaving them in place)`);
  }

  console.log("1) Creating audit row…");
  const auditId = await createAudit();
  console.log(`   New audit id=${auditId}\n`);

  console.log("2) Phase 1 — Scraping (Apify, profile gate, discovery, backfill)…");
  const scrape = await runAudit({ auditId, tier: "full" });
  console.log(
    `   phase=${scrape.finalPhase} scraped=${scrape.itemsScraped} cacheHits=${scrape.cacheHits} errors=${scrape.errors.length}`,
  );
  if (scrape.errors.length > 0) {
    console.log("   scrape errors:", scrape.errors.slice(0, 5));
  }

  console.log("\n3) Phase 2 — Scoring…");
  await runScoring(auditId);
  await setPhase(auditId, AuditPhase.SCORING_COMPLETE);

  console.log("\n4) Phase 3 — Patterns…");
  await runPatternAnalysis(auditId);
  await setPhase(auditId, AuditPhase.CONTENT_PATTERNS_COMPLETE);

  console.log("\n5) Phase 4 — Enrichment…");
  await runEnrichment(auditId);
  await setPhase(auditId, AuditPhase.ENRICHMENT_COMPLETE);

  const reportsDir = path.resolve("reports");
  const marpDir = path.join(reportsDir, "marp");
  mkdirSync(reportsDir, { recursive: true });
  mkdirSync(marpDir, { recursive: true });

  console.log("\n6) Phase 5 — Report (force fresh LLM sections)…");
  const report = await generateReport(auditId, { forceRegenerate: true });
  const mdPath = path.join(reportsDir, `audit-${auditId}.md`);
  writeFileSync(mdPath, report.compiledMarkdown, "utf-8");
  console.log(`   ${mdPath}`);

  console.log("\n7) Phase 6 — HTML report…");
  const htmlPath = path.join(reportsDir, `audit-${auditId}.html`);
  writeFileSync(htmlPath, await generateHTMLReport(auditId), "utf-8");
  console.log(`   ${htmlPath}`);

  console.log("\n8) Phase 7 — Marp workbook decks (light primary)…");
  const basename = `${handle}-audit-${auditId}`;
  const lightMd = path.join(marpDir, `${basename}-light.md`);
  writeFileSync(lightMd, await generateMarpMarkdown(auditId, "light"), "utf-8");
  const light = await convertDeck(lightMd, marpDir, `${basename}-light`, "themes/botlogix-light.css");

  const darkMd = path.join(marpDir, `${basename}-dark.md`);
  writeFileSync(darkMd, await generateMarpMarkdown(auditId, "dark"), "utf-8");
  const dark = await convertDeck(darkMd, marpDir, `${basename}-dark`, "themes/botlogix-dark.css");

  await setPhase(auditId, AuditPhase.COMPLETE);

  console.log("\n═══ DONE ═══");
  console.log(`Audit #${auditId} — @${handle}`);
  console.log(`Markdown:  ${mdPath}`);
  console.log(`HTML:      ${htmlPath}`);
  console.log(`Light PDF: ${light.pdf}   ← primary deliverable`);
  console.log(`Dark PDF:  ${dark.pdf}`);
}

main()
  .catch((err) => {
    console.error("\nFresh run failed:", err);
    process.exit(1);
  })
  .finally(() => sqlClient.end({ timeout: 5 }));
