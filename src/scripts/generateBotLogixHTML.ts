import "dotenv/config";
import { desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits } from "../db/schema.js";
import { generateHTMLReport } from "../services/html-report/htmlGenerator.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const auditRow = db
  .select()
  .from(audits)
  .orderBy(desc(audits.id))
  .all()
  .find(
    (a) =>
      a.instagram_url?.includes("botlogix") ||
      a.business_name?.toLowerCase().includes("botlogix"),
  );

if (!auditRow) {
  console.error("No BotLogix audit found.");
  process.exit(1);
}

const auditId = auditRow.id;
console.log(`\nGenerating HTML report for ${auditRow.business_name} — Audit #${auditId}\n`);

const html = await generateHTMLReport(auditId);

mkdirSync("reports", { recursive: true });
const outPath = join("reports", `botlogix-audit-${auditId}.html`);
writeFileSync(outPath, html, "utf-8");

const sizeKB = (html.length / 1024).toFixed(1);
console.log(`Report saved: ${outPath}`);
console.log(`File size: ${sizeKB} KB`);
console.log(`\nTo open (Windows): start ${outPath}`);
console.log(`\nReport regeneration is instant and free — re-run this script anytime to apply design changes.`);
