import { callLLM } from "../../llm/llmService.js";
import { REPORT_SYSTEM_PROMPT } from "../systemPrompt.js";
import { persistSection } from "../sectionPersist.js";
import type { ReportData } from "../reportDataAssembler.js";

export const SECTION_KEY = "account_snapshot";

export async function generateAccountSnapshot(data: ReportData): Promise<string> {
  const { audit, client, scores } = data;
  const ctx = data.reportContext;

  const firingSignals = Object.entries(scores.signals)
    .flatMap(([, sigs]) => sigs)
    .filter((s) => s.fired && s.earned > 0)
    .sort((a, b) => b.earned - a.earned)
    .slice(0, 3)
    .map((s) => s.label);

  const gapSignals = Object.entries(scores.signals)
    .flatMap(([, sigs]) => sigs)
    .filter((s) => !s.fired && s.weight >= 5)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((s) => `${s.label} (${s.weight}pt gap)`);

  const prompt = `Write the Account Snapshot section for ${audit.business_name ?? "this business"} (@${client.profile?.username ?? audit.instagram_url}).

DATA:
- Business: ${audit.business_name}
- Category: ${audit.business_category}
- City: ${ctx.localMarketLabel}
- Followers: ${client.profile?.follower_count ?? "unknown"}
- Following: ${client.profile?.following_count ?? "unknown"}
- Total posts: ${client.profile?.post_count ?? "unknown"}
- Posts in our dataset: ${client.posts.length}
- Overall score: ${scores.overall ?? "n/a"}/100
- Profile Conversion: ${scores.profile_conversion ?? "n/a"}/100
- Content Performance: ${scores.content_performance ?? "n/a"}/100
- Local Visibility: ${scores.local_visibility ?? "n/a"}/100
- Sales Readiness: ${scores.sales_readiness ?? "n/a"}/100
- Competitor Gap: ${scores.competitor_gap ?? "n/a"}/100
- Top 3 strengths firing: ${firingSignals.join("; ") || "none"}
- Top 3 gaps: ${gapSignals.join("; ") || "none"}

Write 3 tight sentences that state the factual baseline. The reader should finish knowing exactly where they stand. No recommendations here — this section is diagnosis only. Use the normalized market label ${ctx.localMarketLabel}. 150 words maximum.`;

  const result = await callLLM({
    model: "sonnet",
    prompt,
    maxTokens: 300,
    systemPrompt: REPORT_SYSTEM_PROMPT,
  });

  await persistSection(data.audit.id, SECTION_KEY, result.text);
  return result.text;
}
