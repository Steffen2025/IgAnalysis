# MEMORY.md — Current State Index

Last Updated: [2026-05-28]

---

## Current Focus

- Build the private BotLogix Instagram Audit admin dashboard MVP so audits can be created, run, tracked, opened, emailed, and cleaned up from a local/private dashboard.
- Polish the admin UI so the new audit flow is lighter, clearer, and easier to scan for beta testing.
- Validate report-output quality tuning in a fresh post-restart run, then resume SMTP delivery testing.

---

## Active Projects

| Project | Status | Next Action | Deadline |
|---------|--------|-------------|----------|
| BotLogix IG Analysis Dashboard | In Progress | Re-verify tuned report outputs after restart (headings/day blocks/artifact dedupe), then continue SMTP/email validation | [Date or TBD] |
| Premium Report Intelligence Modules | Planned | Add Local Market Map, Opportunity Scoreboard, Content Pattern Bank, Local Lead Playbook, and 30-Day Delta System | [Date or TBD] |
| [Project Name] | [In Progress / Blocked / Review] | [Specific next step] | [Date or TBD] |

---

## Active Clients

| Client | Relationship | Next Touchpoint | Notes |
|--------|-------------|-----------------|-------|
| BotLogix | Internal beta/product owner | Continue report-quality tuning pass, then resume SMTP testing | Audit reports are for first beta testers before public SaaS/subdomain rollout |
| [Client Name] | [Prospect / Active / Retainer] | [Date or trigger] | [Key context] |
| [Client Name] | [Prospect / Active / Retainer] | [Date or trigger] | [Key context] |

---

## Decisions That Affect How I Work

- AGENTS.md and MEMORY.md are the master repo-local memory sources; new memory-system scaffolding must merge into them, not replace them — made [2026-05-25]
- Build the audit product as an internal private dashboard first; defer public SaaS, billing, and subdomain deployment until the local MVP is useful — made [2026-05-25]
- Use Postgres as the default database for the dashboard/audit history going forward; SQLite is now only a legacy import source — made [2026-05-25]
- Use city plus service area/region for local intelligence; current Burlington means Burlington, ON, not any other Burlington — made [2026-05-25]
- Use a lighter, human-readable admin interface for the new audit setup screen and show internal phases with friendly labels in the UI — made [2026-05-27]
- Defer SMTP/email testing until report output quality pass is complete; prioritize report QA and generator tuning first — made [2026-05-28]
- [Decision: e.g. "Focusing only on Instagram and LinkedIn for Q2"] — made [date]
- [Decision: e.g. "Using Claude for first drafts, human review before publish"] — made [date]

---

## Open Loops

- [ ] ✓ Verify one full dashboard-created audit from form submission through COMPLETE without manually running scripts.
- [ ] Configure SMTP credentials before using the Email Report button with beta testers.
- [ ] Decide whether beta pricing is Month 1 free, then Months 2-6 at $100/month, or a different founding tester offer.
- [ ] ✓ Validate the delete-audit workflow on a browser run and confirm the cleanup path removes generated files as expected.
- [ ] Re-verify tuned report outputs after restart (duplicate headings removed, day blocks filled, artifact cards deduped).
- [ ] Resolve Docker Desktop engine instability (`dockerDesktopLinuxEngine` API 500) that blocked final live verification.
- [ ] [Task or question that has no owner or deadline yet]
- [ ] [Thing I said I'd follow up on but haven't]

---

## Context Claude Needs

> Fill this in so Claude can operate without repeated re-explanation.

- **My business**: [What BotLogix does / who it serves]
- **Current product**: BotLogix Instagram Audit turns public Instagram/account/competitor/local/hashtag/comment data into a local growth action guide for beta testers, with a private admin dashboard to create, run, email, and delete test audits.
- **Current repo**: TypeScript ESM Node app with Postgres/Drizzle, Apify scraping, LLM report sections, Marp decks, and a Fastify private admin dashboard.
- **My voice**: [How I write — formal, casual, punchy, etc.]
- **My platforms**: [Which social platforms I post on and their purpose]
- **My content pillars**: [The 3–5 themes my content revolves around]
- **What I never do**: [Hard nos — topics, formats, tones to avoid]
- **Tools I use**: [Scheduling tool, CRM, design tool, etc.]

---

## Last Updated

[2026-05-27] — Added end-of-day dashboard notes, updated the active project focus, and recorded the new lighter admin/delete-audit workflow while preserving the master memory structure.
[2026-05-27] — Added cleaner admin-dashboard guidance, test-audit cleanup tracking, and a friendlier UI focus for the new audit screen.
[2026-05-28] — Completed full dashboard-run audit + cleanup verification, deferred SMTP intentionally, and shifted focus to report-output QA/tuning with follow-up re-verification after restart.
