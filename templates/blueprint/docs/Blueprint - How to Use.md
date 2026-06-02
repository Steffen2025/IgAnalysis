# Blueprint Template — how to use (automated)

This is a **fully automated, data-driven template**. One file drives everything.

| File | Role |
|---|---|
| `auto/data.js` | ⭐ The client data — `window.BLUEPRINT_DATA = { … }`. The only file you regenerate. |
| `Blueprint - Data Schema.md` | The contract — every field, its type, and the page it feeds. |
| `blueprint.html` | The render target. Loads `data.js` and draws all 20 pages on open. |
| `blueprint-print.html` | Same, but auto-opens the print dialog → save as PDF. |

## The workflow

```
1. Your Claude Code project gathers a new client's audit data.
2. It writes  auto/data.js   (same keys as the schema; new values).
3. Open blueprint.html  → the 20 pages render from that data automatically.
4. Open blueprint-print.html  → save as PDF.
```

No HTML editing, no manual substitution. Every chart — the radar pentagon, the
score rings, the opportunity ladder, the posts/week bars, the funnel, the
calendar — is **computed from the scores in `data.js`**.

## The prompt to give Claude Code

> "Copy `auto/data.js` and rewrite the values for **[client]** to match the keys
> and shape in `Blueprint - Data Schema.md`. Keep every key. `pillars` and `chain`
> stay at 5 (fixed `key`s), `competitors` ≤ 5, `cadence_slots` and `offer_paths`
> at 3, `four_week_arc` at 4, `calendar` at 4 weeks × 3 posts, `seven_day_plan`
> at 7. Scores are 0–100 integers; `score_delta = target_score − current_score`
> (prefix `+`); leave `[brackets]` literal in the toolkit copy."

Then open `blueprint.html` (review) or `blueprint-print.html` (PDF).

## What stays fixed vs. what changes

- **Changes per client:** only `auto/data.js` — name, handle, city, scores, pillar
  copy, competitors, calendar, toolkit, dates, offer/contact, and the small
  `narrative` block of connective copy.
- **Stays fixed (the brand + template layer):** logo, colours, fonts, page
  structure, the render engine and page builders, and the 5-pillar / 7-day /
  30-day framework.

## Notes

- `data.js` loads as a JS global, so `blueprint.html` works opened directly from
  disk (no server). Keep the `auto/` folder and `assets/` folder beside it.
- The static `Instagram Growth Blueprint.html` and `example-client-data.md` (YAML)
  are kept only as read-only references of the original Northside render.
