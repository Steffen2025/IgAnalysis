import { escapeHTML, parsePriorities, markdownToHTML } from "./utils.js";

export function renderBattlePlan(md: string): string {
  if (!md) return placeholder();

  const lines = md.split("\n");
  const framingLines: string[] = [];
  let reachedList = false;

  for (const line of lines) {
    if (/^\d+\./.test(line.trim())) { reachedList = true; }
    if (!reachedList && line.trim() && !line.startsWith("#")) {
      framingLines.push(line.trim());
    }
  }

  const framing = framingLines.join(" ").trim();
  const priorities = parsePriorities(md);

  const priorityRows = priorities.length > 0
    ? priorities.map(p => {
        // Try to find a data citation — look for numbers in the body
        const citationMatch = p.body.match(/[\d.]+\s*(?:posts?|%|pts?|\/week|followers?)[^\.\n]*/i);
        const citation = citationMatch ? citationMatch[0].trim() : "";
        const bodyClean = p.body.replace(/\s*\n\s*/g, " ").slice(0, 200);

        return `
        <div class="priority-row">
          <div class="priority-badge">${p.number}</div>
          <div class="priority-content">
            <div class="priority-title">${escapeHTML(p.title)}</div>
            <div class="priority-body">${escapeHTML(bodyClean)}${bodyClean.length < p.body.length ? "…" : ""}</div>
            ${citation ? `<div class="priority-citation">↳ ${escapeHTML(citation)}</div>` : ""}
          </div>
        </div>`;
      }).join("")
    : `<div class="narrative-prose">${markdownToHTML(md)}</div>`;

  return `
<section class="page">
  <span class="eyebrow">One-Page Battle Plan</span>
  <h2 class="section-title">Where to Focus</h2>
  ${framing ? `<p class="battle-intro">${escapeHTML(framing)}</p>` : ""}
  <div class="priority-list">
    ${priorityRows}
  </div>
</section>`;
}

function placeholder(): string {
  return `<section class="page"><span class="eyebrow">One-Page Battle Plan</span><p><em>Section unavailable.</em></p></section>`;
}
