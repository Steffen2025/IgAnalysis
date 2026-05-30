# Instagram Intelligence — Prompt Guide

Plain-English documentation for every prompt in the intelligence pipeline.
The runnable source is `src/services/instagram-intelligence/instagramAnalysisPrompts.ts`.
Edit prose here for understanding; edit the `.ts` file to change behavior.

**Prompt version:** bump `PROMPT_VERSION` in the `.ts` file whenever you change a
prompt. The cache key includes the version, so a bump forces fresh generation
and never serves stale copy.

## Global rules (inherited by every prompt)
- Speak directly to the business owner, plain language, category-specific.
- Never invent metrics, competitors, or facts not supplied.
- Never emit the tokens `none,software`, `none,`, `undefined`, `null`, `NaN`, `[object Object]`.
- CTA language must match the business model. An **app/SaaS** account never says
  "book a call" or "DM for a quote" — it says download / try / link-in-bio.
- If a required input is missing, say so; do not fabricate.

## Model routing
- **Fast** (`OPENROUTER_MODEL_FAST`, default `openai/gpt-5.4-nano`): category
  normalization, CTA classification, competitor scoring, search terms, hashtags,
  simple section generation, data-gap summaries, validation critique.
- **Smart** (`OPENROUTER_MODEL_SMART`, default `openai/gpt-5.4-mini`): full Gold
  Master JSON/Markdown synthesis, quality review, and any fast output that fails
  validation (automatic nano→mini escalation).

## The prompts

1. **buildCategoryNormalizationPrompt** — Turns a raw/garbage IG category plus
   bio/website/name into a clean human business type, a `categoryKind`, a
   confidence score, and the right CTA family. The user-provided `businessType`
   is the strongest signal; raw IG category is treated as unreliable.

2. **buildCtaStrategyPrompt** — Picks primary + secondary CTAs that match the
   model (app vs service vs professional vs B2B). Also returns CTAs to avoid.

3. **buildCompetitorSearchTermsPrompt** — Category-aware discovery seeds:
   category keywords, city+category combinations, and industries to reject.

4. **buildCompetitorRelevancePrompt** — Judges a single candidate account and
   returns keep/reject plus a reason code. Location match alone is not enough;
   high-follower wrong-industry accounts are rejected.

5. **buildMarketPatternPrompt** — Plain interpretation of the supplied pattern
   data (cadence, captions, hooks, formats). No fabricated numbers.

6. **buildTopFiveMovesPrompt** — Exactly five ranked, copy-paste moves with
   impact/effort/score-area/why/action/time/lift/evidence. Never empty.

7. **buildNextSevenDaysPrompt** — Seven daily 15–30 min actions, each with an
   objective, exact instruction, and end-of-day output. Never empty.

8. **buildThirtyDaySprintPrompt** — Four weeks: foundation → rhythm →
   conversion → measure, each with goal/actions/output/measure.

9. **buildHashtagStrategyPrompt** — Grouped, lowercase, human-realistic tags
   (local/category/audience/authority/branded/test). No giant junk tags.

10. **buildContentToolkitPrompt** — Category-specific hook/caption formulas,
    CTA options, Reel/carousel/proof ideas.

11. **buildGoldMasterJsonPrompt** — Smart-model pass that completes the full
    structured object, filling thin sections without fabricating competitors.

12. **buildGoldMasterMarkdownPrompt** — Smart-model final long-form synthesis
    following the 22-section structure; complete enough that a renderer needs
    no further thinking.

13. **buildQualityReviewPrompt** — Strict QA critique returning blocking and
    warning issues (empty sections, malformed tokens, wrong CTA, bad competitors).

## How the pipeline uses them
`generateGoldMaster.ts` assembles as much as possible **deterministically** from
the database (scores, market comparison, patterns, competitor debug, hashtags),
then calls the prompts above through OpenRouter to enrich/synthesize. When
`OPENROUTER_API_KEY` is absent, the deterministic core still produces a Gold
Master and the missing LLM sections are recorded as data gaps — the report is
never silently weak.
