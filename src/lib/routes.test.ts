import { describe, expect, it } from "vitest";
import { business, type ServiceArea } from "../config/business";
import { allRoutes, areaPages, areaParams, findArea, findService, serviceParams, STATIC_ROUTES } from "./routes";
import sitemap from "../app/sitemap";
import robots from "../app/robots";
import { absoluteUrl, siteUrl } from "./seo";

describe("serviceParams", () => {
  it("has one entry per configured service", () => {
    expect(serviceParams()).toEqual(business.services.map((s) => ({ slug: s.slug })));
  });
});

describe("areaPages", () => {
  const areas: ServiceArea[] = [
    { slug: "a", name: "A", description: "About A." },
    { slug: "b", name: "B" },
    { slug: "c", name: "C", description: "   " },
  ];

  it("only includes areas with a real description", () => {
    expect(areaPages(areas).map((a) => a.slug)).toEqual(["a"]);
    expect(areaParams(areas)).toEqual([{ slug: "a" }]);
  });

  it("findArea will not find an area without a description", () => {
    expect(findArea("b", areas)).toBeUndefined();
    expect(findArea("a", areas)?.name).toBe("A");
  });

  it("every configured town has a unique description (MVP)", () => {
    const descs = business.serviceAreas.map((a) => a.description);
    expect(descs.every((d) => typeof d === "string" && d.length > 40)).toBe(true);
    expect(new Set(descs).size).toBe(descs.length);
  });
});

describe("findService", () => {
  it("looks up by slug", () => {
    expect(findService("ac-repair")?.name).toBe("AC Repair");
    expect(findService("nope")).toBeUndefined();
  });
});

describe("allRoutes", () => {
  it("lists static pages, every service page and every generated area page", () => {
    expect(allRoutes()).toEqual([
      ...STATIC_ROUTES,
      ...business.services.map((s) => `/services/${s.slug}/`),
      ...areaPages().map((a) => `/areas/${a.slug}/`),
    ]);
    expect(STATIC_ROUTES).toEqual(["/", "/book/", "/privacy/"]);
  });

  it("all routes end with a slash and are unique", () => {
    const r = allRoutes();
    expect(r.every((p) => p.startsWith("/") && p.endsWith("/"))).toBe(true);
    expect(new Set(r).size).toBe(r.length);
  });
});

describe("sitemap", () => {
  it("has exactly one absolute entry per generated route", () => {
    expect(sitemap().map((e) => e.url)).toEqual(allRoutes().map((p) => absoluteUrl(p)));
  });
});

describe("robots", () => {
  it("allows everything and points at the sitemap", () => {
    const r = robots();
    expect(r.rules).toEqual({ userAgent: "*", allow: "/" });
    expect(r.sitemap).toBe(`${siteUrl()}/sitemap.xml`);
  });
});
