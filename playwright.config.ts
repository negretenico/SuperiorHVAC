import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against the real Worker (`wrangler dev`) serving the static export, with:
 * - local D1 (`npm run db:init:local` first)
 * - Turnstile always-pass test keys (.dev.vars.e2e)
 * - NOTIFIER=log, so no real email is ever sent
 */
const PORT = Number(process.env.E2E_PORT ?? 8787);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 15"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx wrangler dev --port ${PORT} --env-file .dev.vars.e2e`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
