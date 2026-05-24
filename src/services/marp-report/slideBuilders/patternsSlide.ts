import type { ReportData } from "../../report/reportDataAssembler.js";

function e(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function extractQuote(md: string): string {
  const sentences = md.split(/(?<=[.!?])\s+/);
  const withNumbers = sentences.find(s => /\d/.test(s) && s.length > 40 && s.length < 220);
  return withNumbers ?? sentences.find(s => s.length > 60) ?? "";
}

export function patternsSlide(data: ReportData, patternMd: string): string {
  const gaps = (data.patterns as any)?.gaps ?? [];
  const catData = data.patterns?.category;

  const quote = extractQuote(patternMd);
  const prose = patternMd
    .split("\n")
    .filter(l => l.trim() && !l.startsWith("#"))
    .map(l => l.replace(/\*\*/g, ""))
    .slice(0, 3)
    .join(" ")
    .slice(0, 320);

  // Build stat cards from patterns
  const catPostsPerWeek = catData?.postFrequency?.avgPerWeek;
  const clientAvgCaption = data.client?.posts
    ?.reduce((sum, p) => sum + (p.caption?.length ?? 0), 0) /
    Math.max(data.client?.posts?.length ?? 1, 1);
  const catAvgEngagement = catData?.engagement?.avgRate;
  const clientEngagement = data.client?.posts
    ?.reduce((sum, p) => sum + (p.engagement_rate ?? 0), 0) /
    Math.max(data.client?.posts?.length ?? 1, 1);

  const topGap = gaps[0]?.finding ?? "";

  const statCards: string[] = [];
  if (catPostsPerWeek != null) {
    statCards.push(`<div class="stat-card">
  <div class="num">${Number(catPostsPerWeek).toFixed(1)}<span class="suffix">/wk</span></div>
  <div class="label">Category Post Rate</div>
</div>`);
  }
  if (catAvgEngagement != null) {
    statCards.push(`<div class="stat-card">
  <div class="num">${(Number(catAvgEngagement) * 100).toFixed(1)}<span class="suffix">%</span></div>
  <div class="label">Category Avg Engagement</div>
</div>`);
  }
  if (clientEngagement > 0) {
    statCards.push(`<div class="stat-card">
  <div class="num">${(clientEngagement * 100).toFixed(1)}<span class="suffix">%</span></div>
  <div class="label">Your Avg Engagement</div>
</div>`);
  }

  return `<span class="eyebrow">What's Working in Your Market</span>

# Pattern analysis

${prose ? `<p style="font-size:18px;color:#5C5A52;margin-bottom:12px">${e(prose.slice(0, 260))}</p>` : ""}
${quote ? `<div class="pull-quote">${e(quote)}</div>` : ""}
${topGap ? `<p style="font-size:16px;color:#B07D1E;margin-bottom:12px">Gap: ${e(topGap)}</p>` : ""}
${statCards.length > 0 ? `<div class="stat-row" style="margin-top:16px">${statCards.slice(0, 3).join("")}</div>` : ""}`;
}
