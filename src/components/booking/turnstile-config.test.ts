import { describe, expect, it } from "vitest";
import { TURNSTILE_SCRIPT_SRC, TURNSTILE_TEST_SITE_KEY_PASS, resolveSiteKey } from "./turnstile-config";

describe("resolveSiteKey", () => {
  it("uses the configured key", () => {
    expect(resolveSiteKey("0x4AAAAAAA-real")).toBe("0x4AAAAAAA-real");
  });
  it.each([undefined, "", "   "])("falls back to the always-pass test key for %j", (v) => {
    expect(resolveSiteKey(v)).toBe(TURNSTILE_TEST_SITE_KEY_PASS);
    expect(TURNSTILE_TEST_SITE_KEY_PASS).toBe("1x00000000000000000000AA");
  });
  it("loads the explicit-render script", () => {
    expect(TURNSTILE_SCRIPT_SRC).toBe("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit");
  });
});
