import { describe, expect, it } from "vitest";
import { business, todo, type Business } from "../config/business";
import { absoluteUrl, FALLBACK_SITE_URL, normalizePath, pageMetadata, siteUrl } from "./seo";

const withSite = (siteUrl: Business["siteUrl"]): Business => ({ ...business, siteUrl });

describe("siteUrl", () => {
  it("uses the configured domain without a trailing slash", () => {
    expect(siteUrl(withSite("https://superiorhvacoh.com/"))).toBe("https://superiorhvacoh.com");
    expect(siteUrl(withSite("https://superiorhvacoh.com"))).toBe("https://superiorhvacoh.com");
  });

  it("falls back to a clearly fake domain while the domain is todo()", () => {
    expect(siteUrl(withSite(todo("domain")))).toBe(FALLBACK_SITE_URL);
    expect(FALLBACK_SITE_URL).toBe("https://superior-hvac.example");
  });
});

describe("normalizePath", () => {
  it.each([
    ["/", "/"],
    ["", "/"],
    ["services/ac-repair", "/services/ac-repair/"],
    ["/privacy", "/privacy/"],
    ["/book/", "/book/"],
  ])("%s -> %s", (input, out) => expect(normalizePath(input)).toBe(out));
});

describe("absoluteUrl", () => {
  it("joins the site URL and a normalized path", () => {
    expect(absoluteUrl("/privacy", withSite("https://a.com/"))).toBe("https://a.com/privacy/");
    expect(absoluteUrl("/", withSite("https://a.com"))).toBe("https://a.com/");
  });
});

describe("pageMetadata", () => {
  const md = pageMetadata({ title: "AC Repair", description: "Fix it.", path: "/services/ac-repair" });

  it("builds a unique '… | Superior HVAC' title", () => {
    expect(md.title).toEqual({ absolute: `AC Repair | ${business.name}` });
  });

  it("sets description and an absolute canonical with a trailing slash", () => {
    expect(md.description).toBe("Fix it.");
    expect(md.alternates?.canonical).toBe(`${siteUrl()}/services/ac-repair/`);
  });

  it("fills openGraph and twitter to match", () => {
    expect(md.openGraph).toMatchObject({
      title: `AC Repair | ${business.name}`,
      description: "Fix it.",
      url: `${siteUrl()}/services/ac-repair/`,
      siteName: business.name,
      type: "website",
      locale: "en_US",
    });
    expect(md.twitter).toMatchObject({ card: "summary", title: `AC Repair | ${business.name}`, description: "Fix it." });
  });
});
