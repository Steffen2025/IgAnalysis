# Instagram Growth Blueprint — Data Schema

This file defines **every piece of custom information** the 20‑page Blueprint needs.
Nothing in the design is hard‑coded to Northside Studio — fill these fields and the
whole document re‑skins to any account.

> **Format (canonical):** the live system reads **`auto/data.js`** —
> `window.BLUEPRINT_DATA = { … }`, a single JS object using the keys below.
> Regenerate that file per client (copy it, keep the keys, change the values),
> open `blueprint.html`, done. The key names and types in this doc are exactly the
> object's keys. (The YAML in `example-client-data.md` is the same model in an
> older notation, kept only as a readable reference.)
>
> **Computed, not hand-set:** every chart is derived from the numbers below — the
> radar pentagon from the 5 `pillars[].score`, the rings from each `score`, the
> opportunity ladder from the pillar scores + `target_score`, the posts/week bars
> from `cadence_standings`, the gap bars from `data_gaps.gap_cards.fill/target`,
> the format-mix strips from `pillars[2].format_mix`, the funnel from
> `pillars[3].funnel`. You never position a shape; you only set values.
>
> **Helper fields used by the renderer** (additive — keep them): each pillar also
> carries `eyebrow` (e.g. "Pillar 01 · Get found") and `chip_tone`
> (`red|amber|green|brand`) for its status colour; `chain[]`/`cadence_slots[]`
> carry a `tone`; some `metrics[]` carry a `tone` instead of a `target`. A small
> `narrative` block at the end holds the few bespoke connective paragraphs (cover,
> hook, dashboard cards, accountability, close) — `{handle}` / `{city}` /
> `{checkpoint_short}` tokens inside those strings are auto-substituted.

---

## How it plugs in

```
Claude Code project ──► client-data.md (this schema)
                              │
                              ▼
                    fill into Blueprint template ──► HTML ──► PDF
```

- **Scalars** (name, scores, dates) map to single spots, often repeated on several pages.
- **Lists** (pillars, competitors, calendar, hashtags) map to repeating cards/rows.
- Every key marked `‹required›` must be present. `‹optional›` may be omitted (a sensible
  default or blank renders).
- Scores are integers `0–100`. Percentages are integers (no `%` sign needed; the
  template adds it). Dates are human strings (e.g. `June 27, 2026`).

---

## 1 · Report meta  → Cover (P1), header/footer everywhere, P2, P20

| Key | Type | Example | Used on |
|---|---|---|---|
| `client_name` | text ‹required› | `Northside Studio` | P1, P3, P7 mock |
| `handle` | text ‹required› | `@northsidestudio` | P1, P2, P6, P10 |
| `client_descriptor` | text ‹required› | `Social-first creative studio` | P1 |
| `city` | text ‹required› | `Hamilton` | many (local copy) |
| `region` | text ‹required› | `Hamilton, ON` | P1 |
| `cta_link` | text ‹required› | `northsidestudio.ca/start` | P7 mock |
| `prepared_by` | text ‹required› | `Steffen deGraaf · BotLogix` | P1 |
| `prepared_date` | text ‹required› | `May 31, 2026` | P1, P19 |
| `checkpoint_date` | text ‹required› | `June 27, 2026` | P1, P19, P20 |
| `current_score` | int ‹required› | `46` | P1, P2, P3, P19 |
| `target_score` | int ‹required› | `68` | P3, P19 |
| `score_delta` | text ‹required› | `+22` | P19 (target − current) |
| `profile_stats` | object ‹optional› | `{posts: 128, followers: "1,940", following: 312}` | P7 mock |
| `profile_bio` | text ‹optional› | `We make Hamilton businesses impossible to scroll past…` | P7 mock |

---

## 2 · The five pillars  → P5 radar, P6–P10 deep-dives, P3 ladder

A list of **exactly 5** pillars, in this order. Order drives the radar, the ladder,
and the deep-dive page sequence.

