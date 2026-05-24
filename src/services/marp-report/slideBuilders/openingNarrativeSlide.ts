import type { ReportData } from "../../report/reportDataAssembler.js";

function scoreColor(n: number): string {
  if (n >= 70) return "#0F6E56";
  if (n >= 40) return "#B07D1E";
  return "#8B3A2E";
}

function workPhrase(score: number): string {
  if (score < 30) return "almost none of";
  if (score < 50) return "less than half of";
  if (score < 70) return "most but not all of";
  return "the work it should be";
}

function e(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function openingNarrativeSlide(data: ReportData): string {
  const { audit, scores, client } = data;
  const businessName = e(audit.business_name ?? "This account");
  const overall = scores.overall ?? 0;
  const color = scoreColor(overall);
  const phrase = workPhrase(overall);
  const city = e(audit.city ?? "your city");
  const category = e(audit.business_category ?? "your industry");

  // Gap findings
  const gaps = (data.patterns as any)?.gaps ?? [];
  const topGap = gaps[0]?.finding ?? `${category} competitors in ${city} are posting more consistently and tagging local audiences.`;

  const dims: Array<[string, number]> = [
    ["Content Performance", scores.content_performance ?? 0],
    ["Local Visibility", scores.local_visibility ?? 0],
    ["Competitor Gap", scores.competitor_gap ?? 0],
    ["Sales Readiness", scores.sales_readiness ?? 0],
    ["Profile Conversion", scores.profile_conversion ?? 0],
  ];
  const worstDim = dims.reduce((worst, d) => (d[1] < worst[1] ? d : worst), dims[0]);
  const bestOpportunity = 100 - worstDim[1];
  const followers = (client?.profile?.follower_count ?? 0).toLocaleString();

  return `<span class="eyebrow">Where You Are</span>

# ${businessName} on Instagram today

<p>${businessName} is doing ${phrase} what the data says is possible for a ${category} account in ${city}. The overall score of ${overall}/100 reflects the gap between what's being posted and what's landing with the algorithm — and with real buyers.</p>

<p style="font-size:19px;color:#5C5A52">${e(topGap)}</p>

<div class="stat-row">
  <div class="stat-card">
    <div class="num" style="color:${color}">${overall}<span class="suffix">/100</span></div>
    <div class="label">Overall Score</div>
  </div>
  <div class="stat-card">
    <div class="num" style="color:#B07D1E">+${bestOpportunity}<span class="suffix"> pts</span></div>
    <div class="label">Top Opportunity — ${e(worstDim[0])}</div>
  </div>
  <div class="stat-card">
    <div class="num">${followers}</div>
    <div class="label">Followers Today</div>
  </div>
</div>`;
}
