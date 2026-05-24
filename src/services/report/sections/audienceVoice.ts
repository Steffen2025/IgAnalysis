import { callLLM } from "../../llm/llmService.js";
import { REPORT_SYSTEM_PROMPT } from "../systemPrompt.js";
import { persistSection } from "../sectionPersist.js";
import type { ReportData } from "../reportDataAssembler.js";

export const SECTION_KEY = "audience_voice";

export async function generateAudienceVoice(data: ReportData): Promise<string> {
  const { audit, comments } = data;

  const hasComments = comments.summary.totalComments > 0;

  const prompt = hasComments
    ? `Write the Audience Voice section for ${audit.business_name ?? "this business"}.

COMMENT DATA (${comments.summary.totalComments} comments across high-performing posts):
- Question rate: ${(comments.summary.questionRate * 100).toFixed(1)}%
- Tagging rate (people tagging others): ${(comments.summary.tagRate * 100).toFixed(1)}%
- Avg comment length: ${comments.summary.avgLength.toFixed(0)} chars
- Top questions from the audience (verbatim): ${comments.topQuestions.slice(0, 6).map((q, i) => `${i + 1}. "${q}"`).join(" | ")}
- Top concerns appearing in comments: ${comments.topConcerns.join(", ") || "none detected"}
- Audience language (most-used content words): ${comments.audienceLanguage.join(", ")}
- Top tagging comments: ${comments.topTaggingComments.slice(0, 3).map((q) => `"${q}"`).join(" | ")}
- Top praise signals: ${comments.summary.topPraiseTokens.slice(0, 5).map((t) => `${t.token}(${t.count})`).join(", ")}

Write 200 words max. Surface what the audience actually says. Then provide 3 concrete content prompts that answer real audience questions using their own language. Each prompt should be one sentence that a creator can act on immediately.`
    : `Write the Audience Voice section for ${audit.business_name ?? "this business"}.

No comment data was collected for this audit (posts may lack engagement or shortcodes were unavailable).

Write 100 words max. Acknowledge that comment data wasn't available. Explain how the business can gather this signal manually (e.g., read comments on their top 3 posts, note the most common questions, search DMs for FAQ patterns). Give 2 actionable prompts for content based on what any ${audit.business_category ?? "business"} audience typically asks about.`;

  const result = await callLLM({
    model: "sonnet",
    prompt,
    maxTokens: 400,
    systemPrompt: REPORT_SYSTEM_PROMPT,
  });

  await persistSection(data.audit.id, SECTION_KEY, result.text);
  return result.text;
}
