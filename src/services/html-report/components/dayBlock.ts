import { parseDays, escapeHTML, markdownToHTML } from "./utils.js";

export function renderNext7Days(md: string): string {
  if (!md) return placeholder();

  const days = parseDays(md);

  if (days.length === 0) {
    return `
<section class="page">
  <span class="eyebrow">Next 7 Days</span>
  <h2 class="section-title">Your first week</h2>
  <div class="narrative-prose">${markdownToHTML(md)}</div>
</section>`;
  }

  const blocks = days.map((d, i) => {
    const dayNum = i + 1;
    const title = d.label
      .replace(/\*\*Day \d+[^*]*\*\*\s*/, "")
      .replace(/Day \d+\s*[—–-]\s*/, "")
      .trim();

    const items = d.items.map(item => `
      <li class="day-item">
        <div class="day-dot"></div>
        <span>${escapeHTML(item)}</span>
      </li>`).join("");

    return `
    <div class="day-block">
      <span class="day-eyebrow">Day ${dayNum}</span>
      ${title ? `<div class="day-title">${escapeHTML(title)}</div>` : ""}
      ${items ? `<ul class="day-items">${items}</ul>` : ""}
    </div>`;
  }).join("");

  return `
<section class="page">
  <span class="eyebrow">Next 7 Days</span>
  <h2 class="section-title">Your first week</h2>
  ${blocks}
</section>`;
}

function placeholder(): string {
  return `<section class="page"><span class="eyebrow">Next 7 Days</span><p><em>Section unavailable.</em></p></section>`;
}
