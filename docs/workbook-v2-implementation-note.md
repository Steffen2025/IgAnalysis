# 30-Day Instagram Action Workbook — v2 Trust + Depth Pass

_Audit case study: #27 @boxbuddyapp · implemented 2026-05-29_

## Core problem this pass fixed

A single poisoned data value cascaded into every trust failure the review
called out. Instagram returned `business_category = "None,Software"`, and that
string was trusted verbatim:

| Symptom seen by reviewer | Real root cause |
|---|---|
| "none,software", "TorontoNoneSoftware", "Before you hire a none,software" | raw category string interpolated into copy + hashtags |
| Irrelevant competitors (@none_like_mine, @none_tattooer, @fredagain…) | discovery query was literally `"None,Software <city> instagram"` → matched handles containing "none" + a musician |
| "post more" to an account posting 11.7×/week | cadence advice was a hardcoded string, not metric-aware |

## What changed (files)

**New modules**
- `src/services/audit/categoryNormalizer.ts` — rejects junk categories
  (`None,Software`, comma-joined junk, bare `software`/`app`/`none`), infers a
  clean label from bio/name/handle/website. BoxBuddy → **"Moving & home
  inventory app"**. Returns a `kind` (`app|service|professional|retail|creator|generic`)
  + `isApp` flag used for CTA decisions.
- `src/services/audit/categoryCopy.ts` — `ctaForKind` (app → "Download the
  app", not "book a call"), `recommendCadence` (metric-aware — never says "post
  more" above market), `safeHashtagToken` (strips junk → no `#NoneSoftware`).
- `src/services/marp-report/competitorRelevance.ts` — `scoreCompetitorRelevance`
  + `filterByRelevance`. Hard-rejects music/tattoo/event/model/none handles,
  scores keyword overlap with the category vocabulary, attaches a human reason
  code to every keep/reject, logs the decision table.
- `src/services/marp-report/workbookManifest.ts` — section manifest
  (id/title/required/dataDependencies/fallback) + `validateWorkbookOutput` /
  `assertValidWorkbook` which scans rendered markdown for forbidden tokens
  (`none,`, `undefined`, `null`, `NaN`, `[object Object]`, `Yourfirst`,
  `#…NoneSoftware`) and throws before a deck ships.
- `src/services/marp-report/slideBuilders/depthSlides.ts` — **restored
  intelligence depth** against the current data shape: `scoreIndicatorsSlide`
  (what-we-saw, dimension by dimension, with signal notes) and
  `marketPatternsSlide` (posts studied, avg caption/hashtags/emojis, hook-type
  and content-element distribution bars).
- `src/scripts/regenAudit.ts` — regenerate sections + HTML + decks for an
  existing audit with no re-scrape.

**Wiring**
- `auditContextInference.inferCategory` → normalizer (future scrapes store clean).
- `reportContext.buildReportContext` → normalizer; category is no longer a hard
  blocker. Added `categoryKind` + `isApp` to `ReportContext`.
- `reportDataAssembler` → refines category once the bio is loaded.
- `competitorDiscovery` (both local + reference) → `discoveryCategory()` guard so
  queries can never contain `None,Software` again.
- `workbookViewModel` → `filterByRelevance` gate; `selectionReason` on each card.
- `workbookSlides.youVsMarketSlide` → `recommendCadence` + `ctaForKind`
  ("Your volume is not the problem" instead of "post more").
- `marpGenerator` → wires the two depth slides into the order + calls
  `assertValidWorkbook` before returning.

## Verified result (audit 27)

- **Forbidden-token scan of the rendered deck: clean** (no none,software /
  undefined / [object Object] / "post more often").
- **Competitor gate** (from the live run log):
  - `kept 0/3 local` — rejected @fredagain… (musician), @none_like_mine (handle
    pattern), @none_tattooer (tattoo).
  - `kept 1/2 reference` — kept @windsorone, rejected @devwindsor (model/personal).
  - Board renders @windsorone with real logo + latest-post image.
- **Cadence card** now reads "Your volume is not the problem" with 11.7/wk.
- **Category** reads "moving / Moving & home inventory app" throughout.
- Deck grew 18 → 20 slides (score indicators + market patterns restored).

## Section manifest (target structure preserved)

Cover · Start Here · Today's Baseline · **Score Indicators** · Five Moves ·
30-Day Sprint · Week 1 Timeline · Local Unlock · You vs Market · **Market
Patterns** · Competitor Relevance Board · Competitor Cheat Sheet · Hashtags ·
Posting Toolkit · AI Prompts · Checkpoints · Day 30 Review · Close.

`required: true` sections are asserted present; intelligence sections degrade to
clean empty states when their data is missing (never dropped silently).

## Remaining limitations (honest)

1. **LLM section text not regenerated.** `ANTHROPIC_API_KEY` is empty in `.env`,
   so the 8 LLM-authored sections (top_5_fixes, next_7_days, battle_plan, …)
   still hold their original text. They contain no forbidden tokens and read as
   "moving", so the deck passes validation — but to fully re-voice them around
   the clean category, set the key and run `npx tsx src/scripts/regenAudit.ts 27`.
2. **No re-scrape was run**, so the competitor *pool* is still the poisoned one;
   the relevance gate filters it down to the one credible account (@windsorone).
   A fresh `freshAccountRun` now that discovery is category-clean would surface
   real moving/storage/organization accounts. Re-running costs an Apify run.
3. **@windsorone** is a building-products brand — relevant-ish (home/building),
   kept because it's a real active brand, not because it's an ideal moving-app
   peer. With a clean re-scrape the board would be stronger.
4. **Score signal notes** are raw (e.g. a bio dump, "0.00% across 0 posts") —
   pre-existing data quality in `scores.signals`, surfaced now that the slide
   exists. Could be polished separately.
5. **Deeper depth sections** from the spec (observed competitor post snippets,
   pattern recipes, a dedicated 10-Quick-Actions page) are not yet wired — the
   data exists; these are the next increment.
