import { expect, type Page, type TestInfo } from "@playwright/test";
import { expectNoA11yViolations } from "./axe";
import { THIRD_PARTY_FRAME, horizontalOverflow, jsonLdTypes, phoneProblems, screenshotPath } from "./site";

/**
 * Checks every page must pass, whatever its content. Uses soft assertions so one run reports
 * every problem on every page. Call after the page has loaded.
 */
export async function expectHealthyPage(
  page: Page,
  testInfo: TestInfo,
  pathname: string,
  consoleErrors: () => string[],
): Promise<void> {
  const where = `${pathname} [${testInfo.project.name}]`;

  await expect.soft(page.locator("h1"), `${where}: exactly one <h1>`).toHaveCount(1);
  expect.soft((await page.title()).trim(), `${where}: <title>`).not.toBe("");

  const ld = await jsonLdTypes(page);
  expect.soft(ld.parseErrors, `${where}: JSON-LD parses`).toEqual([]);
  expect.soft(ld.types, `${where}: JSON-LD includes @type HVACBusiness`).toContain("HVACBusiness");

  const phone = await phoneProblems(page);
  expect.soft(phone.problems, `${where}: every phone number is a tel: link`).toEqual([]);

  const { scrollWidth, innerWidth } = await horizontalOverflow(page);
  expect.soft(scrollWidth, `${where}: no horizontal overflow (viewport ${innerWidth}px)`).toBeLessThanOrEqual(innerWidth);

  await expectNoA11yViolations(page, { exclude: [THIRD_PARTY_FRAME], soft: true });

  await page.screenshot({ path: screenshotPath(testInfo, pathname), fullPage: true });

  // Last, so errors thrown by anything above are included.
  expect.soft(consoleErrors(), `${where}: no console errors`).toEqual([]);
}
