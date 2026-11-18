# Runbook: Superior HVAC site

What to do when something goes wrong with the live site. Commands run from the repo root after
`npm ci` and `npx wrangler login`. Dashboard paths may move; if one is missing, search the
Cloudflare dashboard for the named item.

Useful everywhere:
- Live logs: `npx wrangler tail` (Ctrl+C to stop), or dashboard > **Workers & Pages > superior-hvac > Logs**.
- Recent bookings: `npm run bookings:recent`.
- Deployed versions: `npx wrangler deployments list` and `npx wrangler versions list`.
- Cloudflare service status: https://www.cloudflarestatus.com. Resend status: https://resend-status.com.

## 1. UptimeRobot says the site is down

The monitor fetches `/api/health`, which returns `{"ok":true}` only when the Worker runs and D1 answers.

1. Open `https://<domain>/` and `https://<domain>/api/health` yourself, on phone data as well as Wi-Fi.
   - Both fine: probably a blip. Check UptimeRobot's response detail, then watch for a repeat.
   - Homepage fine, health returns `503 {"ok":false}`: **D1 problem**. Go to step 3.
   - Both fail, or Cloudflare error page (5xx, 1xxx): go to step 2.
2. **Worker or platform**:
   - Check cloudflarestatus.com for an incident affecting Workers or D1.
   - `npx wrangler tail` and reload the page: look for exceptions.
   - Did a deploy just happen? Dashboard > Worker > **Deployments**. If the failure started with it,
     **roll back** (section 4), then fix forward on a branch.
   - Custom domain removed or DNS changed? Worker > **Settings > Domains & Routes** must list the domain.
3. **D1**:
   - `npx wrangler d1 execute superior-hvac --remote --command "SELECT 1"`. An error here confirms it.
   - Check cloudflarestatus.com for D1. Nothing to fix on our side during a platform incident; bookings
     will fail with a 500 until it recovers. Phone calls still work.
   - If a migration was just added, check none is left unapplied: `npx wrangler d1 migrations list superior-hvac --remote` (lists pending migrations; apply with `npm run db:init:remote`).
4. Once fixed, confirm: UptimeRobot recovers, and run **Actions > Smoke (production) > Run workflow**.

## 2. An OPS alert email arrives ("notifications failed")

The cron retries failed booking emails every 15 minutes, up to 5 attempts. When a notification
still fails, it emails `OPS_EMAIL` once. **A customer asked for a visit and the owner may not know.**

1. **Call the customer first.** The alert includes the booking (name, phone, what's wrong, preferred
   time). If the alert says the *owner alert* failed, phone Joey with the details too. Do this before
   debugging.
2. Find the cause:
   - Logs: `npx wrangler tail` or Workers Logs, search for `notify` / the booking id; the error text
     is also stored with the notification row in D1 (last error column).
   - Resend dashboard > **Emails** / **Logs**: bounced address, suppressed recipient, quota reached?
   - **Domains**: is the domain still Verified? A changed DNS record breaks sending.
   - **API Keys**: was the key revoked or rotated without updating the Worker? (Section 3.)
3. Fix the cause. New bookings will send normally; the exhausted ones will not be retried
   automatically, which is why step 1 matters.
4. A typo'd customer email (bounce) needs no fix: the owner alert still went out; just call them.

## 3. Rotate a secret

Do this if a key may have leaked (GitHub secret-scanning alert, a laptop lost, a contractor leaving)
or on a schedule. `wrangler secret put` deploys a new Worker version with the new value immediately.

| Secret | Get the new value | Then |
| --- | --- | --- |
| `RESEND_API_KEY` | Resend > **API Keys > Create API key** (sending access, this domain) | `npx wrangler secret put RESEND_API_KEY`, submit a test booking, then delete the old key in Resend |
| `TURNSTILE_SECRET_KEY` | Dashboard > **Turnstile** > widget > find **Rotate secret key** | `npx wrangler secret put TURNSTILE_SECRET_KEY` right away; test a booking |
| `IP_HASH_SALT` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | `npx wrangler secret put IP_HASH_SALT`. Old rows keep old hashes; harmless |
| `OWNER_EMAIL`, `FROM_EMAIL`, `REPLY_TO_EMAIL`, `OPS_EMAIL` | the new address (`FROM_EMAIL` must be on the Resend-verified domain) | `npx wrangler secret put <NAME>`; test a booking |
| Gmail "Send mail as" password | a separate Resend API key | Gmail > Settings > Accounts and Import > Send mail as > edit info |

Check names with `npx wrangler secret list`. Never paste secret values into issues, commits or chat.
If a secret was committed to git, rotate it first; rewriting history does not un-leak it.

## 4. Roll back a bad deploy

Rollback switches traffic to an earlier Worker version within seconds. It does **not** undo D1
migrations or data, and the next push to `main` deploys again.

1. From a terminal:
   ```powershell
   npx wrangler deployments list          # find the last good version id
   npx wrangler rollback <version-id>     # omit the id to go back one version; add -m "reason"
   ```
   Or in the dashboard: Worker > **Deployments**, find the last good version, and choose rollback /
   deploy for that version.
2. Confirm `/api/health`, the homepage and a booking (smoke workflow).
3. Fix forward: `git revert` the bad commit on a branch, open a PR, let CI pass, merge. Workers Builds
   then deploys the fixed `main`. Until then, avoid merging other changes, which would redeploy the bad code.
4. If a **migration** caused it: write a new forward migration that undoes the change, test it locally
   (`npm run db:init:local`, `npm run test:e2e`), then `npm run db:init:remote`. D1 Time Travel can
   restore the database to a point in time if data was damaged:
   `npx wrangler d1 time-travel info superior-hvac` then `npx wrangler d1 time-travel restore superior-hvac --timestamp <ISO time>`.

## 5. Spam or a flood of bookings

- Turnstile and the rate limiter (3 per minute per IP) should stop most of it. Check Workers Logs
  for `turnstile` / `rate_limited` lines.
- Add or tighten the WAF rate-limiting rule on `/api/booking` (README launch checklist step 18), or
  switch the Turnstile widget mode to a stricter setting in the Turnstile dashboard.
