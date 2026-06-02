# CLAUDE.md — Instagram Growth Blueprint generator (automated)

You are inside the **Instagram Growth Blueprint** template pack. It produces a
branded, 20-page Instagram audit & growth Blueprint (HTML → PDF) for any client.

**The whole document is data-driven.** `blueprint.html` reads one object —
`window.BLUEPRINT_DATA` in **`auto/data.js`** — and renders all 20 pages on load,
computing every chart (radar pentagon, score rings, opportunity ladder, bars,
funnel, calendar) from the scores. **Your only job per client is to write a new
`auto/data.js`.** Open `blueprint.html` and the document re-skins. No HTML editing.

## Files

| File | Role |
|---|---|
| **`auto/data.js`** | ⭐ THE per-client file. `window.BLUEPRINT_DATA = { … }`. Edit values, keep keys. Currently holds the Northside Studio example. |
| `blueprint.html` | Render target. Loads data.js + engine + page builders. Open it to view. |
| `blueprint-print.html` | Same, but auto-opens the print dialog (save as PDF). |
| `auto/engine.js` | Render engine + chart geometry. **Do not edit per client.** |
| `auto/pages-1.js / pages-2.js / pages-3.js` | Page builders (P1–5 / 6–12 / 13–20). Edit only to change the *template*, never per client. |
| `Blueprint - Data Schema.md` | The field contract — every key, type, and the page it feeds. |
| `assets/` | `botlogix-logo.png`, `botlogix-mascot.png` (relative `assets/` paths). Keep beside `blueprint.html`. |

> Data loads as a JS global (not `fetch`), so `blueprint.html` works opened
> directly from disk — no server needed.

## To generate a client's Blueprint

1. Produce a new **`auto/data.js`** for the client: copy the current file, keep
   every key, replace the values. Match the shape in `Blueprint - Data Schema.md`.
2. Open `blueprint.html` to review, or `blueprint-print.html` to save as PDF.

## Hard rules — keep the data structure intact

- **Never rename or drop a key.** Same key names as `Blueprint - Data Schema.md`.
- **Fixed counts:** `pillars` = 5 (fixed `key`s, in order), `chain` = 5,
  `competitors` ≤ 5, `cadence_slots` = 3, `offer_paths` = 3, `four_week_arc` = 4,
  `calendar` = 4 weeks × 3 posts, `seven_day_plan` = 7.
- **Numbers:** `score` and percentages are integers 0–100 (no `%` — the template
  adds it where needed). `score_delta` = `target_score − current_score`, prefix `+`.
- **Charts are computed** from `pillars[].score`, `cadence_standings`,
  `data_gaps.gap_cards.fill/target`, `format_mix`, `funnel`. You set the numbers;
  the engine positions everything. Never hand-place a polygon point or bar width.
- **`[brackets]`** in `hook_starters` / `caption_frameworks` / `cta_ladder` stay
  literal — they're fill-in prompts for the reader.
- **HTML in strings is allowed** for `<strong>` emphasis inside copy fields
  (already used throughout). `{handle}`, `{city}`, `{checkpoint_short}` etc. in the
  `narrative.*` strings are auto-substituted.
- **The brand layer is fixed:** logo, colours, fonts, page structure, the
  5-pillar / 7-day / 30-day framework. Only `BLUEPRINT_DATA` changes per client.

If a required value is genuinely unknown, ask — don't invent a number that
misrepresents the audit.
