import { describe, expect, it } from "vitest";
import { business, todo, type Business } from "../config/business";
import { breadcrumbJsonLd, businessId, businessJsonLd, serializeJsonLd, serviceJsonLd } from "./jsonld";
import { siteUrl } from "./seo";

const asJson = (v: unknown) => JSON.stringify(v);
const filledBiz: Business = {
  ...business,
  siteUrl: "https://superiorhvacoh.com",
  address: { ...business.address, street: "1 Main St", postalCode: "44857" },
  geo: { latitude: 41.24, longitude: -82.61 },
  hours: [{ days: ["Mo", "Tu"], opens: "08:00", closes: "17:00" }],
  socials: { facebook: "https://facebook.com/x", google: "https://g.page/x" },
  logo: "/logo.svg",
};

describe("businessJsonLd (current config, with todos)", () => {
  const ld = businessJsonLd();

  it("is an HVACBusiness with core NAP from config", () => {
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "HVACBusiness",
      "@id": businessId(),
      name: business.name,
      url: `${siteUrl()}/`,
      telephone: business.phoneE164,
      email: business.email,
    });
  });

  it("uses the legal name and the owner's about text as the description", () => {
    const ld = businessJsonLd() as Record<string, unknown>;
    expect(ld.legalName).toBe("Superior HVAC LLC");
    expect(ld.description).toBe(business.about);
    expect(String(ld.description)).toMatch(/^Superior HVAC LLC is a family-owned and operated/);
  });

  it("never leaks todo() placeholders", () => {
    expect(asJson(ld)).not.toContain("__todo");
  });

  it("omits todo address parts but keeps city/region/country", () => {
    expect(ld.address).toEqual({
      "@type": "PostalAddress",
      addressLocality: business.address.city,
      addressRegion: business.address.region,
      addressCountry: business.address.country,
    });
  });

  it("omits geo, hours, image, logo, priceRange while unset", () => {
    for (const k of ["geo", "openingHoursSpecification", "image", "logo", "priceRange"]) expect(ld).not.toHaveProperty(k);
  });

  it("lists every service area as a City plus the region", () => {
    expect(ld.areaServed).toEqual([
      ...business.serviceAreas.map((a) => ({ "@type": "City", name: `${a.name}, ${business.address.region}` })),
      { "@type": "Place", name: business.regionLabel },
    ]);
  });

  it("sameAs holds only defined socials", () => {
    expect(ld.sameAs).toEqual([business.socials.facebook]);
  });
});

describe("businessJsonLd (everything filled)", () => {
  const ld = businessJsonLd(filledBiz);

  it("includes street, ZIP, geo, hours, logo and image", () => {
    expect(ld.address).toMatchObject({ streetAddress: "1 Main St", postalCode: "44857" });
    expect(ld.geo).toEqual({ "@type": "GeoCoordinates", latitude: 41.24, longitude: -82.61 });
    expect(ld.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["https://schema.org/Monday", "https://schema.org/Tuesday"],
        opens: "08:00",
        closes: "17:00",
      },
    ]);
    expect(ld.logo).toBe("https://superiorhvacoh.com/logo.svg");
    expect(ld.image).toBe("https://superiorhvacoh.com/logo.svg");
    expect(ld.sameAs).toEqual(["https://facebook.com/x", "https://g.page/x"]);
    expect(ld["@id"]).toBe("https://superiorhvacoh.com/#business");
  });
});

describe("empty arrays are omitted", () => {
  it("drops sameAs, areaServed and hours when empty", () => {
    const ld = businessJsonLd({ ...business, socials: {}, serviceAreas: [], regionLabel: "", hours: [] });
    expect(ld).not.toHaveProperty("sameAs");
    expect(ld).not.toHaveProperty("openingHoursSpecification");
    expect(ld).not.toHaveProperty("areaServed");
  });
});

describe("serviceJsonLd", () => {
  const svc = business.services[0]!;
  const ld = serviceJsonLd(svc);

  it("is a Service provided by the business", () => {
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Service",
      name: svc.name,
      serviceType: svc.name,
      description: svc.summary,
      url: `${siteUrl()}/services/${svc.slug}/`,
      provider: { "@id": businessId() },
    });
    expect(ld.areaServed).toEqual(businessJsonLd().areaServed);
    expect(asJson(ld)).not.toContain("__todo");
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers items and uses absolute URLs", () => {
    expect(breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "AC Repair", path: "/services/ac-repair" }])).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl()}/` },
        { "@type": "ListItem", position: 2, name: "AC Repair", item: `${siteUrl()}/services/ac-repair/` },
      ],
    });
  });
});

describe("serializeJsonLd", () => {
  it("escapes characters that could close the script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>" });
  });

  it("refuses to serialize todo() placeholders", () => {
    expect(() => serializeJsonLd({ x: todo("nope") })).toThrow(/todo/i);
  });
});
