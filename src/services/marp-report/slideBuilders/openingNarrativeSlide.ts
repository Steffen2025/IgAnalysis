import type { ReportData } from "../../report/reportDataAssembler.js";

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
  const { scores } = data;
  const ctx = data.reportContext;
  const businessName = e(ctx.displayName ?? "This account");
  const overall = scores.overall ?? 0;
  const phrase = workPhrase(overall);
  const city = e(ctx.localMarketLabel ?? "your city");
  const category = e(ctx.businessClassification ?? "your industry");

  // Gap findings
  const gaps = (data.patterns as any)?.gaps ?? [];
  const topGap = gaps[0]?.finding ?? `${category} competitors in ${city} are posting more consistently and tagging local audiences.`;

  return `<span class="eyebrow">Where You Are</span>

# ${businessName} on Instagram today

<p>${businessName} is doing ${phrase} what the data says is possible for a ${category} account in ${city}. The overall score of ${overall}/100 reflects the gap between what's being posted and what's landing with the algorithm — and with real buyers.</p>

<div class="pull-quote">${e(topGap)}</div>`;
}
