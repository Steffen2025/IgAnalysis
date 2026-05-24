import { escapeHTML } from "./utils.js";

export function renderNarrativeQuote(text: string, attribution?: string): string {
  return `
<div class="narrative-quote">
  <div class="narrative-quote-text">${escapeHTML(text)}</div>
  ${attribution ? `<div class="narrative-quote-attr">${escapeHTML(attribution)}</div>` : ""}
</div>`;
}
