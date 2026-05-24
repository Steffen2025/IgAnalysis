import { escapeHTML } from "./utils.js";

export interface StatCell {
  value: string;
  suffix?: string;
  label: string;
  context?: string;
  color?: string; // CSS color string
}

export function renderStatCallout(cells: StatCell[], fourCol = false): string {
  const cols = cells.slice(0, fourCol ? 4 : 3);
  const gridClass = fourCol || cols.length === 4 ? "stat-callout four-col" : "stat-callout";

  const cellsHTML = cols.map(c => `
    <div class="stat-cell">
      <span class="stat-label">${escapeHTML(c.label)}</span>
      <div class="stat-value" ${c.color ? `style="color:${c.color}"` : ""}>
        ${escapeHTML(c.value)}
        ${c.suffix ? `<span class="stat-suffix">${escapeHTML(c.suffix)}</span>` : ""}
      </div>
      ${c.context ? `<div class="stat-context">${escapeHTML(c.context)}</div>` : ""}
    </div>`).join("");

  return `<div class="${gridClass}">${cellsHTML}</div>`;
}
