import "dotenv/config";
import { writeFileSync, statSync, mkdirSync } from "fs";
import { join } from "path";
import { db, sqlClient } from "../db/index.js";
import { audits } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";
import { generateMarpMarkdown } from "../services/marp-report/marpGenerator.js";
import { convertDeck } from "../services/marp-report/marpConverter.js";

const OUT_DIR = "reports/marp";
mkdirSync(OUT_DIR, { recursive: true });

async function buildVariant(auditId: number, basename: string, theme: "dark" | "light") {
  console.log(`\nBuilding ${theme} slide markdown…`);
  const markdown = await generateMarpMarkdown(auditId, theme);
  const variantBase = `${basename}-${theme}`;
  const mdPath = join(OUT_DIR, `${variantBase}.md`);
  writeFileSync(mdPath, markdown, "utf8");

  const slideCount = (markdown.match(/^---$/gm) ?? []).length;
  console.log(`  Slide separators: ${slideCount}  →  ~${slideCount} slides`);
  console.log(`  Markdown: ${mdPath}  (${Math.round(Buffer.byteLength(markdown) / 1024)} KB)`);

  console.log(`\nConverting ${theme} via Marp CLI…`);
  const outputs = await convertDeck(mdPath, OUT_DIR, variantBase, `themes/botlogix-${theme}.css`);
  return { theme, mdPath, slideCount, ...outputs };
}

try {
  // Find most recent @botlogix audit
  const botlogixAudits = await db
    .select()
    .from(audits)
    .where(eq(audits.instagram_url, "https://www.instagram.com/botlogix/"))
    .orderBy(desc(audits.id));

  if (botlogixAudits.length === 0) {
    throw new Error("No @botlogix audit found.");
  }

  const audit = botlogixAudits[0];
  console.log(`\nGenerating Marp decks for audit #${audit.id} — ${audit.business_name ?? "@botlogix"}`);
  console.log("─".repeat(60));

  const basename = `botlogix-audit-${audit.id}`;
  const light = await buildVariant(audit.id, basename, "light");
  const dark = await buildVariant(audit.id, basename, "dark");

  // Print summary
  console.log("\n" + "═".repeat(60));
  console.log("OUTPUTS");
  console.log("─".repeat(60));

  function kb(path: string): string {
    try { return `${Math.round(statSync(path).size / 1024)} KB`; } catch { return "not found"; }
  }

  for (const output of [light, dark]) {
    console.log(`  ${output.theme.toUpperCase()}`);
    console.log(`    .md   ${output.mdPath}  ${kb(output.mdPath)}`);
    console.log(`    .pdf  ${output.pdf}  ${kb(output.pdf)}`);
    console.log(`    .html ${output.html}  ${kb(output.html)}`);
    console.log(`    .pptx ${output.pptx}  ${kb(output.pptx)}`);
  }
  console.log("─".repeat(60));
  console.log(`  Total slides: ~${dark.slideCount}`);
  console.log(`\n  Primary deliverable (30-Day Action Workbook — light):`);
  console.log(`    start ${light.pdf}`);
  console.log(`\n  Optional dark export:`);
  console.log(`    start ${dark.pdf}`);
} finally {
  await sqlClient.end({ timeout: 5 });
}
