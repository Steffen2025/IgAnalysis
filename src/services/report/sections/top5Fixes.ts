import { callLLM } from "../../llm/llmService.js";
import { REPORT_SYSTEM_PROMPT } from "../systemPrompt.js";
import { persistSection } from "../sectionPersist.js";
import type { ReportData } from "../reportDataAssembler.js";

export const SECTION_KEY = "top_5_fixes";

export async function generateTop5Fixes(data: ReportData): Promise<string> {
  const { audit, scores, patterns } = data;
  const ctx = data.reportContext;

  // All unfired signals, sorted by weight descending
  const unFired = Object.entries(scores.signals)
    .flatMap(([cat, sigs]) => sigs.map((s) => ({ ...s, category: cat })))
    .filter((s) => !s.fired && s.weight >= 3)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8);

  // Top gaps by severity
  const topGaps = [...patterns.gaps]
    .sort((a, b) => ({ high: 3, medium: 2, low: 1 }[b.severity] ?? 0) - ({ high: 3, medium: 2, low: 1 }[a.severity] ?? 0))
    .slice(0, 5);

  const prompt = `Write the Top 5 Fixes section for ${audit.business_name ?? "this business"}.

SCORES:
- Overall: ${scores.overall ?? "n/a"}/100
- Profile Conversion: ${scores.profile_conversion ?? "n/a"}/100
- Content Performance: ${scores.content_performance ?? "n/a"}/100
- Local Visibility: ${scores.local_visibility ?? "n/a"}/100
- Sales Readiness: ${scores.sales_readiness ?? "n/a"}/100
- Competitor Gap: ${scores.competitor_gap ?? "n/a"}/100

HIGHEST-WEIGHT UNFIRED SIGNALS (these are the gaps costing the most points):
${unFired.map((s) => `- [${s.category}] ${s.label} — ${s.weight}pts at stake${s.note ? ` | ${s.note}` : ""}`).join("\n")}

CONTENT PATTERN GAPS:
${topGaps.map((g) => `- [${g.severity.toUpperCase()}] ${g.dimension}: ${g.insight}`).join("\n")}

Business context:
- Business: ${audit.business_name}
- Category: ${audit.business_category}
- City: ${ctx.localMarketLabel}
- Main offer: ${audit.main_offer}
- Target audience: ${audit.target_audience}

Write the 5 fixes that will move the score the most. Rank them by impact. For each fix, provide a markdown table row with:
| # | Fix | Why it matters | How to execute | Score impact | Effort |

Use a proper markdown table. Keep each cell to 1-2 sentences max. "How to execute" must be specific and immediately actionable. "Score impact" should say which sub-score improves and by how much (use the signal weights as your guide). "Effort" is Low/Medium/High. 400 words maximum total.`;

  const result = await callLLM({
    model: "sonnet",
    prompt,
    maxTokens: 800,
    systemPrompt: REPORT_SYSTEM_PROMPT,
  });

  await persistSection(data.audit.id, SECTION_KEY, result.text);
  return result.text;
}
