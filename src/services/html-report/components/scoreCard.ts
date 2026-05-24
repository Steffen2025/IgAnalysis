import type { ReportData } from "../../report/reportDataAssembler.js";
import { scoreColor, markdownToHTML } from "./utils.js";

interface ScoreRow {
  label: string;
  score: number;
}

function getScoreRows(data: ReportData): ScoreRow[] {
  const s = data.scores;
  const rows: ScoreRow[] = [
    { label: "Overall Score", score: s.overall },
  ];

  // Try to get dimension scores from score_explanations or signals
  type ScoreKey = keyof typeof s;
  const dimensionKeys: Array<{ key: ScoreKey; label: string }> = [
    { key: "content_performance" as ScoreKey, label: "Content Performance" },
    { key: "local_visibility" as ScoreKey, label: "Local Visibility" },
    { key: "competitor_gap" as ScoreKey, label: "Competitor Gap" },
    { key: "sales_readiness" as ScoreKey, label: "Sales Readiness" },
    { key: "profile_conversion" as ScoreKey, label: "Profile Conversion" },
  ];

  for (const { key, label } of dimensionKeys) {
    const val = s[key];
    if (typeof val === "number") {
      rows.push({ label, score: val });
    }
  }

  return rows;
}

export function renderScoreCard(data: ReportData, snapshotMd: string): string {
  const rows = getScoreRows(data);
  const mainScore = rows[0];
  const dimRows = rows.slice(1);

  const dimBars = dimRows.map(r => {
    const color = scoreColor(r.score);
    return `
      <div class="score-bar-row">
        <div class="score-bar-label">${r.label}</div>
        <div class="score-bar-track">
          <div class="score-bar-fill" style="width:${r.score}%;background:${color}"></div>
        </div>
        <div class="score-bar-value" style="color:${color}">${r.score}</div>
      </div>`;
  }).join("");

  // Strip heading from snapshot markdown
  const cleanMd = snapshotMd
    ? snapshotMd.replace(/^##.*\n/m, "").trim()
    : "";

  return `
<section class="page">
  <div class="section-label">Account Snapshot</div>
  <h2>Where you stand</h2>

  ${cleanMd ? `<div class="snapshot-prose">${markdownToHTML(cleanMd)}</div>` : ""}

  ${dimBars ? `
  <div class="score-bars">
    ${dimBars}
  </div>
  <p class="score-caption">Scores update each time you re-run this audit.</p>
  ` : ""}
</section>`;
}
