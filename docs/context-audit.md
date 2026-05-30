# Context Audit — BotLogix IG Analysis

_Audit date: 2026-05-29 · Read-only. No files were changed in this phase._

This audit inspects every file that can affect Claude Code's context, memory,
instructions, skills, or behavior in this project. Token estimates use the
rough rule **4 characters = 1 token**.

---

## 1. Total files reviewed

- **36** context-relevant files (`.md`, `.txt`, `.json`, `.yaml`, `.yml`)
  inside the project, excluding `node_modules/` and `.git/`.
- Plus the **global** `~/.claude/CLAUDE.md` (11,403 bytes) and the global
  skills directory (**107** skill folders) — these are NOT in this repo but
  are loaded into every session. Reported, not touched.
- Binary/non-context assets noted but excluded from token math: 3 BotLogix PNG
  logos (~2 MB), `data/botlogix.db`, report media JPGs, `*.out.log` server
  logs, captured HTML pages (`audit24-page.html`, `login-out.html`).

---

## 2. Largest 40 markdown / text / json / yaml files (by bytes)

| # | Bytes | ~Tokens | File | Class |
|---|-------|---------|------|-------|
| 1 | 173,180 | 43,295 | `package-lock.json` | dependency lockfile (not context) |
| 2 | 56,698 | 14,175 | `drizzle/meta/0005_snapshot.json` | migration artifact (not context) |
| 3 | 55,160 | 13,790 | `drizzle-pg/meta/0001_snapshot.json` | migration artifact (not context) |
| 4 | 55,011 | 13,753 | `drizzle-pg/meta/0000_snapshot.json` | migration artifact (not context) |
| 5 | 53,776 | 13,444 | `drizzle/meta/0004_snapshot.json` | migration artifact (not context) |
| 6 | 48,889 | 12,222 | `drizzle/meta/0003_snapshot.json` | migration artifact (not context) |
| 7 | 48,489 | 12,122 | `reports/marp/boxbuddyapp-audit-27-light.md` | generated report output |
| 8 | 48,488 | 12,122 | `reports/marp/boxbuddyapp-audit-27-dark.md` | generated report output |
| 9 | 48,071 | 12,018 | `drizzle/meta/0002_snapshot.json` | migration artifact (not context) |
| 10 | 46,473 | 11,618 | `drizzle/meta/0001_snapshot.json` | migration artifact (not context) |
| 11 | 44,457 | 11,114 | `drizzle/meta/0000_snapshot.json` | migration artifact (not context) |
| 12 | 36,512 | 9,128 | `reports/marp/botlogix-audit-26-light.md` | generated report output |
| 13 | 36,511 | 9,128 | `reports/marp/botlogix-audit-26-dark.md` | generated report output |
| 14 | 17,798 | 4,449 | `reports/audit-26.md` | generated report output |
| 15 | 17,741 | 4,435 | `reports/audit-27.md` | generated report output |
| 16 | 11,403 | 2,851 | `~/.claude/CLAUDE.md` (GLOBAL) | **always-loaded instructions** |
| 17 | 5,949 | 1,487 | `docs/workbook-v2-implementation-note.md` | dev note / reference |
| 18 | 5,868 | 1,467 | `memory/daily/2026-05-28.md` | memory (daily log) |
| 19 | 5,811 | 1,453 | `memory/projects/botlogix-ig-analysis.md` | memory (project file) |
| 20 | 4,961 | 1,240 | `MEMORY.md` | **memory (state index)** |
| 21 | 4,431 | 1,108 | `AGENTS.md` | **operating rules** |
| 22 | 3,510 | 878 | `memory/daily/2026-05-25.md` | memory (daily log) |
| 23 | 1,951 | 488 | `memory/daily/2026-05-27.md` | memory (daily log) |
| 24 | 1,794 | 449 | `docker-compose.yml` | infra config (not context) |
| 25 | 1,692 | 423 | `BUILD-CHECKLIST.md` | dev doc |
| 26 | 1,629 | 407 | `DEPLOYMENT.md` | dev doc |
| 27 | 1,449 | 362 | `package.json` | project manifest |
| 28 | 1,210 | 303 | `drizzle/meta/_journal.json` | migration artifact |
| 29 | 1,121 | 280 | `memory/inbox.md` | memory (inbox) |
| 30 | 768 | 192 | `memory/projects/template.md` | memory template |
| 31 | 755 | 189 | `tsconfig.json` | build config (not context) |
| 32 | 537 | 134 | `memory/daily/template.md` | memory template |
| 33 | 535 | 134 | `memory/daily/2026-05-23.md` | memory (daily log) |
| 34 | 371 | 93 | `regen-headers.txt` | scratch artifact |
| 35 | 361 | 90 | `drizzle-pg/meta/_journal.json` | migration artifact |
| 36 | 274 | 68 | `cookies-5059.txt` | **session cookie scratch (sensitive-ish)** |
| 37 | 214 | 54 | `.claude/settings.local.json` | permissions config |

