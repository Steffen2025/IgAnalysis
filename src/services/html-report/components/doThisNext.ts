import { parseActions, escapeHTML, markdownToHTML } from "./utils.js";

function tagClass(tag: string): string {
  if (tag === "TODAY") return "tag-today";
  if (tag === "THIS MONTH") return "tag-month";
  if (tag === "IN 30 DAYS") return "tag-30days";
  return "tag-week";
}

export function renderDoThisNext(md: string): string {
  if (!md) return placeholder();

  const actions = parseActions(md);

  if (actions.length === 0) {
    return `
<section class="page">
  <div class="section-label">Do This Next</div>
  <h2>10 actions, time-boxed</h2>
  <div class="narrative-prose">${markdownToHTML(md)}</div>
</section>`;
  }

  const items = actions.map((a, i) => {
    const isLast = i === actions.length - 1;
    return `
    <div class="action-item${isLast ? " action-item-last" : ""}">
      <div class="action-circle"></div>
      <span class="action-number">${a.number}</span>
      <span class="action-text">${escapeHTML(a.text)}</span>
      <span class="action-tag ${tagClass(a.timeTag)}">${a.timeTag}</span>
    </div>`;
  }).join("");

  return `
<section class="page">
  <div class="section-label">Do This Next</div>
  <h2>10 actions, time-boxed</h2>
  <div class="action-checklist">
    ${items}
  </div>
</section>`;
}

function placeholder(): string {
  return `<section class="page"><div class="section-label">Do This Next</div><p><em>Section unavailable.</em></p></section>`;
}
