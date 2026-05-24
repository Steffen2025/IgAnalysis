import { execSync } from "child_process";
import { join } from "path";

export interface ConvertResult {
  pdf: string;
  html: string;
  pptx: string;
}

function run(cmd: string): void {
  try {
    execSync(cmd, { stdio: ["ignore", "inherit", "pipe"] });
  } catch (err: any) {
    const stderr = err.stderr?.toString() ?? "";
    // Marp exits non-zero on some warnings; only throw if the output file was not produced
    if (stderr) console.warn("[marp]", stderr.slice(0, 400));
    // Re-throw only true errors
    if (err.status && err.status > 1) throw err;
  }
}

export function convertDeck(mdPath: string, outDir: string, basename: string): ConvertResult {
  // Resolve theme path relative to cwd (the project root)
  const themeArg = `--theme-set themes/botlogix.css`;
  const flags    = `${themeArg} --allow-local-files`;

  const pdf  = join(outDir, `${basename}.pdf`);
  const html = join(outDir, `${basename}.html`);
  const pptx = join(outDir, `${basename}.pptx`);

  console.log("  → Generating PDF…");
  run(`npx marp "${mdPath}" --pdf  ${flags} --output "${pdf}"`);

  console.log("  → Generating HTML…");
  run(`npx marp "${mdPath}" --html ${flags} --output "${html}"`);

  console.log("  → Generating PPTX…");
  run(`npx marp "${mdPath}" --pptx ${flags} --output "${pptx}"`);

  return { pdf, html, pptx };
}
