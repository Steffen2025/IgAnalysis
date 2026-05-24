import { callLLM } from "../../llm/llmService.js";
import { REPORT_SYSTEM_PROMPT } from "../systemPrompt.js";
import { persistSection } from "../sectionPersist.js";
import type { ReportData } from "../reportDataAssembler.js";

export const SECTION_KEY = "battle_plan";

export async function generateOnePageBattlePlan(
  data: ReportData,
  priorSections: Record<string, string>,
): Promise<string> {
  const { audit, scores, patterns, comments } = data;

  // Find the biggest scoring gap
  const scoreDims = [
    { name: "Profile Conversion", score: scores.profile_conversion ?? 0 },
    { name: "Content Performance", score: scores.content_performance ?? 0 },
    { name: "Local Visibility", score: scores.local_visibility ?? 0 },
    { name: "Sales Readiness", score: scores.sales_readiness ?? 0 },
    { name: "Competitor Gap", score: scores.competitor_gap ?? 0 },
  ];
  const lowestDim = scoreDims.sort((a, b) => a.score - b.score)[0];

  // Best reference competitor
  const bestRef = data.competitors
    .filter((c) => c.competitor_type === "reference_model" && c.deep_scraped)
    .sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0))[0];

  // Most surprising audience finding
  const topQuestion = comments.topQuestions[0] ?? null;
  const topPraise = comments.summary.topPraiseTokens[0] ?? null;

  const topFix = Object.entries(scores.signals)
    .flatMap(([cat, sigs]) => sigs.map((s) => ({ ...s, category: cat })))
    .filter((s) => !s.fired && s.weight >= 5)
    .sort((a, b) => b.weight - a.weight)[0];

  const prompt = `Write the One-Page Battle Plan for ${audit.business_name ?? "this business"}.

This section appears FIRST in the report. It must work as a standalone executive summary.

FACTS:
- Overall Instagram score: ${scores.overall ?? "n/a"}/100
- Biggest gap: ${lowestDim.name} at ${lowestDim.score}/100
- Highest-value unfired signal: ${topFix ? `${topFix.label} (${topFix.weight}pts, category: ${topFix.category})` : "none"}
- Best reference model: ${bestRef ? `@${bestRef.username} (${bestRef.follower_count?.toLocaleString() ?? "?"} followers)` : "none identified"}
- Most surprising audience finding: ${topQuestion ? `A common question in comments: "${topQuestion}"` : topPraise ? `Top praise signal: "${topPraise.token}" appearing ${topPraise.count}x` : "no comment data collected"}
- Business: ${audit.business_name} | ${audit.business_category} | ${audit.city}
- Main offer: ${audit.main_offer}
- Business outcome goal: ${audit.business_outcome}

SECTION SUMMARIES FOR CONTEXT:
Top 5 Fixes opening: ${(priorSections["top_5_fixes"] ?? "").slice(0, 400)}
Next 7 Days Day 1: ${(priorSections["next_7_days"] ?? "").slice(0, 300)}

Write 250 words max. Open with one sentence: the overall score and the single biggest growth lever. Then write exactly 5 numbered priorities, each with: the action, why it matters, and the specific data point supporting it. End with one sentence framing the report as a measurement of movement (reference the score and the 30-day re-audit). This is written by a strategist, not a marketer. No bombast.`;

  const result = await callLLM({
    model: "opus",
    prompt,
    maxTokens: 600,
    systemPrompt: REPORT_SYSTEM_PROMPT,
  });

  await persistSection(data.audit.id, SECTION_KEY, result.text);
  return result.text;
}
