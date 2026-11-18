import { describe, expect, it } from "vitest";
import { analyticsBeacon } from "./analytics";

describe("analyticsBeacon", () => {
  it("is off when no token is set", () => {
    expect(analyticsBeacon(undefined)).toBeUndefined();
    expect(analyticsBeacon("  ")).toBeUndefined();
  });
  it("builds the Cloudflare beacon script props", () => {
    expect(analyticsBeacon("abc123")).toEqual({
      src: "https://static.cloudflareinsights.com/beacon.min.js",
      "data-cf-beacon": '{"token":"abc123"}',
    });
  });
});
