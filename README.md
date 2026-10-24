# Make It So

Website, admin area, client portal and quotes for the creative marketing agency **Make It So**.

- **Website** (`public/`): the animated NL / FR / EN site, with six color-matched department detail pages, concept examples, an About page, a project approach page with engagement options, and practical FAQs.
- **System status** (`/status/`): an EN / NL / FR public dashboard for the website, apps, client portal, email and billing. The anonymous `/api/public/status` endpoint checks the configured public site, the private apps health endpoint, and the client portal/login API. Redirects are not followed, probe targets stay server-side, checks are cached briefly, and the page refreshes automatically. Email/contact is explicitly shown as under maintenance; quotes and invoices inherit the client portal status.
- **Admin area** (`/admin`): clients, contacts, projects, milestones, work-item status boards, project timesheets, notes, leads and an activity log, behind password + two-factor login. Project progress is calculated from work items when present; otherwise it can be updated manually.
- **Client portal** (`/portal/`): invited clients can follow project progress, milestones and explicitly shared work items, reply in shared feature discussions, review quotes and invoices, download invoice PDFs, and manage support conversations. Time entries and internal notes remain admin-only.
- **Private client media**: admins can enable per-client access and manage Jellyfin, Jellyseerr and Ubuntu connection details. Jellyfin and Jellyseerr HTTP availability and Ubuntu TCP port reachability are checked automatically against trusted server-only targets. Checks report endpoint availability only—not playback, host health, or media-library correctness. Passwords are encrypted at rest and only revealed to a shared client after they re-enter their portal password. This is separate from the public `/status/` page.
- **Quotes**: prepare and revise drafts, share a quote in the client portal, and track accept/decline decisions with timestamps.
- **Invoices**: create invoices from scratch or accepted quotes, issue them with sequential numbers, generate PDF copies, and manually record bank-transfer payments. Clients can download issued PDFs from the portal.
- **Support**: clients can open tickets and reply in the portal; admins can triage, prioritize and respond from the admin area.
- **Backend** (`src/`): Node 20, Express, PostgreSQL. Production serves committed prerendered public pages; no browser or build step is needed on Railway.

## Google / SEO

Public pages are served with their main content already in the HTML, including
EN / NL / FR titles, descriptions, self-referencing canonical URLs, reciprocal
`hreflang` links and a localized sitemap. English uses the unparameterized URL;
Dutch and French use `?lang=nl` and `?lang=fr`. Tracking parameters are excluded
from canonicals. The language switch updates the URL and metadata without
changing the layout. Structured data describes the actual business address,
services, website and breadcrumbs; no reviews or ratings are invented.
Fictional sample projects remain `noindex`. Admin, portal and API responses
also send `X-Robots-Tag: noindex, nofollow`.

After editing public page content or translations, regenerate the committed
HTML in `generated/seo/` (do not edit generated files manually):

```sh
pnpm exec playwright install chromium
pnpm build:seo
pnpm test:seo
pnpm test
```

`pnpm test` detects stale generated content. The browser checks exercise all
public pages and language switches, plus content visibility without JavaScript.
Generation uses a local static server, not your production database, and blocks
external requests. The production server does not load Playwright.
SEO metadata is maintained in `public/seo-data.js`; the 1200 x 630 social image
is regenerated from existing brand artwork.

After deployment, verify ownership of `https://makeitso.studio/` in Google
Search Console and submit `https://makeitso.studio/sitemap.xml`. Use URL
Inspection to request indexing of key service pages. Set up or complete your
Google Business Profile with the same company name, address and website.
These account-level steps require the owner's access and are not automated
by this repository. Indexing and rankings are determined by Google, not guaranteed.

See [docs/PHASE-0-PLAN.md](docs/PHASE-0-PLAN.md) for the plan, decisions, accounts to create and the Belgian / privacy checklist. Quotes are not invoices, and an online quote decision is an audit record—not legal advice about electronic signatures.

## Run it locally

Requires Node 20 or newer and pnpm (`corepack enable`).

```sh
pnpm install
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD="a-long-passphrase" pnpm start
```

Open <http://127.0.0.1:3000> for the website and <http://127.0.0.1:3000/admin/> for the admin. With no `DATABASE_URL`, an embedded PostgreSQL (PGlite) stores data in `./data` (git-ignored). The first start creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`; at first sign-in you must set up an authenticator app and save your recovery codes.

From a client's record in the admin, invite a saved contact and copy the one-time setup link to send it yourself. No invitation email is sent. The same is true when sharing a quote: it appears in the client's portal, and the admin can copy the portal link to deliver it.

