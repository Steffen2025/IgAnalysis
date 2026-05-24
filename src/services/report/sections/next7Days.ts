import { callLLM } from "../../llm/llmService.js";
import { REPORT_SYSTEM_PROMPT } from "../systemPrompt.js";
import { persistSection } from "../sectionPersist.js";
import type { ReportData } from "../reportDataAssembler.js";

export const SECTION_KEY = "next_7_days";

export async function generateNext7Days(data: ReportData, top5FixesContent?: string): Promise<string> {
  const { audit, scores, patterns, hashtagHygiene, comments } = data;

  const topGaps = [...patterns.gaps]
    .sort((a, b) => ({ high: 3, medium: 2, low: 1 }[b.severity] ?? 0) - ({ high: 3, medium: 2, low: 1 }[a.severity] ?? 0))
    .slice(0, 3);

  const unFired = Object.entries(scores.signals)
    .flatMap(([cat, sigs]) => sigs.map((s) => ({ ...s, category: cat })))
    .filter((s) => !s.fired && s.weight >= 5)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  const prompt = `Write the Next 7 Days action plan for ${audit.business_name ?? "this business"}.

BUSINESS CONTEXT:
- Business: ${audit.business_name}
- Category: ${audit.business_category}
- City: ${audit.city}
- Main offer: ${audit.main_offer}
- Current local score: ${scores.local_visibility ?? "n/a"}/100
- Geo hashtag status: ${hashtagHygiene.clientUsesOwnGeo ? "Uses geo hashtag" : "NOT using geo hashtag — quick win"}
- Current hashtags: ${hashtagHygiene.topClientHashtags.slice(0, 6).join(", ")}

TOP GAPS TO ADDRESS THIS WEEK:
${topGaps.map((g, i) => `${i + 1}. [${g.severity}] ${g.dimension}: ${g.insight}`).join("\n")}

HIGHEST-WEIGHT QUICK WINS (unfired signals):
${unFired.map((s) => `- ${s.label} (${s.weight}pts): ${s.note ?? "no note"}`).join("\n")}

AUDIENCE QUESTIONS TO ANSWER THIS WEEK:
${comments.topQuestions.slice(0, 4).map((q, i) => `${i + 1}. "${q}"`).join("\n") || "No comment data — use FAQ format"}

Write a day-by-day plan for 7 days. Format each day as:
**Day N — [Theme]**
- Action 1 (time estimate e.g. "15 min")
- Action 2

Day 1 must be the fastest possible win (profile update or bio edit or hashtag change — something under 10 minutes). Each day should have 2-3 actions. The week should build toward a post going live by Day 4-5. 400 words maximum.`;

  const result = await callLLM({
    model: "sonnet",
    prompt,
    maxTokens: 800,
    systemPrompt: REPORT_SYSTEM_PROMPT,
  });

  await persistSection(data.audit.id, SECTION_KEY, result.text);
  return result.text;
}