> Note: `cookies-5059.txt` holds a local admin session cookie. It is left
> untouched and flagged — do not move, print, or commit it.

---

## 3. Rough token estimate (4 chars = 1 token)

- **Whole repo context files (36):** ~206,000 tokens of raw text — but almost
  all of that is lockfiles, migration snapshots, and generated reports that are
  **never auto-loaded**. They only matter if a task explicitly reads them.
- **Actually loaded each session:**
  - Native Claude Code auto-load: global `~/.claude/CLAUDE.md` ≈ **2,851 tokens**
    (plus the 107 global skill descriptions injected into the system prompt —
    the single biggest hidden cost, see §12).
  - The project's session-start ritual (per `AGENTS.md`) reads:
    `MEMORY.md` (1,240) + `AGENTS.md` (1,108) + `inbox.md` (280) +
    active project file (1,453) + today's daily log (~1,400) ≈ **5,480 tokens**.
  - **Combined per-session baseline ≈ 8,300 tokens** of project + global text,
    before any task work.

---

## 4. Files likely loaded automatically

- **Native Claude Code:** only `~/.claude/CLAUDE.md` (global). There is **no
  project-level `CLAUDE.md`**, so the repo itself adds nothing to the native
  auto-load path today.
- **Via the session-start ritual** (`AGENTS.md` → Session Start Protocol):
  `MEMORY.md`, `memory/inbox.md`, the active `memory/projects/*.md`, today's
  `memory/daily/*.md`, and `AGENTS.md` itself.

---

## 5. Files likely used as memory

- `MEMORY.md` — current-state index.
- `memory/inbox.md` — unrouted notes.
- `memory/projects/botlogix-ig-analysis.md` — active project file.
- `memory/daily/2026-05-23.md`, `2026-05-25.md`, `2026-05-27.md`, `2026-05-28.md`
  — daily logs (permanent record).
- `memory/projects/template.md`, `memory/daily/template.md` — scaffolds.

---

## 6. Files likely used as skills

- **None.** There is no `.claude/skills/`, `skills/`, or `prompts/` directory in
  this project. All skills available to the session are **global/plugin** skills
  (see §12). Phase 5 will create project-local operational skills.

---

## 7. Files likely used as reusable references

- **None formally.** No `.claude/references/` exists yet. Material that *should*
  live as reference (read only on demand) is currently scattered:
  - `docs/workbook-v2-implementation-note.md` — long implementation narrative.
  - `reports/audit-26.md`, `reports/audit-27.md`, and the `reports/marp/*.md`
    decks — large worked examples of the output format.
  - `themes/botlogix-dark.css`, `themes/botlogix-light.css` — brand styling.

---

## 8. Files that appear bloated or misplaced

- `reports/marp/*.md` (36–48 KB each) and `reports/audit-*.md` — generated
  outputs living in the repo root tree. Fine as artifacts, but they are *worked
  examples*; one representative copy belongs in `.claude/references/`.
- Root-level scratch/log files: `admin-server*.out.log`, `audit24-page.html`,
  `login-out.html`, `regen-out.html`, `regen-headers.txt`, `cookies-5059.txt`.
  These clutter the root and one holds a cookie. Not context-loaded, but messy.
- `drizzle/meta/*` and `drizzle-pg/meta/*` snapshots — large but legitimate
  migration artifacts; leave alone.

