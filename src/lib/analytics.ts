/**
 * Cloudflare Web Analytics (cookieless). The beacon is included only when
 * NEXT_PUBLIC_CF_ANALYTICS_TOKEN is set at BUILD time (it is inlined into the static HTML);
 * with no token, no analytics script is emitted at all.
 * Get the token from Cloudflare dashboard > Analytics & Logs > Web Analytics > Manage site.
 */
export function analyticsBeacon(token: string | undefined) {
  const t = token?.trim();
  if (!t) return undefined;
  return {
    src: "https://static.cloudflareinsights.com/beacon.min.js",
    "data-cf-beacon": JSON.stringify({ token: t }),
  };
}
