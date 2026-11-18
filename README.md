# Superior HVAC website

Marketing and booking site for **Superior HVAC**, a family-run heating and cooling business in
Norwalk, Ohio. Visitors read about services and service areas, call with one tap, or request a
visit through a short booking form. Every booking is stored and emailed to the owner, and the
customer gets a confirmation email.

Decisions and scope live in [`docs/PLAN.md`](docs/PLAN.md). Operating the live site:
[`docs/RUNBOOK.md`](docs/RUNBOOK.md).

## Architecture

```
                         Cloudflare (one Worker: "superior-hvac")
                     +---------------------------------------------+
 browser  --HTTPS--> |  worker/index.ts                            |
                     |   |                                         |
                     |   +-- /api/*  --> handlers (worker/*.ts) ---+--> D1 "superior-hvac" (bookings,
                     |   |                 |   |                   |      notification status)
                     |   |                 |   +-- Turnstile siteverify (bot check)
                     |   |                 |   +-- rate limiter binding (3 req / 60 s / IP)
                     |   |                 +--> Resend HTTP API --> owner alert + customer email
                     |   |                                         |
                     |   +-- everything else --> ASSETS binding    |
                     |                           (static ./out from next build)
                     |                                             |
                     |  cron */15 min: retry failed notifications, |
                     |  email OPS_EMAIL when retries run out,      |
                     |  purge bookings older than 24 months        |
                     +---------------------------------------------+
```

- **Pages** are a Next.js App Router static export (`output: "export"`), rendered at build time.
  Only the `/book/` flow ships client JavaScript.
- **One Worker** serves `out/` through the `ASSETS` binding and runs first only for `/api/*`
  (`/api/booking`, `/api/health`). Config: `wrangler.toml`.
- **D1** stores bookings and per-notification delivery status. **Turnstile** stops bots.
  **Resend** sends email behind a `Notifier` interface (SMS can be added later without touching the handler).
- **Workers Builds** deploys on every push to `main`. **Workers Logs** keeps request logs.

## Repo map

| Path | What |
| --- | --- |
| `src/app/` | Pages, layout, metadata, `sitemap.ts`, `robots.ts` |
| `src/config/business.ts` | **The only place business facts live** (name, phone, towns, team, services, hours) |
| `src/lib/booking.ts` | Booking validation shared by the form and the Worker |
| `worker/` | Worker entry (`index.ts`), API handlers, cron, `contracts.ts` (all seams), unit tests + fakes |
| `db/migrations/` | D1 schema migrations |
| `e2e/` | Playwright suites (see [`e2e/README.md`](e2e/README.md)) |
| `scripts/check-launch.mts` | Lists business facts still marked `todo(...)` |
| `lighthouserc.json` | Lighthouse CI budgets (mobile, all categories >= 95) |
| `.github/workflows/` | `ci.yml` (every PR + main), `smoke.yml` (production check) |
| `design/` | Design brief and prototypes (reference only) |

## Local development

Requires Node 22+. On Windows, run the commands in PowerShell.

```powershell
npm ci
Copy-Item .dev.vars.example .dev.vars   # local secrets; never committed. NOTIFIER=log prints emails instead of sending
npm run db:init:local                   # create the local D1 tables (.wrangler/state)
```

| Command | Use it for |
| --- | --- |
| `npm run dev` | Pages only, with hot reload, at http://localhost:3000. `/api/*` does not exist here. |
| `npm run preview` | Full stack: builds `out/`, then `wrangler dev` at http://localhost:8787 with the API, local D1 and `.dev.vars`. |
| `npm run check:launch` | Lists every business fact still missing. |
| `npm run verify` | Typecheck, lint, unit tests, build. Must pass before every merge. |

The Turnstile widget needs a site key at build time: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Locally,
leave it unset or use Cloudflare's always-pass test key `1x00000000000000000000AA`.

### Editing business facts

Everything about the business (phone, email, towns, team bios, hours, services, testimonials,
socials) is in `src/config/business.ts`. Values not known yet are written as `todo("...")`;
`npm run check:launch` lists them, and `npm run deploy` refuses to run until they are filled in.
Change a fact there once and every page, the footer, JSON-LD and meta tags update together.

## Testing

| Command | What |
| --- | --- |
| `npm test` | Vitest unit/integration tests (no network; fakes in `worker/test/fakes.ts`) |
| `npm run test:e2e:install` | Once: download Playwright's Chromium + WebKit |
| `npm run test:e2e` | Playwright against `wrangler dev` + local D1 on Pixel 7, iPhone 15 and desktop. Details: [`e2e/README.md`](e2e/README.md) |
| `npm run build; npm run lighthouse` | Lighthouse CI on the built `out/` (mobile, every category >= 0.95). Reports in `.lighthouseci/` |

