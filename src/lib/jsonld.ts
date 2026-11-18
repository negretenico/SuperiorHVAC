/** schema.org structured data, built only from src/config/business.ts. */
import { business as defaultBusiness, isTodo, type Business, type Service, type Weekday } from "../config/business";
import { filled } from "./todo";
import { absoluteUrl, siteUrl } from "./seo";

type Json = Record<string, unknown>;

const DAY: Record<Weekday, string> = {
  Mo: "Monday",
  Tu: "Tuesday",
  We: "Wednesday",
  Th: "Thursday",
  Fr: "Friday",
  Sa: "Saturday",
  Su: "Sunday",
};

/** Removes undefined, todo() values, empty strings and empty arrays (recursively). */
function compact<T extends Json>(obj: T): T {
  const out: Json = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === "" || isTodo(v)) continue;
    if (Array.isArray(v)) {
      const items = v.filter((x) => x !== undefined && !isTodo(x));
      if (items.length) out[k] = items;
      continue;
    }
    out[k] = v;
  }
  return out as T;
}

export const businessId = (b: Business = defaultBusiness) => `${siteUrl(b)}/#business`;

export function areaServed(b: Business = defaultBusiness): Json[] {
  return [
    ...b.serviceAreas.map((a) => ({ "@type": "City", name: `${a.name}, ${b.address.region}` })),
    ...(b.regionLabel ? [{ "@type": "Place", name: b.regionLabel }] : []),
  ];
}

export function businessJsonLd(b: Business = defaultBusiness): Json {
  const geo = filled(b.geo);
  const hours = filled(b.hours);
  const logo = filled(b.logo);
  const logoUrl = logo ? `${siteUrl(b)}/${logo.replace(/^\/+/, "")}` : undefined;
  return compact({
    "@context": "https://schema.org",
    "@type": "HVACBusiness",
    "@id": businessId(b),
    name: b.name,
    legalName: b.legalName,
    description: b.tagline,
    url: `${siteUrl(b)}/`,
    telephone: b.phoneE164,
    email: b.email,
    address: compact({
      "@type": "PostalAddress",
      streetAddress: filled(b.address.street),
      addressLocality: b.address.city,
      addressRegion: b.address.region,
      postalCode: filled(b.address.postalCode),
      addressCountry: b.address.country,
    }),
    geo: geo ? { "@type": "GeoCoordinates", latitude: geo.latitude, longitude: geo.longitude } : undefined,
    openingHoursSpecification: hours?.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days.map((d) => `https://schema.org/${DAY[d]}`),
      opens: h.opens,
      closes: h.closes,
    })),
    areaServed: areaServed(b),
    sameAs: [b.socials.facebook, filled(b.socials.google)],
    image: logoUrl,
    logo: logoUrl,
    foundingDate: b.foundedYear ? String(b.foundedYear) : undefined,
  });
}

export function serviceJsonLd(service: Service, b: Business = defaultBusiness): Json {
  const url = absoluteUrl(`/services/${service.slug}/`, b);
  return compact({
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: service.name,
    serviceType: service.name,
    description: service.summary,
    url,
    provider: { "@id": businessId(b) },
    areaServed: areaServed(b),
  });
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

/** Safe for inlining in <script type="application/ld+json">. Throws if a todo() slipped through. */
export function serializeJsonLd(data: unknown): string {
  const json = JSON.stringify(data);
  if (json.includes('"__todo"')) throw new Error("JSON-LD contains a todo() placeholder; filter it with filled()");
  return json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
