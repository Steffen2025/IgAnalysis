# Instagram Success Teardown + Cohort Tracking — Build-Ready Spec

> Status: **PLAN ONLY — no app code until explicitly green-lit.**
> Owner: BotLogix. Purpose: reverse-engineer high-performing Instagram accounts and track a
> small competitor cohort over time to inform a real Instagram social-growth plan for the
> BotLogix and BoxBuddy business units.
> Operating principle: **data integrity first, cost second.** Single profile at a time
> (~3/day max). Never bulk.

---

## 1. Scope

Two related capabilities on one shared spine:

- **Capability A — Deep Profile Teardown** (on-demand, one URL at a time): pull the last
  **100 pieces of content** for a target account, analyze cover images (vision), captions,
  hashtags, reel transcripts (Deepgram), engagement, and comment drivers, then synthesize a
  **success thesis + replication playbook**. Output: one structured `.md` file.
  Test target: `https://www.instagram.com/cooper.simson/`.

- **Capability B — Cohort Tracking** (scheduled, 30-day longitudinal): track **10 accounts**
  (5 BotLogix-niche + 5 BoxBuddy-niche), captured **daily** via a lightweight append-only
  snapshot (our own growth curve, replacing Social Blade) plus **delta capture** of newly
  published content (posts/reels/carousels/stories). After 30 days, emit a **success-meter**
  `.md` report. The 10 accounts are chosen via a **discovery + human-pick** step.

Report design (HTML/Marp/dashboards) is explicitly **deferred**. Deliverable = structured
Markdown for now.

---

## 2. Confirmed decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Social Blade | **Skip entirely.** Build our own daily snapshot as sole system of record. |
| 2 | Live stories during cohort | **Yes** — best-effort daily capture (authenticated session required, flagged lower-integrity). |
| 3 | Cohort scheduler | **In-repo daily worker.** |
| 4 | The 10 accounts | **Discovery step** produces ranked candidates; human picks final 5 per BU. |
| 5 | Persistence | **Dedicated tables** (separate from existing audit tables). |
| 6 | Transcription | **Deepgram** (`DEEPGRAM_API_KEY`). |
| 7 | Output | **Structured `.md` file** per run. |
| 8 | Depth | **Last 100 content items** per profile. |
| 9 | Throughput | **~3 teardowns/day**, single-worker queue. |

---

## 3. Data availability (honesty layer)

| Data | Status | Source / approach |
|------|--------|-------------------|
| Posts / Reels | OK | `apify/instagram-scraper` (`resultsType: posts`) |
| Carousels | OK | Sidecar children; store slide count + per-slide media; slide 1 = cover |
| Stories (live, during cohort) | Best-effort | Daily authenticated scrape within 24h; flagged lower-integrity |
| Stories (historical) | Not available | Gone after 24h; only **Highlights** recoverable |
| Highlights | OK | Profile normalizer already captures `highlight_titles`; media scrapable |
| Likes / Comments / Views | OK | `likesCount` / `commentsCount` / `videoViewCount` |
| Follower-growth history | Built by us | Daily append-only `account_snapshots` time series |
| Saves / Shares / Reach | Not public | Owner-only; report uses labeled estimates only, never invented numbers |

Every run emits a **Data Integrity Report** section: what was captured, what is missing, and
any `partial` flags with reasons. Incomplete pulls are never silently treated as complete.

---

## 4. Shared spine (reused from existing repo)

- Apify client + `apify/instagram-scraper` — `src/services/apify/`
- Normalizers (`instagramNormalizer.ts`) — extend for carousel children + stories
- TTL cache (`cacheService.ts`) + scrape-job budget (`apifyBudget.ts`)
- Comment scrape + deterministic analysis — `src/services/comments/`
- Hashtag mining + hygiene — `hashtagAnalysis.ts`, `hashtagHygiene.ts`
- LLM client + cache — **OpenRouter** is the active provider (`src/services/llm/llmClient.ts`
  `runLlmTask()` → `openRouterClient.ts`), with fast/smart escalation, caching, and a
  "never fabricate without a key" contract. (Legacy `llmService.ts`/Anthropic is report-only.)
  Add new `LlmTask` values for teardown analysis; extend the OpenRouter client for **vision**
  (multimodal `image_url` parts) in M5.
- Discovery patterns (`competitorDiscovery.ts`, `competitorProfileGate.ts`) — reused for cohort discovery
- Admin job queue / single worker (`auditRunner.ts` pattern)

**Net new:** Deepgram transcription, dedicated schema, MD generators, daily cohort worker,
delta-scrape logic, cover-image vision module, success-thesis synthesizer, cohort discovery + pick flow.

---

## 5. Data integrity > cost — enforcement

**Integrity (priority 1)**
- Append-only time series; snapshots never overwritten; everything timestamped.
- Always persist `raw_json` next to normalized fields.
- Idempotent upserts keyed by `shortcode` / `(account, utc_day)`.
- Explicit `partial`/`failed` flags with reasons; no silent completion.
- Per-field validation on normalize; flag malformed records rather than ingest.

