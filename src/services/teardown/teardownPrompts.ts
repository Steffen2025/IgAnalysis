// Prompt registry for the teardown intelligence tasks. All teardown system +
// user prompts live here (mirrors the instagram-intelligence prompt registry
// pattern). Every builder feeds the LLM ONLY deterministic, pre-computed facts
// and forbids inventing metrics — the "never fabricate" contract.

export interface TeardownPromptContext {
  handle: string;
  fullName: string | null;
  category: string | null;
  bio: string | null;
  followerCount: number | null;
  postCount: number | null;
  capturedCount: number;
}

const GLOBAL_RULES = `GLOBAL RULES:
- You are reverse-engineering WHY this account performs, for a strategist who will replicate the playbook.
- Use ONLY the numbers and text provided. Never invent metrics, follower counts, saves, shares, or reach.
- Instagram does not expose saves/shares/reach to scraping — never reference them as if measured.
- Be concrete and specific to THIS account's content; no generic social-media platitudes.
- Return STRICT JSON only — no markdown fences, no commentary before or after the JSON.`;

function ctxBlock(c: TeardownPromptContext): string {
  return [
    `ACCOUNT: ${c.fullName ?? c.handle} (@${c.handle})`,
    c.category ? `CATEGORY: ${c.category}` : null,
    c.bio ? `BIO: ${c.bio}` : null,
    `FOLLOWERS: ${c.followerCount ?? "unknown"} · POSTS: ${c.postCount ?? "unknown"} · ANALYZED: ${c.capturedCount} items`,
  ]
    .filter(Boolean)
    .join("\n");
}

export interface PromptSpec {
  system: string;
  user: string;
}

// ── Caption & hook system ──────────────────────────────────────────────────
export function buildCaptionSystemPrompt(
  ctx: TeardownPromptContext,
  captionStatsJson: string,
): PromptSpec {
  return {
    system: `You are a senior Instagram content strategist analyzing an account's caption + hook system. ${GLOBAL_RULES}

Return JSON with EXACTLY this shape:
{
  "hook_formulas": ["3-6 short, named hook patterns this account repeats, each with a concrete example phrasing"],
  "cta_strategy": "2-4 sentences on how this account uses calls-to-action (esp. any 'comment KEYWORD' mechanic) and what it is engineering",
  "voice_and_tone": "2-3 sentences describing the writing voice",
  "caption_structure": ["3-5 structural templates: how a typical caption is built start to finish"],
  "replication_tips": ["3-5 specific, copyable instructions for writing captions in this style"]
}`,
    user: `${ctxBlock(ctx)}

DETERMINISTIC CAPTION SIGNALS (computed from the captured captions):
${captionStatsJson}

Analyze the caption + hook system and return the strict JSON object.`,
  };
}

// ── Comment drivers ─────────────────────────────────────────────────────────
export function buildCommentDriversPrompt(
  ctx: TeardownPromptContext,
  driversJson: string,
  ctaLiftJson: string,
): PromptSpec {
  return {
    system: `You are analyzing WHAT DRIVES COMMENTS on an Instagram account. ${GLOBAL_RULES}

Return JSON with EXACTLY this shape:
{
  "primary_drivers": ["3-5 ranked drivers of comment volume, each one sentence, grounded in the data (e.g. keyword-reply CTAs, questions, tagging prompts)"],
  "manufactured_vs_organic": "2-3 sentences: how much of the comment volume is engineered by CTAs vs organic conversation, citing the numbers",
  "audience_signals": ["2-4 things the comments reveal about the audience (language, intent, what they want)"],
  "replication_tips": ["3-4 specific tactics to drive comments the same way"]
}`,
    user: `${ctxBlock(ctx)}

DETERMINISTIC COMMENT SIGNALS:
${driversJson}

CAPTION-CTA → COMMENT LIFT (avg comments on posts with a 'comment KEYWORD' CTA vs without):
${ctaLiftJson}

Analyze what drives comments and return the strict JSON object.`,
  };
}

// ── Success thesis + replication playbook ───────────────────────────────────
export function buildSuccessThesisPrompt(
  ctx: TeardownPromptContext,
  metricsJson: string,
  captionStatsJson: string,
  hashtagJson: string,
  driversJson: string,
): PromptSpec {
  return {
    system: `You are a senior growth strategist writing the SUCCESS THESIS for an Instagram account teardown — the "why this works and how to replicate it" centerpiece. ${GLOBAL_RULES}

This is a TEXT-ONLY thesis (M3): you have captions, hashtags, engagement, momentum, and comment data — but NOT yet the cover-image visual analysis or reel transcripts (those arrive in later milestones). Frame the thesis on what the text + engagement data support, and flag where visual/audio analysis would sharpen it.

Return JSON with EXACTLY this shape:
{
  "thesis": "3-5 sentence core thesis for why this account performs",
  "pillars": [{"name": "short pillar name", "evidence": "one sentence citing specific signals", "so_what": "why it matters for replication"}],
  "what_is_replicable": ["3-6 concrete, transferable plays"],
  "what_is_not_easily_replicable": ["1-3 advantages that are hard to copy (e.g. existing audience size)"],
  "preliminary_playbook": ["5-8 ordered, specific actions a BotLogix/BoxBuddy account could run to apply these lessons"],
  "open_questions_for_later_milestones": ["1-3 things cover-image vision (M5) or reel transcripts (M4) would answer"]
}
"pillars" must have 3-5 entries.`,
    user: `${ctxBlock(ctx)}

ENGAGEMENT + MOMENTUM:
${metricsJson}

CAPTION + HOOK SIGNALS:
${captionStatsJson}

HASHTAG SYSTEM:
${hashtagJson}

COMMENT DRIVERS:
${driversJson}

Synthesize the success thesis and replication playbook. Return the strict JSON object.`,
  };
}
