# Phase 0: Plan, decisions and checklist

Status: **draft for your sign-off.** Phases 1 and 2 (foundation and the admin CRM) are already built against this plan; nothing here is irreversible.

## 1. What is being built (phases 0 to 2)

| Phase | Result |
| --- | --- |
| 0. Decisions | This document: scope, choices, accounts to create, open questions |
| 1. Foundation | Node backend, Postgres database, secure admin login with mandatory two-factor, backups plan, deploy config, automated tests |
| 2. Clients and projects | Admin area at `/admin`: client database, contacts, projects, milestones, notes, activity log, dashboard, and the website contact form feeding a leads inbox |

Not in these phases (planned later): client logins and the client portal (phase 3), quotes (4), invoices and payments (5), support tickets (6), file uploads and e-mail notifications (need a storage and e-mail provider; see section 7).

## 2. Decisions taken

| Topic | Decision | Why |
| --- | --- | --- |
| Country | Belgium, euro, 21% VAT default | Your answer. Data model stores Belgian VAT and company (KBO/BCE) numbers and validates them with the official check digits |
| Repository | One **private** repository | The public repo would expose the backend source. Pages would also publish every file in it |
| Hosting | Railway: one web service plus one Postgres database | Your choice. Nothing is Railway-specific, so it also runs elsewhere (`deploy/Dockerfile`, any Node 20 host) |
| Website | Served unchanged from `public/` by the same server | Same domain for site, admin and later the client portal: simpler and safer cookies |
| Database | PostgreSQL (`DATABASE_URL`); embedded Postgres (PGlite) for local development and tests | Same SQL everywhere, nothing to install locally |
| Login | Email and password (scrypt), plus **mandatory** authenticator-app two-factor for admins, recovery codes | Admin access exposes all client data |
| Sessions | HTTP-only, `SameSite=Lax`, `Secure` in production, 12 h maximum, 2 h idle | Standard hardening |
| Language of the admin | English | Website stays NL / FR / EN; the portal (phase 3) will follow the client's language |

## 3. Security measures in place

- Passwords hashed with scrypt (per-user salt); minimum 12 characters; generic error messages (no account enumeration); 5 failed attempts lock an account for 15 minutes; rate limits per IP on sign-in, 2FA and the public form.
- Two-factor: time-based codes (RFC 6238), each code usable once, 8 single-use recovery codes stored only as hashes, secrets encrypted at rest with `APP_SECRET`.
- CSRF: custom request header plus `Origin` check on every state-changing call.
- Content-Security-Policy, HSTS (production), `nosniff`, no framing, Permissions-Policy. The website's single inline script is allowed by hash, so the site needed no changes.
- Every query is parameterised. All admin output is escaped by default.
- Audit log of who changed what. IP addresses are stored only as salted hashes.
- Automated tests cover sign-in, lockout, 2FA replay, CSRF, SQL-injection attempts, access control on every endpoint, rate limits and security headers.

Still recommended before you store real client data: an independent security review (phase 7) and a privacy notice on the website (see section 6).

## 4. Data model (phases 1 and 2)

`users`, `sessions`, `recovery_codes`; `clients`, `contacts`, `projects` (stage, progress, next step, target date), `milestones`, `notes`, `leads`, `activity_log`. Clients and projects are **archived, never hard-deleted**, and a client with projects cannot be deleted at database level. Phase 3 adds client logins to the same `users` table.

## 5. Accounts and settings you need to create

1. **GitHub:** make the repository private (Settings, Danger zone). Do this *after* Railway is deployed if you want the current GitHub Pages site to stay online until then; Pages stops serving from a private repository on free plans.
2. **Railway:** new project, "Deploy from GitHub repo", choose this repository. Add a **PostgreSQL** database to the project.
3. **Railway variables** (service, Variables tab):

   | Variable | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | reference to the Postgres service (`${{Postgres.DATABASE_URL}}`) |
   | `APP_SECRET` | a random string of at least 32 characters (keep it safe; changing it invalidates stored 2FA secrets) |
   | `PUBLIC_ORIGIN` | your final address, e.g. `https://makeitso.studio` (no trailing slash) |
   | `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | first admin account; **delete `ADMIN_PASSWORD` after your first sign-in** |

4. **Domain:** add your domain under the service's Networking tab and update DNS as Railway instructs. HTTPS is automatic.
5. **Backups:** enable Railway's database backups if your plan offers them, and additionally schedule your own dump (`pg_dump`) to storage you control. Test a restore once. Backups are the single most important safety net.
6. **Later phases:** an e-mail sending provider (phase 3 invitations), a payment provider (phase 5: Mollie supports iDEAL and Bancontact), and file storage (Railway volume or an S3-compatible bucket).

## 6. Belgian and privacy points to confirm with your accountant / a lawyer

I am not an accountant or lawyer; treat these as a checklist of questions.

- **Invoices (phase 5):** required invoice mentions under the Belgian VAT Code, sequential numbering without gaps, the 6-year retention rule, credit notes, and **mandatory structured e-invoicing (Peppol) between businesses from 2026**. This decides whether phase 5 builds PDF invoices, Peppol delivery, or connects an existing invoicing tool.
- **GDPR:** the contact form collects names, e-mail addresses and messages. You need a privacy notice on the website (what you collect, why, how long, how to be removed) and a retention rule for leads. Deleting a lead is already possible in the admin; a full "erase this client" workflow is planned.
- **Client data:** a processing agreement (verwerkersovereenkomst) with hosting providers, and a short data-processing clause in your client contracts.

## 7. Known limits of phases 1 and 2

- No e-mail is sent yet (new leads appear in the admin inbox and as a badge; e-mail alerts arrive with the e-mail provider in phase 3).
- No file uploads yet (storage decision in section 5.6).
- One admin role. Staff accounts with restricted rights can be added later.
- Lost phone *and* recovery codes: run `node src/cli/reset-2fa.js you@example.com` on the server (Railway: `railway run`).
- Sessions and rate limits are kept per server instance; fine for one instance, revisit before scaling out.

## 8. Go-live checklist

- [ ] Repository private; Railway project, Postgres and variables set
- [ ] Deployed; `https://your-domain/healthz` returns `{"ok":true}`
- [ ] Signed in at `/admin`, two-factor on, recovery codes stored in a password manager
- [ ] `ADMIN_PASSWORD` variable deleted
- [ ] Contact form tested from the live site (lead appears in Leads)
- [ ] Backup enabled and a restore tested
- [ ] Privacy notice published
- [ ] GitHub Pages switched off (if you moved the site to Railway)
