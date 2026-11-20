import { describe, expect, it } from "vitest";
import { business } from "../config/business";
import { securityTxt } from "./securitytxt";

describe("securityTxt (RFC 9116)", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  const txt = securityTxt(business, now);

  it("has a mailto Contact from config", () => {
    expect(txt).toContain(`Contact: mailto:${business.email}`);
  });

  it("expires one year after the build, in ISO 8601", () => {
    expect(txt).toContain("Expires: 2027-11-19T12:00:00.000Z");
  });

  it("names its canonical URL on the real domain", () => {
    expect(txt).toContain("Canonical: https://superiorhvacoh.com/.well-known/security.txt");
    expect(txt).toContain("Preferred-Languages: en");
  });

  it("ends with a newline", () => {
    expect(txt.endsWith("\n")).toBe(true);
  });
});
