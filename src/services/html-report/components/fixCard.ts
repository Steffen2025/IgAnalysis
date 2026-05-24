import { parseMarkdownTable, escapeHTML, markdownToHTML } from "./utils.js";

interface FixRow {
  number: string; fix: string; why: string; how: string; impact: string; effort: string;
}

function parseFixRows(md: string): FixRow[] {
  const tableRows = parseMarkdownTable(md);
  if (tableRows.length >= 2) {
    return tableRows.slice(1).map((cols, i) => ({
      number: String(i + 1),
      fix: cols[1] ?? cols[0] ?? "",
      why: cols[2] ?? "",
      how: cols[3] ?? "",
      impact: cols[4] ?? "",
      effort: cols[5] ?? cols[4] ?? "",
    }));
  }
  return [];
}

export function renderTop5Fixes(md: string): string {
  if (!md) return placeholder();

  const fixes = parseFixRows(md);

  if (fixes.length === 0) {
    return `
<section class="page">
  <span class="eyebrow">The Five Moves That Matter Most</span>
  <h2 class="section-title">Highest-leverage actions</h2>
  <div class="narrative-prose">${markdownToHTML(md)}</div>
</section>`;
  }

  const cards = fixes.map(f => `
    <div class="fix-card">
      <div class="fix-card-header">
        <div class="fix-badge">${escapeHTML(f.number)}</div>
        <h3 class="fix-title">${escapeHTML(f.fix.replace(/\*\*/g, ""))}</h3>
      </div>
      <div class="fix-meta">
        ${f.why    ? `<div><span class="fix-meta-label">Why it matters</span><div class="fix-meta-value">${escapeHTML(f.why)}</div></div>` : ""}
        ${f.how    ? `<div><span class="fix-meta-label">How to execute</span><div class="fix-meta-value">${escapeHTML(f.how)}</div></div>` : ""}
        ${f.impact ? `<div><span class="fix-meta-label">Score impact</span><div class="fix-meta-value">${escapeHTML(f.impact)}</div></div>` : ""}
        ${f.effort ? `<div><span class="fix-meta-label">Effort</span><div class="fix-meta-value">${escapeHTML(f.effort)}</div></div>` : ""}
      </div>
    </div>`).join("");

  return `
<section class="page">
  <span class="eyebrow">The Five Moves That Matter Most</span>
  <h2 class="section-title">Highest-leverage actions</h2>
  ${cards}
</section>`;
}

function placeholder(): string {
  return `<section class="page"><span class="eyebrow">Top 5 Fixes</span><p><em>Section unavailable.</em></p></section>`;
}
