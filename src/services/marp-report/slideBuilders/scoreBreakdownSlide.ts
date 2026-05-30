import type { ScoreResult } from "../../scoring/types.js";

function fillClass(n: number): string {
  if (n >= 70) return "high";
  if (n >= 40) return "mid";
  return "low";
}

function bar(label: string, value: number): string {
  const cls = fillClass(value);
  const widthClass = `score-width-${Math.max(0, Math.min(100, Math.round(value)))}`;
  return `<div class="score-bar">
  <div class="score-bar-top">
    <span class="score-bar-label">${label}</span>
    <span class="score-bar-value">${value}</span>
  </div>
  <div class="score-bar-track">
    <div class="score-bar-fill ${cls} ${widthClass}" style="width: ${value}%"></div>
  </div>
</div>`;
}

function scoreWidthStyles(values: number[]): string {
  const unique = Array.from(new Set(values.map((value) => Math.max(0, Math.min(100, Math.round(value))))));
  return `<style>
${unique.map((value) => `.score-bar-fill.score-width-${value} { width: ${value}%; }`).join("\n")}
</style>`;
}

export function scoreBreakdownSlide(scores: ScoreResult): string {
  const overall = scores.overall ?? 0;
  const values = [
    overall,
    scores.content_performance ?? 0,
    scores.local_visibility ?? 0,
    scores.competitor_gap ?? 0,
    scores.sales_readiness ?? 0,
    scores.profile_conversion ?? 0,
  ];

  return `<span class="eyebrow">The Reality of the Data</span>

# Score breakdown

${scoreWidthStyles(values)}

<div class="score-bars">
${bar("Overall", overall)}

${bar("Content Performance", scores.content_performance ?? 0)}
${bar("Local Visibility",    scores.local_visibility    ?? 0)}
${bar("Competitor Gap",      scores.competitor_gap      ?? 0)}
${bar("Sales Readiness",     scores.sales_readiness     ?? 0)}
${bar("Profile Conversion",  scores.profile_conversion  ?? 0)}
</div>`;
}
