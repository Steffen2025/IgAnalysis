# BotLogix Audit Dashboard Deployment

This is a later-step scaffold for running the private dashboard on a VPS behind `audit.botlogix.ca`.

## Local

```bash
docker compose up -d postgres
npm run migrate
npm run admin
```

Open `http://127.0.0.1:5057`.

## Docker

```bash
docker compose build
docker compose up -d dashboard
```

The compose file binds the dashboard to `127.0.0.1:5057` on the host so it can sit behind a private reverse proxy.

## Required Environment

```env
APIFY_TOKEN=
ANTHROPIC_API_KEY=
DATABASE_URL=postgres://botlogix:botlogix@127.0.0.1:55432/botlogix
POSTGRES_DB=botlogix
POSTGRES_USER=botlogix
POSTGRES_PASSWORD=
POSTGRES_PORT=55432
ADMIN_PASSWORD=
SESSION_SECRET=
PUBLIC_BASE_URL=https://audit.botlogix.ca
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=BotLogix <reports@botlogix.ca>
```

## VPS Reverse Proxy Notes

- Terminate HTTPS at the reverse proxy.
- Proxy `audit.botlogix.ca` to `127.0.0.1:5057`.
- Keep app login enabled.
- Add `X-Robots-Tag: noindex, nofollow` at proxy too if possible.
- Do not expose the container on a public host port.

## Persistent Volumes

- `postgres_data:/var/lib/postgresql/data`
- `./reports:/app/reports`
- `./themes:/app/themes:ro`

## One-Time SQLite Import

After Postgres migrations have run, import the old local SQLite database with:

```bash
MIGRATE_SQLITE_OVERWRITE=true npm run db:migrate-sqlite
```

By default the script reads `data/botlogix.db`. Override with `SQLITE_DATABASE_PATH=/path/to/botlogix.db`.

## Not Yet

- Public signup
- Billing
- Multi-user accounts
- Client portal

Those wait until the internal beta workflow is proven.
