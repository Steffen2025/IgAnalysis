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

---

## CONTRAST FORMULA INSTRUCTION

Before writing each reel script, identify the contrast that makes it worth watching:
- Common belief: what the target audience currently believes (must be genuine, not a strawman)
- Surprising truth: the insight that changes how they think (must be provable by this business)
- The hook must be built from this contrast — not from a generic description of the topic

Six hook patterns to choose from for each reel (pick the strongest fit):
1. contradiction — states what everyone believes, then flips it
2. specificity — hyper-specific number or detail that creates immediate credibility
3. timeframe_tension — urgency or time pressure ("what happens in the first 30 seconds")
4. pov_as_advice — first-person experience reframed as a universal lesson
5. vulnerable_confession — admits a mistake or misconception to build trust
6. pattern_interrupt — breaks the expected sentence structure to stop the scroll

Score each hook mentally on:
- contrast_fit: does it leverage the A→B flip? (0-10)
- pattern_strength: does the chosen pattern match the content type? (0-10)
- platform_fit: does it sound native to Instagram Reels? (0-10)

Pick the hook with the highest composite. Only show the winning hook in the output.

---

Produce:

## 3 Reel Scripts

For each reel, show:
**Reel [N] — [Topic]**
Contrast: [Common belief] → [Surprising truth]
Hook pattern: [pattern name] | Composite score: [X]/10
Hook (1 sentence):
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

Scripts must be specific to this business's offer and audience. The contrast must be genuine — the common belief should be something the target audience actually holds, and the surprising truth must be something this business can actually prove. Use the audience language tokens where they fit naturally. 700 words maximum.`;

  const result = await callLLM({
    model: "sonnet",
    prompt,
    maxTokens: 1500,
    systemPrompt: REPORT_SYSTEM_PROMPT,
  });

  await persistSection(data.audit.id, SECTION_KEY, result.text);
  return result.text;
}
