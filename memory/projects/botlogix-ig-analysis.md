# BotLogix IG Analysis / Social Intelligence System

> Source of truth for this project. MEMORY.md only summarizes it.

## Current State

- **Engine + dashboard**: Instagram audit engine (TypeScript ESM, Postgres/
  Drizzle, Apify scraping, LLM report sections, Marp decks) with a private
  Fastify admin dashboard that can create, run, track, open, email, and delete
  audits. MVP runs locally.
- **Intelligence pipeline (Gold Master)** — the primary deliverable path. Lives
  in `src/services/instagram-intelligence/`. Profile-first (handle in → city +
  type derived from the scraped profile). Run via
  `npx tsx src/scripts/intelligence.ts generate --auditId=<id> [--live]` or
  `analyze --handle=<h> [--live]`. `--live` runs the 4-lane competitor discovery
  (paid Apify) first; without it, builds from existing DB rows (no cost).
- **Competitor discovery is rebuilt and rock-solid** (was finding only 1 in thin
  niches). Four engagement-driven lanes on the existing `apify/instagram-scraper`
  (NO new actor needed): (1) hashtag TOP-posts, (2) Instagram-native user search,
  (3) Google `site:instagram.com`, (4) `relatedProfiles` expansion. Pools ~40–60
  candidates, then a SOFT band + engagement-success gate classifies them into
  reference models (in-band) vs local peers (below-band); above-band giants are
  rejected. English-only gate at discovery AND render (drops CJK/non-Latin
  accounts). Report selection trusts these vetted rows (no re-gating drift).
  Validated live across service (garage doors), professional (mortgage), app
  (BoxBuddy) — 6–8 real same-category accounts each.
- **Client deliverable = "Instagram Growth Intelligence Report"**, a 20-section
  premium field guide (NOT an audit dump): teaches every number (what it means /
  good or bad / why / what to do / how to know it improved), growth-diagnosis
  funnel, profile blueprint, full Days 1–30 roadmap, 30-day content calendar,
  copy-and-use toolkit. Renderer: `deliverableMarkdown.ts` → `report.md`;
  `deliverableHtml.ts` → branded self-contained `report.html`; `htmlToPdf.ts` →
  `report.pdf` (headless Edge/Chrome, no new dep). `gold-master.md` remains the
  technical/QA view. Blueprint: `docs/report-blueprint.md`.
- **Tests**: `npm test` = typecheck + `src/scripts/intelligenceTests.ts`
  (28 no-DB fixture tests covering category, CTA, relevance, trusted-passthrough,
  hashtag gen, confidence, deliverable + HTML renderers).
- **Git**: pushed to remote `origin` = https://github.com/Steffen2025/IgAnalysis
  (branch `master`).
- Recent audits: `#26` (botlogix), `#22` (activedoor), `#18` (jelinekmortgages),
  `#27` (@boxbuddyapp).
- **Next**: design-system polish on the deliverable (light-gray cards, softer
  dividers); drop in the exact BotLogix wordmark PNG (cover auto-embeds whatever
  is at repo-root `BotLogix Logo.png`); then resume SMTP delivery + the
  5-accounts-per-business-unit 30-day tracking pass.

## Purpose

Analyze selected Instagram accounts, track competitor activity, collect posts/
reels/stories/carousel data, and generate structured markdown insights that
help BotLogix, BoxBuddy, and AEC Benefits improve content strategy.

## Business Units

- BotLogix
- BoxBuddy
- AEC Benefits

## Current Operating Principle

Start small. Analyze 5 accounts per business unit first. Track for 30 days. Use
practical markdown reports first. Do not invest time in designed PDF reports
until the data and workflow are proven.

## Current Scope

- Instagram profile analysis
- Posts
- Reels
- Stories when available
- Carousels
- Competitor tracking
- Social Blade or similar high-level profile tracking where useful
- 30-day success meter
- Markdown report output first
- Designed report output later

## Data Rules

Separate raw data from recommendations. Preserve source links where available.
Do not mix assumptions with confirmed data. Mark uncertain findings as
`[TO CONFIRM]`.

## Output Rules

Default output is structured markdown. Reports should be useful before they are
pretty. Designed reports come later.

## Decisions Log

