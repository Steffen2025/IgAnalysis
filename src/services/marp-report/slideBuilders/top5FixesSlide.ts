function e(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface FixRow {
  number: string; fix: string; why: string; how: string; impact: string; effort: string;
}

function parseMarkdownTable(md: string): string[][] {
  const rows: string[][] = [];
  for (const line of md.split("\n")) {
    if (line.trim().startsWith("|") && !line.includes("---")) {
      const cols = line.split("|").slice(1, -1).map(c => c.trim());
      if (cols.length > 0) rows.push(cols);
    }
  }
  return rows;
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
  // Fallback: numbered list
  const fixes: FixRow[] = [];
  const lines = md.split("\n");
  let current: Partial<FixRow> | null = null;
  for (const line of lines) {
    const m = line.match(/^(\d+)[.)]\s*\*{0,2}(.+?)\*{0,2}\s*$/);
    if (m) {
      if (current?.fix) fixes.push(current as FixRow);
      current = { number: m[1], fix: m[2].replace(/\*\*/g, "").trim(), why: "", how: "", impact: "", effort: "" };
    } else if (current && line.trim() && !current.why) {
      current.why = line.replace(/^[-*]\s*/, "").trim().slice(0, 120);
    }
  }
  if (current?.fix) fixes.push(current as FixRow);
  return fixes.slice(0, 5);
}

function renderFixRow(f: FixRow): string {
  const support = [f.why, f.how].filter(Boolean).join(" ");
  const cite = [f.impact, f.effort].filter(Boolean).join(" · ");
  return `<li class="priority-row">
  <div class="priority-num">${e(f.number)}</div>
  <div class="priority-body">
    <div class="priority-title">${e(f.fix.replace(/\*\*/g, ""))}</div>
    ${support ? `<p class="priority-support">${e(support)}</p>` : ""}
    ${cite ? `<div class="priority-cite">${e(cite)}</div>` : ""}
  </div>
</li>`;
}

function normLevel(raw: string, fallback: "high" | "medium" | "low"): "high" | "medium" | "low" {
  const v = raw.toLowerCase();
  if (v.includes("high")) return "high";
  if (v.includes("low")) return "low";
  if (v.includes("med")) return "medium";
  return fallback;
}

/**
 * Ranked Impact-vs-Effort card grid. Replaces the old absolutely-positioned
 * matrix dots, which collapsed to a pile of digits ("43251") whenever the PDF
 * renderer dropped the inline left/top styles. A grid of badge cards renders
 * identically every time.
 */
function renderMoveGrid(fixes: FixRow[]): string {
  const cards = fixes.slice(0, 5).map((f, i) => {
    const impact = normLevel(f.impact, "high");
    const effort = normLevel(f.effort, "medium");
    const title = e(f.fix.replace(/\*\*/g, "").trim().slice(0, 64));
    return `<div class="move-card move-impact-${impact}">
  <div class="move-rank">${i + 1}</div>
  <div class="move-body">
    <div class="move-title">${title}</div>
    <div class="move-badges">
      <span class="move-badge impact-${impact}">${impact} impact</span>
      <span class="move-badge effort-${effort}">${effort} effort</span>
    </div>
  </div>
</div>`;
  });
  return `<div class="move-grid">
${cards.join("\n")}
</div>`;
}

/** Workbook: impact/effort matrix + ranked five moves (action-first). */
export function fiveMovesWorkbookSlides(md: string): string[] {
  const fixes = parseFixRows(md);

  if (fixes.length === 0) {
    return [`<span class="eyebrow">Five moves that matter most</span>

# Your highest-leverage actions

<div style="font-size:17px;color:var(--text-secondary);line-height:1.6">${e(md.slice(0, 700))}</div>`];
  }

  const moveGrid = renderMoveGrid(fixes);

  return [
    `<span class="eyebrow">Five moves that matter most</span>

# Do these first

<p>This is your 30-day sprint, not a score lecture. Ranked by leverage — start at #1.</p>

${moveGrid}

<div class="guide-card full">
  <div class="kicker">How to read this</div>
  <div class="copy">High-impact / low-effort moves come first. Knock out one move at a time — the detail and timing live on the sprint and Week 1 pages next.</div>
</div>`,
  ];
}

export function top5FixesSlides(md: string): string[] {
  const fixes = parseFixRows(md);

  if (fixes.length === 0) {
    return [`<span class="eyebrow">05 · Top priorities</span>

# The five moves that matter most

<div style="font-size:17px;color:var(--text-secondary);line-height:1.6">${e(md.slice(0, 800))}</div>`];
  }

  if (fixes.length <= 3) {
    return [`<span class="eyebrow">05 · Top priorities</span>

# The five moves that matter most

<ul class="priority-list">
${fixes.map(renderFixRow).join("\n")}
</ul>`];
  }

  return [
    `<span class="eyebrow">05 · Top priorities · 1–3</span>

# The five moves that matter most

<ul class="priority-list">
${fixes.slice(0, 3).map(renderFixRow).join("\n")}
</ul>`,
    `<span class="eyebrow">05 · Top priorities · 4–5</span>

# The five moves that matter most _(continued)_

<ul class="priority-list">
${fixes.slice(3, 5).map(renderFixRow).join("\n")}
</ul>`,
  ];
}
