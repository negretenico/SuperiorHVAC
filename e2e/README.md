# End-to-end tests (Playwright)

The suites run against the **real Worker** (`wrangler dev`) serving the static export in `out/`,
with a local D1 database, Cloudflare's Turnstile **test** keys, and `NOTIFIER=log` (emails are
printed to the wrangler console, never sent). Nothing here talks to production unless you set
`E2E_BASE_URL` yourself.

## What runs

| File | Projects | Checks |
| --- | --- | --- |
| `site-crawl.spec.ts` | mobile-chrome (Pixel 7), mobile-safari (iPhone 15), desktop | Every URL in the live `/sitemap.xml`: HTTP 200 with no redirect, exactly one `<h1>`, `<title>`, meta description, canonical (same path and origin as the sitemap entry), JSON-LD that parses and contains `HVACBusiness`, no console errors, axe (WCAG 2.1 AA, serious/critical fail), no sideways scrolling, every rendered `419-706-1724` inside `<a href="tel:+14197061724">`. Saves a full-page screenshot per page. |
| `not-found.spec.ts` | the three device projects | A random path returns status 404 with the site's own 404 page, plus the same page checks. |
| `api.spec.ts` | `api` (no browser, runs once) | `/api/health`, `POST /api/booking` valid/invalid, `GET /api/booking` → 405, unknown `/api/x` → 404. |

Screenshots land in `test-results/screenshots/<project>/<path>.png` (e.g. `mobile-chrome/services/ac-repair.png`,
`desktop/index.png`). The HTML report is in `playwright-report/`.

Shared helpers: `helpers/axe.ts` (axe-core with WCAG 2.1 AA tags), `helpers/site.ts` (sitemap, JSON-LD,
phone-link, overflow and screenshot helpers), `helpers/page-checks.ts` (the per-page checklist).
Phone number and tel link come from `src/config/business.ts`, never hard-coded.

## How a run starts

1. Playwright's `webServer` runs `e2e/prepare.mts`, which applies D1 migrations to the local database
   (`wrangler d1 migrations apply superior-hvac --local`) and runs `npm run build` if `out/` is missing
   (with the always-pass Turnstile test site key). Set `E2E_REBUILD=1` to force a rebuild.
2. It then starts `wrangler dev --port 8787 --env-file .dev.vars.e2e` and waits for `/api/health`.
3. `e2e/global-setup.ts` checks `/api/health` and `/sitemap.xml` and stops early with a clear message
   if either is broken.

Locally, an already-running server on port 8787 is reused. Note it must have been started with
`.dev.vars.e2e` (or equivalent test keys); otherwise `POST /api/booking` fails Turnstile.

## Run locally (Windows, PowerShell)

```powershell
npm ci
npm run test:e2e:install        # once: downloads Chromium + WebKit for Playwright
npm run test:e2e                # all projects
npx playwright test --project=desktop            # one project
npx playwright test e2e/api.spec.ts              # one file
npx playwright test --ui                         # interactive
npx playwright show-report                       # open the last HTML report
$env:E2E_REBUILD = "1"; npm run test:e2e; Remove-Item Env:E2E_REBUILD   # after changing pages
```

On macOS/Linux use `E2E_REBUILD=1 npm run test:e2e`. On Linux, install system libraries once with
`npx playwright install --with-deps chromium webkit`.

Use a different port with `$env:E2E_PORT = "8790"`.

### Against a deployed site

```powershell
$env:E2E_BASE_URL = "https://your-domain.example"; npx playwright test --project=desktop
```

No server is started. Careful: `api.spec.ts` really submits a booking (with Turnstile's test token,
which production rejects with 403, so the "valid booking" test fails there by design). Prefer
`--project=desktop` (crawl + 404 only) against production.

## In CI

`.github/workflows/ci.yml` builds `out/` once, then the e2e job downloads it, runs
`npx playwright install --with-deps chromium webkit` and `npx playwright test`, and always uploads
`playwright-report/` and `test-results/screenshots/` as artifacts (open the run, scroll to
**Artifacts**).

## Turnstile test keys

Cloudflare publishes dummy keys that work on any hostname, including `localhost`:

| Purpose | Key |
| --- | --- |
| Site key, always passes (used for e2e builds) | `1x00000000000000000000AA` |
| Site key, always blocks | `2x00000000000000000000AB` |
| Secret, always passes (in `.dev.vars.e2e`) | `1x0000000000000000000000000000000AA` |
| Secret, **always fails** | `2x0000000000000000000000000000000AA` |
| Secret, "token already spent" error | `3x0000000000000000000000000000000AA` |

To try the **403 path** by hand: copy `.dev.vars.e2e` to `.dev.vars`, change
`TURNSTILE_SECRET_KEY=2x0000000000000000000000000000000AA`, run `npm run preview`, and submit the
booking form (or `POST /api/booking`). Expect `403 {"ok":false,"error":"turnstile"}`.

## Rate limit

`POST /api/booking` is limited to 3 requests per 60 s per IP (`[[ratelimits]]` in `wrangler.toml`).
All local tests share one IP, so keep booking submissions in e2e to a minimum: `api.spec.ts` sends
two and runs in a single project. If you see 429s, wait a minute or restart `wrangler dev`.
