import type { ReportData } from "../../report/reportDataAssembler.js";
import { escapeHTML, parseReels, parseCarousels } from "./utils.js";

// ─── POST TEMPLATE CARD ───────────────────────────────────────────────────────

interface PostTemplateData {
  number: number;
  style: string;
  title: string;
  purpose: string;
  copy: string;
  whenToUse: string;
}

function renderPostTemplateCard(t: PostTemplateData): string {
  return `
<div class="post-template-card">
  <div class="post-template-number">${t.number}</div>
  <span class="post-template-style">${escapeHTML(t.style)}</span>
  <div class="post-template-title">${escapeHTML(t.title)}</div>
  <p class="post-template-purpose">${escapeHTML(t.purpose)}</p>
  <div class="post-template-copy">${escapeHTML(t.copy)}</div>
  <div class="post-template-when"><strong>When to use it:</strong> ${escapeHTML(t.whenToUse)}</div>
</div>`;
}

// ─── AI PROMPT CARD ────────────────────────────────────────────────────────────

interface AIPromptData {
  title: string;
  desc: string;
  prompt: string;
}

function renderAIPromptCard(p: AIPromptData): string {
  return `
<div class="ai-prompt-card">
  <span class="ai-prompt-eyebrow">AI PROMPT</span>
  <div class="ai-prompt-title">${escapeHTML(p.title)}</div>
  <p class="ai-prompt-desc">${escapeHTML(p.desc)}</p>
  <div class="ai-prompt-code-wrap">
    <span class="ai-prompt-hint">Copy ↑</span>
    <pre class="ai-prompt-code">${escapeHTML(p.prompt)}</pre>
  </div>
</div>`;
}

// ─── HASHTAG GROUPS ────────────────────────────────────────────────────────────

