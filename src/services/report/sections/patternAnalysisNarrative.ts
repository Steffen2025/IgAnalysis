import { callLLM } from "../../llm/llmService.js";
import { REPORT_SYSTEM_PROMPT } from "../systemPrompt.js";
import { persistSection } from "../sectionPersist.js";
import type { ReportData } from "../reportDataAssembler.js";

export const SECTION_KEY = "pattern_analysis";

export async function generatePatternAnalysis(data: ReportData): Promise<string> {
  const { audit, patterns, competitors } = data;

  const topGaps = [...patterns.gaps]
    .sort((a, b) => ({ high: 3, medium: 2, low: 1 }[b.severity] ?? 0) - ({ high: 3, medium: 2, low: 1 }[a.severity] ?? 0))
    .slice(0, 3);

  const safeComps = competitors.filter((c) => c.competitor_type === "reference_model" && c.deep_scraped);
  const compSummary = safeComps.slice(0, 3).map((c) => {
    const topPost = c.top_posts[0];
    return `@${c.username} (${c.follower_count?.toLocaleString() ?? "?"} followers) — top post hook: ${topPost?.hook_type ?? "unknown"}, tone: ${topPost?.tone ?? "unknown"}`;
  }).join("\n");

  const cat = patterns.category;
  const cli = patterns.client;

  const prompt = `Write the Pattern Analysis section for ${audit.business_name ?? "this business"}.

CATEGORY CORPUS (${cat.postCount} posts from comparable accounts in this market):
- Top hook: ${cat.hooks.topHook} | Best-performing hook by ER: ${cat.hooks.bestPerformingHookByEngagement ?? "unknown"}
- Hook distribution: ${JSON.stringify(cat.hooks.distribution)}
- Top tone: ${cat.tones.topTone} | Best by ER: ${cat.tones.bestPerformingToneByEngagement ?? "unknown"}
- Tone distribution: ${JSON.stringify(cat.tones.distribution)}
- Best content element by ER: ${cat.contentElements.bestPerformingElementByEngagement ?? "unknown"}
- Content element distribution: ${JSON.stringify(cat.contentElements.distribution)}
- Best post type by ER: ${cat.postTypes.bestPerformingByEngagement?.post_type ?? "unknown"}
- Avg hashtags: ${cat.hashtags.avgCountPerPost.toFixed(1)}/post

CLIENT (${cli.postCount} posts):
- Top hook: ${cli.hooks.topHook}
- Top tone: ${cli.tones.topTone}
- Avg hashtags: ${cli.hashtags.avgCountPerPost.toFixed(1)}/post
- Avg caption length: ${Math.round(cli.caption.avgLength)} chars

REFERENCE MODEL COMPETITORS (safeToReference=true):
${compSummary || "None with deep scrape data"}

TOP 3 GAPS (client vs category):
${topGaps.map((g, i) => `${i + 1}. [${g.severity.toUpperCase()}] ${g.dimension}: ${g.insight}${g.exampleToEmulate?.safeToReference ? ` | Example: @${g.exampleToEmulate.username}` : ""}`).join("\n")}

Write 250 words max. Describe what works in this category (cite 1-2 @usernames where safeToReference=true). Then explain where this client diverges from those patterns. End with the single most actionable pattern shift the client should make.`;

  const result = await callLLM({
    model: "sonnet",
    prompt,
    maxTokens: 500,
    systemPrompt: REPORT_SYSTEM_PROMPT,
  });

  await persistSection(data.audit.id, SECTION_KEY, result.text);
  return result.text;
}
