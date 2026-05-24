import { markdownToHTML, escapeHTML } from "./utils.js";
import { renderNarrativeQuote } from "./narrativeQuote.js";
import { renderStatCallout } from "./statCallout.js";
import type { ReportData } from "../../report/reportDataAssembler.js";

function extractPullQuote(md: string): { text: string; attr?: string } | null {
  const lines = md.split("\n").map(l => l.trim().replace(/\*\*/g, "")).filter(Boolean);
  for (const line of lines) {
    if (
      line.length > 50 && line.length < 220 &&
      !line.startsWith("#") &&
      /\d+x|\d+%|average|benchmark|reference|more than|dominant|majority|single most/i.test(line)
    ) {
      // Pull attributed if mentions an @handle
      const attrMatch = line.match(/@[a-z0-9._]+/i);
      return {
        text: line.replace(/@[a-z0-9._]+/gi, "").trim(),
        attr: attrMatch ? `— pattern observed across ${attrMatch[0]}` : undefined,
      };
    }
  }
  return null;
}

function extractPatternStat(data: ReportData): { catPosts: number; clientAvgCaption: number; catAvgCaption: number } {
  const cat = data.patterns?.category;
  const client = data.patterns?.client;
  return {
    catPosts: cat?.postCount ?? 0,
    clientAvgCaption: client?.captions?.avgLength ?? 0,
    catAvgCaption: cat?.captions?.avgLength ?? 0,
  };
}

export function renderPatternSection(md: string, data: ReportData): string {
  if (!md) return placeholder();

  const cleanMd = md.replace(/^##[^\n]*\n/m, "").trim();
  const quote = extractPullQuote(cleanMd);
  const { catPosts, clientAvgCaption, catAvgCaption } = extractPatternStat(data);

  const statCells = [];
  if (catPosts > 0) statCells.push({ value: String(catPosts), label: "Category Posts Analyzed", context: "Benchmark sample" });
  if (catAvgCaption > 0) statCells.push({ value: String(catAvgCaption), suffix: "ch", label: "Category Avg Caption", context: "Target length" });
  if (clientAvgCaption > 0) statCells.push({ value: String(clientAvgCaption), suffix: "ch", label: "Your Avg Caption", context: clientAvgCaption > catAvgCaption ? "Above category" : "Below category" });

  return `
<section class="page">
  <span class="eyebrow">What's Working in Your Market</span>
  <h2 class="section-title">Content patterns in your category</h2>

  ${quote ? renderNarrativeQuote(quote.text, quote.attr) : ""}

  <div class="narrative-prose">${markdownToHTML(cleanMd)}</div>

  ${statCells.length >= 2 ? renderStatCallout(statCells) : ""}
</section>`;
}

function placeholder(): string {
  return `<section class="page"><span class="eyebrow">Content Pattern Analysis</span><p><em>Section unavailable.</em></p></section>`;
}
