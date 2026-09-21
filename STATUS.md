Area: botlogix

## Now
- Admin-dashboard security hardening from the 2026-07-03 eng review is sitting uncommitted in the working tree: timing-safe login + no hardcoded password fallback, login rate limit, Postgres session store, open-redirect fix, boot checks for SESSION_SECRET/ADMIN_PASSWORD_HASH, interrupted-audit reconcile, plus new emailReport regression tests.

## Next
- Run `npm test` (tsc --noEmit + intelligenceTests) over that hardening work and commit it.
- Add the GitHub Actions workflow running `npm test` on every push (TODOS.md; there is no .github/workflows/ today).
- Do the repo-root hygiene sweep in TODOS.md: ~25 untracked root files, including the session-cookie file cookies-5059.txt.

## Blocked
- Nothing.

## Last touched
2026-07-03 - admin auth/session files edited in the working tree (file mtime; newer than the last commit, 2026-06-02)
