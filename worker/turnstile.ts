/**
 * Server-side Cloudflare Turnstile verification (siteverify).
 *
 * Test keys (https://developers.cloudflare.com/turnstile/troubleshooting/testing/):
 * - Secret that always passes: 1x0000000000000000000000000000000AA (.dev.vars.example, e2e)
 * - Secret that always fails:  2x0000000000000000000000000000000AA
 * - Site keys for the widget:  1x00000000000000000000AA (always passes), 2x00000000000000000000AB (always blocks)
 */
export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface VerifyTurnstileOptions {
  secret: string;
  token: string;
  /** Client IP (cf-connecting-ip), sent as remoteip when known. */
  ip: string | null;
  fetch?: typeof fetch;
}

/** true = human verified; false = rejected. Throws on network errors and non-200 responses. */
export async function verifyTurnstile({ secret, token, ip, fetch: fetchFn = fetch }: VerifyTurnstileOptions): Promise<boolean> {
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set("remoteip", ip);
  const res = await fetchFn(SITEVERIFY_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) throw new Error(`Turnstile siteverify returned HTTP ${res.status}`);
  const data = (await res.json()) as { success?: unknown };
  return data.success === true;
}
