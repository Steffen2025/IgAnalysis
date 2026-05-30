# AGENTS.md — Operating Rules

> These are the standing instructions Claude follows in every session.
> Update this file when a rule changes. Claude treats this as authoritative.
> AGENTS.md and MEMORY.md are the master repo-local memory files. New memory scaffolds must be merged into them, not used to overwrite them.

---

## Session Start Protocol

When a new session begins, Claude must:

1. Read `MEMORY.md` — load current state, active projects, open loops
2. Read `memory/inbox.md` — route any unprocessed notes to the right file
3. Read the relevant file in `memory/projects/` when the task maps to an active project
4. Confirm what was last worked on and ask: *"Where do you want to start?"*
5. If a daily log for today doesn't exist in `memory/daily/`, create one

[Add or remove steps here as the workflow evolves]

---

## Memory Routing Rules

Claude routes notes from `inbox.md` as follows:

| Note type | Route to |
|-----------|----------|
| Project update or task | `memory/projects/[project-name].md` |
| Client interaction | `memory/projects/[client-name].md` or MEMORY.md client table |
| Decision that affects workflow | MEMORY.md → Decisions section |
| Idea without a project yet | `memory/inbox.md` (leave in inbox, tag with `[idea]`) |
| Daily log entry | `memory/daily/YYYY-MM-DD.md` |
| Hard rule or lesson learned | `AGENTS.md` → LEARNED section |

[Add routing rules as edge cases emerge]

---

## Daily Log Protocol

- File naming: `memory/daily/YYYY-MM-DD.md`
- Claude creates the file at session start if it doesn't exist
- Log structure (see scaffold in `memory/daily/`)
- At session end, Claude summarizes what was done and adds it to the log
- Logs are never deleted — they are the permanent record

[Add any custom fields to track in daily logs here]

---

## Project File Protocol

- One file per project or client: `memory/projects/[slug].md`
- Each file tracks: goal, status, decisions, tasks, history
- Claude updates the relevant project file whenever work is done on that project
- Project files are the source of truth — MEMORY.md is just a summary index

[Add naming conventions or required fields here]

---

## Hard Rules

> Claude must follow these without exception.

1. Never publish or schedule content without explicit confirmation
2. Never delete or overwrite memory files — append only, or ask first
3. Always route inbox notes before starting work — don't let inbox accumulate
4. If context is ambiguous, ask — don't assume and proceed
5. Preserve existing AGENTS.md and MEMORY.md content when adopting a new scaffold; merge and organize instead of replacing master instructions.
6. Keep local intelligence region-specific when city names are ambiguous, especially Burlington, ON versus other Burlington locations.
7. [Add rule — e.g. "Always write in first person when drafting my content"]
8. [Add rule — e.g. "Never use emojis in LinkedIn posts"]

---

## Platform Formatting

### Instagram
- [Tone: e.g. casual, energetic, story-driven]
- [Length: e.g. 150–300 words]
- [Hashtag strategy: e.g. 5–10 niche tags, no banned tags]
- [CTA style: e.g. always end with a question]

### LinkedIn
- [Tone: e.g. professional but personal]
- [Length: e.g. 3–5 short paragraphs]
- [Hook format: e.g. bold first line, no more than 8 words]
- [CTA style: e.g. invite comments, never hard-sell]

### [Other Platform]
- [Tone: placeholder]
- [Length: placeholder]
- [Format notes: placeholder]

---

## LEARNED

> Lessons from real sessions. Add entries as they happen.

- [YYYY-MM-DD] [What Claude got wrong or right, and the corrected behavior]
- [YYYY-MM-DD] [Preference discovered mid-session that should persist]
- [YYYY-MM-DD] [Edge case handled — note how it was resolved]
- [2026-05-25] Current AGENTS.md and MEMORY.md are master. Memory-system setup should merge into the existing files and preserve project-specific rules.
- [2026-05-27] The admin dashboard should keep setup and action screens readable by default; lighter surfaces and human-friendly phase labels are better for the new-audit workflow.
- [2026-05-27] Test runs need an explicit cleanup path in the dashboard so temporary audits can be deleted without manual database work.
- [2026-05-28] Before resuming feature QA after runtime interruptions, re-verify critical local dependencies first (Docker engine/Postgres), then rerun one full dashboard flow to confirm output integrity.
