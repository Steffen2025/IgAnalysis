# BotLogix IG Analysis / Social Intelligence System

> Source of truth for this project. MEMORY.md only summarizes it.

## Current State

- **Engine + dashboard**: Instagram audit engine (TypeScript ESM, Postgres/
  Drizzle, Apify scraping, LLM report sections, Marp decks) with a private
  Fastify admin dashboard that can create, run, track, open, email, and delete
  audits. MVP runs locally.
- Full dashboard-run audit verified (create → run → COMPLETE) on a test audit;
  delete-audit cleanup verified (DB rows + artifacts removed).
- Post-restart regenerate on audit `#24` passed (no duplicate headings, no
  duplicate PDF cards, Day 5/6/7 present in Marp dark deck). Recent audits:
  `#26` (botlogix), `#27` (@boxbuddyapp).
- **Next**: re-verify tuned report outputs after restart, then resume SMTP
  delivery. Begin the 5-accounts-per-business-unit, 30-day tracking pass.

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

## Open Loops

- [ ] Select the 5 Instagram accounts per business unit to track.
- [ ] Re-verify tuned report outputs after restart (headings, day blocks, artifact dedupe).
- [ ] Configure SMTP credentials for real beta-tester delivery.
- [ ] Resolve Docker Desktop engine instability (`dockerDesktopLinuxEngine` API 500).
- [ ] Premium modules: Local Market Map, Opportunity Scoreboard, Content Pattern Bank, Local Lead Playbook, 30-Day Delta System.

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

## Notes

- Local admin URLs used: `:5057`, `:5058` (fallback), `:5059` (Postgres). Local Postgres on `127.0.0.1:55432`.
- Fallback admin password and secrets live in `.env` — never print or commit them. Set `ADMIN_PASSWORD`/`SESSION_SECRET` before deployment.
- VPS/subdomain deployment waits until the local workflow is useful.

## Last Updated

2026-05-29 — Rewrote to the standard project structure; merged dashboard build
history with the IG Analysis / Social Intelligence framing. Prior version backed
up under `.claude/backups/context-cleanup-20260529-2015/`.
