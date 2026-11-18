import type { MetadataRoute } from "next";
import { allRoutes } from "../lib/routes";
import { absoluteUrl } from "../lib/seo";

// Required for `output: "export"`: render to a static out/sitemap.xml at build time.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return allRoutes().map((path) => ({ url: absoluteUrl(path) }));
}
