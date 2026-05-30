/**
 * Wipe old @botlogix analysis artifacts + caches, then run a full fresh audit
 * and generate markdown, HTML, and Marp dark/light PDFs.
 */
import "dotenv/config";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { desc, eq, like, or } from "drizzle-orm";
import { db, sqlClient } from "../db/index.js";
import { audits, llm_cache, scrape_cache } from "../db/schema.js";
import { AuditPhase, setPhase } from "../services/audit/auditState.js";
import { runAudit } from "../services/audit/orchestrator.js";
import { runScoring } from "../services/scoring/scoringOrchestrator.js";
import { runPatternAnalysis } from "../services/patterns/patternOrchestrator.js";
import { runEnrichment } from "../services/comments/enrichmentOrchestrator.js";
import { generateReport } from "../services/report/reportOrchestrator.js";
import { generateHTMLReport } from "../services/html-report/htmlGenerator.js";
import { generateMarpMarkdown } from "../services/marp-report/marpGenerator.js";
import { convertDeck } from "../services/marp-report/marpConverter.js";

const BOTLOGIX_IG = "https://www.instagram.com/botlogix/";

function clearReportFiles(): number {
  const reportsDir = path.resolve("reports");
  const marpDir = path.join(reportsDir, "marp");
  let removed = 0;

  const shouldRemove = (name: string): boolean =>
    /^audit-\d+/i.test(name) ||
    /^botlogix-audit-/i.test(name) ||
    /^slides\.\d+/i.test(name) ||
    /^\d+-botlogix/i.test(name) ||
    /^14-botlogix/i.test(name);

  for (const dir of [reportsDir, marpDir]) {
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!shouldRemove(name)) continue;
      const full = path.join(dir, name);
      rmSync(full, { recursive: true, force: true });
      removed += 1;
      console.log(`  removed ${full}`);
    }
  }
  return removed;
}

async function clearAllCaches(): Promise<void> {
  const scrape = await db.delete(scrape_cache);
  const llm = await db.delete(llm_cache);
  console.log(`  scrape_cache rows cleared`);
  console.log(`  llm_cache rows cleared`);
  void scrape;
  void llm;
}

async function deleteBotlogixAudits(): Promise<number> {
  const rows = await db
    .select({ id: audits.id })
    .from(audits)
    .where(
      or(
        eq(audits.instagram_url, BOTLOGIX_IG),
        like(audits.instagram_url, "%instagram.com/botlogix%"),
      ),
    );
  for (const row of rows) {
    await db.delete(audits).where(eq(audits.id, row.id));
    console.log(`  deleted audit #${row.id} (cascade)`);
  }
  return rows.length;
}

async function createBotlogixAudit(): Promise<number> {
  const [audit] = await db
    .insert(audits)
    .values({
      business_name: "BotLogix - AI Solutions",
      instagram_url: BOTLOGIX_IG,
      website_url: "https://botlogix.ca",
      city: "Burlington",
      service_area: "Burlington, Halton, Hamilton, Greater Toronto Area",
      business_category: "Marketing agency",
      main_offer:
        "Instagram automation, AI agents, and DM marketing workflows for small businesses",
      target_audience:
        "Small business owners using Instagram for sales — e-commerce, service businesses, coaches",
      follower_goal: "10000",
      business_outcome:
        "More inbound leads via Instagram DM automations; grow agency credibility through follower count",
      report_type: "full_gtm",
      mode: "mixed",
      status: "queued",
    })
    .returning({ id: audits.id });
  return audit.id;
}

async function main(): Promise<void> {
  console.log("\n═══ FRESH BOTLOGIX RUN ═══\n");

  console.log("1) Clearing old report files…");
  const filesRemoved = clearReportFiles();
  console.log(`   ${filesRemoved} path(s) removed\n`);

  console.log("2) Clearing scrape + LLM caches…");
  await clearAllCaches();

  console.log("\n3) Deleting prior @botlogix audit rows…");
  const deleted = await deleteBotlogixAudits();
  console.log(`   ${deleted} audit(s) deleted\n`);

  console.log("4) Creating new audit row…");
  const auditId = await createBotlogixAudit();
  console.log(`   New audit id=${auditId}\n`);

  console.log("5) Phase 1 — Scraping (Apify, profile gate, discovery, backfill)…");
  const scrape = await runAudit({ auditId, tier: "full" });
  console.log(
    `   phase=${scrape.finalPhase} scraped=${scrape.itemsScraped} cacheHits=${scrape.cacheHits} errors=${scrape.errors.length}`,
  );

  console.log("\n6) Phase 2 — Scoring…");
  await runScoring(auditId);
  await setPhase(auditId, AuditPhase.SCORING_COMPLETE);

  console.log("\n7) Phase 3 — Patterns…");
  await runPatternAnalysis(auditId);
  await setPhase(auditId, AuditPhase.CONTENT_PATTERNS_COMPLETE);

  console.log("\n8) Phase 4 — Enrichment…");
  await runEnrichment(auditId);
  await setPhase(auditId, AuditPhase.ENRICHMENT_COMPLETE);

  const reportsDir = path.resolve("reports");
  const marpDir = path.join(reportsDir, "marp");
  mkdirSync(reportsDir, { recursive: true });
  mkdirSync(marpDir, { recursive: true });

  console.log("\n9) Phase 5 — Report (force fresh LLM sections)…");
  const report = await generateReport(auditId, { forceRegenerate: true });
  const mdPath = path.join(reportsDir, `audit-${auditId}.md`);
  writeFileSync(mdPath, report.compiledMarkdown, "utf-8");
  console.log(`   ${mdPath}`);

  console.log("\n10) Phase 6 — HTML report…");
  const htmlPath = path.join(reportsDir, `audit-${auditId}.html`);
  writeFileSync(htmlPath, await generateHTMLReport(auditId), "utf-8");
  console.log(`   ${htmlPath}`);

  console.log("\n11) Phase 7 — Marp decks…");
  const basename = `botlogix-audit-${auditId}`;
  const darkMd = path.join(marpDir, `${basename}-dark.md`);
  writeFileSync(darkMd, await generateMarpMarkdown(auditId, "dark"), "utf-8");
  const dark = await convertDeck(darkMd, marpDir, `${basename}-dark`, "themes/botlogix-dark.css");

  const lightMd = path.join(marpDir, `${basename}-light.md`);
  writeFileSync(lightMd, await generateMarpMarkdown(auditId, "light"), "utf-8");
  const light = await convertDeck(lightMd, marpDir, `${basename}-light`, "themes/botlogix-light.css");

  await setPhase(auditId, AuditPhase.COMPLETE);

  console.log("\n═══ DONE ═══");
  console.log(`Audit #${auditId}`);
  console.log(`Markdown: ${mdPath}`);
  console.log(`HTML:     ${htmlPath}`);
  console.log(`Dark PDF: ${dark.pdf}`);
  console.log(`Light PDF: ${light.pdf}`);
  console.log("\nSave the dark PDF to your desktop — that is the deliverable.\n");
}

main()
  .catch((err) => {
    console.error("\nFresh run failed:", err);
    process.exit(1);
  })
  .finally(() => sqlClient.end({ timeout: 5 }));