To share private media credentials, open the client in the admin and enable the media section. Configure each available service (Jellyfin, Jellyseerr or Ubuntu), including its URL, optional username and login note, whether connection details may be shared, and an optional password. Admin-configured connection URLs are per-client sharing details only; monitoring never fetches those editable URLs. Trusted server targets poll Jellyfin `/health` and Jellyseerr `/api/v1/status` and connect to Ubuntu's configured TCP port immediately at startup and every 60 seconds, with a 5-second timeout and 16 KB HTTP response limit. A valid response under 1.5 seconds is operational; slower valid responses are degraded, one failed check is degraded, two consecutive failures are offline, and results older than 150 seconds appear unknown/stale. Jellyfin must return `Healthy`; Jellyseerr must return JSON with a non-empty `version`. This measures only endpoint or TCP reachability—not playback, host health, or media-library correctness. The supplied Jellyfin and Jellyseerr defaults use HTTP, so they provide no transport encryption; HTTPS is recommended where available. The client portal only shows connection details when sharing is enabled and never receives the trusted monitoring target URLs. Clients must re-enter their current portal password each time they reveal a saved password. These private client statuses do not change the separate public status dashboard.

Before issuing invoices, fill in **Invoices → Business details** in the admin and add complete billing addresses to client records. Invoices are PDFs with manual bank-transfer tracking; Peppol is not integrated. Do not assume PDF invoices satisfy Belgian structured e-invoicing requirements. Confirm compliance, retention and correction rules with your accountant.

```sh
pnpm test                          # automated tests
pnpm test:media                    # private media browser validation
pnpm create-admin "Name" a@b.be "password-of-12+-characters"
node src/cli/reset-2fa.js a@b.be   # admin lost phone and recovery codes
```

## Configuration

Everything is environment variables; see [.env.example](.env.example).

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. **Required in production.** Locally, empty means the embedded database |
| `APP_SECRET` | Random string, at least 32 characters. **Required in production**; encrypts 2FA secrets and private media passwords. Keep it stable across deploys and backups or encrypted values cannot be decrypted |
| `PUBLIC_ORIGIN` | Optional comma-separated list of trusted site origins, e.g. `https://makeitso.studio,https://your-app.up.railway.app`. The actual origin serving the app is also checked automatically |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | Create the first admin on first start. Remove `ADMIN_PASSWORD` afterwards |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | SMTP account used to send contact-form notifications. Hostinger Email uses `smtp.hostinger.com`, port `465`, secure `true` |
| `SMTP_FROM`, `CONTACT_EMAIL` | Optional sender address (defaults to `SMTP_USER`) and inbox for contact messages (defaults to `SMTP_USER`) |
| `MEDIA_JELLYFIN_URL`, `MEDIA_JELLYSEERR_URL` | Trusted server-only monitoring targets (default: `https://jellyfin.makeitso.studio/` and `https://seer.makeitso.studio/`). Set either explicitly to an empty value to disable that check. Values must be HTTP(S) base URLs without credentials, query strings, or fragments |
| `MEDIA_UBUNTU_TCP` | Trusted TCP target, default `213.119.105.234:3389`. Use `host:port`, or an explicitly empty value to disable. Port reachability only; no remote login |
| `PORT`, `TRUST_PROXY` | Set automatically on Railway |

Monitoring results are global to these configured servers, shared across client records, and persisted without storing their raw target URLs. Admin media responses include the configured HTTP target to help prefill a service when it has no saved per-client URL; this field is never included in portal responses. Ubuntu uses a TCP connection to `213.119.105.234:3389` (override with `MEDIA_UBUNTU_TCP=host:port`; explicitly empty disables it). This only tests port reachability, not OS health or remote-desktop authentication, and sends no login data. It follows the same 5-second timeout, 60-second interval, failure threshold and stale-result rules as HTTP checks. A TCP address is never suggested as a browser URL. For monitored services, status cannot be manually set, but a maintenance message may still be edited. With `NODE_ENV=test`, monitoring is disabled unless targets are explicitly supplied.

### Editing "Your access" for a client

1. Open **Admin → Clients → the client → Extra portal sections**.
2. Enable **Show media server status to this client** and click **Save portal permission**.
3. Click **Manage** beside the relevant service. Fill in the client-facing HTTP(S) link (if one exists), username, sign-in instructions and optional password.
4. Enable **Share this service link and account with this client** and save. This is separate from enabling the status page and applies only to this client.
5. The client sees these values under **Your access** after refreshing the portal. Viewing a password requires their own portal password. A blank password field preserves an existing password; **Remove the stored password** explicitly deletes it. For Ubuntu, leave the browser link blank unless an actual web interface exists; put remote-desktop connection instructions in the sign-in instructions, never admin credentials.

## Deploy on Railway

1. Keep this repository **private**.
2. Railway: New project, Deploy from GitHub repo, pick this repo; add a PostgreSQL database.
3. Set the variables above (`DATABASE_URL` = reference to the Postgres service, `NODE_ENV=production`). To enable contact-form emails, configure the SMTP variables using an email account and its mailbox password; do not use your hPanel password.
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

The contact form on the website posts to `/api/public/leads`. New leads are stored and sent to `CONTACT_EMAIL` using SMTP. If SMTP is unavailable or the backend cannot be reached, the form falls back to opening the visitor's mail app.
