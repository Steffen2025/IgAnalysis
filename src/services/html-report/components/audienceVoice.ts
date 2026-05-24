import { markdownToHTML, escapeHTML } from "./utils.js";
import type { ReportData } from "../../report/reportDataAssembler.js";

export function renderAudienceVoice(md: string, data: ReportData): string {
  if (!md) return placeholder();

  const cleanMd = md.replace(/^##[^\n]*\n/m, "").trim();
  const questions = (data.comments as any)?.topQuestions?.slice(0, 5) ?? [];
  const language = (data.comments as any)?.audienceLanguage?.slice(0, 10) ?? [];

  const hasCommentData = questions.length > 0 || language.length > 0;

  const fallbackBlock = `
<div class="audience-fallback">
  <p>No comment data was collected in this audit. Your content hasn't yet generated the volume of conversation needed to measure audience language patterns.</p>
  <p>The 7-day plan starts asking questions in captions — by the next audit, this section becomes a goldmine of direct audience intelligence.</p>
</div>`;

  const quoteBlocks = questions.length > 0
    ? `<div class="quote-grid">
        ${questions.map((q: string) => `<div class="quote-block">&ldquo;${escapeHTML(q)}&rdquo;</div>`).join("")}
      </div>`
    : "";

  const langChips = language.length > 0
    ? `<p class="eyebrow" style="margin-top:28px">Recurring audience language</p>
       <div class="hashtag-grid">
         ${language.map((t: string) => `<span class="hashtag-chip">${escapeHTML(t)}</span>`).join("")}
       </div>`
    : "";

  return `
<section class="page">
  <span class="eyebrow">What Your Audience Is Saying</span>
  <h2 class="section-title">Audience intelligence</h2>
  <div class="narrative-prose">${markdownToHTML(cleanMd)}</div>
  ${hasCommentData ? quoteBlocks + langChips : fallbackBlock}
</section>`;
}

function placeholder(): string {
  return `<section class="page"><span class="eyebrow">Audience Voice</span><p><em>Section unavailable.</em></p></section>`;
}