---

## 9. Skills that are too large

- N/A for project-local skills (there are none). The **global** skill set is
  very large (§12) but is out of scope to edit without approval.

---

## 10. Memory files that are too large or too messy

- `MEMORY.md` (1,240 tok) — healthy size, but carries leftover **template
  placeholders** (`[Project Name]`, `[Client Name]`, `[Decision: e.g. ...]`,
  empty `Context Claude Needs` fields). Noise that should be trimmed.
- `AGENTS.md` (1,108 tok) — same: real rules mixed with `[Add rule ...]` and
  placeholder Platform Formatting sections.
- `memory/inbox.md` — only placeholder examples; never actually cleared to a
  bare header. Should be reset to a clean inbox.
- `memory/projects/botlogix-ig-analysis.md` — good content, but it is framed as
  the **"audit dashboard product"**, which only partially matches the IG
  Analysis / Social Intelligence framing in the new brief (see §13 note).

---

## 11. Prompt / template files that should move into references

- No `prompts/` directory exists. Candidates to relocate into
  `.claude/references/` as on-demand material:
  - `docs/workbook-v2-implementation-note.md` (implementation reference)
  - A representative `reports/*.md` + `reports/marp/*.md` pair (output-format
    example)
  - `themes/botlogix-*.css` brand styling (referenced, not loaded)

---

## 12. Are global Claude skills contributing to context bloat?

**Yes — this is the dominant hidden cost, and it is global (out of scope to edit
without your approval).**

- `~/.claude/CLAUDE.md` is **11,403 bytes (~2,851 tokens)** and is injected into
  *every* session of *every* project. It contains the full RTK command catalog
  **and** an unrelated "AEC Social — System Status" block — neither is relevant
  to this IG-analysis repo, yet both load every time.
- The global skills directory holds **107 skill folders**, and the session
  system prompt lists well over 150 skill descriptions (gstack, seo-*,
  firecrawl-*, anthropic-skills, claude-mem, ios-*, etc.). Each description is
  tokens you pay on every turn whether or not the skill is used.

**Recommendation (requires your approval — not done here):** trim
`~/.claude/CLAUDE.md` to RTK-only (move the AEC Social block to that project's
own `CLAUDE.md`), and prune/disable global skills you never use in BotLogix
work. This would cut far more baseline context than anything inside this repo.

---

## 13. Recommended cleanup plan

**Inside this project (safe, backed-up, no source/secret changes):**

1. Add a short project-level **`CLAUDE.md`** (Phase 7) so behavior is explicit
   and lean — it does the steering instead of relying on the bloated global file.
2. **Trim `MEMORY.md` and `AGENTS.md`** of template placeholders; keep them
   under ~300 lines each and focused (state vs. rules). Back up first.
3. **Reset `memory/inbox.md`** to a clean header after routing the one historical
   note already logged.
4. Add `memory/daily/TEMPLATE.md` (uppercase, matching the brief) alongside the
   existing lowercase `template.md`.
5. Create `.claude/skills/` with 3–4 short operational skills (instagram-analysis,
   competitor-tracking, markdown-reporting, content-strategy).
6. Create `.claude/references/` and move/copy heavy reusable material there
   (output-format example, brand voice, theme CSS, workbook note) — read only on
   demand.
7. Create `.claude/commands/` (session-start, session-end, context-check,
   context-audit, behavior-correction, weekly-review).
8. Create `.claude/backups/`, `.claude/memory/`, `memory/projects/` scaffolding
   per the standard structure.
9. Clarify the project framing in `memory/projects/botlogix-ig-analysis.md`:
   **merge** (do not overwrite) the existing dashboard-product history with the
   new IG Analysis / Social Intelligence scope (5 accounts × 3 business units,
   30-day tracking, markdown-first). Back up first.

**Outside this project (flagged, needs your approval):**

10. Trim `~/.claude/CLAUDE.md` and prune unused global skills (§12). Highest
    leverage, but global — left untouched pending your go-ahead.

**Explicitly NOT touched:** source code in `src/`, `data/botlogix.db`, `.env`,
`cookies-5059.txt`, drizzle migration snapshots, generated reports, and all
global Claude folders.
