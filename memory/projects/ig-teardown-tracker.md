# Project: Instagram Success Teardown + Cohort Tracking

> A new product line in the botlogix-ig-analysis repo: reverse-engineer high-performing
> Instagram accounts (one at a time) and track a small competitor cohort over 30 days to
> inform a real Instagram social-growth plan for BotLogix and BoxBuddy.
> Build-ready spec lives at `docs/teardown-and-tracking-plan.md`.

---

## Goal

Two capabilities on one shared spine:
- **Deep Teardown** — one IG URL -> last 100 content items -> cover-image (vision), caption,
  hashtag, reel-transcript (Deepgram), engagement, and comment-driver analysis -> success
  thesis + replication playbook. Output = structured `.md`.
- **Cohort Tracking** — 10 accounts (5 BotLogix + 5 BoxBuddy), daily append-only snapshot
  (our own growth curve, no Social Blade) + delta content capture, day-30 success meter.

Operating principle: **data integrity first, cost second.** ~3 teardowns/day max, never bulk.

---

## Status

**M1 + M3 built + validated live.** M1 = data spine + integrity (100/100 cooper.simson capture).
M3 = text intelligence: comment scraper, deterministic analyzers (metrics/caption/hashtag/
comment-drivers), 3 OpenRouter synthesis tasks, prompt registry, full `report.md` generator,
orchestrator wiring, and `teardown:analyze` CLI. Validated on teardown #1 — 295 comments, 3/3 LLM
calls OK, typecheck clean; report at `reports/teardown/cooper.simson-1-2026-05-30/report.md`.
**Next: M2** (cohort discovery + human-pick + daily snapshot/delta worker) — blocked on seed
keywords/region + research IG account. (M4 = Deepgram reel transcripts; M5 = cover-image vision +
success meter.)

Test target for teardown: `https://www.instagram.com/cooper.simson/`.
Run capture: `npm run teardown:run https://www.instagram.com/cooper.simson/ botlogix 100`.
Re-run analysis only: `npm run teardown:analyze <id|latest> [--no-comments]`.

---

## Key Decisions

- [2026-05-29] Build as a new `teardown` capability reusing ~70% of existing Apify/LLM/report spine.
- [2026-05-29] Honest data boundaries: saves/shares/reach are not public (estimates only);
  follower-growth history built from our own daily snapshots.
- [2026-05-30] **Skip Social Blade** — our daily Apify `details` snapshot is the sole system of
  record (higher integrity, cheaper, owns raw data). Social Blade only gives follower trendlines
  anyway, not post/reel/story/carousel data.
- [2026-05-30] **Capture live stories** during cohort tracking, best-effort, via an
  authenticated dedicated research account; flag lower-integrity. Historical stories are gone.
- [2026-05-30] **In-repo daily worker** for cohort snapshots (idempotent per UTC day).
- [2026-05-30] **Discovery + human-pick** chooses the 10 cohort accounts (no auto-bulk).
- [2026-05-30] Persistence = **dedicated tables** (Option B). Transcription = **Deepgram**.
  Output = **structured `.md`** (report design deferred). Depth = **100 content items**.

---

## Tasks

- [x] Map reusable infrastructure (Apify actors, normalizers, LLM, report, schema, admin).
- [x] Finalize build-ready spec (`docs/teardown-and-tracking-plan.md`).
- [x] M1 — dedicated schema + teardown orchestrator + 100-content pull + integrity report + JSON/CSV export. **Validated live on cooper.simson (100/100, 0 errors).**
- [ ] M2 — cohort discovery + human-pick + daily snapshot/delta worker.
- [x] M3 — text intelligence (caption/hashtag/engagement/comment-driver) + comment scraper + 3 LLM synthesis tasks + full `report.md` + `teardown:analyze` CLI. **Validated live on teardown #1 (295 comments, 3/3 LLM OK).**
- [ ] M4 — Deepgram reel transcription + reel-script teardown.
- [ ] M5 — cover-image vision + success thesis + replication playbook + day-30 success meter.

---

## Open Inputs Needed

- Seed niche keywords (and any region) per business unit for cohort discovery.
- Dedicated research IG account for story capture (`IG_SESSION_COOKIE`).
- Deepgram model preference (default Nova-class if unspecified).

---

## Notes

- New env: `DEEPGRAM_API_KEY`, `IG_SESSION_COOKIE`, `TEARDOWN_*` caps, `MAX_TEARDOWNS_PER_DAY=3`,
  `COHORT_SNAPSHOT_HOUR`.
- Only Apify actor needed: `apify/instagram-scraper` (profile/posts/comments/hashtag/stories)
  + existing `apify/google-search-scraper` for discovery.
- LLM = **OpenRouter** (`llmClient.runLlmTask` → `openRouterClient.ts`); Anthropic is report-only legacy.
  M3 adds teardown `LlmTask`s; M5 vision extends `openRouterClient.ts` for multimodal `image_url`
  parts + optional `OPENROUTER_MODEL_VISION`.
- Future: Metabase/Grafana can sit on the same Postgres for dashboards; `platform` column
  leaves room for YouTube later.

---

## History

| Date | What Happened |
|------|---------------|
| 2026-05-29 | Designed v1 single-profile teardown plan; mapped reusable repo infrastructure. |
| 2026-05-30 | Locked decisions (skip Social Blade, stories yes, in-repo worker, discovery); wrote build-ready spec + project memory. |
| 2026-05-30 | Built M1: dedicated teardown tables (`teardowns`, `teardown_content`, `reel_transcripts`, `cover_analyses`, `teardown_comments`, `teardown_artifacts`), phase machine, teardown-scoped Apify runner (`scrape_jobs.audit_id` now nullable + `teardown_id`), richer content normalizer (carousel children/cover/video URLs/engagement), orchestrator, Data Integrity Report, JSON/CSV export, CLI `npm run teardown:run`. Migration `0002_teardown_spine.sql`; typecheck clean. |
| 2026-05-30 | Validated M1 live: reconciled a partial DB state (made `0002` idempotent — IF NOT EXISTS + guarded FK DO-blocks), applied migration, ran `cooper.simson` → 100/100 (85 reels/15 carousels), 0 errors, clean integrity report. Corrected spec: LLM/vision route through OpenRouter, not Anthropic. |
| 2026-05-30 | Built + validated M3 (text intelligence): added 3 teardown `LlmTask`s; deterministic analyzers `metrics.ts`/`captionAnalysis.ts`/`hashtagTeardown.ts`/`commentDrivers.ts`; comment scraper `teardownComments.ts` (idempotent/cached/budget-gated, `TEARDOWN_MAX_RUNS`→24); prompt registry `teardownPrompts.ts`; `analysisRunner.ts` + `markdownReport.ts` (full §11 report); orchestrator runs analysis at DATA_EXPORTED (gated by `TEARDOWN_RUN_ANALYSIS`); CLI `teardown:analyze`. Live on teardown #1: 295 comments, 3/3 LLM OK, typecheck clean. Polish TODO: round float ratios in comment-driver LLM payload; `likes=-1` hidden-likes sentinel on one carousel. |