```yaml
pillars:
  - key: local_visibility      # fixed keys — do not rename
    name: Local visibility
    score: 0
    status: Fix first          # short chip: Fix first | Needs work | Developing | Closest to par
    one_liner: The single lowest score in the audit — and the highest-leverage fix.
    what_measured: Geotags, local hashtags, a location + service area in the bio…
    why_matters: Most local discovery happens through location pages and hashtag surfaces…
    what_next: Add your city to the bio, geotag every post, build 3 local hashtag sets…
    metrics:                   # 3–4 small stat cards on the deep-dive page
      - { label: Geotagged posts, value: "0%",  target: "100%" }
      - { label: Local hashtag sets, value: "0", target: "3 sets" }
      - { label: City in bio, value: "No", target: "Yes" }
  - key: profile_conversion
    name: Profile conversion
    score: 55
    status: Needs work
    # …same shape…
  - key: content_performance
    name: Content performance
    score: 50
    status: Needs work
  - key: sales_readiness
    name: Sales readiness
    score: 56
    status: Needs work
  - key: competitor_gap
    name: Competitor gap
    score: 70
    status: Closest to par
```

- **Radar (P5)** plots the 5 `score`s. **Ladder (P3)** plots pillars 1–4 + `target_score`.
- **Deep-dives (P6–P10)** each render `name`, `score`, `status`, `one_liner`,
  `what_measured`, `why_matters`, `what_next`, and `metrics`.

---

## 3 · The 5-stage chain  → P4

A list of **exactly 5** stages (the user-journey version of the pillars).

```yaml
chain:
  - { n: 1, name: Get found,          question: Can the right local people discover you?, score: 6,  status: Critical,   bottleneck: true }
  - { n: 2, name: Make sense fast,     question: In 3 seconds, do they get who you help?,  score: 55, status: Needs work }
  - { n: 3, name: Be worth following,  question: Does it earn the save and the share?,     score: 50, status: Needs work }
  - { n: 4, name: Stand out,           question: Are you distinct from the feed beside you?, score: 62, status: Developing }
  - { n: 5, name: Drive action,        question: Is there a clear next step to a chat?,     score: 56, status: Needs work }
chain_note: >
  Stage 01 — Get found — is the bottleneck. Fix discovery first and you raise the
  ceiling on every stage downstream.   # the amber "Why this matters" callout on P4
```

`bottleneck: true` flags the red card. Exactly one stage should set it.

---

## 4 · Competitors & data gaps  → P10, P11, P12

```yaml
benchmark_count: 5            # shown as "Benchmarked against N regional accounts"

competitors:                  # P11 — render 5 cards (use as many as provided)
  - handle: "@awanidigitals"
    type: Regional digital agency · educator
    metric: 5 posts / wk        # the brand pill: strongest metric
    does_well: Tight “swipe to learn” carousels with a strong promise on slide one.
    borrow: The 5-slide carousel skeleton — problem → 3 tips → CTA.
  - handle: "@vitamindmarketing"
    type: Founder-led studio · brand-consistent
    metric: 4 posts / wk
    does_well: Recognisable brand system + founder face-to-camera reels.
    borrow: Founder reels + single-offer bio.
  # …3 more competitors, same shape…

# P10 figure — posts/week standings (top performer, average, you) + target line
cadence_standings:
  top_performer: { label: "Top performer · @awanidigitals", value: 5.0 }
  average:       { label: "Five-account average", value: 4.4 }
  you:           { label: "You · @northsidestudio", value: 1.2 }
  target_line:   4.0          # the blue target marker

# P12 table — one row per metric. Keep `you`, `target`; comps are the 2 strongest.
data_gaps:
  benchmark_label: Benchmarked against 5 regional accounts · table shows the two strongest
  columns: ["@awanidigitals", "@vitamindmarketing"]   # column headers after "You"
  rows:
    - { metric: Posts / week,    you: "1.2", comps: ["5.0","4.0"], target: "4.0" }
    - { metric: Caption length,  you: "~40 w", comps: ["~120 w","~90 w"], target: "80–120 w" }
    - { metric: Reels share,     you: "10%", comps: ["45%","50%"], target: "40%" }
    - { metric: Carousels,       you: "5%",  comps: ["40%","30%"], target: "35%" }
    - { metric: Geotagged posts, you: "0%",  comps: ["90%","70%"], target: "100%" }
    - { metric: Avg saves / post,you: "3",   comps: ["60","40"],  target: "30+" }
  gap_cards:                   # 3 visual gap cards (value vs target bar)
    - { title: The volume gap, value: "4×", unit: less often,        fill: 24, target: 80 }
    - { title: The format gap, value: "15%", unit: reels + carousels, fill: 19, target: 94 }
    - { title: The local gap,  value: "0%", unit: geotagged,         fill: 2,  target: 100 }
  quick_win: The geotag line is the easiest to close — it's a setting, not a skill.
```