CI (`.github/workflows/ci.yml`) runs all of this on every pull request and push to `main`, and
uploads the Playwright report, per-device screenshots and Lighthouse results as run artifacts.

## Viewing bookings

- **Email**: every booking is emailed to `OWNER_EMAIL` right away.
- **Database**: `npm run bookings:recent` prints the 20 newest bookings from production D1
  (needs `npx wrangler login`). For anything else:
  `npx wrangler d1 execute superior-hvac --remote --command "SELECT ..."`.
  The Cloudflare dashboard also has a D1 console: **Storage & Databases > D1 > superior-hvac > Console**
  (in the dashboard, find D1 if the menu has moved).
- **Logs**: Cloudflare dashboard > **Workers & Pages > superior-hvac > Logs** (Workers Logs), or
  live from a terminal with `npx wrangler tail`.

---

## Launch checklist

Do these in order. Commands run from the repo root in PowerShell after `npm ci`. Where a dashboard
path is given as "find X", Cloudflare/Google may have renamed the menu; search the dashboard for X.
Keep a private note of every value you create (never commit secrets).

### Domain and Cloudflare

1. **Buy the domain** in Cloudflare: dashboard > **Domain Registration > Register Domains**. Search,
   buy. It is added to your Cloudflare account automatically with DNS on Cloudflare.
2. **Fill in the facts**: edit `src/config/business.ts` and set `siteUrl` (e.g. `https://yourdomain.com`),
   street, ZIP, geo, hours, bios, logo. Run `npm run check:launch` until it prints a check mark
   (the Google Business Profile URL can be filled in at step 19 and redeployed).
3. **Log in wrangler**: `npx wrangler login` (opens the browser).

### Database

4. **Create D1**:
   ```powershell
   npx wrangler d1 create superior-hvac
   ```
   Copy the printed `database_id` into `wrangler.toml` under `[[d1_databases]]`, replacing the
   `00000000-...` placeholder. Commit that change.
5. **Create the tables**: `npm run db:init:remote`.

### Turnstile (bot protection)

6. Dashboard > **Turnstile > Add widget**. Name `superior-hvac`, hostname = your domain (add
   `www.` too if you will use it), widget mode **Managed**. Create.
7. Note the **site key** (public) and **secret key** (private). The site key goes in the Workers
   Builds build variable `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (step 15). The secret key is set at step 9.

### Email: Resend (sending)

8. Create a Resend account, then **Domains > Add domain** with your domain. Resend shows DNS records:
   an MX and a TXT (SPF) record on the `send` subdomain and a DKIM TXT record (`resend._domainkey`).
   If Resend offers automatic setup with Cloudflare, use it; otherwise add each record in Cloudflare
   dashboard > your domain > **DNS > Records > Add record**, exactly as shown (Proxy status: DNS only).
   Also add DMARC:
   - Type `TXT`, name `_dmarc`, content `v=DMARC1; p=none; rua=mailto:superiorhvac90@gmail.com`

   Click **Verify** in Resend and wait for every record to show Verified. Then **API Keys > Create
   API key** with "Sending access" for this domain only. Copy it once.

### Worker secrets

9. Set each secret (each command prompts for the value; nothing is echoed or saved locally). If
   wrangler asks to create the Worker first, answer yes.
   ```powershell
   npx wrangler secret put RESEND_API_KEY        # the Resend API key from step 8
   npx wrangler secret put TURNSTILE_SECRET_KEY  # the Turnstile secret from step 7
   npx wrangler secret put OWNER_EMAIL           # where booking alerts go, e.g. superiorhvac90@gmail.com
   npx wrangler secret put FROM_EMAIL            # e.g. Superior HVAC <bookings@yourdomain.com> (domain verified in step 8)
   npx wrangler secret put REPLY_TO_EMAIL        # where customer replies go, e.g. superiorhvac90@gmail.com
   npx wrangler secret put OPS_EMAIL             # maintainer address for "notifications failed" alerts
   npx wrangler secret put IP_HASH_SALT          # a long random string, see below
   ```
   Generate the salt with:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   Check with `npx wrangler secret list` (names only).

### Email: receiving and replying from Gmail

10. **Email Routing** (receive `@yourdomain.com` mail in Gmail): dashboard > your domain > **Email >
    Email Routing** > enable; let it add its MX/TXT records. Add the destination address
    `superiorhvac90@gmail.com` and click the verification link Cloudflare emails to it. Create routing
    rules, e.g. `bookings@yourdomain.com` and `hello@yourdomain.com` -> Gmail (or enable the catch-all).
    Email Routing uses the root domain; Resend uses the `send` subdomain, so the records do not clash.
11. **Gmail "Send mail as"** (reply as `hello@yourdomain.com`): in Gmail, **Settings (gear) > See all
    settings > Accounts and Import > Send mail as > Add another email address**. Name `Superior HVAC`,
    address `hello@yourdomain.com`, untick "Treat as an alias" only if you want replies to stay
    separate. SMTP server `smtp.resend.com`, port `465`, username `resend`, password = a Resend API
    key (create a separate key for Gmail so it can be revoked on its own), **Secured connection
    using SSL**. Gmail sends a confirmation code to that address; it arrives via Email Routing.

### Deploy

12. **Push the repo to GitHub** (public) with `wrangler.toml` containing the real `database_id`.
13. **Connect Workers Builds**: dashboard > **Workers & Pages** > `superior-hvac` (exists after
    step 9; otherwise **Create > Import a repository**) > **Settings > Builds > Connect**. Pick the
    GitHub repo, branch `main`.
    - Build command: `npm run build`
    - Deploy command: `npx wrangler deploy`
    - Root directory: `/`
14. Optional but recommended: use `npm run check:launch && npm run build` as the build command so a
    deploy with missing business facts fails (the same guard `npm run deploy` applies locally).
15. In the same Builds settings, add the **build variable** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = the
    site key from step 7. (Build variables are separate from the Worker's runtime secrets.)
    Trigger a build (push to `main` or **Retry build**) and wait for it to succeed.
16. **Custom domain**: Worker `superior-hvac` > **Settings > Domains & Routes > Add > Custom domain** >
    `yourdomain.com` (repeat for `www.yourdomain.com` if wanted). Cloudflare creates the DNS record
    and certificate. Open `https://yourdomain.com/api/health`; it should show `{"ok":true}`.
    Submit a real test booking and confirm both emails arrive.

