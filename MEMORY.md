# MEMORY.md — Current State Index

Last Updated: 2026-05-29

> Concise current-state index. State lives here; rules live in `AGENTS.md`;
> project detail lives in `memory/projects/`; long examples live in
> `.claude/references/`. Keep this file under ~300 lines.

---

## Current Focus

- Run this project lean: small always-loaded files, concise memory, short
  operational skills, heavy material in `.claude/references/` read on demand.
- BotLogix IG Analysis / Social Intelligence: analyze a small set of Instagram
  accounts per business unit and produce practical markdown insights first.
- Continue maturing the audit engine + private admin dashboard that generates
  these analyses (report-output QA/tuning, then SMTP delivery).

---

## Active Projects

| Project | Status | Next Action | Deadline |
|---------|--------|-------------|----------|
| BotLogix IG Analysis / Social Intelligence | In Progress | Build-ready spec done (`docs/teardown-and-tracking-plan.md`, project: `memory/projects/ig-teardown-tracker.md`); await go-ahead, then M1 (schema + teardown orchestrator + 100-content pull). Focus: BotLogix + BoxBuddy, 5 accounts each, 30-day tracking, markdown-first | TBD |
| IG Audit Admin Dashboard (engine) | In Progress | Re-verify tuned report outputs after restart, then resume SMTP/email validation | TBD |
| Premium Report Intelligence Modules | Planned | Add Local Market Map, Opportunity Scoreboard, Content Pattern Bank, Local Lead Playbook, 30-Day Delta System | TBD |

---

## Active Clients or Business Units

| Name | Relationship | Next Touchpoint | Notes |
|------|-------------|-----------------|-------|
| BotLogix | Internal / product owner | Report-quality tuning, then SMTP testing | Primary brand; audit reports serve first beta testers before public rollout |
| BoxBuddy | Internal business unit | Select 5 IG accounts to analyze | Moving & home-inventory app; recent audit #27 |
| AEC Benefits | Internal business unit | Select 5 IG accounts to analyze | Benefits/insurance; Burlington, ON local market |

---

## Decisions That Affect How I Work

- AGENTS.md and MEMORY.md are the master repo-local memory; new scaffolds merge in, never overwrite — 2026-05-25
- Start small: 5 accounts per business unit, track 30 days, markdown reports first; defer designed PDFs until data + workflow are proven — 2026-05-29
- Skills = instructions, References = storage, Memory = current state; never blend them — 2026-05-29
- Build the audit product as an internal private dashboard first; defer public SaaS/billing/subdomain — 2026-05-25
- Use Postgres as the default DB; SQLite is now only a legacy import source — 2026-05-25
- Local intelligence is region-specific: "Burlington" means Burlington, ON — 2026-05-25
- Lighter, human-readable admin UI with friendly phase labels for the new-audit flow — 2026-05-27
- Prioritize report-output QA/tuning before SMTP/email testing this cycle — 2026-05-28

---

## Open Loops

- [ ] Select the 5 Instagram accounts per business unit to start 30-day tracking — current focus BotLogix + BoxBuddy; a discovery step will propose ranked candidates for a human pick (provide seed niche keywords + region). AEC Benefits deferred.
- [ ] Provide a dedicated research IG account (`IG_SESSION_COOKIE`) for best-effort story capture during cohort tracking.
- [ ] Re-verify tuned report outputs after restart (duplicate headings removed, day blocks filled, artifact cards deduped).
- [ ] Configure SMTP credentials before using the Email Report button with beta testers.
- [ ] Resolve Docker Desktop engine instability (`dockerDesktopLinuxEngine` API 500) that blocked final live verification.
- [ ] Decide beta pricing (Month 1 free + Months 2–6 at $100/mo, or another founding-tester offer).
- [x] ✓ Verify one full dashboard-created audit from form submission through COMPLETE.
- [x] ✓ Validate the delete-audit cleanup path (DB rows + generated files).

---

## Context Claude Needs

- **What this project is**: BotLogix's IG Analysis / Social Intelligence System —
  analyze selected Instagram accounts and competitors, collect post/reel/story/
  carousel data, and produce structured markdown insights that improve content
  strategy for BotLogix, BoxBuddy, and AEC Benefits.
- **The engine**: TypeScript ESM Node app with Postgres/Drizzle, Apify scraping,
  LLM report sections, Marp decks, and a Fastify private admin dashboard.
- **Output default**: structured markdown. Designed/PDF reports only when asked.
- **Voice**: practical, direct, human BotLogix language. No hype.
- **Local market**: Burlington, ON is the default ambiguous-city resolution.
- **Reference files** (read only when the task needs them): see
  `.claude/references/` (brand voice, output template, 30-day meter, etc.).

---

## Weekly Summaries

- [WEEK OF: TBD] — first weekly review not yet run.

---

## Last Updated

- 2026-05-29 — Context cleanup pass: rewrote MEMORY.md to the standard index
  structure, merged dashboard project state with the new IG Analysis / Social
  Intelligence framing, added the three business units, and trimmed template
  placeholders. Prior version backed up under `.claude/backups/`.
- 2026-05-28 — Completed full dashboard-run audit + cleanup verification, deferred
  SMTP, shifted focus to report-output QA/tuning.
