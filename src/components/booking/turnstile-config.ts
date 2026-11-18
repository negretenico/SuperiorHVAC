/**
 * Cloudflare Turnstile client settings.
 *
 * The site key is public and baked in at build time from NEXT_PUBLIC_TURNSTILE_SITE_KEY.
 * When it is unset (local dev, CI, e2e) we fall back to Cloudflare's documented test
 * site key that ALWAYS PASSES: 1x00000000000000000000AA. It pairs with the always-pass
 * test secret 1x0000000000000000000000000000000AA used in .dev.vars.e2e.
 * Other test site keys: 2x00000000000000000000AB always fails (useful to exercise the
 * error path), 3x00000000000000000000FF forces an interactive challenge.
 * Production MUST set NEXT_PUBLIC_TURNSTILE_SITE_KEY to the real key at build time.
 */
export const TURNSTILE_TEST_SITE_KEY_PASS = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SITE_KEY_FAIL = "2x00000000000000000000AB";

export const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function resolveSiteKey(value: string | undefined): string {
  const v = value?.trim();
  return v ? v : TURNSTILE_TEST_SITE_KEY_PASS;
}

// Must be read as a literal `process.env.NEXT_PUBLIC_…` so Next inlines it into the client bundle.
export const TURNSTILE_SITE_KEY = resolveSiteKey(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
