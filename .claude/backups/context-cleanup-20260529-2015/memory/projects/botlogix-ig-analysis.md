# Project: BotLogix IG Analysis Dashboard

> Source of truth for the private Instagram audit dashboard and report-intelligence product.

---

## Goal

Build an internal BotLogix dashboard that can create Instagram audits, run them in the background, track status, open generated reports, email reports to beta testers, and later support premium local-growth intelligence modules.

[Add or refine the exact success definition]

---

## Status

In Progress

The dashboard MVP is live locally, with full run, cleanup, and post-restart report regenerate verification completed; next focus is SMTP delivery when you are ready.

## Current State

- Full dashboard-run audit verification completed (create -> run -> complete) on a low-risk test audit.
- Delete-audit cleanup verification completed (DB rows and audit-specific artifacts removed).
- Post-restart regenerate on audit `#24` passed: no duplicate section headings, no duplicate PDF cards in admin detail, Day 5/6/7 present in Marp dark deck.
- Extra fix shipped during verification: seven-day parser no longer treats inline text like `from Day 2.` as a day header (was dropping Day 7 via `slice(0, 7)`).

## Contacts

- None added today.

---

## Key Decisions

- [2026-05-25] Build as a private internal dashboard first, not a public SaaS.
- [2026-05-25] Use Fastify/server-rendered admin pages on top of the TypeScript audit engine.
- [2026-05-25] Migrate the dashboard/audit engine from SQLite to Postgres before adding more beta-product intelligence.
- [2026-05-25] Keep background audit jobs at concurrency 1 for the private MVP.
- [2026-05-25] Disable secure admin cookies for local HTTP testing; turn them back on with `ADMIN_COOKIE_SECURE=true` for deployment.
- [2026-05-25] Add a report artifact registry so generated files are tracked instead of guessed.
- [2026-05-25] Treat ambiguous local markets with city plus service area/region, e.g. Burlington, ON.
- [2026-05-27] Use a lighter admin presentation for the new-audit flow and show human-friendly phase labels in the UI.
- [2026-05-27] Add delete-audit controls so temporary test runs can be cleared from the dashboard.
- [2026-05-28] Defer SMTP/email testing until report-output tuning is validated in a fresh post-restart run.
- [Decision made — date — reason]

## Decisions Log

- [2026-05-28] Prioritized report quality testing and generator tuning over SMTP delivery testing for this cycle.

---

## Tasks

- [x] Create Fastify admin shell with password login.
- [x] Add audit dashboard list, new audit form, audit detail page, protected report file routes, and email action.
- [x] Add `report_artifacts` and `report_deliveries` tables.
- [x] Persist `delivery_email` from the new audit form.
- [x] Add dedicated report routes for regenerate/email/status API.
- [x] Add Dockerfile, docker-compose scaffold, and deployment notes for later VPS/subdomain work.
- [x] Migrate the active dashboard/audit runtime from SQLite to Postgres.
- [x] Add one-time SQLite-to-Postgres data import script.
- [x] Add delete-audit controls in the dashboard for test-run cleanup.
- [x] Rework the new-audit UI to be lighter, cleaner, and more readable.
- [x] Verify one full dashboard-created audit from form submission to COMPLETE.
- [ ] Configure SMTP credentials for real beta-tester delivery.
- [x] Validate delete-audit cleanup path (row + artifact cleanup).
- [ ] Re-run live output verification after restart (no duplicate headings, no empty day block, no duplicate artifact cards).
- [ ] Add Local Market Map.
- [ ] Add Opportunity Scoreboard.
- [ ] Add Content Pattern Bank.
- [ ] Add Local Lead Playbook.
- [ ] Add 30-Day Delta System.
- [ ] [Next action — owner if not me]

---

## History

| Date | What Happened |
|------|---------------|
| 2026-05-25 | Rebuilt report deck toward portrait BotLogix-branded action guide and added dark/light Marp themes. |
| 2026-05-25 | Tightened Burlington local-market handling so current audit means Burlington, ON. |
| 2026-05-25 | Built first private admin dashboard MVP at `http://127.0.0.1:5057`. |
| 2026-05-25 | Continued phases 2-6: delivery email persistence, report routes, richer audit detail, status API, Docker/VPS scaffold. |
| 2026-05-25 | Migrated DB layer to Postgres, generated `drizzle-pg` migrations, imported existing SQLite data, and verified dashboard reads imported audits on `http://127.0.0.1:5059`. |
| 2026-05-25 | Fixed local admin session behavior, restarted Docker Desktop, and verified a live browser form submission created audit `#15` on `http://127.0.0.1:5057/audits/15?created=1`. |
| 2026-05-27 | Added dashboard delete-audit controls, softened the admin visual shell, improved the new-audit layout, and replaced technical phase text with human-friendly labels. |
| 2026-05-28 | Ran a full dashboard audit to COMPLETE (test `#25`), validated delete cleanup, executed report QA, and applied generator/rendering tuning patches before pausing for system restart. |
| [YYYY-MM-DD] | [Milestone, meeting, deliverable, or shift in direction] |

---

## Notes

- Current local admin URL: `http://127.0.0.1:5057`
- Refreshed verification server used `http://127.0.0.1:5058` because Docker Desktop was holding port `5057`.
- Postgres verification server used `http://127.0.0.1:5059`; local Postgres is exposed on `127.0.0.1:55432` because `5432` and `5433` were unavailable on this machine.
- Current fallback admin password: `botlogix`; set `ADMIN_PASSWORD` and `SESSION_SECRET` before VPS/subdomain deployment.
- VPS/subdomain deployment should wait until local dashboard workflow is useful.
- Docker engine became unstable late session (`dockerDesktopLinuxEngine` API 500), so final live verification will be completed first after restart.
- [Anything that doesn't fit above — context, constraints, links, references]
