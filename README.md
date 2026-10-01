# Make It So

Website, admin area, client portal and quotes for the creative marketing agency **Make It So**.

- **Website** (`public/`): the animated NL / FR / EN site, served exactly as designed.
- **Admin area** (`/admin`): clients, contacts, projects, milestones, notes, leads and an activity log, behind password + two-factor login.
- **Client portal** (`/portal/`): invited clients can follow project progress, review quotes and invoices, download invoice PDFs, and manage support conversations.
- **Quotes**: prepare and revise drafts, share a quote in the client portal, and track accept/decline decisions with timestamps.
- **Invoices**: create invoices from scratch or accepted quotes, issue them with sequential numbers, generate PDF copies, and manually record bank-transfer payments. Clients can download issued PDFs from the portal.
- **Support**: clients can open tickets and reply in the portal; admins can triage, prioritize and respond from the admin area.
- **Backend** (`src/`): Node 20, Express, PostgreSQL. No build step.

See [docs/PHASE-0-PLAN.md](docs/PHASE-0-PLAN.md) for the plan, decisions, accounts to create and the Belgian / privacy checklist. Quotes are not invoices, and an online quote decision is an audit record—not legal advice about electronic signatures.

## Run it locally

Requires Node 20 or newer and pnpm (`corepack enable`).

```sh
pnpm install
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD="a-long-passphrase" pnpm start
```

Open <http://127.0.0.1:3000> for the website and <http://127.0.0.1:3000/admin/> for the admin. With no `DATABASE_URL`, an embedded PostgreSQL (PGlite) stores data in `./data` (git-ignored). The first start creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`; at first sign-in you must set up an authenticator app and save your recovery codes.

From a client's record in the admin, invite a saved contact and copy the one-time setup link to send it yourself. No invitation email is sent. The same is true when sharing a quote: it appears in the client's portal, and the admin can copy the portal link to deliver it.

Before issuing invoices, fill in **Invoices → Business details** in the admin and add complete billing addresses to client records. Invoices are PDFs with manual bank-transfer tracking; Peppol is not integrated. Do not assume PDF invoices satisfy Belgian structured e-invoicing requirements. Confirm compliance, retention and correction rules with your accountant.

```sh
pnpm test                          # automated tests
pnpm create-admin "Name" a@b.be "password-of-12+-characters"
node src/cli/reset-2fa.js a@b.be   # admin lost phone and recovery codes
```

## Configuration

Everything is environment variables; see [.env.example](.env.example).

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. **Required in production.** Locally, empty means the embedded database |
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
src/routes/        auth, CRM, public contact form, portal, quotes, invoices/payments, support
src/db/            database adapter (pg or PGlite), migrations
tests/             node:test suites (auth, CRM, security, portal, invoices and support)
```

The contact form on the website posts to `/api/public/leads`. If the backend is unreachable (static hosting, offline), it falls back to opening the visitor's mail app, so no message is lost.