function extractHashtagsFromMd(md: string): string[] {
  const chips: string[] = [];
  const matches = md.matchAll(/#([A-Za-z][A-Za-z0-9_]+)/g);
  for (const m of matches) {
    const tag = `#${m[1]}`;
    if (!chips.includes(tag)) chips.push(tag);
  }
  return chips;
}

function renderChipRow(chips: string[]): string {
  return chips.map(t => `<span class="hashtag-chip">${escapeHTML(t)}</span>`).join("");
}

// ─── TEMPLATE COPY BUILDER ────────────────────────────────────────────────────

function buildTemplates(data: ReportData): PostTemplateData[] {
  const city = data.reportContext.businessLocation.city;
  const market = data.reportContext.localMarketLabel;
  const cat = data.reportContext.businessClassification;
  const offer = data.audit.main_offer ?? `${cat} services`;
  const audience = data.audit.target_audience ?? "small business owners";
  const citySlug = city.toLowerCase().replace(/\s+/g, "");
  const catSlug = cat.toLowerCase().replace(/[^a-z0-9]+/g, "");

  return [
    {
      number: 1,
      style: "THE WIN STORY",
      title: "Build trust through proof",
      purpose: "The single highest-impact content type for service businesses. One real client result, told specifically, does more than ten motivational posts.",
      copy: `Last week we helped a [client type — e.g. local contractor, dental clinic, accountant] save [X hours / $X / Y leads].

Here's what was happening before:
[1–2 sentences describing the pain point in plain words]

Here's what we built:
[1–2 sentences describing the ${offer} solution]

Here's what it's doing now:
[1–2 sentences describing the result — specific numbers if possible]

If this is on your mind, send us a DM and we'll point you in the right direction.

#${citySlug}business #${citySlug}${catSlug} #${catSlug}tips`,
      whenToUse: `Once a week. Make this your Monday post. It builds trust and brings DMs.`,
    },
    {
      number: 2,
      style: "THE QUESTION HOOK",
      title: "Generate comments — and next-audit data",
      purpose: `Questions drive comments. Comments become the audience language data the next audit mines for insight. Post one every mid-week.`,
      copy: `What if your [business process — e.g. follow-ups, scheduling, lead routing] could run while you sleep?

Most ${audience} I talk to are doing this manually. Three follow-up emails per lead, every day. By Friday, it's a part-time job nobody got hired for.

Here's what one ${market} buyer did differently → [1 sentence describing the change]

Question for you: What's the one task you'd hand off first if you could?

#${citySlug}business #${citySlug}${catSlug} #local${catSlug}`,
      whenToUse: `Mid-week. The comments you get back are content for the next audit.`,
    },
    {
      number: 3,
      style: "THE BEHIND-THE-SCENES",
      title: "Show the work. Build personality.",
      purpose: `Reference accounts in the ${cat} category post this kind of content far more than you do. It humanizes the offer and shows competence without claiming it.`,
      copy: `Here's what we handled for a [client type] in ${market} this week:

→ [Specific step 1]
→ [Specific step 2]
→ [Specific step 3]

Took us [time]. Will save them [estimated hours/week or month].

The work looks simple from the outside, but details compound. Showing the process helps buyers understand why the right help matters.

Working on something like this for your own business? DM us.

#${citySlug}business #${citySlug}${catSlug} #${catSlug}advice`,
      whenToUse: `Friday. Show the work week. Tag the city every time.`,
    },
    {
      number: 4,
      style: "THE TOOL DEMO (REEL)",
      title: "Show the result in 30 seconds",
      purpose: `High-engagement ${cat} content usually makes one result or answer easy to understand quickly.`,
      copy: `HOOK (0–3s):
"One thing ${market} buyers should know before [decision]."

BODY (3–25s):
Show the question, situation, or result.
Voiceover: "Here is what we checked first. Here is what changed after the right next step."

CTA (25–30s):
"If this is on your mind, send us a DM."

Caption (60–80 words):
[Restate what the reel showed + DM CTA + 8 hashtags including #${citySlug}business]`,
      whenToUse: `Bi-weekly. Highest-conversion content type for ${cat} on Instagram in 2026.`,
    },
  ];
}

// ─── AI PROMPTS BUILDER ────────────────────────────────────────────────────────

function buildAIPrompts(data: ReportData): AIPromptData[] {
  const name = data.reportContext.displayName;
  const city = data.reportContext.businessLocation.city;
  const region = data.reportContext.businessLocation.region;
  const cat = data.reportContext.businessClassification;
  const offer = data.audit.main_offer ?? `${cat} services`;
  const audience = data.audit.target_audience ?? "small business owners";

  const cat_ = data.patterns?.category;
  const topHook = cat_?.hooks?.bestPerformingHookByEngagement ?? cat_?.hooks?.topHook ?? "[hook type]";
  const topTone = cat_?.tones?.bestPerformingToneByEngagement ?? cat_?.tones?.topTone ?? "[tone]";
  const topPostType = cat_?.postTypes?.bestPerformingByEngagement?.post_type ?? "reel";
  const topElement = cat_?.contentElements?.bestPerformingElementByEngagement ?? "storytelling";

  return [
    {
      title: "Generate More Reel Hooks",
      desc: "When the templates above run out, paste this into Claude or ChatGPT to get 10 more hooks calibrated to your category data.",
      prompt: `I run ${name}, a ${cat} in ${city}, ${region}. My main offer is ${offer}. My target audience is ${audience}.

Based on Instagram analysis of similar businesses, these patterns drive engagement in my category:
- Best-performing hook type: ${topHook}
- Best-performing tone: ${topTone}
- Best-performing post type: ${topPostType}
- Top content elements: ${topElement}

Generate 10 Reel hooks (under 80 characters each) following these patterns. Each hook should feel native to ${city} small business audiences. Avoid generic AI-speak. Use the language a real founder would use.`,
    },
    {
      title: "Write a Week of Captions",
      desc: "Plan five days of content in one prompt. Paste, fill the brackets, and you have a week's worth of posts.",
      prompt: `I'm ${name} (${cat}, ${city}). My main offer: ${offer}.

Write me 5 Instagram captions for next week:
1. A customer win story
2. A behind-the-scenes work post
3. An educational post about [industry topic]
4. A community/local post that references ${city} specifically
5. A soft offer post that drives DMs to ${offer}

Each caption: 120–180 words, plain English, no jargon, no emojis in the prose (one or two at the end if natural). End each with a clear CTA. Suggest 8 hashtags per post including local tags for ${city}.`,
    },
    {
      title: "Turn a Client Win Into Content",
      desc: "When you finish a project, paste this prompt with the details. One project becomes a full content package.",
      prompt: `I just finished a project for a [client type] in ${city}. Here's what happened:
- Problem: [describe the pain point in 1–2 sentences]
- Solution: [describe what was built in 1–2 sentences]
- Result: [describe the outcome with specific numbers if possible]

Turn this into:
1. One Instagram Reel script (hook + body + CTA + caption)
2. One 5-slide carousel (slide titles + caption + CTA)
3. One single-image caption (150 words + CTA)
4. Three Story prompts to support the campaign

Brand voice: direct, confident, evidence-based, no jargon. Reference ${city} where natural.`,
    },
  ];
}

// ─── HASHTAG SETS ─────────────────────────────────────────────────────────────

function buildHashtagSets(data: ReportData, localMd: string): { local: string[]; category: string[]; branded: string[] } {
  const city = data.reportContext.businessLocation.city;
  const citySlug = city.toLowerCase().replace(/\s+/g, "");
  const regionSlug = data.reportContext.businessLocation.region.toLowerCase().replace(/\s+/g, "");
  const cat = data.reportContext.businessClassification.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const bizName = (data.audit.business_name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // Pull any hashtags already in the local visibility section
  const fromMd = extractHashtagsFromMd(localMd);

  // Build local set
  const local = Array.from(new Set([
    ...fromMd.filter(t => t.toLowerCase().includes(citySlug.slice(0, 4))),
    citySlug ? `#${citySlug}` : "",
    citySlug ? `#${citySlug}business` : "",
    citySlug && cat ? `#${citySlug}${cat}` : "",
    regionSlug ? `#${regionSlug}business` : "",
    "#supportlocal",
  ].filter(Boolean))).slice(0, 8);

  // Category set
  const category = Array.from(new Set([
    `#${cat}`,
    `#${cat}tips`,
    `#${cat}advice`,
    `#local${cat}`,
    citySlug && cat ? `#${citySlug}${cat}` : "",
  ].filter(t => t !== "#"))).slice(0, 8);

  // Branded
  const branded = [
    bizName ? `#${bizName}` : "",
  ].filter(Boolean).slice(0, 4);

  return { local, category, branded };
}

// ─── CONTENT KIT (reels + carousels from existing section) ────────────────────

function renderContentKitInToolkit(kitMd: string): string {
  if (!kitMd) return "";

  const reels = parseReels(kitMd);
  const carousels = parseCarousels(kitMd);

  const reelCards = reels.map(r => `
    <div class="reel-card">
      <div class="content-card-header">REEL ${r.number}</div>
      <div class="content-card-topic">${escapeHTML(r.topic)}</div>
      ${r.contrast ? `<div class="reel-contrast">${escapeHTML(r.contrast)}</div>` : ""}
      ${r.hookPattern ? `<div class="reel-pattern">Pattern: ${escapeHTML(r.hookPattern)}${r.compositeScore ? ` · Score: ${escapeHTML(r.compositeScore)}` : ""}</div>` : ""}
      ${r.hook ? `<div class="reel-hook">${escapeHTML(r.hook)}</div>` : ""}
      ${r.body.length > 0 ? `<div class="reel-body"><ul>${r.body.map(b => `<li>${escapeHTML(b)}</li>`).join("")}</ul></div>` : ""}
      ${r.caption ? `<span class="reel-caption-label">Caption</span><div class="reel-caption">${escapeHTML(r.caption)}</div>` : ""}
      ${r.cta ? `<span class="reel-cta-label">CTA</span><div class="reel-cta">${escapeHTML(r.cta)}</div>` : ""}
    </div>`).join("");

  const carouselCards = carousels.map(c => `
    <div class="carousel-card">
      <div class="content-card-header">CAROUSEL ${c.number}</div>
      <div class="content-card-topic">${escapeHTML(c.topic)}</div>
      ${c.slides.length > 0 ? `<div class="carousel-slides">${c.slides.map((s, i) => `
        <div class="carousel-slide">
          <span class="carousel-slide-num">${i + 1}</span>
          <span>${escapeHTML(s)}</span>
        </div>`).join("")}</div>` : ""}
      ${c.caption ? `<span class="carousel-caption-label">Caption</span><div class="carousel-caption">${escapeHTML(c.caption)}</div>` : ""}
      ${c.cta ? `<div class="carousel-cta">${escapeHTML(c.cta)}</div>` : ""}
    </div>`).join("");

  if (!reelCards && !carouselCards) return "";

  return `
<div class="toolkit-subsection">
  <h3 class="section-subtitle" style="margin-bottom:8px">AI-Generated Scripts for Your Account</h3>
  <p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:24px">These three reel scripts and three carousel outlines were generated from your specific audit data using the Contrast Formula — a hook framework that identifies the gap between what your audience believes and what you can prove.</p>
  ${reelCards}
  ${carouselCards}
</div>`;
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export function renderToolkitSection(data: ReportData, localMd: string, kitMd: string): string {
  const templates = buildTemplates(data);
  const aiPrompts = buildAIPrompts(data);
  const { local, category, branded } = buildHashtagSets(data, localMd);

  const templateCards = templates.map(renderPostTemplateCard).join("");
  const aiPromptCards = aiPrompts.map(renderAIPromptCard).join("");
  const contentKitSection = renderContentKitInToolkit(kitMd);

  return `
<section class="page">
  <span class="eyebrow">Your Toolkit</span>
  <h2 class="section-title">Ready-to-use content, hashtags, and prompts</h2>
  <p class="toolkit-intro">Copy, adapt, and feed the data sections back into Claude or ChatGPT to keep generating ideas customized to your business. Everything here is calibrated to your category and market.</p>

  <div class="toolkit-subsection">
    <h3 class="section-subtitle">Four Post Styles to Get You Posting</h3>
    ${templateCards}
  </div>

  <div class="toolkit-subsection">
    <h3 class="section-subtitle">Hashtag Sets You Can Save and Reuse</h3>

    <div class="hashtag-section">
      <span class="hashtag-group-label">Local Discovery (8 tags)</span>
      <div class="hashtag-grid">${renderChipRow(local)}</div>
      <p class="hashtag-note">Borrow the hashtags your local market is using. Hashtags aren't creative property — the content inside them is. Use these to be findable.</p>
    </div>

    <div class="hashtag-section">
      <span class="hashtag-group-label">Category Reach (8 tags)</span>
      <div class="hashtag-grid">${renderChipRow(category)}</div>
      <p class="hashtag-note">Geo-neutral category tags for broader reach. These don't compete locally.</p>
    </div>

    <div class="hashtag-section">
      <span class="hashtag-group-label">Your Branded Set (4 tags)</span>
      <div class="hashtag-grid">${renderChipRow(branded)}</div>
      <p class="hashtag-note">Your own claim. Use one per post.</p>
    </div>
  </div>

  <div class="toolkit-subsection">
    <h3 class="section-subtitle">AI Prompts You Can Reuse</h3>
    <p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:24px">These prompts are pre-filled with your audit data. Open Claude or ChatGPT, paste one in, and you'll get output that knows your business, your city, and your category patterns.</p>
    ${aiPromptCards}
  </div>

  ${contentKitSection}
</section>`;
}
