/**
 * Gets the local stack ready for `wrangler dev` before Playwright starts it:
 *   1. applies D1 migrations to the local database (.wrangler/state)
 *   2. builds the static export (./out) if it is missing, or always when E2E_REBUILD=1
 *
 * Runs as the first half of Playwright's webServer command (see playwright.config.ts),
 * because Playwright starts the webServer BEFORE globalSetup, and wrangler dev needs ./out.
 * Also runnable by hand: `npm run e2e:prepare`.
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";

/** Cloudflare's public Turnstile test site key that always passes (safe to commit). */
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

function run(cmd: string, env: NodeJS.ProcessEnv = process.env): void {
  console.log(`[e2e:prepare] $ ${cmd}`);
  execSync(cmd, { stdio: "inherit", env });
}

const hasMigrations = existsSync("db/migrations") && readdirSync("db/migrations").some((f) => f.endsWith(".sql"));
if (hasMigrations) {
  // CI=1 keeps wrangler from asking for confirmation.
  run("npx wrangler d1 migrations apply superior-hvac --local", { ...process.env, CI: "1" });
} else {
  console.warn("[e2e:prepare] no db/migrations/*.sql yet; skipping local D1 migrations.");
}

if (process.env.E2E_REBUILD === "1" || !existsSync("out/index.html")) {
  run("npm run build", {
    ...process.env,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? TURNSTILE_TEST_SITE_KEY,
  });
} else {
  console.log("[e2e:prepare] using existing ./out (set E2E_REBUILD=1 to rebuild).");
}
