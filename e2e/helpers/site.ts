import path from "node:path";
import type { APIRequestContext, ConsoleMessage, Page, TestInfo } from "@playwright/test";
import { business } from "../../src/config/business";

export const TEL_HREF = `tel:${business.phoneE164}`;
export const PHONE_DISPLAY = business.phoneDisplay;

/** Third-party frames whose console noise and a11y we do not own (Turnstile widget). */
export const THIRD_PARTY_FRAME = 'iframe[src*="challenges.cloudflare.com"]';
const THIRD_PARTY_ORIGINS = ["https://challenges.cloudflare.com"];

/** Fetches /sitemap.xml from the running site and returns every <loc> as an absolute URL. */
export async function readSitemap(request: APIRequestContext): Promise<string[]> {
  const res = await request.get("/sitemap.xml");
  if (res.status() !== 200) throw new Error(`/sitemap.xml returned ${res.status()}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => decodeXml(m[1]!));
  if (locs.length === 0) throw new Error("/sitemap.xml has no <loc> entries");
  if (/<sitemapindex/i.test(xml)) throw new Error("sitemap index files are not supported by the crawl; emit a single urlset");
  return [...new Set(locs)];
}

function decodeXml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

/** Collects console errors and uncaught page errors, ignoring third-party frames. */
export function trackConsoleErrors(page: Page): { take(): string[] } {
  let errors: string[] = [];
  const isThirdParty = (msg: ConsoleMessage) => THIRD_PARTY_ORIGINS.some((o) => msg.location().url.startsWith(o));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !isThirdParty(msg)) errors.push(`console.error: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`uncaught: ${err.message}`));
  return {
    take() {
      const out = errors;
      errors = [];
      return out;
    },
  };
}

/** Every @type found anywhere in the page's JSON-LD (handles arrays, @graph and nesting). */
export async function jsonLdTypes(page: Page): Promise<{ types: string[]; parseErrors: string[] }> {
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types: string[] = [];
  const parseErrors: string[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    const t = (node as Record<string, unknown>)["@type"];
    if (typeof t === "string") types.push(t);
    if (Array.isArray(t)) types.push(...t.filter((x): x is string => typeof x === "string"));
    Object.values(node).forEach(visit);
  };
  for (const [i, text] of raw.entries()) {
    try {
      visit(JSON.parse(text));
    } catch (err) {
      parseErrors.push(`JSON-LD block #${i + 1}: ${(err as Error).message}`);
    }
  }
  return { types, parseErrors };
}

/**
 * Finds every rendered text node containing the phone number and reports the ones that are not
 * inside <a href="tel:+1…">. Also reports tel: links that point anywhere else.
 */
export async function phoneProblems(page: Page): Promise<{ found: number; problems: string[] }> {
  return page.evaluate(
    ({ display, href }) => {
      const problems: string[] = [];
      let found = 0;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent?.includes(display)) continue;
        const el = node.parentElement;
        if (!el || el.closest("script, style, noscript, template")) continue;
        found++;
        const a = el.closest("a");
        if (a?.getAttribute("href") !== href) {
          problems.push(`phone text not inside <a href="${href}">: ${el.outerHTML.slice(0, 160)}`);
        }
      }
      for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href^="tel:"]')) {
        if (a.getAttribute("href") !== href) problems.push(`unexpected tel link: ${a.outerHTML.slice(0, 160)}`);
      }
      return { found, problems };
    },
    { display: PHONE_DISPLAY, href: TEL_HREF },
  );
}

/** true when the page is wider than the viewport (sideways scrolling on phones). */
export async function horizontalOverflow(page: Page): Promise<{ scrollWidth: number; innerWidth: number }> {
  return page.evaluate(() => ({
    scrollWidth: (document.scrollingElement ?? document.documentElement).scrollWidth,
    innerWidth: window.innerWidth,
  }));
}

/** test-results/screenshots/<project>/<path>.png, e.g. desktop/services/ac-repair.png, desktop/index.png */
export function screenshotPath(testInfo: TestInfo, pathname: string): string {
  const clean = pathname.replace(/^\/+|\/+$/g, "") || "index";
  const safe = clean.replace(/[^a-zA-Z0-9/_-]/g, "_");
  return path.join("test-results", "screenshots", testInfo.project.name, `${safe}.png`);
}
