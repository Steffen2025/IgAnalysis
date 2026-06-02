# BotLogix Audit Dashboard — Deployment

Runs the private intelligence dashboard on a VPS behind `audit.botlogix.ca`.
The dashboard scrapes an Instagram account, scores it, discovers competitors,
and generates the client deliverables — the **Gold Master**, the **field-guide
report** (md/html/pdf), and the designed **20-page Instagram Growth Blueprint**.

The whole app runs via `tsx` at runtime (no separate compiled build step), and
renders PDFs with the **chromium** that the image installs.

---

## Local development

```bash
docker compose up -d postgres
npm run migrate
npm run admin           # http://127.0.0.1:5057  (login: ADMIN_PASSWORD, default "botlogix")
```

> **Windows-only note:** host port `55432` may fall inside a Windows-reserved
> range (`netsh interface ipv4 show excludedportrange protocol=tcp`). If
> `docker compose up postgres` fails with a socket-bind error, pick a free port:
> `POSTGRES_PORT=15432 docker compose up -d --force-recreate postgres` and run the
> app with `DATABASE_URL=postgres://botlogix:botlogix@127.0.0.1:15432/botlogix`.
> This does **not** apply on a Linux VPS — `55432` is fine there.

---

## Server (Docker)

```bash
docker compose build dashboard
docker compose run --rm dashboard npm run migrate   # one-time / on schema change
docker compose up -d dashboard
```

The compose `dashboard` service binds to `127.0.0.1:5057` on the host so it sits
behind a private reverse proxy (see Traefik below). It connects to the `postgres`
service over the compose network, so the host DB port is irrelevant in Docker.

PDF generation works in-container: the image installs `chromium` and sets
`CHROME_PATH=/usr/bin/chromium`, which `htmlToPdf` honors.

---

## Required environment (`.env`, loaded by the compose `dashboard` service)

```env
# Scraping + LLM (required for a full run)
APIFY_TOKEN=                     # Instagram scrape (paid Apify)
OPENROUTER_API_KEY=              # LLM enrichment for the intelligence pipeline
# ANTHROPIC_API_KEY=             # optional / legacy paths only

# Database (compose overrides DATABASE_URL to the `postgres` service host)
POSTGRES_DB=botlogix
POSTGRES_USER=botlogix
POSTGRES_PASSWORD=               # set a real password in production
# POSTGRES_PORT=55432            # host port for local dev only (see Windows note)

# Admin auth + sessions
ADMIN_PASSWORD=                  # or ADMIN_PASSWORD_HASH (bcrypt); default is "botlogix"
SESSION_SECRET=                  # set a long random value
ADMIN_COOKIE_SECURE=true         # behind HTTPS (Traefik terminates TLS)
TRUST_PROXY=true

# Public URL + email delivery
PUBLIC_BASE_URL=https://audit.botlogix.ca
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=BotLogix <reports@botlogix.ca>
```

Without `OPENROUTER_API_KEY` the pipeline still produces a complete report from
its deterministic core (LLM enrichment is additive). Without `APIFY_TOKEN` a
full "Launch Audit" cannot scrape.

---

## Reverse proxy — Traefik

A `docker-compose.traefik.yml` override adds the Traefik router/TLS labels and
joins the dashboard to an external `traefik` network. It assumes a Traefik
instance is already running with a `web`/`websecure` entrypoint and an ACME
cert resolver named `le` (adjust the labels to match your setup).

```bash
# create the shared proxy network once (if it doesn't exist)
docker network create traefik

# bring the dashboard up with Traefik labels
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d dashboard
```

The override removes the host port publish (Traefik reaches the container over
the `traefik` network), routes `Host(\`audit.botlogix.ca\`)` to container port
5057, terminates TLS at Traefik, and keeps the app login on. Point an A record
for `audit.botlogix.ca` at the VPS first.

Checklist:
- Terminate HTTPS at Traefik; set `ADMIN_COOKIE_SECURE=true` + `TRUST_PROXY=true`.
- Keep app login enabled (do not disable auth).
- Do not publish the dashboard on a public host port — only via Traefik.
- Add `X-Robots-Tag: noindex, nofollow` at the proxy too (the app already sends it).

---

## Persistent volumes

- `postgres_data:/var/lib/postgresql/data` — database.
- `./reports:/app/reports` — generated artifacts, incl.
  `reports/intelligence/<id>/` (Gold Master, report, and the Blueprint).
- `./themes:/app/themes:ro` — legacy Marp themes (unused by the current
  pipeline; safe to drop later).

---

## One-time SQLite import (optional / legacy)

Only if migrating an old local SQLite DB. Requires dev deps (`better-sqlite3`),
so run it from a dev checkout rather than the slim production image:

