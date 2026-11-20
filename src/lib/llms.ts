/**
 * /llms.txt (https://llmstxt.org): a plain Markdown summary of the business for AI assistants
 * and answer engines. Built only from src/config/business.ts, like the JSON-LD.
 */
import { business as defaultBusiness, type Business } from "../config/business";
import { areaPages, areaPath, bookPath, servicePath } from "./routes";
import { filled } from "./todo";
import { absoluteUrl, siteUrl } from "./seo";

export function llmsTxt(b: Business = defaultBusiness): string {
  const url = (path: string) => absoluteUrl(path, b);
  const towns = b.serviceAreas.map((a) => a.name);
  const townList = towns.length > 1 ? `${towns.slice(0, -1).join(", ")} and ${towns.at(-1)}` : towns.join("");
  const withPage = new Set(areaPages(b.serviceAreas).map((a) => a.slug));
  const sameAs = [b.socials.facebook, filled(b.socials.google)].filter((s): s is string => !!s);

  const lines = [
    `# ${b.name}`,
    "",
    `> ${b.legalName ?? b.name} is a family-run heating and air conditioning (HVAC) company based in ${b.address.city}, ${b.address.region}, serving ${townList} and the rest of ${b.regionLabel}.`,
    "",
    b.about,
    "",
    "## Contact",
    "",
    `- Phone: ${b.phoneDisplay}`,
    `- Email: ${b.email}`,
    `- Request service online: ${url(bookPath())}`,
    `- Website: ${siteUrl(b)}/`,
    ...sameAs.map((s) => `- Also at: ${s}`),
    "",
    "## Services",
    "",
    ...b.services.map((s) => `- [${s.name}](${url(servicePath(s.slug))}): ${s.summary}`),
    "",
    "## Service area",
    "",
    ...b.serviceAreas.map((a) =>
      withPage.has(a.slug) ? `- [${a.name}, ${b.address.region}](${url(areaPath(a.slug))})` : `- ${a.name}, ${b.address.region}`,
    ),
    `- Surrounding areas of ${b.regionLabel}`,
    "",
  ];
  return lines.join("\n");
}