**Cost (priority 2)**
- **Delta scraping**: daily cohort runs fetch cheap profile details + only new content since last seen.
- **Hard dedup**: cache by shortcode/content-hash; never re-scrape or re-transcribe.
- **Tiered Apify**: cheap `details` daily; expensive 100-post pull only on teardown / first backfill.
- **Transcription/vision caps**: top N reels (default 10), cover analyses capped; dedup by hash.
- **Budget gates**: reuse `apifyBudget.ts`; per-run + per-day caps; 3-teardowns/day throttle in code.
- **Idempotent daily tick**: one snapshot per account per UTC day; skip if already captured.

---

## 6. Dedicated schema (Option B)

New Drizzle tables (Postgres), separate from existing audit tables:

- `teardowns` — id, target_handle, target_url, status/phase, content_window (default 100),
  started_at, completed_at, partial_flags JSON, business_unit (nullable).
- `tracked_accounts` — id, handle, business_unit (`botlogix`|`boxbuddy`), niche_tag,
  added_at, active, source (`discovery`|`manual`).
- `account_snapshots` — **append-only**: id, account_id, captured_at, followers, following,
  post_count, raw_json. (The growth curve.)
- `content_items` — id, account_id (or teardown_id), shortcode (unique per account),
  content_type (`post`|`reel`|`carousel`|`story`), caption, hashtags JSON, mentions JSON,
  like_count, comment_count, play_count, posted_at, cover_url, child_count, child_media JSON,
  engagement_rate, is_story (bool), captured_at, integrity_flag, raw_json.
- `reel_transcripts` — id, content_item_id, transcript, hook_text, word_timings JSON,
  deepgram_model, transcribed_at.
- `cover_analyses` — id, content_item_id, on_image_text, layout, has_face, palette JSON,
  style_notes, vision_model, image_hash, analyzed_at.
- `content_comments` — id, content_item_id, commenter, comment_text, has_question, has_tag,
  emoji_count, raw_json. (Or reuse existing `comments` shape.)
- `md_artifacts` — id, teardown_id/cohort_run_id, kind, file_path, generated_at.

Add `platform` column on growth/content tables now (default `instagram`) so YouTube can be
added later without re-architecting.

---

## 7. Capability A — Deep Teardown pipeline

Phases (resumable via status, mirrors existing state-machine pattern):

```
CREATED
 -> TARGET_PROFILE      profile details (cheap)
 -> TARGET_CONTENT      last 100 items (posts/reels/carousels) in one pull
 -> HIGHLIGHTS          highlight titles + (optional) highlight media
 -> MEDIA_SELECTED      pick top reels (transcribe) + top covers (vision) + top posts (comments)
 -> COVER_VISION_DONE   OpenRouter vision model on selected cover frames
 -> TRANSCRIPTS_DONE    Deepgram on selected reels
 -> COMMENTS_DONE       scrape + analyze top posts
 -> HASHTAGS_DONE       tag teardown
 -> METRICS_DONE        engagement trend, cadence, format mix, outliers
 -> THESIS_DONE         success synthesis + replication playbook (LLM)
 -> MD_GENERATED        write structured .md + JSON/CSV export
 -> COMPLETE
```

Selection caps (cost): top 10 reels for transcription, ~15 covers for vision, top 12 posts
for comments — all configurable.

---

## 8. Capability B — Cohort Tracking

### 8.1 Discovery + human-pick (one-time per BU, re-runnable)

1. Per business unit, take seed inputs:
   - **BotLogix**: niche keywords (e.g., "AI for small business", "business automation tips",
     creator-style accounts like the test target), optional region.
   - **BoxBuddy**: niche keywords (e.g., "home organization", "moving tips", "decluttering",
     "label maker / storage").
2. Run discovery (reuse `competitorDiscovery.ts`): Google search scraper (`site:instagram.com`
   + niche queries) + IG hashtag/place search → candidate handles.
3. Apply a profile gate (reuse `competitorProfileGate.ts`): min followers, min posts,
   business/creator relevance, dedup.
4. Emit `reports/cohort/<bu>-candidates.md`: ranked candidates with handle, followers,
   category, why-relevant, and a recommended top 5.
5. **Human picks** the final 5 per BU; confirmed handles inserted into `tracked_accounts`.
   (Human-in-the-loop by design — no auto-bulk.)

Cost: a few capped Google + hashtag runs per BU.

### 8.2 Daily worker (in-repo)

- A long-running in-repo worker (`tsx src/workers/cohortWorker.ts`) with an internal daily
  tick at `COHORT_SNAPSHOT_HOUR`, plus a manual `cohort:tick` script for on-demand runs.
- Each tick, for each active tracked account (idempotent per UTC day):
  1. **Snapshot** — `details` scrape → append `account_snapshots` (followers/following/posts).
  2. **Delta content** — small `posts` pull; upsert only items newer than last seen shortcode.
  3. **Stories** — best-effort authenticated story scrape (see 8.3); store immediately,
     flag lower-integrity.
