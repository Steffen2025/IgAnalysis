# Deliverable Blueprint — Instagram Growth Plan

Purpose: turn the raw `gold-master.json` into a report a business owner actually
wants to read. The data is already strong; this maps **arrangement, narrative,
and audience** so the output can be generated systematically.

## Design principles

1. **Lead with the answer.** Score + verdict + first 3 moves on page one. Never
   open with metadata.
2. **Narrative arc, not a list of 25 sections.** Five "acts": Stand → Market →
   Plan → Toolkit → Appendix.
3. **Separate client-facing from internal.** Raw relevance scores, discovery
   debug, evidence index, validation → Appendix, not the body.
4. **Every claim earns its place.** Diagnosis points to a fix; a fix points to a
   day; a day points to a measurement.
5. **BotLogix voice:** practical, direct, human. No hype, no filler.
6. **Same data object, new arrangement.** A new renderer consumes the existing
   `GoldMasterIntelligence`; nothing in discovery/scoring changes.

## Structure (maps every current section → its new home)

### COVER
- Title, @handle, business name, market, date, "prepared by BotLogix".
- Source: `meta`.

### PART 1 — Executive Summary  *(the one page that matters)*
- Headline verdict: overall score + one-sentence read.
- The big opportunity (1–2 sentences).
- Your first 3 moves (this week).
- What good looks like by day 30.
- Source: `executiveSnapshot`, `scores.overall`, top `fixes`, `measurement` day30.

### PART 2 — Where You Stand Today  *(the diagnosis)*
- 2.1 Scorecard — 5 dimensions as bars, strongest + weakest called out.
- 2.2 Profile snapshot — display name, bio, link, CTA status.
- 2.3 What's holding you back — profile gaps in plain language.
- Source: `scores`, `accountProfile`, profile gaps.

### PART 3 — What's Working In Your Market  *(the intelligence — our differentiator)*
- 3.1 How you compare — you vs market table + interpretation.
- 3.2 Accounts worth studying — **cleaned** competitor cards (reference vs local,
  adjacency labeled), each with one "borrow this / avoid that". No raw 0–100
  internal columns here.
- 3.3 Proven patterns in your category — top formats, hook types, content
  elements (N posts studied), as the evidence base.
- 3.4 Local & adjacent opportunities — spotlighted accounts, local wording,
  complementary industries (only when present).
- Source: `marketComparison`, `competitors` (relevance board, cleaned),
  `marketPatterns`, `localSignal`.

### PART 4 — Your 30-Day Plan  *(the action)*
- 4.1 The 5 moves that matter most — `fixes`, each: why → exact action → time →
  expected lift.
- 4.2 Your first 7 days — `nextSevenDays`, day-by-day.
- 4.3 The 30-day sprint — `sprint`, 4 weeks.
- 4.4 How we'll measure — `measurement` + `day30Review`.

### PART 5 — Your Content Toolkit  *(the do-it-yourself kit)*
- 5.1 Hook + caption formulas — `toolkit`.
- 5.2 Hashtag sets — `hashtags` (local/category/audience/authority/branded/test).
- 5.3 Copy-ready AI prompts — `aiPrompts`.
- 5.4 Idea bank — `quickActions` + content ideas (10 hooks, carousels, reels,
  stories).

### APPENDIX — Methodology & Evidence  *(for the curious / internal QA)*
- A. How this was built — sources, model, prompt version, posts studied.
- B. Competitor discovery detail — the debug table + raw relevance scores.
- C. Source evidence index.
- D. Confidence & validation — section confidence, data gaps, pass/fail.
- Source: `meta`, `competitorDebug`, `evidence`, `sectionConfidence`, `validation`.

## What changes vs the current file

| Current | Blueprint |
| --- | --- |
| Metadata is section 0 (top) | Moves to Appendix A / cover |
| Discovery debug table mid-report (§10) | Appendix B |
| Relevance board with raw 0–100 columns (§11) | Cleaned cards in Part 3.2; raw → Appendix B |
| Evidence index + validation mid-tail (§23–24) | Appendix C/D |
| 25 flat numbered sections | 5 narrative parts + appendix |
| No connective narrative | Short intro framing each part |

## Build plan (once the forks below are confirmed)
1. New `renderDeliverable(gm)` renderer (separate from `goldMasterMarkdown.ts`,
   which stays as the raw/QA view).
2. Section-by-section, driven by this blueprint.
3. Add narrative intro strings per part (category-aware, no hype).
4. Optional medium step (HTML/PDF) reusing existing report infra if desired.