- [2026-05-25] Build as a private internal dashboard first, not a public SaaS.
- [2026-05-25] Use Fastify/server-rendered admin pages on top of the TypeScript audit engine.
- [2026-05-25] Migrate the dashboard/audit engine from SQLite to Postgres before adding more intelligence modules.
- [2026-05-25] Keep background audit jobs at concurrency 1 for the private MVP.
- [2026-05-25] Disable secure admin cookies for local HTTP testing; re-enable with `ADMIN_COOKIE_SECURE=true` for deployment.
- [2026-05-25] Add a report artifact registry so generated files are tracked, not guessed.
- [2026-05-25] Treat ambiguous local markets with city + service area/region, e.g. Burlington, ON.
- [2026-05-27] Lighter admin presentation + human-friendly phase labels for the new-audit flow.
- [2026-05-27] Add delete-audit controls so temporary test runs can be cleared from the dashboard.
- [2026-05-28] Defer SMTP/email testing until report-output tuning is validated post-restart.
- [2026-05-29] Reframe the project around IG Analysis / Social Intelligence: 5 accounts per business unit, 30-day tracking, markdown-first; the dashboard is the engine that produces these analyses.
- [2026-05-30] Move LLM provider to OpenRouter direct (no MCP); default `openai/gpt-5.4-nano`, escalate `openai/gpt-5.4-mini`. Keys in gitignored `.env` only.
- [2026-05-31] Competitor discovery is engagement-driven, not SEO-driven. Discover by hashtag TOP posts / IG user search / relatedProfiles (owners of top posts are successful by construction); pool wide, then gate. NO new Apify actor — the existing `apify/instagram-scraper` covers all modes.
- [2026-05-31] Follower band is a SOFT sanity bound, not a hard floor: in-band → reference model, below-band-but-relevant → local peer, above-band → reject. successScore (engagement) is the primary ranker.
- [2026-05-31] English-only competitor data: reject predominantly non-Latin (CJK/Cyrillic/Arabic) accounts at both discovery and render — a client must be able to read and adapt what they study.
- [2026-05-31] Report selection TRUSTS live-discovery rows (sources `reference_search`/`hashtag_discovery`) instead of re-deriving relevance; this keeps the report in lockstep with discovery and excludes stale legacy rows.
- [2026-05-31] The client deliverable is a teaching field guide, not an audit dump. Every number answers: what it means / good or bad / why / what to do / how to know it improved. No sales pitch — trust sells BotLogix.
- [2026-05-31] Live discovery + designed deliverable are now built (supersedes the earlier "markdown-first, defer designed reports" stance for the intelligence path). The intelligence engine `src/` is under active development (Hard Rule 7 relaxed for this subsystem with standing approval).

## Open Loops

- [ ] Deliverable design-system polish: light-gray cards around the 4-card summary + recipe cards, softer section dividers (currently tables/headings).
- [ ] Drop the exact BotLogix wordmark at repo-root `BotLogix Logo.png` (cover auto-embeds it as base64; I could not save the chat-attached image bytes to disk).
- [ ] Optional content refinement: pull each competitor's actual top format/hook into the "borrow" line (currently generic).
- [ ] **VPS deploy**: push the validated `botlogix-ig-analysis-dashboard:latest` image; needs server + DNS (`audit.botlogix.ca`) + running Traefik. `docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d`.
- [ ] Select the 5 Instagram accounts per business unit to track.
- [ ] Configure SMTP credentials for real beta-tester delivery.
- [ ] Docker Desktop Linux engine drops under load (recurring) — restart Docker Desktop to recover. Local: Postgres on host port 15432 (55432 is Windows-reserved); dashboard on a free port (5057 taken by `botlogix-social-studio`).
- [ ] Premium modules: Local Market Map, Opportunity Scoreboard, Content Pattern Bank, Local Lead Playbook, 30-Day Delta System.
- [x] ✓ Dashboard input wired to the pipeline (Blueprint is the output); new-audit form trimmed; containerized deploy dry-run passed (image builds, in-container chromium renders PDFs) (2026-06-02).
- [x] ✓ Designed 20-page Blueprint wired in: template pack vendored at `templates/blueprint/`; `blueprintData.ts` maps GoldMaster → `auto/data.js` + self-contained `reports/intelligence/<id>/blueprint/`; charts computed from scores; 5 fixture tests; verified on audit 27 (2026-06-02).
- [x] ✓ Competitor discovery rebuilt (4 lanes) + report alignment + data-quality confidence (2026-05-31).
- [x] ✓ Client deliverable rebuilt as a 20-section field guide (md + branded html + pdf) (2026-05-31).
- [x] ✓ English-only competitor filter; above-band outlier fix (2026-05-31).

## Reference Files

Read only when the task requires them:

- `.claude/references/instagram-analysis-output-template.md`
- `.claude/references/competitor-tracking-reference.md`
- `.claude/references/report-format-reference.md`
- `.claude/references/carousel-review-reference.md`
- `.claude/references/thirty-day-success-meter-reference.md`
- `.claude/references/botlogix-brand-voice-reference.md`
- `.claude/references/boxbuddy-brand-voice-reference.md`
- `.claude/references/aec-benefits-brand-voice-reference.md`

## History

