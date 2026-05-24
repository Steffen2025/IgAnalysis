import { callLLM } from "../../llm/llmService.js";
import { REPORT_SYSTEM_PROMPT } from "../systemPrompt.js";
import { persistSection } from "../sectionPersist.js";
import type { ReportData } from "../reportDataAssembler.js";

export const SECTION_KEY = "do_this_next";

export async function generateDoThisNext(data: ReportData): Promise<string> {
  const { audit, scores } = data;

  const unFired = Object.entries(scores.signals)
    .flatMap(([cat, sigs]) => sigs.map((s) => ({ ...s, category: cat })))
    .filter((s) => !s.fired && s.weight >= 3)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);

  const prompt = `Write the Do This Next section for ${audit.business_name ?? "this business"}.

CURRENT SCORES: Overall ${scores.overall ?? "n/a"}/100 | Profile ${scores.profile_conversion ?? "n/a"} | Content ${scores.content_performance ?? "n/a"} | Local ${scores.local_visibility ?? "n/a"} | Sales ${scores.sales_readiness ?? "n/a"} | Competitor ${scores.competitor_gap ?? "n/a"}

TOP UNFIRED SIGNALS (the changes with the most point value):
${unFired.map((s) => `- [${s.category}] ${s.label} (${s.weight}pts)${s.note ? `: ${s.note}` : ""}`).join("\n")}

Business: ${audit.business_name} | ${audit.business_category} | ${audit.city}

Write exactly 10 actions, numbered 1-10. Each action is one sentence. Time-box each with (today), (this week), or (this month). The first 3 should be executable in under 10 minutes each. Action 10 must be: "Re-run this audit in 30 days to measure movement against today's score of ${scores.overall ?? "?"}/100." 200 words maximum.`;

  const result = await callLLM({
    model: "sonnet",
    prompt,
    maxTokens: 400,
    systemPrompt: REPORT_SYSTEM_PROMPT,
  });

  await persistSection(data.audit.id, SECTION_KEY, result.text);
  return result.text;
}
