@AGENTS.md

# Superior HVAC: project rules

Marketing + booking site for a family-run HVAC business in Norwalk, Ohio. Decisions are recorded in `docs/PLAN.md`; read it before changing architecture.

## Architecture (one line each)
- `src/` Next.js App Router, `output: "export"`, fully static → `out/`.
- `worker/` one Cloudflare Worker: serves `out/` via the ASSETS binding and handles `/api/booking`, `/api/health`, plus a 15-min cron.
- `src/config/business.ts` is the ONLY place business facts live. Never hard-code name/phone/email/towns elsewhere.
- `src/lib/booking.ts` validation is shared by the form and the Worker. Keep it dependency-free.
- `worker/contracts.ts` defines every seam (store, notifiers, turnstile, rate limit). Handlers take deps; tests inject `worker/test/fakes.ts`.

## Rules
- TDD: write or extend a failing test first, then implement. Never weaken an existing test to make it pass; if a spec is wrong, say so.
- No real network in unit tests. E2E uses `NOTIFIER=log` and Turnstile test keys; never send real email from tests.
- Minimal dependencies. No component libraries, no Tailwind, no zod. Plain CSS / CSS Modules with custom properties.
- Client JS only where needed (booking flow). Everything else is a Server Component rendered at build time.
- Respect `prefers-reduced-motion` and `prefers-color-scheme` (no theme toggle).
- Never push, deploy, create accounts, or buy anything. Commit only on your own branch.
- Before finishing: `npm run verify` (typecheck, lint, unit tests, build) must pass.
