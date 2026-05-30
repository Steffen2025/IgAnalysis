import type { ReportData } from "../../report/reportDataAssembler.js";
import { formatMarketLabel } from "../../audit/referenceMarkets.js";

function e(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface AIPrompt {
  title: string;
  desc: string;
  prompt: string;
}

function buildPrompts(data: ReportData): AIPrompt[] {
  const name = data.reportContext.businessName ?? "my business";
  const city = data.reportContext.businessLocation.city ?? "[city]";
  const market = data.reportContext.localMarketLabel ?? formatMarketLabel(data.audit.city, data.audit.service_area);
  const cat = data.reportContext.businessClassification ?? "service business";
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
      prompt: `I run ${name}, a ${cat} in ${market}. My main offer is ${offer}. My audience: ${audience}.

Best-performing hook type in my category: ${topHook}
Best-performing tone: ${topTone}
Best-performing post type: ${topPostType}
Top content element: ${topElement}

Generate 10 Reel hooks (under 80 chars each) following these patterns. Feel native to ${market} small business audiences. Avoid AI-speak.`,
    },
    {
      title: "Write a Week of Captions",
      desc: "Five days of content in one prompt. Fill the brackets and you have a week's worth of posts.",
      prompt: `I'm ${name} (${cat}, ${market}). Main offer: ${offer}.

Write 5 Instagram captions for next week:
1. A customer win story
2. A behind-the-scenes work post
3. An educational post about [industry topic]
4. A local post that references ${market}
5. A soft offer post that drives DMs to ${offer}

Each: 120–180 words, plain English, no jargon. Clear CTA. 8 hashtags per post including local ${market} tags.`,
    },
    {
      title: "Turn a Client Win Into Content",
      desc: "Finish a project, fill the blanks, get a compact content package without overflowing the slide.",
      prompt: `Client win in ${market}: [client type]. Problem: [pain]. Build: [solution]. Result: [number]. Create: Reel script, 5-slide carousel, 150-word caption, 3 Stories. Voice: direct, confident, evidence-based. CTA: DM.`,
    },
  ];
}

export function aiPromptSlide(data: ReportData, num: 1 | 2 | 3): string {
  const prompts = buildPrompts(data);
  const p = prompts[num - 1];
  const promptPreview = num === 3 ? p.prompt.slice(0, 280) : p.prompt.split("\n").slice(0, 10).join("\n");

  return `<span class="eyebrow">Toolkit · AI Prompt ${num} of 3</span>

<div class="ai-prompt">
  <div class="label">AI PROMPT</div>
  <div class="title">${e(p.title)}</div>
  <p class="desc">${e(p.desc)}</p>
  <div class="prompt">${e(promptPreview)}</div>
</div>`;
}