- Catches up missed days (idempotency prevents duplicate same-day snapshots).
- All runs go through the existing single-worker queue + Apify budget gate.

### 8.3 Story capture (authenticated)

- Story scraping needs an authenticated Instagram session. Use a **dedicated research
  account** (never a personal/business-critical login) supplied to the Apify actor via
  session cookie/login env (`IG_SESSION_COOKIE` or actor login fields).
- Reliability varies; capture within the 24h window; download cover/frames immediately
  (URLs expire). Mark all story rows `integrity_flag = best_effort`.
- If auth/session fails, the day's story pass is flagged `partial`, snapshots + posts still proceed.

### 8.4 Day-30 success meter

- Emit `reports/cohort/<bu>-day30.md`: per-account follower delta + growth rate, engagement
  velocity, posting cadence, **format mix vs growth correlation** (which content types tracked
  with gains), top-performing content, and a ranked "who's winning and why" summary.

---

## 9. Deepgram transcription design

- For each selected reel: read `videoUrl` from `raw_json`, download mp4 to temp immediately
  (signed/expiring URL), send buffer to Deepgram pre-recorded API (extracts audio from video),
  capture transcript + word timings, persist to `reel_transcripts`, delete temp file.
- Extract the **spoken hook (first ~3s)** separately — highest signal for reel reverse-engineering.
- Dedup by shortcode; never re-transcribe. Cap per teardown (default 10).

---

## 10. Cover-image vision design

- Extend `openRouterClient.ts` to accept multimodal message content (text + `image_url`
  parts) and add a `teardown_cover_vision` task to `llmClient.ts`. Use a vision-capable
  OpenRouter model (set `OPENROUTER_MODEL_VISION`, fall back to `OPENROUTER_MODEL_SMART`).
- For selected covers (carousel slide 1 / reel cover): fetch image, base64, send with a
  structured prompt → on-image text, layout, face presence, palette, style, thumbnail-stop power.
- Cache by `image_hash`; cap count per run.

---

## 11. MD output spec

`reports/teardown/<handle>-<YYYY-MM-DD>.md`, stable diff-able sections:

```
# Teardown: @handle  (captured YYYY-MM-DD)
## 0. Data Integrity Report
## 1. Success Thesis
## 2. Account Snapshot
## 3. Momentum & Growth
## 4. Content Performance        (full 100-item table)
## 5. Visual System              (cover-image teardown)
## 6. Caption & Hook System
## 7. Reel Script System         (transcripts + hooks)
## 8. Hashtag System
## 9. What Drives Comments
## 10. Replication Playbook
## Appendix: raw export paths (JSON/CSV)
```

Cohort: `reports/cohort/<bu>-candidates.md` (discovery) and `reports/cohort/<bu>-day30.md`
(success meter).

---

## 12. Dependencies & env

New env:
```
DEEPGRAM_API_KEY=
IG_SESSION_COOKIE=                 # dedicated research account, for story capture only
TEARDOWN_POSTS_LIMIT=100
TEARDOWN_TOP_REELS_TO_TRANSCRIBE=10
TEARDOWN_TOP_COVERS_FOR_VISION=15
TEARDOWN_TOP_POSTS_FOR_COMMENTS=12
MAX_TEARDOWNS_PER_DAY=3
COHORT_SNAPSHOT_HOUR=6
```
Reused: `APIFY_TOKEN`, `ANTHROPIC_API_KEY` (now vision too), `DATABASE_URL`.
No Social Blade dependency.

New package: Deepgram SDK (or direct REST). No new dep for vision — reuse the OpenRouter
client (extended for multimodal content). Optional `OPENROUTER_MODEL_VISION` env var.

---

## 13. Future (not now)

- Postgres + dedicated tables = the open-source analytics foundation. Later, point
  **Metabase / Grafana** at the same DB for live growth dashboards — zero rebuild.
- YouTube via the `platform` column when posting begins there.

---

## 14. Build roadmap (each milestone runnable against the test target + cohorts)

- **M1 — Spine + integrity**: dedicated schema, teardown orchestrator, 100-content pull,
  JSON/CSV export, Data Integrity Report.
- **M2 — Cohort tracker**: discovery + human-pick, `tracked_accounts`, daily append-only
  snapshots + delta capture, in-repo worker (growth curve = our Social Blade).
- **M3 — Text intelligence**: caption + hashtag + engagement/momentum + comment-driver → first MD.
- **M4 — Audio (Deepgram)**: reel transcription + reel-script teardown.
- **M5 — Vision + synthesis**: cover-image analysis + success thesis + replication playbook +
  story capture + day-30 cohort success meter.

---

## 15. Open inputs needed before/at build start

- Seed niche keywords (and any region) per business unit for discovery.
- A dedicated research IG account for story capture (`IG_SESSION_COOKIE`).
- Confirm Deepgram model preference (e.g., Nova-class) — default chosen if unspecified.
