# Superior HVAC: build plan & decisions

Agreed with the maintainer on 2026-11-17. Changes to anything here need their sign-off.

## Business facts
- Superior HVAC, Norwalk, OH (home base). Phone 419-706-1724. Email superiorhvac90@gmail.com.
- Joey Ojeda (Owner/Operator) receives all booking alerts. Ramon Negrete (Lead Installer) receives nothing.
- Serving Norwalk, Sandusky, Huron, Willard & surrounding areas.
- Facebook: https://www.facebook.com/profile.php?id=61562683560654
- Placeholders (typed `todo()`): domain, street, ZIP, geo, hours, bios, Google Business Profile URL, logo.
  `npm run check:launch` lists them; `npm run deploy` refuses until filled.

## Stack
- Next.js 16 App Router, TS strict, `output: "export"`, `trailingSlash: true`.
- **Cloudflare Worker with static assets** (not Pages): Pages Functions can't use the native rate-limit binding; Workers also give Logs + Cron.
- D1 for bookings + notification status. Turnstile (server-verified). Native `[[ratelimits]]` binding (3 req / 60 s / IP).
- Resend HTTP API for email behind the `Notifier` interface (SMS can be added as another Notifier).
- Cron every 15 min: retry failed notifications (max 5 attempts), alert OPS_EMAIL once when exhausted, purge bookings > 24 months.
- `GET /api/health` (D1 ping) for UptimeRobot. Workers Builds deploys on push to `main`.
- Cloudflare Web Analytics (cookieless). Public GitHub repo with secret scanning.
- Follows system light/dark; no toggle. English only.

## Pages
- `/` hero, services, team, testimonials (hidden while empty), booking entry, contact.
- `/services/[slug]/` one per service, Service JSON-LD.
- `/areas/[slug]/` generated ONLY for areas with a unique `description` (MVP: all four get one). Visually low-key: footer links + subtle "Serving…" line only.
- `/book/` 3-step flow: what's going on → when works (ASAP/morning/afternoon/evening) → contact (name, phone, email, street optional, ZIP) + Turnstile → confirmation.
- `/privacy/`, 404.
- SEO: unique title/description/canonical/OG per page; HVACBusiness JSON-LD everywhere from config; sitemap.ts + robots.ts; one h1 per page; NAP rendered from config only.

## Testing ("no hiccups")
- Vitest unit/integration with fakes for all deps (`worker/test/fakes.ts`). Specs written first.
- Playwright against `wrangler dev` + local D1, Turnstile always-pass/always-fail test keys, `NOTIFIER=log`.
  Projects: Pixel 7, iPhone 15, Desktop Chrome. axe check on every page.
- CI on every PR: typecheck, lint, unit, build, Playwright, Lighthouse CI (mobile ≥ 95 perf/a11y/SEO), JSON-LD + sitemap validation, phone-width screenshots as artifacts.
- Post-deploy smoke test against production (`/api/health` + homepage).

## Work split
- Phase 0 (lead): scaffold, config, contracts, fakes, failing specs, tooling. **Done.**
- Phase 1, parallel, one git worktree/branch each:
  - **A `feat/api`**: Worker API, D1 migrations + store, Turnstile verify, rate limit, Resend + log notifiers, cron, health, index.ts wiring.
  - **B `feat/pages`**: design tokens from the chosen prototype, layout, all pages, metadata, JSON-LD, sitemap/robots, area descriptions, privacy copy.
  - **C `feat/booking-ui`**: `/book` client flow against `src/lib/booking.ts` + `/api/booking`, Turnstile widget, confirmation.
  - **D `feat/ops`**: Playwright suites, Lighthouse CI, GitHub Actions, dependabot, README + launch checklist, smoke test.
  - B and C start after the design direction is picked.
- Phase 2 (lead): merge, full verification, fixes, hand-off summary.

## Design
Three prototypes in `design/prototypes/` (brief: `design/prototype-brief.md`):
- A Thermostat: https://claude.ai/artifact/Hjio6xk415WeDbjoHP6s2J
- B Field Schematic: https://claude.ai/artifact/WJpiqNq17EGPuoeDfw4akk
- C Neighborhood Editorial: https://claude.ai/artifact/UDBak72qxFGFsQXUxUU32i
Chosen direction: _pending_.
