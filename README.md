# Make It So

Website, admin area and (soon) client portal for the creative marketing agency **Make It So**.

- **Website** (`public/`): the animated NL / FR / EN site, served exactly as designed.
- **Admin area** (`/admin`): clients, contacts, projects, milestones, notes, leads and an activity log, behind password + two-factor login.
- **Backend** (`src/`): Node 20, Express, PostgreSQL. No build step.

See [docs/PHASE-0-PLAN.md](docs/PHASE-0-PLAN.md) for the plan, decisions, accounts to create and the Belgian / privacy checklist.

## Run it locally

Requires Node 20 or newer and pnpm (`corepack enable`).

```sh
pnpm install
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD="a-long-passphrase" pnpm start
```

Open <http://127.0.0.1:3000> for the website and <http://127.0.0.1:3000/admin/> for the admin. With no `DATABASE_URL`, an embedded PostgreSQL (PGlite) stores data in `./data` (git-ignored). The first start creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`; at first sign-in you must set up an authenticator app and save your recovery codes.

```sh
pnpm test                          # 30+ automated tests
pnpm create-admin "Name" a@b.be "password-of-12+-characters"
node src/cli/reset-2fa.js a@b.be   # admin lost phone and recovery codes
```

## Configuration

Everything is environment variables; see [.env.example](.env.example).

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Empty means the embedded local database |
| `APP_SECRET` | Random string, at least 32 characters. **Required in production**; encrypts 2FA secrets |
| `PUBLIC_ORIGIN` | Your site address, e.g. `https://makeitso.studio`. Used for the origin check |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | Create the first admin on first start. Remove `ADMIN_PASSWORD` afterwards |
| `PORT`, `TRUST_PROXY` | Set automatically on Railway |

## Deploy on Railway

1. Keep this repository **private**.
2. Railway: New project, Deploy from GitHub repo, pick this repo; add a PostgreSQL database.
3. Set the variables above (`DATABASE_URL` = reference to the Postgres service, `NODE_ENV=production`).
4. Add your domain. Check `/healthz`, sign in at `/admin`, then delete `ADMIN_PASSWORD`.

`railway.json` already sets the start command and health check. The app has no Railway-specific code: any host that runs Node 20 plus Postgres works, and `deploy/Dockerfile` is provided as an untested template for container hosts.

## How it fits together

```
public/            the website (unchanged) + admin app (public/admin)
src/app.js         Express app: security headers, API, static files
src/routes/        auth (login, 2FA, password), crm (clients, projects, leads…), public (contact form)
src/db/            database adapter (pg or PGlite), migrations
tests/             node:test suites (auth, CRM, security)
```

The contact form on the website posts to `/api/public/leads`. If the backend is unreachable (static hosting, offline), it falls back to opening the visitor's mail app, so no message is lost.
