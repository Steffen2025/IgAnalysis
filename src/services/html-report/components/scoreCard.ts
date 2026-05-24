import type { ReportData } from "../../report/reportDataAssembler.js";
import { scoreColor, markdownToHTML } from "./utils.js";

interface ScoreRow { label: string; score: number; }

function getScoreRows(data: ReportData): ScoreRow[] {
  const s = data.scores;
  const rows: ScoreRow[] = [];
  type SK = keyof typeof s;
  const dims: Array<{ key: SK; label: string }> = [
    { key: "content_performance" as SK, label: "Content Performance" },
    { key: "local_visibility" as SK,    label: "Local Visibility" },
    { key: "competitor_gap" as SK,      label: "Competitor Gap" },
    { key: "sales_readiness" as SK,     label: "Sales Readiness" },
    { key: "profile_conversion" as SK,  label: "Profile Conversion" },
  ];
  for (const { key, label } of dims) {
    const val = s[key];
    if (typeof val === "number") rows.push({ label, score: val });
  }
  return rows;
}

export function renderScoreCard(data: ReportData, snapshotMd: string): string {
  const rows = getScoreRows(data);
  const overall = data.scores.overall ?? 0;

  const bars = rows.map(r => {
    const color = scoreColor(r.score);
    return `
      <div class="score-bar-row">
        <span class="score-bar-label">${r.label}</span>
        <div class="score-bar-track">
          <div class="score-bar-fill" style="width:${r.score}%;background:${color}"></div>
        </div>
        <span class="score-bar-value" style="color:${color}">${r.score}</span>
      </div>`;
  }).join("");

  // Clean snapshot — strip heading, use first ~2 paragraphs only
  const cleanMd = snapshotMd
    ? snapshotMd.replace(/^##[^\n]*\n/m, "").trim()
    : "";

  // Pull first paragraph as the lead narrative
  const firstPara = cleanMd.split(/\n\n/)[0] ?? "";

  return `
<section class="page">
  <span class="eyebrow">The Reality of the Data</span>
  <h2 class="section-title">Where you stand</h2>

  ${firstPara ? `<div class="score-narrative">${firstPara.replace(/\*\*/g, "")}</div>` : ""}

  <div class="score-bars" style="margin-top:32px">
    <div class="score-bar-row" style="margin-bottom:8px">
      <span class="score-bar-label" style="font-size:0.75rem;color:var(--text-muted)">Overall</span>
      <div class="score-bar-track">
        <div class="score-bar-fill" style="width:${overall}%;background:${scoreColor(overall)}"></div>
      </div>
      <span class="score-bar-value" style="color:${scoreColor(overall)};font-size:1rem">${overall}</span>
    </div>
    <div style="height:1px;background:var(--hairline);margin:12px 0"></div>
    ${bars}
  </div>

  <p class="score-caption">Scores are recalculated on every audit run. Re-run in 30 days to measure movement.</p>
</section>`;
}