`fill`/`target` are bar percentages (0–100) for the mini gap bars.

---

## 5 · The 7-day plan  → P13 (Days 1–4) + P14 (Days 5–7)

```yaml
seven_day_plan:
  - { day: 1, minutes: 20, title: Fix the profile signals,        desc: Add your city, rewrite the bio, set location + service area. }
  - { day: 2, minutes: 25, title: Highlights & link,              desc: Three highlight covers + one clear CTA link. }
  - { day: 3, minutes: 30, title: Build the hashtag systems,      desc: Three saved localized sets, ready to paste. }
  - { day: 4, minutes: 30, title: Publish the pinned conversion posts, desc: Post & pin three — Who we help · Proof · The offer. }
  - { day: 5, minutes: 25, title: Record your first reel,         desc: Founder face-to-camera, hook in 3 words, geotagged.,        output: First geotagged founder reel }
  - { day: 6, minutes: 20, title: Build one carousel,             desc: The 5-slide skeleton on a topic clients always ask about.,  output: First educational carousel }
  - { day: 7, minutes: 15, title: Engagement sprint & review,     desc: Comment on 10 local accounts, reply to all, review the week., output: Week reviewed + next 3 posts planned }
week1_done_checklist:          # P14 celebratory checklist (6 items)
  - City + value-prop bio, location set
  - 3 highlights + single CTA link live
  - 3 localized hashtag sets saved
  - 3 pinned conversion posts
  - First geotagged founder reel
  - First educational carousel
week1_score_move: { from: 46, to: 53 }   # P14 "foundation complete" mini-stat
```

Days 1–4 render on P13, Days 5–7 on P14. `output` only used for Days 5–7.

---

## 6 · Calendar, cadence & rhythm  → P17, P18

```yaml
calendar:                      # P17 — 4 weeks × 3 posts. format ∈ Carousel|Reel|Static
  - week: 1
    theme: Foundation
    posts:
      - { format: Carousel, title: Who we help (pinned), note: The 3 businesses we make unmissable. }
      - { format: Reel,     title: Founder intro,        note: "Face to camera: why this studio exists." }
      - { format: Static,   title: Local proof,          note: A Hamilton client result, geotagged. }
  - week: 2
    theme: Authority
    posts: [ … 3 posts … ]
  - week: 3
    theme: Proof
    posts: [ … 3 posts … ]
  - week: 4
    theme: Convert
    posts: [ … 3 posts … ]

cadence_slots:                 # P18 — 3 weekly slots
  - { day: Mon, purpose: Educate,         format: Carousel,       window: "11:00–13:00", watch: Saves,            example: "“3 fixes most [niche] miss”" }
  - { day: Wed, purpose: Connect,         format: Reel,           window: "17:00–19:00", watch: Follows · visits, example: Founder face-to-camera tip }
  - { day: Fri, purpose: Prove / Convert, format: Static or reel, window: "12:00–14:00", watch: DMs · link clicks, example: A client win, or the offer }

four_week_arc:                 # P18 list
  - { n: 1, name: Foundation, desc: Tell people who you help and prove you're real and local. }
  - { n: 2, name: Authority,  desc: Teach. Every post leaves them smarter. }
  - { n: 3, name: Proof,      desc: Show results — case studies and testimonials. }
  - { n: 4, name: Convert,    desc: Make the ask — clear offer + local urgency. }

weekly_workflow:               # P18 5-step strip
  - { step: Sun,    label: Choose topics }
  - { step: Mon,    label: Publish carousel }
  - { step: Wed,    label: Publish reel }
  - { step: Fri,    label: Proof / offer }
  - { step: Weekly, label: Check saves · DMs · visits }
```