```bash
MIGRATE_SQLITE_OVERWRITE=true SQLITE_DATABASE_PATH=/path/to/botlogix.db npm run db:migrate-sqlite
```

---

## Hostinger VPS (`audit.botlogix.ca` → 72.60.119.119)

### What is already on the VPS (Docker Manager → project `app`)

| Container | Role | Notes |
|-----------|------|--------|
| `botlogix-postgres` | Postgres for other BotLogix apps | **Separate** from the IG audit stack unless you wire an external DB URL |
| `botlogix-social-studio` | Social studio | **Host port `5057` is already taken** (`5057:5055`) |
| `botlogix-web` | Main site / web app | Unrelated to the audit dashboard |

The IG analysis tool is a **new compose stack** in this repo. Do not replace
`social-studio` unless you intend to retire it on that port.

### Recommended layout

```
Internet → Traefik (TLS, ACME) → Host(`audit.botlogix.ca`) → botlogix-ig-audit:5057
                                      ↑
                    botlogix-ig-postgres (compose network only)
```

- **DNS:** A record `audit.botlogix.ca` → `72.60.119.119` (you have this).
- **No public host port** for the audit dashboard — Traefik only (see
  `docker-compose.vps.yml`; avoids clashing with `botlogix-social-studio` on
  `5057`).
- **Dedicated Postgres** in this compose project (`botlogix-ig-postgres`) keeps
  audit data isolated from `botlogix-postgres`. Reusing the existing Postgres
  instance is possible but requires a separate database/user and manual
  `DATABASE_URL` — only do that if you know both apps’ schemas won’t collide.

### What this deploy runs (client deliverables)

After a full audit job, the dashboard pipeline produces (under
`reports/intelligence/<auditId>/`):

- Gold Master (`gold-master.md` / `.json`)
- Field-guide report (`report.md`, `report.html`, `report.pdf`)
- Designed **Instagram Growth Blueprint** (`blueprint/Instagram Growth Blueprint.pdf`)

Requires in `.env`: `APIFY_TOKEN` (scrape), `OPENROUTER_API_KEY` (LLM enrichment),
strong `POSTGRES_PASSWORD`, `SESSION_SECRET`, `ADMIN_PASSWORD`.

Legacy Marp workbook PDFs are **not** the documented production path in this
repo; the intelligence + Blueprint pipeline is.

### VPS deploy commands (SSH on the server)

```bash
# 1) Clone or pull
cd /opt/botlogix-ig-analysis
git pull origin master

# 2) Production .env (copy from secure machine — never commit)
#    Must include APIFY_TOKEN, OPENROUTER_API_KEY, strong POSTGRES_PASSWORD, etc.

# 3) One-command deploy (patches Traefik file routes + build + migrate + up)
bash deploy/vps-deploy.sh

# 4) Verify
curl -sS -o /dev/null -w "%{http_code}\n" https://audit.botlogix.ca/healthz
```

On this Hostinger VPS, Traefik uses the **file provider**
(`/opt/boxbuddy/traefik/dynamic.yml`), not Docker labels. `deploy/patch-traefik-audit.py`
adds `audit.botlogix.ca` → `http://botlogix-ig-audit:5057` on network
`boxbuddy_boxbuddy-network` (cert resolver `letsencrypt`). Do **not** use
`docker-compose.traefik.yml` here unless you switch Traefik to the Docker provider.

### Pre-deploy checklist (local machine)

1. **Commit** all production-ready changes you want on the server (today’s work is
   mostly **uncommitted** in `src/admin/`, `src/services/instagram-intelligence/`,
   `templates/blueprint/`, `package.json`, etc.). Do not deploy a dirty tree you
   haven’t reviewed.
2. Run `npm test` (typecheck + intelligence fixture tests).
3. Optional: `docker compose build dashboard` locally and smoke-test migrate.
4. Confirm `.env` on the VPS — not copied from dev; rotate `SESSION_SECRET` and
   `POSTGRES_PASSWORD`.
5. Ensure `reports/` volume path exists and is writable (persistent artifacts).
6. Confirm Traefik route for `audit.botlogix.ca` does not point at
   `botlogix-social-studio` by mistake.

### Post-deploy smoke test

1. Open `https://audit.botlogix.ca/login` — login works, cookie secure.
2. Create a **test** audit (or regenerate an existing one).
3. Confirm artifacts appear on the audit detail page (Blueprint PDF, report PDF).
4. Download PDFs — Chromium in-container must render (check dashboard logs if
   PDFs missing).

---

## Not yet

- Public signup, billing, multi-user accounts, client portal.

These wait until the internal beta workflow is proven.
