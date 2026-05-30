/**
 * Restored intelligence-depth slides, written against the CURRENT ReportData
 * shape (the older scoreBreakdown/patterns builders targeted a stale shape and
 * were dropped). These bring back the ActiveDoor/Jelinek depth the workbook had
 * lost: dimension-by-dimension score indicators and a market-pattern dashboard.
 */

import type { ReportData } from "../../report/reportDataAssembler.js";
import { escapeHtml, truncateChars } from "../utils/text.js";

function fillClass(n: number): string {
  if (n >= 70) return "high";
  if (n >= 40) return "mid";
  return "low";
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function bar(label: string, value: number, note?: string): string {
  const v = clamp(value);
  return `<div class="score-bar">
  <div class="score-bar-top">
    <span class="score-bar-label">${escapeHtml(label)}</span>
    <span class="score-bar-value">${v}</span>
  </div>
  <div class="score-bar-track">
    <div class="score-bar-fill ${fillClass(v)} score-width-${v}" style="width:${v}%"></div>
  </div>
  ${note ? `<div class="score-bar-note">${escapeHtml(note)}</div>` : ""}
</div>`;
}

function widthStyles(values: number[]): string {
  const unique = Array.from(new Set(values.map(clamp)));
  return `<style>
${unique.map((v) => `.score-bar-fill.score-width-${v}{width:${v}%;}`).join("\n")}
.score-bar-note{font-size:13px;color:var(--muted,#667);margin-top:4px;line-height:1.35;}
</style>`;
}

/** Short "why it matters" line per dimension. */
const DIMENSION_MEANING: Record<string, string> = {
  "Profile conversion": "Whether a new visitor instantly gets who you help and what to do next.",
  "Content performance": "How well your posts earn saves, shares, and reach.",
  "Local visibility": "How discoverable you are for your city + category — geotags, name field, captions.",
  "Sales readiness": "Whether the path from post → DM/download/booking is obvious.",
  "Competitor gap": "How you stack up against active accounts in your space.",
};

/**
 * Score Indicators — what we saw, dimension by dimension, with the strongest
 * signal note attached to each bar. Restores the diagnostic depth.
 */
export function scoreIndicatorsSlide(data: ReportData): string {
  const s = data.scores;
  const dims: Array<{ label: string; value: number; key: string }> = [
    { label: "Profile conversion", value: s.profile_conversion ?? 0, key: "profile_conversion" },
    { label: "Content performance", value: s.content_performance ?? 0, key: "content_performance" },
    { label: "Local visibility", value: s.local_visibility ?? 0, key: "local_visibility" },
    { label: "Sales readiness", value: s.sales_readiness ?? 0, key: "sales_readiness" },
    { label: "Competitor gap", value: s.competitor_gap ?? 0, key: "competitor_gap" },
  ];

  const signalNote = (key: string): string | undefined => {
    const sig = (s.signals?.[key] ?? []).find((x) => x.note && x.note.trim());
    if (sig?.note) return truncateChars(sig.note, 110);
    return DIMENSION_MEANING[dims.find((d) => d.key === key)?.label ?? ""];
  };

  const values = [s.overall ?? 0, ...dims.map((d) => d.value)];

  return `<span class="eyebrow">What we saw</span>

# Score indicators

${widthStyles(values)}

<div class="score-bars">
${bar("Overall", s.overall ?? 0, "Your weighted starting line — every move below lifts this.")}

${dims.map((d) => bar(d.label, d.value, signalNote(d.key))).join("\n\n")}
</div>`;
}

function distBars(dist: Record<string, number>, max = 4): string {
  const entries = Object.entries(dist)
    .filter(([k]) => k && k.toLowerCase() !== "unknown")
    .sort((a, b) => b[1] - a[1])
    .slice(0, max);
  const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;
  if (entries.length === 0) return "";
  const pcts = entries.map(([k, v]) => ({ k, pct: clamp((v / total) * 100) }));
  // Inline width only — the static .dist-* CSS is emitted once at slide top
  // (a <style> tag inside a <div> renders as literal text in markdown-it).
  return pcts
    .map(
      (p) => `<div class="dist-row">
  <div class="dist-top"><span>${escapeHtml(p.k)}</span><span>${p.pct}%</span></div>
  <div class="dist-track"><div class="dist-fill" style="width:${p.pct}%"></div></div>
</div>`,
    )
    .join("\n");
}

function statCard(num: string, suffix: string, label: string): string {
  return `<div class="stat-card">
  <div class="num">${escapeHtml(num)}${suffix ? `<span class="suffix">${escapeHtml(suffix)}</span>` : ""}</div>
  <div class="label">${escapeHtml(label)}</div>
</div>`;
}

/**
 * Market Pattern Dashboard — posts studied, avg caption, avg hashtags, plus
 * hook-type and content-element distributions. Pure data, no LLM prose needed.
 */
export function marketPatternsSlide(data: ReportData): string {
  const cat = data.patterns?.category;
  const cards: string[] = [];
  if (cat?.postCount) cards.push(statCard(String(cat.postCount), "", "Posts studied"));
  if (cat?.caption?.avgLength) cards.push(statCard(String(Math.round(cat.caption.avgLength)), "chars", "Avg caption"));
  if (cat?.hashtags?.avgCountPerPost) cards.push(statCard(cat.hashtags.avgCountPerPost.toFixed(1), "", "Avg hashtags"));
  if (cat?.caption?.avgEmojiCount) cards.push(statCard(cat.caption.avgEmojiCount.toFixed(1), "", "Avg emojis"));

  const hookDist = cat?.hooks?.distribution ?? {};
  const elemDist = cat?.contentElements?.distribution ?? {};
  const topHook = cat?.hooks?.bestPerformingHookByEngagement ?? cat?.hooks?.topHook;

  const hookBlock = Object.keys(hookDist).length
    ? `<div class="pattern-col"><h3>Hook types</h3>${distBars(hookDist)}</div>`
    : "";
  const elemBlock = Object.keys(elemDist).length
    ? `<div class="pattern-col"><h3>Content elements</h3>${distBars(elemDist)}</div>`
    : "";

  return `<span class="eyebrow">What's working in your market</span>

# Market pattern dashboard

<style>
.pattern-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:8px;}
.pattern-col h3{font-size:16px;margin:0 0 8px;}
.dist-row{margin-bottom:8px;}
.dist-top{display:flex;justify-content:space-between;font-size:14px;margin-bottom:3px;}
.dist-track{height:8px;background:rgba(0,0,0,.08);border-radius:4px;overflow:hidden;}
.dist-fill{height:100%;background:var(--accent,#2b7);border-radius:4px;}
</style>

${cards.length ? `<div class="stat-row">${cards.slice(0, 4).join("")}</div>` : ""}

${topHook ? `<p style="font-size:16px;margin:14px 0 8px"><strong>Best-performing hook in your market:</strong> ${escapeHtml(topHook)}.</p>` : ""}

<div class="pattern-grid">
${hookBlock}
${elemBlock}
</div>`;
}
