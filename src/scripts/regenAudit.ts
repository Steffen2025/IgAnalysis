/**
 * Regenerate report sections + HTML + Marp decks for an EXISTING audit, with no
 * re-scrape. Used after fixing the category/competitor/copy layers so the
 * deliverable picks up clean data without spending another Apify run.
 *
 * Run: npx tsx src/scripts/regenAudit.ts 27
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, sqlClient } from "../db/index.js";
import { audits } from "../db/schema.js";
import { generateReport } from "../services/report/reportOrchestrator.js";
import { generateHTMLReport } from "../services/html-report/htmlGenerator.js";
import { generateMarpMarkdown } from "../services/marp-report/marpGenerator.js";
import { convertDeck } from "../services/marp-report/marpConverter.js";

const auditId = Number(process.argv[2] ?? "27");

async function main(): Promise<void> {
  const audit = await db.select().from(audits).where(eq(audits.id, auditId)).limit(1);
  if (audit.length === 0) throw new Error(`Audit ${auditId} not found`);
  const handle = (audit[0].business_name ?? `audit-${auditId}`).toLowerCase();
  console.log(`\n═══ REGEN — audit #${auditId} (@${handle}) ═══\n`);

  const reportsDir = path.resolve("reports");
  const marpDir = path.join(reportsDir, "marp");
  mkdirSync(marpDir, { recursive: true });

  // Load persisted sections (no LLM). Pass --force to regenerate via API.
  const force = process.argv.includes("--force");
  console.log(`1) Report sections (${force ? "force fresh LLM" : "from DB"})…`);
  const report = await generateReport(auditId, { forceRegenerate: force });
  writeFileSync(path.join(reportsDir, `audit-${auditId}.md`), report.compiledMarkdown, "utf-8");

  console.log("2) HTML report…");
  writeFileSync(path.join(reportsDir, `audit-${auditId}.html`), await generateHTMLReport(auditId), "utf-8");

  console.log("3) Marp decks (light primary)…");
  const basename = `${handle}-audit-${auditId}`;
  const lightMd = path.join(marpDir, `${basename}-light.md`);
  writeFileSync(lightMd, await generateMarpMarkdown(auditId, "light"), "utf-8");
  const light = await convertDeck(lightMd, marpDir, `${basename}-light`, "themes/botlogix-light.css");

  const darkMd = path.join(marpDir, `${basename}-dark.md`);
  writeFileSync(darkMd, await generateMarpMarkdown(auditId, "dark"), "utf-8");
  const dark = await convertDeck(darkMd, marpDir, `${basename}-dark`, "themes/botlogix-dark.css");

  console.log("\n═══ DONE ═══");
  console.log(`Light PDF: ${light.pdf}   ← primary deliverable`);
  console.log(`Dark PDF:  ${dark.pdf}`);
}

main()
  .catch((err) => {
    console.error("\nRegen failed:", err);
    process.exit(1);
  })
  .finally(() => sqlClient.end({ timeout: 5 }));
