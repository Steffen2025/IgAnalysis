import { markdownToHTML, escapeHTML } from "./utils.js";
import type { ReportData } from "../../report/reportDataAssembler.js";

function extractPullQuote(md: string, data: ReportData): string | null {
  // Try to find a significant comparison sentence
  const lines = md.split("\n").map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Look for lines with numbers, percentages, or "x more"
    if (/\d+x|times more|average|benchmark|reference/i.test(line) && line.length > 40 && line.length < 200) {
      return line.replace(/\*\*/g, "").trim();
    }
  }

  // Fallback: use the biggest gap
  const gaps = data.patterns?.gaps ?? [];
  if (gaps.length > 0) {
    return `The highest-leverage gap is ${gaps[0].label ?? "content frequency"} — closing it is worth more points than any other single change.`;
  }

  return null;
}

export function renderPatternSection(md: string, data: ReportData): string {
  if (!md) return placeholder();

  const cleanMd = md.replace(/^##.*\n/m, "").trim();
  const pullQuote = extractPullQuote(cleanMd, data);

  return `
<section class="page">
  <div class="section-label">Content Pattern Analysis</div>
  <h2>How this category performs</h2>
  <div class="narrative-prose">${markdownToHTML(cleanMd)}</div>
  ${pullQuote ? `<blockquote class="pull-quote">${escapeHTML(pullQuote)}</blockquote>` : ""}
</section>`;
}

function placeholder(): string {
  return `<section class="page"><div class="section-label">Content Pattern Analysis</div><p><em>Section unavailable.</em></p></section>`;
}