### Monitoring, security, analytics

17. **Cloudflare Web Analytics** (cookieless): dashboard > **Analytics & Logs > Web Analytics >
    Add a site** > your domain, and enable automatic setup for the proxied hostname. If automatic
    injection is not offered for this site, the JS snippet must be added to the layout in `src/app/`.
18. **Optional WAF rate limit** on top of the Worker's own limiter: your domain > **Security > WAF >
    Rate limiting rules > Create rule**. If incoming requests match: URI Path equals `/api/booking`
    AND Request Method equals `POST`. Characteristic: IP. e.g. 5 requests per 10 seconds, action Block
    for 10 seconds (the Free plan allows one rule with these short periods).
19. **Google Business Profile**: at https://business.google.com create or claim the profile as a
    **service-area business** (hide the street address, list Norwalk, Sandusky, Huron, Willard).
    Use exactly the same name, phone (419-706-1724) and website as the site. After verification,
    put the profile URL in `business.socials.google` in `src/config/business.ts` and push.
20. **Google Search Console**: https://search.google.com/search-console > **Add property > Domain** >
    `yourdomain.com`. Verify with the TXT record it gives you (add it in Cloudflare DNS, or accept the
    Cloudflare one-click option if offered). Then **Sitemaps** > submit `https://yourdomain.com/sitemap.xml`.
21. **GitHub secret scanning**: repo **Settings > Code security** (in GitHub, find "Code security" or
    "Advanced Security" if renamed) > enable **Secret scanning** and **Push protection**. Also turn on
    **Dependabot alerts** (the update config is already in `.github/dependabot.yml`).
22. **UptimeRobot**: create a free account > **New monitor**. Type **Keyword**, URL
    `https://yourdomain.com/api/health`, keyword `"ok":true`, alert when the keyword **does not exist**,
    interval 5 minutes. Alert contact: the maintainer's email (and phone app if wanted).
    What to do when it fires: `docs/RUNBOOK.md`.
23. **Smoke workflow**: GitHub repo **Settings > Secrets and variables > Actions > Variables > New
    repository variable**: `PROD_URL` = `https://yourdomain.com`. Then **Actions > Smoke (production) >
    Run workflow** and check it passes. It also runs daily.

### After each deploy

Workers Builds deploys on the Cloudflare side, so it does not start GitHub Actions by itself. After a
deploy that matters, run **Actions > Smoke (production) > Run workflow** (or wait for the daily run;
UptimeRobot watches `/api/health` continuously). If deploys ever move into GitHub Actions, call the
smoke test from that workflow with `uses: ./.github/workflows/smoke.yml` after the deploy job.
