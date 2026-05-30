/**
 * Instagram Intelligence — prompt registry.
 *
 * EVERY system prompt and prompt-builder for the intelligence pipeline lives
 * here. No prompts in slide builders, no prompts scattered across services.
 * Edit this file (and the sibling docs at prompts/instagram-analysis-prompts.md)
 * to tune the system.
 *
 * All builders are category-aware and client-aware. They take a normalized
 * client context and never assume a specific business (no BoxBuddy logic here).
 */

export const PROMPT_VERSION = "instagram-intelligence-v1.1.0";

/** Normalized client context passed to every builder. */
export interface PromptClientContext {
  handle: string;
  businessName: string;
  normalizedCategory: string;
  categoryKind: "app" | "service" | "professional" | "retail" | "creator" | "generic";
  city: string;
  region: string;
  marketLabel: string;
  website: string | null;
  bio: string | null;
  targetAudience: string | null;
  followerCount: number | null;
  postCount: number | null;
  postsPerWeek: number | null;
  overallScore: number | null;
}

/** Shared rules every section prompt inherits. */
const GLOBAL_RULES = `GLOBAL RULES:
- Write for the business owner, directly, in plain language.
- Be specific to the account's category and city; never generic filler.
- Never invent metrics, competitors, or facts that were not provided.
- Never output the literal tokens: none,software | none, | undefined | null | NaN | [object Object].
- Never use service-business CTAs ("book a call", "DM for a quote") for an app/SaaS account; use download/try/link-in-bio.
- If a required input is missing, say so plainly instead of fabricating.`;

export const SYSTEM_BASE = `You are a senior Instagram growth strategist producing a precise, category-aware intelligence report. ${GLOBAL_RULES}`;

function ctxBlock(c: PromptClientContext): string {
  return [
    `ACCOUNT: ${c.businessName} (@${c.handle})`,
    `CATEGORY: ${c.normalizedCategory} (kind: ${c.categoryKind})`,
    `MARKET: ${c.marketLabel}`,
    c.website ? `WEBSITE: ${c.website}` : null,
    c.bio ? `BIO: ${c.bio}` : null,
    c.targetAudience ? `AUDIENCE: ${c.targetAudience}` : null,
    `FOLLOWERS: ${c.followerCount ?? "unknown"} · POSTS: ${c.postCount ?? "unknown"} · POSTS/WK: ${c.postsPerWeek?.toFixed(1) ?? "unknown"}`,
    `OVERALL SCORE: ${c.overallScore ?? "unknown"}/100`,
  ]
    .filter(Boolean)
    .join("\n");
}

export interface PromptSpec {
  system: string;
  user: string;
}

/* ────────────────────────────────────────────────────────────────────────
 * 1. Category normalization
 *   Purpose: turn a raw/garbage IG category + profile signals into a clean,
 *   human business type + kind + CTA family, with confidence.
 *   Output contract: JSON { normalizedCategory, categoryKind, confidence,
 *   whatItSells, likelyAudience, contentThatWorks, ctaType, ctaOptions[] }.
 *   Prohibited: emitting "none"/"software"-alone/comma-junk as the category.
 *   Failure: if signals are too thin, return categoryKind "generic" with a
 *   readable fallback label and confidence <= 40.
 * ──────────────────────────────────────────────────────────────────────── */
