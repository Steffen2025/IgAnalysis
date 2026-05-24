import type { ScoreResult } from "../../scoring/types.js";

function fillClass(n: number): string {
  if (n >= 70) return "high";
  if (n >= 40) return "mid";
  return "low";
}

function scoreColor(n: number): string {
  if (n >= 70) return "#0F6E56";
  if (n >= 40) return "#B07D1E";
  return "#8B3A2E";
}

function bar(label: string, value: number): string {
  const cls = fillClass(value);
  const color = scoreColor(value);
  const fillHtml = value > 0
    ? `<div class="fill ${cls}" style="width:${value}%"></div>`
    : "";
  return `<div class="score-bar">
  <div class="bar-label">${label}</div>
  <div class="track">${fillHtml}</div>
  <div class="bar-value" style="color:${color}">${value}</div>
</div>`;
}

export function scoreBreakdownSlide(scores: ScoreResult): string {
  const overall = scores.overall ?? 0;

  return `<span class="eyebrow">The Reality of the Data</span>

# Score breakdown

<div style="margin-bottom:12px">${bar("Overall", overall)}</div>
<hr style="border:none;border-top:1px solid #E5E2D6;margin:0 0 12px">

${bar("Content Performance", scores.content_performance ?? 0)}
${bar("Local Visibility",    scores.local_visibility    ?? 0)}
${bar("Competitor Gap",      scores.competitor_gap      ?? 0)}
${bar("Sales Readiness",     scores.sales_readiness     ?? 0)}
${bar("Profile Conversion",  scores.profile_conversion  ?? 0)}`;
}