| Date | What Happened |
|------|---------------|
| 2026-05-25 | Rebuilt report deck toward portrait BotLogix-branded action guide; added dark/light Marp themes. |
| 2026-05-25 | Tightened Burlington local-market handling (Burlington, ON). |
| 2026-05-25 | Built first private admin dashboard MVP at `http://127.0.0.1:5057`. |
| 2026-05-25 | Phases 2–6: delivery-email persistence, report routes, richer audit detail, status API, Docker/VPS scaffold. |
| 2026-05-25 | Migrated DB to Postgres, generated `drizzle-pg` migrations, imported SQLite data, verified on `:5059`. |
| 2026-05-27 | Added delete-audit controls, softened admin shell, improved new-audit layout, human-friendly phase labels. |
| 2026-05-28 | Ran full dashboard audit to COMPLETE (test `#25`), validated delete cleanup, ran report QA + generator tuning. |
| 2026-05-29 | Context-system cleanup pass; reframed project around IG Analysis / Social Intelligence. |
| 2026-05-30 | Built the Gold Master intelligence pipeline; moved LLM to OpenRouter direct; fail-closed validation; profile-first input. |
| 2026-05-31 | Rebuilt competitor discovery (4 engagement lanes, soft band, success ranking); aligned report selection to trusted discovery rows; data-quality confidence; productionized via `--live`; English-only filter + above-band outlier fix; rebuilt the client deliverable as a 20-section field guide (md + branded HTML + PDF); pushed to GitHub `Steffen2025/IgAnalysis`. |
| 2026-06-02 | Wired the Claude-Design 20-page Blueprint into the engine (`templates/blueprint/` + `blueprintData.ts`); wired the admin "Launch Audit"/"Regenerate" job to run `generateGoldMaster` (Blueprint becomes the dashboard output; legacy Marp decks removed); trimmed the new-audit form. Deploy prep: fixed Dockerfile blocker (`tsx`→deps so the slim prod image can run), `htmlToPdf` honors `CHROME_PATH`, rewrote `DEPLOYMENT.md`, added `docker-compose.traefik.yml` (validated). Local container dry-run PASSED after a Docker Desktop restart (engine v29.5.2): image builds (1.43 GB, Chromium 148), container boots healthy, login works, the dashboard job runs `generateGoldMaster` in-container, and in-container chromium renders the Blueprint/report PDFs (proven by delete→regenerate→recreated, served 200 application/pdf). Host port note: `botlogix-social-studio` holds 5057, so the dry-run used 5077 via a throwaway override; on the VPS use the committed compose + `docker-compose.traefik.yml`. Next: actual VPS deploy (needs server + DNS for audit.botlogix.ca + a running Traefik). |

## Notes

- **Dashboard now produces the Blueprint (2026-06-02):** the admin "Launch Audit" /
  "Regenerate" job (`auditRunner.ts`) runs `generateGoldMaster` after scrape→score→
  patterns→enrichment — producing the Gold Master, field-guide report, and 20-page
  Blueprint (legacy Marp decks removed). Audit-detail surfaces them as primary
  "Client deliverables"; email attaches the Blueprint PDF; delete cleans
  `reports/intelligence/<id>/`. New-audit form trimmed to the fields the pipeline
  uses (dropped follower_goal, business_outcome, reference_markets, mode select).
  Verified live: regenerated audit 27 via the dashboard → Blueprint PDF (2.8 MB) opens.
- **Local Postgres host port moved 55432 → 15432:** Windows reserved the 55392–55491
  range (WinNAT), so `55432` fails to bind ("socket access forbidden"). Bring DB up with
  `POSTGRES_PORT=15432 docker compose up -d --force-recreate postgres` (data volume
  `postgres_data` is preserved). Run the admin server with
  `DATABASE_URL=postgres://botlogix:botlogix@127.0.0.1:15432/botlogix`. To make
  `npm run admin` work without the inline env, add those two lines (`POSTGRES_PORT`,
  `DATABASE_URL`) to `.env`. Admin default password is `botlogix` (set `ADMIN_PASSWORD`).
- Local admin URLs used: `:5057`, `:5058` (fallback), `:5059` (Postgres). Local Postgres on `127.0.0.1:55432` (now 15432 — see above).
- Fallback admin password and secrets live in `.env` — never print or commit them. Set `ADMIN_PASSWORD`/`SESSION_SECRET` before deployment.
- VPS/subdomain deployment waits until the local workflow is useful.

## Last Updated

2026-06-02 — Wired the designed 20-page Blueprint into the engine and made it the
dashboard's output (input form trimmed; legacy Marp decks retired). Deploy prep:
Dockerfile blocker fixed, `htmlToPdf` honors `CHROME_PATH`, `DEPLOYMENT.md`
rewritten, `docker-compose.traefik.yml` added. Containerized deploy dry-run PASSED
(image builds with Chromium 148; in-container PDF render proven). Next: VPS push.

2026-05-31 — Logged the competitor-discovery rebuild (4 lanes, soft band,
trusted report alignment, English-only), the productionized `--live` flow, and
the 20-section client field-guide deliverable (md + branded HTML + PDF). Repo
now on GitHub (`Steffen2025/IgAnalysis`).
