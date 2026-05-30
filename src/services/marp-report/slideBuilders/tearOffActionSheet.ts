import type { ReportData } from "../../report/reportDataAssembler.js";

function e(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface FixRow {
  number: string;
  fix: string;
  why: string;
}

function parseMarkdownTable(md: string): string[][] {
  const rows: string[][] = [];
  for (const line of md.split("\n")) {
    if (line.trim().startsWith("|") && !line.includes("---")) {
      const cols = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cols.length > 0) rows.push(cols);
    }
  }
  return rows;
}

function parseTopFixes(md: string): FixRow[] {
  const tableRows = parseMarkdownTable(md);
  if (tableRows.length >= 2) {
    return tableRows.slice(1, 4).map((cols, i) => ({
      number: String(i + 1),
      fix: cols[1] ?? cols[0] ?? "",
      why: cols[2] ?? "",
    }));
  }
  return [];
}

export function tearOffActionSheet(data: ReportData, fixesMd: string, nextMd: string): string {
  const market = data.reportContext.localMarketLabel;
  const fixes = parseTopFixes(fixesMd);
  const priorityRows =
    fixes.length > 0
      ? fixes
          .map(
            (f) => `<li class="tear-check"><span class="tear-box"></span><span><strong>${e(f.fix.replace(/\*\*/g, ""))}</strong> — ${e(f.why.slice(0, 100))}</span></li>`,
          )
          .join("\n")
      : `<li class="tear-check"><span class="tear-box"></span><span>Update bio with ${e(market)} and a clear offer</span></li>
<li class="tear-check"><span class="tear-box"></span><span>Add local hashtags and location tags to the next 3 posts</span></li>
<li class="tear-check"><span class="tear-box"></span><span>Publish one FAQ post and one proof post this week</span></li>`;

  const quickWins = nextMd
    .split("\n")
    .map((line) => line.match(/^(\d+)[.)]\s*(.+)/))
    .filter(Boolean)
    .slice(0, 4)
    .map((m) => `<li class="tear-check"><span class="tear-box"></span><span>${e(m![2].replace(/\*\*/g, "").trim().slice(0, 90))}</span></li>`)
    .join("\n");

  const defaultChecks = [
    `<li class="tear-check tear-check-lg"><span class="tear-box"></span><span>Update bio: ${e(market)} + one offer + one CTA</span></li>`,
    `<li class="tear-check tear-check-lg"><span class="tear-box"></span><span>Publish one local FAQ or proof post (15–30 min)</span></li>`,
    `<li class="tear-check tear-check-lg"><span class="tear-box"></span><span>Add location tag + 3 local hashtags on your next post</span></li>`,
    `<li class="tear-check tear-check-lg"><span class="tear-box"></span><span>Comment on 5 local accounts (real replies, not spam)</span></li>`,
    `<li class="tear-check tear-check-lg"><span class="tear-box"></span><span>Save this page — check profile visits + DMs on day 7</span></li>`,
  ];
  const startChecks =
    fixes.length > 0
      ? priorityRows +
        defaultChecks.slice(fixes.length).join("\n")
      : defaultChecks.join("\n");

  return `<span class="eyebrow">Start here</span>

# Your first-week checklist

<p>Check these off before you read the rest. No scoring theory — just execution.</p>

<ul class="tear-list tear-list-hero">${startChecks}</ul>

<div class="guide-card full tear-print-hint">
  <div class="copy"><strong>Print or screenshot this page.</strong> Come back on day 7 to compare profile visits, saves, comments, and DMs.</div>
</div>`;
}
