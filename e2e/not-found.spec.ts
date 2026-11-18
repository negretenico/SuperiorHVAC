import { expect, test } from "@playwright/test";
import { expectHealthyPage } from "./helpers/page-checks";
import { trackConsoleErrors } from "./helpers/site";

test("an unknown path serves the site's 404 page with status 404", async ({ page }, testInfo) => {
  const consoleErrors = trackConsoleErrors(page);
  const pathname = `/no-such-page-${Date.now().toString(36)}/`;
  const res = await page.goto(pathname);

  expect(res?.status()).toBe(404);
  expect(res?.headers()["content-type"] ?? "").toContain("text/html");
  // The site's own 404 (out/404.html), not a bare platform error: it has the site chrome and a way home.
  await expect(page.locator('a[href="/"]').first()).toBeVisible();

  // The browser logs "Failed to load resource: 404" for the document itself; that one is expected.
  const unexpected = () => consoleErrors.take().filter((e) => !/status of 404/.test(e));
  await expectHealthyPage(page, testInfo, "404", unexpected);
});
