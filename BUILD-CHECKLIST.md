# BotLogix Dashboard Build Checklist

## 0) Preflight
- [ ] Confirm `.env` has required values: `DATABASE_URL`, `POSTGRES_*`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
- [ ] Confirm `APIFY_TOKEN` and `ANTHROPIC_API_KEY` are set for full audit runs.
- [ ] Confirm `SMTP_*` values for delivery testing.

## 1) Boot Local Stack
- [x] Start Postgres: `docker compose up -d postgres`
- [x] Run DB migrations: `npm run migrate`
- [x] Start admin server: `npm run admin`
- [x] Verify app health: `http://127.0.0.1:5057/healthz`

## 2) End-to-End Audit Run
- [x] Login to dashboard at `http://127.0.0.1:5057`.
- [x] Create a low-risk test audit from the new-audit form.
- [x] Track audit status from queued/running to complete.
- [x] Open generated report artifacts from the audit detail page.
- [x] Confirm audit detail shows expected metadata and phase labels.

## 3) Cleanup + Artifact Validation
- [x] Delete the test audit from dashboard controls.
- [x] Confirm audit row is removed from list/detail pages.
- [x] Confirm linked report artifacts are removed/cleaned up as expected.

## 4) Email Delivery Validation
- [ ] Configure SMTP credentials in `.env`.
- [ ] Trigger "Email Report" from a completed audit.
- [ ] Confirm delivery record is captured and email arrives.

## 5) Beta-Readiness Gate
- [ ] Decide beta offer/pricing model.
- [ ] Record decision in `MEMORY.md` and `memory/projects/botlogix-ig-analysis.md`.
- [ ] Capture known gaps and move into a next sprint checklist.

## 6) Next Build Modules (After MVP Gate)
- [ ] Local Market Map
- [ ] Opportunity Scoreboard
- [ ] Content Pattern Bank
- [ ] Local Lead Playbook
- [ ] 30-Day Delta System
