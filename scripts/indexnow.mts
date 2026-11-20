/**
 * Tell IndexNow search engines (Bing, which also powers ChatGPT search and Copilot; Yandex; others)
 * that every page in the sitemap is new or changed. Run after a deploy that changes content:
 *   npm run indexnow
 * The key is public by design: public/<KEY>.txt proves we own the domain.
 */
import { existsSync, readFileSync } from "node:fs";

const KEY = "8ad1218d4979a42e825567c74c82697f";

if (!existsSync(`public/${KEY}.txt`) || !existsSync("out/sitemap.xml")) {
  console.error(`indexnow ✗ needs public/${KEY}.txt and a built out/sitemap.xml (run npm run build).`);
  process.exit(1);
}

// Submit exactly what the built (and deployed) sitemap lists.
const urlList = [...readFileSync("out/sitemap.xml", "utf8").matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]!);
const origin = new URL(urlList[0]!).origin;
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(origin).host, key: KEY, keyLocation: `${origin}/${KEY}.txt`, urlList }),
});
const host = new URL(origin).host;

if (res.ok) {
  console.log(`indexnow ✓ ${res.status}: submitted ${urlList.length} URLs for ${host}.`);
} else {
  console.error(`indexnow ✗ ${res.status} ${await res.text()}`);
  process.exit(1);
}
