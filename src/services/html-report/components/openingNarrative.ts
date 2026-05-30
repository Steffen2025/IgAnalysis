import type { ReportData } from "../../report/reportDataAssembler.js";
import { renderStatCallout } from "./statCallout.js";
import { scoreColor } from "./utils.js";

function workPhrase(score: number): string {
  if (score < 30) return "almost none of the work it should be doing";
  if (score < 50) return "less than half of the work it should be doing";
  if (score < 70) return "most of what it should be doing, but not all";
  return "the work it should be doing";
}

function topGapDescription(data: ReportData): string {
  const gaps = data.patterns?.gaps ?? [];
  if (gaps.length === 0) return "The most actionable gap is posting frequency.";
  const g = gaps[0];
  const label = g.dimension.replace(/_/g, " ") ?? "content frequency";
  return `The most actionable gap is ${label} — closing it is worth more than any other single change.`;
}

function fixableCount(data: ReportData): { points: number; habits: number } {
  // Estimate from gaps array
  const gaps = data.patterns?.gaps ?? [];
  const points = gaps.slice(0, 5).reduce((s) => s + 10, 0);
  return { points: Math.min(points, 60), habits: Math.min(gaps.length, 5) };
}

export function renderOpeningNarrative(data: ReportData): string {
  const { audit, scores } = data;
  const profile = data.client?.profile;

  const name = audit.business_name ?? "This account";
  const followers = (profile?.follower_count ?? 0).toLocaleString();
  const postCount = profile?.post_count ?? 0;
  const overall = scores.overall ?? 0;
  const workStr = workPhrase(overall);
  const gapDesc = topGapDescription(data);
  const { points, habits } = fixableCount(data);
  const habitWord = habits === 1 ? "habit" : "habits";

  const para1 = `${name} has ${followers} followers, ${postCount} posts, and an Instagram presence that's currently doing ${workStr}. ${gapDesc}`;
  const para2 = `Here's what the data found — and where ${points} points of growth are sitting in ${habits} fixable ${habitWord}.`;

  // Biggest gap label for the stat
  const gaps = data.patterns?.gaps ?? [];
  const topGapLabel = gaps[0]?.dimension.replace(/_/g, " ") ?? "Posting frequency";
  const topGapPoints = gaps.length > 0 ? 25 : 0;

  const cells = [
    {
      value: String(overall),
      suffix: "/100",
      label: "Overall Score",
      context: overall < 50 ? "Significant headroom" : overall < 70 ? "Solid foundation" : "Strong position",
      color: scoreColor(overall),
    },
    {
      value: `+${topGapPoints}`,
      label: "Top Opportunity",
      context: topGapLabel,
      color: "var(--accent-warm)",
    },
    {
      value: followers,
      label: "Followers at Audit",
      context: `${postCount} total posts`,
    },
  ];

  return `
<section class="page">
  <span class="eyebrow">Opening Analysis</span>
  <h2 class="section-title" style="margin-bottom:28px">${name}</h2>
  <div class="opening-narrative-text">
    <p>${para1}</p>
    <p>${para2}</p>
  </div>
  ${renderStatCallout(cells)}
</section>`;
}
