import "dotenv/config";
import { writeFileSync, statSync, mkdirSync } from "fs";
import { join } from "path";
import { db } from "../db/index.js";
import { audits } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";
import { generateMarpMarkdown } from "../services/marp-report/marpGenerator.js";
import { convertDeck } from "../services/marp-report/marpConverter.js";

const OUT_DIR = "reports/marp";
mkdirSync(OUT_DIR, { recursive: true });

// Find most recent @botlogix audit
const botlogixAudits = db
  .select()
  .from(audits)
  .where(eq(audits.instagram_url, "https://www.instagram.com/botlogix/"))
  .orderBy(desc(audits.id))
  .all();

if (botlogixAudits.length === 0) {
  console.error("No @botlogix audit found.");
  process.exit(1);
}

const audit = botlogixAudits[0];
console.log(`\nGenerating Marp deck for audit #${audit.id} — ${audit.business_name ?? "@botlogix"}`);
console.log("─".repeat(60));

// Generate markdown
console.log("Building slide markdown…");
const markdown = await generateMarpMarkdown(audit.id);

const basename = `botlogix-audit-${audit.id}`;
const mdPath   = join(OUT_DIR, `${basename}.md`);
writeFileSync(mdPath, markdown, "utf8");

const slideCount = (markdown.match(/^---$/gm) ?? []).length;  // separators = slides - 1
const totalSlides = slideCount;  // front-matter separator + slide separators
console.log(`  Slide separators: ${slideCount}  →  ~${slideCount} slides`);
console.log(`  Markdown: ${mdPath}  (${Math.round(Buffer.byteLength(markdown) / 1024)} KB)`);

// Convert to PDF / HTML / PPTX
console.log("\nConverting via Marp CLI…");
const { pdf, html, pptx } = convertDeck(mdPath, OUT_DIR, basename);

// Print summary
console.log("\n" + "═".repeat(60));
console.log("OUTPUTS");
console.log("─".repeat(60));

function kb(path: string): string {
  try { return `${Math.round(statSync(path).size / 1024)} KB`; } catch { return "not found"; }
}

console.log(`  .md   ${mdPath}            ${kb(mdPath)}`);
console.log(`  .pdf  ${pdf}   ${kb(pdf)}`);
console.log(`  .html ${html}  ${kb(html)}`);
console.log(`  .pptx ${pptx}  ${kb(pptx)}`);
console.log("─".repeat(60));
console.log(`  Total slides: ~${totalSlides}`);
console.log(`\n  Open PDF:`);
console.log(`    start ${pdf}`);
console.log("\nRe-run anytime. Cached LLM sections + Marp theme = instant regeneration, zero LLM cost.");
