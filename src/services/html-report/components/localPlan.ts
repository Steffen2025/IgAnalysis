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

  const cleanMd = md.replace(/^##.*\n/m, "").trim();
  const hashtags = extractHashtags(cleanMd);

  const chips = hashtags.length > 0
    ? `<p class="section-label" style="margin-top:24px">Recommended hashtags</p>
       <div class="hashtag-grid">
         ${hashtags.map(t => `<span class="hashtag-chip">${escapeHTML(t)}</span>`).join("")}
       </div>`
    : "";

  return `
<section class="page">
  <div class="section-label">Local Visibility Plan</div>
  <h2>Building local signal</h2>
  <div class="narrative-prose">${markdownToHTML(cleanMd)}</div>
  ${chips}
</section>`;
}

function placeholder(): string {
  return `<section class="page"><div class="section-label">Local Visibility Plan</div><p><em>Section unavailable.</em></p></section>`;
}
