import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** WCAG 2.0 + 2.1, levels A and AA. */
export const WCAG_21_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] as const;

/** Impacts that fail the build. Minor/moderate findings are printed but tolerated. */
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

export interface AxeOptions {
  /** CSS selectors to skip, e.g. third-party iframes such as the Turnstile widget. */
  exclude?: string[];
  /** Use expect.soft so a crawl keeps going and reports every page. */
  soft?: boolean;
}

/**
 * Runs axe-core against the current page and fails on any serious/critical WCAG 2.1 AA violation.
 * The failure message lists rule, impact, help URL and the first few offending selectors.
 */
export async function expectNoA11yViolations(page: Page, opts: AxeOptions = {}): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags([...WCAG_21_AA_TAGS]);
  for (const sel of opts.exclude ?? []) builder = builder.exclude(sel);
  const results = await builder.analyze();

  const blocking = results.violations.filter((v) => v.impact && BLOCKING_IMPACTS.has(v.impact));
  const minor = results.violations.filter((v) => !blocking.includes(v));
  if (minor.length) {
    console.warn(`[axe] ${page.url()}: ${minor.length} minor/moderate finding(s): ${minor.map((v) => v.id).join(", ")}`);
  }

  const report = blocking.map((v) => {
    const targets = v.nodes.slice(0, 5).map((n) => `      ${n.target.join(" ")}`).join("\n");
    return `  [${v.impact}] ${v.id}: ${v.help}\n    ${v.helpUrl}\n${targets}`;
  });
  const assertion = opts.soft ? expect.soft : expect;
  assertion(blocking, `axe found serious/critical violations on ${page.url()}:\n${report.join("\n")}`).toEqual([]);
}
