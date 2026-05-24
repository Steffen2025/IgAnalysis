import type { ReportData } from "../../report/reportDataAssembler.js";

function e(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface AIPrompt {
  title: string;
  desc: string;
  prompt: string;
}

function buildPrompts(data: ReportData): AIPrompt[] {
  const name = data.audit.business_name ?? "my business";
  const city = data.audit.city ?? "[city]";
  const region = data.audit.service_area ?? "Ontario";
  const cat = data.audit.business_category ?? "service business";
  const offer = data.audit.main_offer ?? "AI automation solutions";
  const audience = data.audit.target_audience ?? "small business owners";

  const catData = data.patterns?.category;
  const topHook = (catData as any)?.hooks?.bestPerformingHookByEngagement ?? (catData as any)?.hooks?.topHook ?? "[hook type]";
  const topTone = (catData as any)?.tones?.bestPerformingToneByEngagement ?? (catData as any)?.tones?.topTone ?? "[tone]";
  const topPostType = (catData as any)?.postTypes?.bestPerformingByEngagement?.post_type ?? "reel";
  const topElement = (catData as any)?.contentElements?.bestPerformingElementByEngagement ?? "storytelling";

  return [
    {
      title: "Generate More Reel Hooks",
      desc: "When the templates run out, paste this to get 10 hooks calibrated to your category data.",
      prompt: `I run ${name}, a ${cat} in ${city}, ${region}. My main offer is ${offer}. My audience: ${audience}.

Best-performing hook type in my category: ${topHook}
Best-performing tone: ${topTone}
Best-performing post type: ${topPostType}
Top content element: ${topElement}

Generate 10 Reel hooks (under 80 chars each) following these patterns. Feel native to ${city} small business audiences. Avoid AI-speak.`,
    },
    {
      title: "Write a Week of Captions",
      desc: "Five days of content in one prompt. Fill the brackets and you have a week's worth of posts.",
      prompt: `I'm ${name} (${cat}, ${city}). Main offer: ${offer}.

Write 5 Instagram captions for next week:
1. A customer win story
2. A behind-the-scenes work post
3. An educational post about [industry topic]
4. A local post that references ${city}
5. A soft offer post that drives DMs to ${offer}

Each: 120–180 words, plain English, no jargon. Clear CTA. 8 hashtags per post including local ${city} tags.`,
    },
    {
      title: "Turn a Client Win Into Content",
      desc: "Finish a project, fill the blanks, get a full content package.",
      prompt: `I just finished a project for a [client type] in ${city}.
Problem: [pain point in 1–2 sentences]
Solution: [what was built]
Result: [outcome with numbers]

Turn this into:
1. A Reel script (hook + body + CTA + caption)
2. A 5-slide carousel (titles + caption + CTA)
3. A single-image caption (150 words + CTA)
4. Three Story prompts

Voice: direct, confident, evidence-based. Reference ${city} where natural.`,
    },
  ];
}

export function aiPromptSlide(data: ReportData, num: 1 | 2 | 3): string {
  const prompts = buildPrompts(data);
  const p = prompts[num - 1];
  const promptPreview = p.prompt.split("\n").slice(0, 10).join("\n");

  return `<span class="eyebrow">Toolkit · AI Prompt ${num} of 3</span>

<div class="ai-prompt-card">
  <div class="ai-label">AI PROMPT</div>
  <div class="ai-title">${e(p.title)}</div>
  <p class="ai-desc">${e(p.desc)}</p>
  <div class="prompt-block">${e(promptPreview)}</div>
</div>`;
}
