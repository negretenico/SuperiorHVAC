/**
 * Tell IndexNow search engines (Bing, which also powers ChatGPT search and Copilot; Yandex; others)
 * that every page in the sitemap is new or changed. Run after a deploy that changes content:
 *   npm run indexnow
 * The key is public by design: public/<KEY>.txt proves we own the domain.
 */
import { existsSync } from "node:fs";
import { allRoutes } from "../src/lib/routes.ts";
import { absoluteUrl, siteUrl } from "../src/lib/seo.ts";

const KEY = "8ad1218d4979a42e825567c74c82697f";

if (!existsSync(`public/${KEY}.txt`)) {
  console.error(`indexnow ✗ public/${KEY}.txt is missing.`);
  process.exit(1);
}

const host = new URL(siteUrl()).host;
const urlList = allRoutes().map((p) => absoluteUrl(p));
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key: KEY, keyLocation: `${siteUrl()}/${KEY}.txt`, urlList }),
});

if (res.ok) {
  console.log(`indexnow ✓ ${res.status}: submitted ${urlList.length} URLs for ${host}.`);
} else {
  console.error(`indexnow ✗ ${res.status} ${await res.text()}`);
  process.exit(1);
}
