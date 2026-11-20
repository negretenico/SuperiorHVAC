/** /.well-known/security.txt (RFC 9116): who to tell about a security problem. Built from config. */
import { business as defaultBusiness, type Business } from "../config/business";
import { siteUrl } from "./seo";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** `now` is the build time; Expires is one year later, so any redeploy within a year refreshes it. */
export function securityTxt(b: Business = defaultBusiness, now: Date = new Date()): string {
  return [
    `Contact: mailto:${b.email}`,
    `Expires: ${new Date(now.getTime() + ONE_YEAR_MS).toISOString()}`,
    "Preferred-Languages: en",
    `Canonical: ${siteUrl(b)}/.well-known/security.txt`,
    "",
  ].join("\n");
}
