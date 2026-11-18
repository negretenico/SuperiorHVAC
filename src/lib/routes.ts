/**
 * Every statically generated route, derived from config. generateStaticParams and sitemap.ts
 * both read from here so the sitemap can never drift from what's built.
 */
import { business, type ServiceArea } from "../config/business";

export const STATIC_ROUTES = ["/", "/book/", "/privacy/"] as const;

export const servicePath = (slug: string) => `/services/${slug}/`;
export const areaPath = (slug: string) => `/areas/${slug}/`;
/** The booking flow reads ?service=<slug> to preselect step 1. */
export const bookPath = (serviceSlug?: string) =>
  serviceSlug ? `/book/?service=${encodeURIComponent(serviceSlug)}` : "/book/";

export const serviceParams = () => business.services.map((s) => ({ slug: s.slug }));
export const findService = (slug: string) => business.services.find((s) => s.slug === slug);

/** Only areas with a unique description get a page (no thin doorway pages). */
export const areaPages = (areas: ServiceArea[] = business.serviceAreas) =>
  areas.filter((a) => typeof a.description === "string" && a.description.trim().length > 0);
export const areaParams = (areas?: ServiceArea[]) => areaPages(areas).map((a) => ({ slug: a.slug }));
export const findArea = (slug: string, areas?: ServiceArea[]) => areaPages(areas).find((a) => a.slug === slug);

export function allRoutes(): string[] {
  return [
    ...STATIC_ROUTES,
    ...business.services.map((s) => servicePath(s.slug)),
    ...areaPages().map((a) => areaPath(a.slug)),
  ];
}
