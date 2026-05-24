import { parseMarkdownTable, escapeHTML, markdownToHTML } from "./utils.js";

interface FixRow {
  number: string;
  fix: string;
  why: string;
  how: string;
  impact: string;
  effort: string;
}

function parseFixRows(md: string): FixRow[] {
  // Try table parse first
  const tableRows = parseMarkdownTable(md);
  if (tableRows.length >= 2) {
    // First row is header, skip it
    return tableRows.slice(1).map((cols, i) => ({
      number: String(i + 1),
      fix: cols[1] ?? cols[0] ?? "",
      why: cols[2] ?? "",
      how: cols[3] ?? "",
      impact: cols[4] ?? "",
      effort: cols[5] ?? cols[4] ?? "",
    }));
  }

  // Fallback: treat markdown as freeform
  return [];
}

export function renderTop5Fixes(md: string): string {
  if (!md) return placeholder();

  const fixes = parseFixRows(md);

  if (fixes.length === 0) {
    // Fallback to rendered markdown
    return `
<section class="page">
  <div class="section-label">Top 5 Fixes</div>
  <h2>Highest-leverage actions</h2>
  <div class="narrative-prose">${markdownToHTML(md)}</div>
</section>`;
  }

  const cards = fixes.map((f) => `
    <div class="fix-card">
      <div class="fix-card-header">
        <div class="fix-number-badge">${escapeHTML(f.number)}</div>
        <h3 class="fix-title">${escapeHTML(f.fix.replace(/\*\*/g, ""))}</h3>
      </div>
      <div class="fix-meta">
        ${f.why ? `<div class="fix-meta-item">
          <div class="fix-meta-label">Why it matters</div>
          <div class="fix-meta-value">${escapeHTML(f.why)}</div>
        </div>` : ""}
        ${f.how ? `<div class="fix-meta-item">
          <div class="fix-meta-label">How to execute</div>
          <div class="fix-meta-value">${escapeHTML(f.how)}</div>
        </div>` : ""}
        ${f.impact ? `<div class="fix-meta-item">
          <div class="fix-meta-label">Score impact</div>
          <div class="fix-meta-value">${escapeHTML(f.impact)}</div>
        </div>` : ""}
        ${f.effort ? `<div class="fix-meta-item">
          <div class="fix-meta-label">Effort</div>
          <div class="fix-meta-value">${escapeHTML(f.effort)}</div>
        </div>` : ""}
      </div>
    </div>`).join("");

  return `
<section class="page">
  <div class="section-label">Top 5 Fixes</div>
  <h2>Highest-leverage actions</h2>
  ${cards}
</section>`;
}

function placeholder(): string {
  return `<section class="page"><div class="section-label">Top 5 Fixes</div><p><em>Section unavailable.</em></p></section>`;
}