---

## 7 · Copy-and-use toolkit  → P15, P16

```yaml
hook_starters:                 # P15 — 5 fill-in-the-blank hooks. [brackets] stay literal.
  - "If you run a [business type] in [city], stop doing [common mistake]."
  - "3 reasons [local audience] aren't booking with you yet."
  - "The [city] [niche] playbook nobody hands you."
  - "We took a [client type] in [neighbourhood] from [before] to [after]."
  - "Save this if you [target action] in [city]."

caption_frameworks:            # P15 — 3 cards
  - { name: PAS,         body: Problem → Agitate → Solve → CTA. }
  - { name: Local proof, body: "Hook → mini case study → “we're [n] min from [landmark]” → CTA." }
  - { name: The list,    body: Hook → 3 numbered tips → “which are you trying?” → CTA. }

cta_ladder:                    # P16 — 4 escalating-intent CTA lines
  - { stage: Awareness,     line: "“Follow for [city] [niche] tips every week.”" }
  - { stage: Consideration, line: "“Save this for when you're ready to [outcome].”" }
  - { stage: Decision,      line: "“DM AUDIT for a free 15-min look at your account.”" }
  - { stage: Local urgency, line: "“Booking [month] for [city] businesses — link in bio.”" }

hashtag_sets:                  # P16 — 3 copy-ready blocks (~12 tags each)
  - { name: SET A · LOCAL,     tags: "#HamOnt #HamiltonOntario #BurlingtonON #905 …" }
  - { name: SET B · NICHE,     tags: "#SocialMediaMarketing #ContentStrategy …" }
  - { name: SET C · COMMUNITY, tags: "#ShopLocalHamilton #SupportLocal905 …" }
hashtag_how_to: Mix ~10–15 tags per post — a few from each set. Rotate them; always include 3+ local tags.
```

---

## 8 · Offer & contact  → P20

```yaml
offer_paths:                   # exactly 3; middle is highlighted "Most popular"
  - { name: Do it yourself, desc: Follow the 7-day plan and the calendar. }
  - { name: Done with you,  desc: We build the systems, you make the content. Weekly 30-min session., popular: true }
  - { name: Done for you,   desc: We run the full 30 days end to end. }

contact:
  name: Steffen deGraaf · BotLogix
  site: botlogix.ca · Burlington, Ontario
```

---

## Checklist for your Claude Code project

- [ ] Emit a single `.md` with YAML frontmatter using the **exact keys** above.
- [ ] `pillars`, `chain` → exactly 5 each. `competitors` → up to 5. `cadence_slots` → 3.
      `offer_paths` → 3. `calendar` → 4 weeks × 3 posts.
- [ ] Scores 0–100 ints; percentages as ints; `[brackets]` left literal in toolkit copy.
- [ ] `score_delta` = `target_score − current_score` (prefix `+`).
- [ ] Bar fields (`fill`, `target`, `target_line`, gap-card `fill`/`target`) are 0–100.
- [ ] Dates as display strings (`June 27, 2026`).

Hand the resulting `.md` back here (or to the filler script) and the 20 pages populate automatically.
