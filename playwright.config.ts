import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against the real Worker (`wrangler dev`) serving the static export, with:
 * - local D1, migrated by e2e/prepare.mts (which also builds ./out if missing)
 * - Turnstile always-pass test keys (.dev.vars.e2e)
 * - NOTIFIER=log, so no real email is ever sent
 * Set E2E_BASE_URL to test an already-running server (or production) instead. See e2e/README.md.
 */
const PORT = Number(process.env.E2E_PORT ?? 8787);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/** API specs need no browser and must run once (POST /api/booking is rate limited per IP). */
const API_SPECS = /api\.spec\.ts$/;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }], ["list"]] : [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "api", testMatch: API_SPECS },
    { name: "mobile-chrome", testIgnore: API_SPECS, use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", testIgnore: API_SPECS, use: { ...devices["iPhone 15"] } },
    { name: "desktop", testIgnore: API_SPECS, use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `node --experimental-strip-types --no-warnings e2e/prepare.mts && npx wrangler dev --env e2e --port ${PORT} --env-file .dev.vars.e2e`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        // First run may include `next build`.
        timeout: 300_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
