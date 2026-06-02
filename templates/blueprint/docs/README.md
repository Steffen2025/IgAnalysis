# Instagram Growth Blueprint — Template Pack (automated)

A **data-driven**, 20-page Instagram audit & growth Blueprint, branded for
**BotLogix**. Everything in the document is generated from a single data object,
so producing a new client's Blueprint is one step: **write a new `auto/data.js`,
open `blueprint.html`.** The design and field set are locked; only the data changes.

## Start here

1. Read **`CLAUDE.md`** — the operating rules (Claude Code loads this automatically).
2. Open **`auto/data.js`** — the one file you edit per client (currently Northside Studio).
3. Reference **`Blueprint - Data Schema.md`** — every field, its type, and the page it feeds.

## How it works

```
auto/data.js  (window.BLUEPRINT_DATA = { … the client … })
      │
      ▼   blueprint.html loads it and renders itself on load
20 pages  ── radar, rings, ladder, bars, funnel, calendar all COMPUTED from the scores
      │
      ▼   open blueprint-print.html → save as PDF
```

The data loads as a JS global (not a `fetch`), so `blueprint.html` opens straight
from disk — no local server required.

## Contents

```
blueprint-template-pack/
├── CLAUDE.md                       ← operating rules
├── README.md                       ← this file
├── Blueprint - Data Schema.md      ← the field contract (fixed)
├── blueprint.html                  ← render target — open to view
├── blueprint-print.html            ← auto-prints → save as PDF
├── auto/
│   ├── data.js                     ← ⭐ the per-client file you regenerate
│   ├── engine.js                   ← render engine + chart geometry (don't edit)
│   └── pages-1.js / pages-2.js / pages-3.js   ← page builders (template only)
└── assets/  botlogix-logo.png · botlogix-mascot.png
```

## Make a new client's Blueprint

Tell Claude:

> "Copy `auto/data.js` and rewrite the values for **[client]**, keeping every key
> and the shape in `Blueprint - Data Schema.md`. Keep `pillars`/`chain` at 5,
> `competitors` ≤ 5, `cadence_slots`/`offer_paths` at 3, `calendar` at 4×3, and
> `seven_day_plan` at 7. Scores are 0–100 integers; leave `[brackets]` literal."

Then open `blueprint.html` to review, or `blueprint-print.html` to export a PDF.

> The static, fully-rendered Northside reference (`Instagram Growth Blueprint.html`)
> and the YAML reference (`example-client-data.md`) are kept as read-only examples.
> The live, automated render target is **`blueprint.html` + `auto/data.js`**.
