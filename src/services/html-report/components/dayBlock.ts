import { parseDays, escapeHTML, markdownToHTML } from "./utils.js";

export function renderNext7Days(md: string): string {
  if (!md) return placeholder();

  const days = parseDays(md);

  if (days.length === 0) {
    return `
<section class="page">
  <div class="section-label">Next 7 Days</div>
  <h2>Your first week</h2>
  <div class="narrative-prose">${markdownToHTML(md)}</div>
</section>`;
  }

  const blocks = days.map((d, i) => {
    const dayNum = i + 1;
    const title = d.label.replace(/\*\*Day \d+[^*]*\*\*\s*/, "").replace(/Day \d+\s*[—–-]\s*/, "");
    const items = d.items.map(item => `
      <li class="day-item">
        <div class="day-item-circle"></div>
        <span>${escapeHTML(item)}</span>
      </li>`).join("");

    return `
    <div class="day-block">
      <div class="day-label">Day ${dayNum}</div>
      ${title ? `<div class="day-title">${escapeHTML(title)}</div>` : ""}
      ${items ? `<ul class="day-items">${items}</ul>` : ""}
    </div>`;
  }).join("");

  return `
<section class="page">
  <div class="section-label">Next 7 Days</div>
  <h2>Your first week</h2>
  ${blocks}
</section>`;
}

function placeholder(): string {
  return `<section class="page"><div class="section-label">Next 7 Days</div><p><em>Section unavailable.</em></p></section>`;
}
