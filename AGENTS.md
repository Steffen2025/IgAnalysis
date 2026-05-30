# AGENTS.md — Operating Rules

> Standing instructions Claude follows every session. Update this file when a
> rule changes; Claude treats it as authoritative. AGENTS.md and MEMORY.md are
> the master repo-local memory files — merge into them, never overwrite. Keep
> this file under ~300 lines.

---

## Session Start Protocol

1. Read `MEMORY.md` — load current state, active projects, open loops.
2. Read `AGENTS.md` — load operating rules (this file).
3. Read or create today's daily log at `memory/daily/YYYY-MM-DD.md` (from
   `memory/daily/TEMPLATE.md` if it doesn't exist); note carry-forward items.
4. Read `memory/inbox.md` — route any unprocessed notes, then clear to header.
5. Read the active `memory/projects/*.md` when the task maps to a project.
6. Flag open loops in MEMORY.md older than 7 days.
7. Confirm likely focus, stale loops, inbox status, and files loaded. Then wait.

(The `/session-start` command runs this sequence.)

---

## Session End Protocol

1. Write the End of Day Summary into today's daily log.
2. Update `MEMORY.md`: mark resolved loops ✓, add new loops, update project
   status, update Last Updated.
3. Update any project files that had activity (decisions, status, contacts, loops).
4. Add permanent behavior corrections to AGENTS.md → LEARNED if applicable.
5. Show what was written and where. (The `/session-end` command runs this.)

---

## Memory Routing Rules

| Note type | Route to |
|-----------|----------|
| Project update or task | `memory/projects/[project].md` |
| Client / business-unit interaction | `memory/projects/[name].md` or MEMORY.md table |
| Decision that affects workflow | MEMORY.md → Decisions section |
| Idea without a project yet | leave in `memory/inbox.md`, tag `[idea]` |
| Daily log entry | `memory/daily/YYYY-MM-DD.md` |
| Hard rule or lesson learned | AGENTS.md → LEARNED |

---

## Daily Log Protocol

- Naming: `memory/daily/YYYY-MM-DD.md`. Created at session start if missing.
- Structure: copy `memory/daily/TEMPLATE.md`.
- At session end, summarize what was done into the log.
- Logs are never deleted — they are the permanent record.

---

## Project File Protocol

- One file per project/business unit: `memory/projects/[slug].md`.
- Each tracks: state, purpose, decisions, tasks, history, references.
- Update the relevant project file whenever work is done on it.
- Project files are the source of truth; MEMORY.md is the summary index.

---

## Context Efficiency Rules

- Keep always-loaded instructions short.
- MEMORY.md is for current state, not long history.
- AGENTS.md is for operating rules, not project details.
- Project files hold project-specific context.
- Skills explain how to perform tasks.
- References store long examples, templates, and background material.
- Do not load reference files unless the current task requires them.
- Before reading large files, explain why they are needed.
- Prefer reading targeted files over scanning the entire project.
- Preserve raw data separately from interpretation.
- Do not create designed reports until the markdown/report logic is proven.

---

## Skill Loading Rules

- Project skills live in `.claude/skills/[name]/SKILL.md` and are short and
  operational: purpose, when to use, inputs, process, output, quality rules.
- A skill points to a reference file; it does not embed long examples.
- Load a skill only when the task matches its trigger.

---

## Reference File Rules

- Reference material lives in `.claude/references/`.
- References are read on demand, never auto-loaded.
- A skill or task says explicitly: "Read `.claude/references/[file]` only when
  this task requires it."
- Move long examples/templates/brand guides here, not into skills or memory.

---

## Hard Rules

1. Never publish or schedule content without explicit confirmation.
2. Never delete or overwrite memory files — append only, or ask first.
3. Always route inbox notes before starting work — don't let inbox accumulate.
4. If context is ambiguous, ask — don't assume and proceed.
5. Preserve existing AGENTS.md/MEMORY.md content when adopting a scaffold; merge
   and organize, don't replace.
6. Keep local intelligence region-specific; "Burlington" means Burlington, ON.
7. Do not change application source code (`src/`) without explicit approval.
8. Do not expose, move, print, or alter secrets, API keys, tokens, cookies, or
   `.env` values.
9. Do not modify global Claude folders without explicit approval.
10. Do not commit to git unless asked.

---

## Platform Formatting

### Instagram
- Tone: practical, human, direct — no hype.
- Separate raw data from recommendations; mark uncertain findings `[TO CONFIRM]`.
- Default output is structured markdown.

### LinkedIn
- Tone: professional but personal. [Refine when LinkedIn work begins.]

### [Other Platform]
- [Add when needed.]

---

## LEARNED

> Lessons from real sessions. Format: [YYYY-MM-DD] — rule.

- [2026-05-25] Current AGENTS.md and MEMORY.md are master. Memory-system setup should merge into existing files and preserve project-specific rules.
- [2026-05-27] The admin dashboard should keep setup and action screens readable by default; lighter surfaces and human-friendly phase labels are better for the new-audit workflow.
- [2026-05-27] Test runs need an explicit cleanup path in the dashboard so temporary audits can be deleted without manual database work.
- [2026-05-28] Before resuming feature QA after runtime interruptions, re-verify critical local dependencies first (Docker engine/Postgres), then rerun one full dashboard flow to confirm output integrity.
- [2026-05-29] Keep the context system lean: skills are instructions, references are storage, memory is current state — never blend them. Heavy material goes to `.claude/references/` and is read only on demand.
