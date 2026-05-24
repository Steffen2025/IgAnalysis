import { callLLM } from "../../llm/llmService.js";
import { REPORT_SYSTEM_PROMPT } from "../systemPrompt.js";
import { persistSection } from "../sectionPersist.js";
import type { ReportData } from "../reportDataAssembler.js";

export const SECTION_KEY = "content_kit";

export async function generateContentExecutionKit(data: ReportData): Promise<string> {
  const { audit, patterns, comments } = data;

  const cat = patterns.category;
  const bestHook = cat.hooks.bestPerformingHookByEngagement ?? cat.hooks.topHook;
  const bestTone = cat.tones.bestPerformingToneByEngagement ?? cat.tones.topTone;
  const bestPostType = cat.postTypes.bestPerformingByEngagement?.post_type ?? "reel";
  const bestElement = cat.contentElements.bestPerformingElementByEngagement ?? "unknown";

  const prompt = `Write the Content Execution Kit for ${audit.business_name ?? "this business"}.

WHAT WORKS IN THIS CATEGORY (${cat.postCount} posts analyzed):
- Best-performing hook type: ${bestHook}
- Best-performing tone: ${bestTone}
- Best-performing post type: ${bestPostType}
- Best-performing content element: ${bestElement}

BUSINESS CONTEXT:
- Business: ${audit.business_name}
- Category: ${audit.business_category}
- City: ${audit.city}
- Main offer: ${audit.main_offer}
- Target audience: ${audit.target_audience}

AUDIENCE LANGUAGE (words used most by real commenters — use these naturally in scripts):
${comments.audienceLanguage.join(", ") || "no comment data — use industry-standard language"}

AUDIENCE QUESTIONS (real questions from comments — answer these in content):
${comments.topQuestions.slice(0, 4).map((q, i) => `${i + 1}. "${q}"`).join("\n") || "no comment data"}

Produce:

## 3 Reel Scripts

For each reel:
**Reel [N] — [Topic]**
Hook (1 sentence, must use the "${bestHook}" hook format):
Body:
- Bullet 1
- Bullet 2
- Bullet 3
Caption (50-80 words, use audience language where natural):
CTA:

---

## 3 Carousel Outlines

For each carousel:
**Carousel [N] — [Topic]**
Slide 1: [Cover slide title]
Slide 2: [Title]
Slide 3: [Title]
Slide 4: [Title]
Slide 5: [Title]
Caption (40-60 words):
CTA:

---

Scripts must be specific to this business's offer and audience. Use the audience language tokens where they fit naturally — do not force them. 600 words maximum.`;

  const result = await callLLM({
    model: "sonnet",
    prompt,
    maxTokens: 1200,
    systemPrompt: REPORT_SYSTEM_PROMPT,
  });

  await persistSection(data.audit.id, SECTION_KEY, result.text);
  return result.text;
}
