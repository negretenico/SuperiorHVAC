import { expect, test } from "@playwright/test";
import { expectHealthyPage } from "./helpers/page-checks";
import { readSitemap, trackConsoleErrors } from "./helpers/site";

/**
 * Visits every URL in the live /sitemap.xml on every device project. The URL list is only known
 * at run time, so each URL is a test.step with soft assertions: one run reports every failure.
 */
test("every sitemap URL is healthy", async ({ page, request }, testInfo) => {
  const locs = await readSitemap(request);
  test.setTimeout(30_000 + locs.length * 45_000);
  const consoleErrors = trackConsoleErrors(page);

  for (const loc of locs) {
    const sitemapUrl = new URL(loc);
    const pathname = sitemapUrl.pathname;
    const where = `${pathname} [${testInfo.project.name}]`;

    await test.step(pathname, async () => {
      consoleErrors.take(); // drop anything left from the previous page
      const res = await page.goto(pathname + sitemapUrl.search, { waitUntil: "load" });

      expect.soft(res?.status(), `${where}: HTTP status`).toBe(200);
      expect.soft(res?.request().redirectedFrom()?.url() ?? null, `${where}: sitemap URL must not redirect`).toBeNull();

      const description = await page.locator('meta[name="description"]').getAttribute("content").catch(() => null);
      expect.soft(description?.trim() ?? "", `${where}: meta description`).not.toBe("");

      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href").catch(() => null);
      expect.soft(canonical, `${where}: canonical link`).toBeTruthy();
      if (canonical) {
        const c = new URL(canonical, sitemapUrl);
        expect.soft(c.pathname, `${where}: canonical path matches sitemap path`).toBe(pathname);
        expect.soft(c.origin, `${where}: canonical origin matches sitemap origin`).toBe(sitemapUrl.origin);
      }

      await expectHealthyPage(page, testInfo, pathname, consoleErrors.take);
    });
  }
});
