import { markdownToHTML, escapeHTML } from "./utils.js";
import type { ReportData } from "../../report/reportDataAssembler.js";

function extractHashtags(md: string): string[] {
  const chips: string[] = [];
  const matches = md.matchAll(/#([A-Za-z][A-Za-z0-9_]+)/g);
  for (const m of matches) {
    const tag = `#${m[1]}`;
    if (!chips.includes(tag)) chips.push(tag);
  }
  return chips.slice(0, 12);
}

export function renderLocalPlan(md: string, data: ReportData): string {
  if (!md) return placeholder();

  const cleanMd = md.replace(/^##[^\n]*\n/m, "").trim();
  const hashtags = extractHashtags(cleanMd);

  return `
<section class="page">
  <span class="eyebrow">Your Local Market</span>
  <h2 class="section-title">Building local signal</h2>
  <div class="narrative-prose">${markdownToHTML(cleanMd)}</div>

  ${hashtags.length > 0 ? `
  <div style="margin-top:28px">
    <span class="eyebrow">Recommended hashtags from this analysis</span>
    <div class="hashtag-grid" style="margin-top:10px">
      ${hashtags.map(t => `<span class="hashtag-chip">${escapeHTML(t)}</span>`).join("")}
    </div>
    <p class="hashtag-note" style="margin-top:12px">Borrow the hashtags. Never the content.</p>
  </div>` : ""}
</section>`;
}

function placeholder(): string {
  return `<section class="page"><span class="eyebrow">Your Local Market</span><p><em>Section unavailable.</em></p></section>`;
}
