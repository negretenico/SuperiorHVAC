import type { FullConfig } from "@playwright/test";

/**
 * Runs once after the webServer is up (local) or against E2E_BASE_URL (remote).
 * Fails fast with a clear message instead of 100 confusing per-page failures.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) throw new Error("globalSetup: no baseURL configured");

  const checks: Array<[path: string, expect: (res: Response, body: string) => string | null]> = [
    ["/api/health", (res, body) => (res.ok && body.includes('"ok":true') ? null : `expected 200 {"ok":true}, got ${res.status} ${body.slice(0, 200)}`)],
    ["/sitemap.xml", (res, body) => (res.ok && body.includes("<loc>") ? null : `expected a sitemap with <loc> entries, got ${res.status}`)],
  ];

  for (const [path, check] of checks) {
    const url = new URL(path, baseURL).toString();
    let problem: string | null;
    try {
      const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
      problem = check(res, await res.text());
    } catch (err) {
      problem = `request failed: ${(err as Error).message}`;
    }
    if (problem) throw new Error(`globalSetup: ${url} ${problem}`);
  }
}
