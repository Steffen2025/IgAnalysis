import { callLLM } from "../../llm/llmService.js";
import { REPORT_SYSTEM_PROMPT } from "../systemPrompt.js";
import { persistSection } from "../sectionPersist.js";
import type { ReportData } from "../reportDataAssembler.js";

export const SECTION_KEY = "local_visibility";

export async function generateLocalVisibilityPlan(data: ReportData): Promise<string> {
  const { audit, scores, hashtagHygiene } = data;
  const ctx = data.reportContext;

  const localScore = scores.local_visibility ?? 0;
  const localSignals = scores.signals["local_visibility"] ?? [];

  const prompt = `Write the Local Visibility Plan section for ${audit.business_name ?? "this business"}.

DATA:
- City: ${ctx.businessLocation.city}
- Region: ${ctx.businessLocation.region}
- Local market: ${ctx.localMarketLabel}
- Business type: ${ctx.businessClassification}
- Local Visibility score: ${localScore}/100
- Uses own geo hashtag: ${hashtagHygiene.clientUsesOwnGeo ? "YES" : "NO"}
- Avg hashtags per post: ${hashtagHygiene.avgCountPerPost.toFixed(1)} [${hashtagHygiene.countAssessment}]
- Top hashtags used: ${hashtagHygiene.topClientHashtags.slice(0, 10).join(", ") || "none"}
- Brand pollution detected: ${hashtagHygiene.brandPollutionDetected.join(", ") || "none"}
- Hashtag notes: ${hashtagHygiene.notes.join("; ") || "none"}
- Local visibility signals:
${localSignals.map((s) => `  ${s.fired ? "FIRED" : "UNFIRED"} | ${s.label} | weight=${s.weight} | earned=${s.earned}${s.note ? ` | ${s.note}` : ""}`).join("\n") || "  none"}

${localScore < 30 ? "NOTE: Local Visibility is the lowest-scoring area. Frame this as the lowest-effort, highest-return opportunity available." : ""}

Write 200 words max. Name specific hashtags to add (format with #). Name specific local content angles they haven't tried. Mention specific local references that should appear in bio and captions. Be concrete — not "use local hashtags" but "add a ${ctx.businessClassification} hashtag set for ${ctx.localMarketLabel} to every post."`;

  const result = await callLLM({
    model: "sonnet",
    prompt,
    maxTokens: 400,
    systemPrompt: REPORT_SYSTEM_PROMPT,
  });

  await persistSection(data.audit.id, SECTION_KEY, result.text);
  return result.text;
}