export function buildCategoryNormalizationPrompt(input: {
  rawCategory: string | null;
  bio: string | null;
  website: string | null;
  fullName: string | null;
  handle: string;
  userProvidedBusinessType?: string | null;
}): PromptSpec {
  return {
    system: `You are a precise business-category classifier for Instagram accounts. ${GLOBAL_RULES}`,
    user: `Classify this account into a clean, human business type.

USER-PROVIDED BUSINESS TYPE (strongest signal if present): ${input.userProvidedBusinessType ?? "(none)"}
RAW INSTAGRAM CATEGORY (often unreliable): ${input.rawCategory ?? "(none)"}
NAME: ${input.fullName ?? input.handle}
HANDLE: @${input.handle}
WEBSITE: ${input.website ?? "(none)"}
BIO: ${input.bio ?? "(none)"}

Return JSON only:
{
  "normalizedCategory": "human label, e.g. 'moving and home inventory app' or 'mortgage broker'",
  "categoryKind": "app|service|professional|retail|creator|generic",
  "confidence": 0-100,
  "whatItSells": "one sentence",
  "likelyAudience": "one sentence",
  "contentThatWorks": "one sentence",
  "ctaType": "short label",
  "ctaOptions": ["3-6 verb-led CTAs appropriate to the kind"]
}
Never return "none", "software" alone, or comma-joined junk as the category.`,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 2. CTA strategy — choose CTA language that matches the business model.
 * ──────────────────────────────────────────────────────────────────────── */
export function buildCtaStrategyPrompt(input: { ctx: PromptClientContext }): PromptSpec {
  return {
    system: SYSTEM_BASE,
    user: `For the account below, list the correct primary + secondary CTAs.

${ctxBlock(input.ctx)}

Rules:
- app/SaaS → download / try / link-in-bio / save-this / use-before-X. Never "book a call".
- service → call / book estimate / request quote / DM a photo.
- professional (mortgage/finance/legal) → book a call / ask a question / start pre-approval / request a review.
- B2B service → book a demo / request audit / DM keyword / schedule consultation.

Return JSON: { "primary": "...", "ctaOptions": ["..."], "avoid": ["CTAs that would be wrong for this kind"] }`,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 3. Competitor search terms — category-aware discovery seeds.
 * ──────────────────────────────────────────────────────────────────────── */
export function buildCompetitorSearchTermsPrompt(input: { ctx: PromptClientContext }): PromptSpec {
  return {
    system: SYSTEM_BASE,
    user: `Produce Instagram competitor/reference discovery search terms for this account's category and market.

${ctxBlock(input.ctx)}

Return JSON: { "categoryTerms": ["8-16 category keywords a human would search"], "localTerms": ["city + category combinations"], "rejectIndustries": ["industries that are NOT valid references for this account"] }
Make terms realistic and specific to the category. Do not include the account's own brand.`,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 4. Competitor relevance — judge a candidate account.
 * ──────────────────────────────────────────────────────────────────────── */
export function buildCompetitorRelevancePrompt(input: {
  ctx: PromptClientContext;
  candidate: { handle: string; bio: string | null; category: string | null; followers: number | null };
}): PromptSpec {
  return {
    system: SYSTEM_BASE,
    user: `Decide if this candidate is a relevant competitor/reference for the client.

CLIENT: ${input.ctx.normalizedCategory} in ${input.ctx.marketLabel}
CANDIDATE: @${input.candidate.handle} · category: ${input.candidate.category ?? "?"} · followers: ${input.candidate.followers ?? "?"}
CANDIDATE BIO: ${input.candidate.bio ?? "(none)"}

Return JSON: { "keep": true|false, "code": "selected_category_match|selected_location_match|selected_keyword_match|selected_recent_activity|selected_reference_model|rejected_category_mismatch|rejected_location_only_but_wrong_industry|rejected_random_high_follower_account|rejected_missing_relevance|rejected_known_invalid|rejected_low_confidence", "reason": "one sentence" }
Reject high-follower accounts that are the wrong industry. Location match alone is NOT enough.`,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 5. Market pattern summary.
 * ──────────────────────────────────────────────────────────────────────── */
export function buildMarketPatternPrompt(input: { ctx: PromptClientContext; patternsJson: string }): PromptSpec {
  return {
    system: SYSTEM_BASE,
    user: `Summarize what is working in this account's market. Use ONLY the data provided.

${ctxBlock(input.ctx)}

PATTERN DATA (JSON): ${input.patternsJson}

Return 2-3 sentences of plain interpretation a business owner can act on. No fabricated numbers.`,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 6. Top five moves.
 * ──────────────────────────────────────────────────────────────────────── */
export function buildTopFiveMovesPrompt(input: { ctx: PromptClientContext; scoresJson: string }): PromptSpec {
  return {
    system: SYSTEM_BASE,
    user: `Produce the FIVE highest-leverage moves for this account, ranked.

${ctxBlock(input.ctx)}
SCORES (JSON): ${input.scoresJson}

Return ONLY this JSON object (no markdown, no commentary):
{
  "moves": [
    {
      "title": "string",
      "impact": "high" | "medium" | "low",
      "effort": "high" | "medium" | "low",
      "scoreArea": "profile" | "content" | "local" | "sales" | "competitor" | "category",
      "whyItMatters": "string",
      "exactAction": "string, copy-paste specific",
      "timeRequired": "string e.g. '15 min'",
      "expectedLift": "string e.g. '+10 local'",
      "evidence": "string referencing the data"
    }
  ]
}
HARD RULES:
- "moves" array length must be EXACTLY 5.
- Every field is a non-empty STRING (no nested objects, no arrays, no nulls).
- CTAs must match category kind (${input.ctx.categoryKind}): app→download/try/link-in-bio; service→call/book/quote; professional→book a call/pre-approval.
- Do NOT recommend posting more often if the account already posts above market average.`,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 7. Next seven days.
 * ──────────────────────────────────────────────────────────────────────── */
export function buildNextSevenDaysPrompt(input: { ctx: PromptClientContext; movesJson: string }): PromptSpec {
  return {
    system: SYSTEM_BASE,
    user: `Produce SEVEN daily actions (day 1 through 7).

${ctxBlock(input.ctx)}
TOP MOVES (JSON): ${input.movesJson}

Return ONLY this JSON object (no markdown, no commentary):
{
  "days": [
    {
      "day": 1,
      "objective": "string",
      "action": "string",
      "timeEstimate": "string e.g. '15-30 min'",
      "exactInstruction": "string, copy-paste",
      "outputByEndOfDay": "string",
      "whyItMatters": "string"
    }
  ]
}
HARD RULES:
- "days" length must be EXACTLY 7, with day = 1..7, no duplicates.
- Every text field is a non-empty STRING (no nested objects/arrays/nulls).
- 15-30 minutes each. Category-appropriate CTAs only (kind: ${input.ctx.categoryKind}).`,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 8. 30-day sprint.
 * ──────────────────────────────────────────────────────────────────────── */
export function buildThirtyDaySprintPrompt(input: { ctx: PromptClientContext }): PromptSpec {
  return {
    system: SYSTEM_BASE,
    user: `Produce a 4-week sprint (week 1-4).

${ctxBlock(input.ctx)}

Return JSON array of 4:
[{ "week": 1, "goal": "", "actions": ["3 actions"], "output": "", "measure": "" }]
Week 1 = foundation/profile, Week 2 = rhythm, Week 3 = conversion, Week 4 = measure. Category-appropriate.`,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 9. Hashtag strategy — grouped, human-realistic, category-safe.
 * ──────────────────────────────────────────────────────────────────────── */
export function buildHashtagStrategyPrompt(input: { ctx: PromptClientContext }): PromptSpec {
  return {
    system: SYSTEM_BASE,
    user: `Produce grouped hashtags a real person in this category would use.

${ctxBlock(input.ctx)}

Return JSON: { "local": [], "category": [], "audience": [], "authority": [], "branded": [], "test": [] }
Rules: lowercase, no spaces, realistic (e.g. #movingtips not #MovingAndHomeInventoryAppTips). No malformed/junk tags. 3-8 per group.`,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 10. Content toolkit — category-specific hooks/captions/CTAs/formats.
 * ──────────────────────────────────────────────────────────────────────── */
export function buildContentToolkitPrompt(input: { ctx: PromptClientContext }): PromptSpec {
  return {
    system: SYSTEM_BASE,
    user: `Produce a category-specific posting toolkit.

${ctxBlock(input.ctx)}

Return JSON: { "hookFormulas": [], "captionFormulas": [], "ctaOptions": [], "reelIdeas": [], "carouselIdeas": [], "proofIdeas": [] }
Everything specific to ${input.ctx.normalizedCategory}. CTAs match kind ${input.ctx.categoryKind}.`,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 11. Gold Master JSON — full structured synthesis (smart model).
 * ──────────────────────────────────────────────────────────────────────── */
export function buildGoldMasterJsonPrompt(input: { ctx: PromptClientContext; assembledJson: string }): PromptSpec {
  return {
    system: `${SYSTEM_BASE}\nYou are assembling a complete, structured intelligence object. Fill gaps sensibly from provided data; never fabricate competitors or metrics.`,
    user: `Given the assembled data below, return the COMPLETE GoldMasterIntelligence JSON (same shape), filling any thin sections with category-appropriate, non-fabricated content.

${ctxBlock(input.ctx)}

ASSEMBLED DATA (JSON): ${input.assembledJson}

Return only the JSON object.`,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 12. Gold Master Markdown — final long-form synthesis (smart model).
 * ──────────────────────────────────────────────────────────────────────── */
export function buildGoldMasterMarkdownPrompt(input: { ctx: PromptClientContext; goldMasterJson: string }): PromptSpec {
  return {
    system: `${SYSTEM_BASE}\nYou write the final, comprehensive Gold Master Markdown workbook. It must be complete enough that a renderer needs no further thinking.`,
    user: `Render the Gold Master Markdown for the data below, following the 22-section structure. Every required section must be present and non-empty.

${ctxBlock(input.ctx)}

GOLD MASTER (JSON): ${input.goldMasterJson}`,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 13. Quality review — critique the assembled report, return issues.
 * ──────────────────────────────────────────────────────────────────────── */
export function buildQualityReviewPrompt(input: { markdown: string }): PromptSpec {
  return {
    system: `You are a strict report QA reviewer. ${GLOBAL_RULES}`,
    user: `Review this Gold Master Markdown. Flag empty required sections, malformed tokens, wrong-CTA-for-category, and irrelevant competitors.

Return JSON: { "issues": [{ "rule": "", "severity": "blocking|warning", "detail": "" }] }

MARKDOWN:
${input.markdown.slice(0, 12000)}`,
  };
}
