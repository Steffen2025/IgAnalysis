/**
 * Re-render the Marp workbook decks for an existing audit (no scraping / LLM).
 * Run: npx tsx src/scripts/renderDeck.ts <auditId> [handle]
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sqlClient } from "../db/index.js";
import { generateMarpMarkdown } from "../services/marp-report/marpGenerator.js";
import { convertDeck } from "../services/marp-report/marpConverter.js";

const auditId = Number(process.argv[2]);
const handle = process.argv[3] ?? `audit`;
if (!auditId) throw new Error("Usage: renderDeck.ts <auditId> [handle]");

const marpDir = path.resolve("reports", "marp");
mkdirSync(marpDir, { recursive: true });

try {
  const base = `${handle}-audit-${auditId}`;
  const lightMd = path.join(marpDir, `${base}-light.md`);
  writeFileSync(lightMd, await generateMarpMarkdown(auditId, "light"), "utf-8");
  const light = await convertDeck(lightMd, marpDir, `${base}-light`, "themes/botlogix-light.css");

  const darkMd = path.join(marpDir, `${base}-dark.md`);
  writeFileSync(darkMd, await generateMarpMarkdown(auditId, "dark"), "utf-8");
  const dark = await convertDeck(darkMd, marpDir, `${base}-dark`, "themes/botlogix-dark.css");

  console.log(`\nLight PDF: ${light.pdf}`);
  console.log(`Dark PDF:  ${dark.pdf}`);
} finally {
  await sqlClient.end({ timeout: 5 });
}
