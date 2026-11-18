import type { Metadata } from "next";
import { business as defaultBusiness, type Business } from "../config/business";
import { filled } from "./todo";

/** Used until business.siteUrl is filled in. `npm run check:launch` blocks deploy while it's todo. */
export const FALLBACK_SITE_URL = "https://superior-hvac.example";

/** Origin with no trailing slash, e.g. "https://superiorhvacoh.com". */
export function siteUrl(b: Business = defaultBusiness): string {
  return (filled(b.siteUrl) ?? FALLBACK_SITE_URL).replace(/\/+$/, "");
}

/** Leading and trailing slash, matching `trailingSlash: true`. */
export function normalizePath(path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}/` : "/";
}

export function absoluteUrl(path: string, b: Business = defaultBusiness): string {
  return `${siteUrl(b)}${normalizePath(path)}`;
}

export interface PageMetaInput {
  title: string;
  description: string;
  path: string;
}

/** Per-page metadata: unique title, description, absolute canonical, Open Graph, Twitter. */
export function pageMetadata({ title, description, path }: PageMetaInput): Metadata {
  const fullTitle = `${title} | ${defaultBusiness.name}`;
  const url = absoluteUrl(path);
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: defaultBusiness.name,
      type: "website",
      locale: "en_US",
    },
    twitter: { card: "summary", title: fullTitle, description },
  };
}
