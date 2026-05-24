import { markdownToHTML, escapeHTML } from "./utils.js";
import type { ReportData } from "../../report/reportDataAssembler.js";

export function renderAudienceVoice(md: string, data: ReportData): string {
  if (!md) return placeholder();

  const cleanMd = md.replace(/^##.*\n/m, "").trim();
  const questions = (data.comments as any)?.topQuestions?.slice(0, 5) ?? [];
  const language = (data.comments as any)?.audienceLanguage?.slice(0, 8) ?? [];

  const quoteBlocks = questions.length > 0
    ? `<div class="quote-grid">
        ${questions.map(q => `<div class="quote-block">&ldquo;${escapeHTML(q)}&rdquo;</div>`).join("")}
      </div>`
    : "";

  const languageChips = language.length > 0
    ? `<div class="hashtag-grid">
        ${language.map(t => `<span class="hashtag-chip">${escapeHTML(t)}</span>`).join("")}
      </div>`
    : "";

  return `
<section class="page">
  <div class="section-label">Audience Voice</div>
  <h2>What your audience says</h2>
  <div class="narrative-prose">${markdownToHTML(cleanMd)}</div>
  ${quoteBlocks}
  ${language.length > 0 ? `<p class="section-label" style="margin-top:24px">Recurring language tokens</p>${languageChips}` : ""}
</section>`;
}

function placeholder(): string {
  return `<section class="page"><div class="section-label">Audience Voice</div><p><em>Section unavailable.</em></p></section>`;
}
