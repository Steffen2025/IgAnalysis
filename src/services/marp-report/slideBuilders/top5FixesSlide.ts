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
  return `<div class="fix-row">
  <div class="fix-num">${e(f.number)}</div>
  <div>
    <div class="fix-title">${e(f.fix.replace(/\*\*/g, ""))}</div>
    ${f.why ? `<div class="fix-col-label">Why it matters</div><div style="font-size:14px;color:#5C5A52">${e(f.why)}</div>` : ""}
  </div>
  <div>
    ${f.how ? `<div class="fix-col-label">How to execute</div><div style="font-size:14px;color:#5C5A52">${e(f.how)}</div>` : ""}
  </div>
  <div>
    ${f.impact ? `<div class="fix-col-label">Score impact</div><div style="font-size:14px;color:#5C5A52">${e(f.impact)}</div>` : ""}
  </div>
  <div class="fix-effort">${e(f.effort || "—")}</div>
</div>`;
}

export function top5FixesSlides(md: string): string[] {
  const fixes = parseFixRows(md);

  if (fixes.length === 0) {
    return [`<span class="eyebrow">The Five Moves That Matter Most</span>

# Highest-leverage actions

<div style="font-size:17px;color:#5C5A52;line-height:1.6">${e(md.slice(0, 800))}</div>`];
  }

  if (fixes.length <= 3) {
    return [`<span class="eyebrow">The Five Moves That Matter Most</span>

# Highest-leverage actions

${fixes.map(renderFixRow).join("\n")}`];
  }

  return [
    `<span class="eyebrow">The Five Moves That Matter Most · 1–3</span>

# Highest-leverage actions

${fixes.slice(0, 3).map(renderFixRow).join("\n")}`,
    `<span class="eyebrow">The Five Moves That Matter Most · 4–5</span>

# Highest-leverage actions _(continued)_

${fixes.slice(3, 5).map(renderFixRow).join("\n")}`,
  ];
}
