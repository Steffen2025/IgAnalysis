import { escapeHTML, parsePriorities, markdownToHTML } from "./utils.js";

export function renderBattlePlan(md: string): string {
  if (!md) return renderPlaceholder("One-Page Battle Plan");

  // Extract the framing sentence (first paragraph before the numbered list)
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

  const priorityHTML = priorities.length > 0
    ? priorities.map(p => `
        <div class="priority-row">
          <div class="priority-number">${p.number}</div>
          <div class="priority-content">
            <div class="priority-title">${escapeHTML(p.title)}</div>
            <div class="priority-body">${escapeHTML(p.body.replace(/\s*\n\s*/g, " "))}</div>
          </div>
        </div>`).join("")
    : markdownToHTML(md);

  return `
<section class="page">
  <div class="section-label">One-Page Battle Plan</div>
  <h2>Where to Focus</h2>
  ${framing ? `<div class="battle-plan-framing">${escapeHTML(framing)}</div>` : ""}
  <div class="priority-list">
    ${priorityHTML}
  </div>
</section>`;
}

function renderPlaceholder(title: string): string {
  return `<section class="page"><div class="section-label">${escapeHTML(title)}</div><p><em>Section unavailable.</em></p></section>`;
}
