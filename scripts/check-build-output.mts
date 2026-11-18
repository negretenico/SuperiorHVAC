/**
 * Run after `npm run build`. Scans out/**\/*.html and fails if any page breaks the SEO/a11y/NAP rules:
 * one <h1>, canonical + description, parseable HVACBusiness JSON-LD, no todo leaks, every phone
 * number in visible text inside a tel: link, and /areas/ pages only for towns with a description.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { business } from "../src/config/business.ts";
import { checkPage } from "./build-output-checks.ts";

const OUT = "out";
if (!existsSync(OUT)) {
  console.error("check-build-output ✗ out/ not found. Run `npm run build` first.");
  process.exit(1);
}

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "_next" ? [] : htmlFiles(p);
    return name.endsWith(".html") ? [p] : [];
  });
}

const failures: string[] = [];
const files = htmlFiles(OUT);
for (const file of files) {
  const rel = relative(OUT, file).split(sep).join("/");
  const isNotFound = rel === "404.html" || rel.startsWith("404/") || rel.startsWith("_not-found/");
  for (const e of checkPage(readFileSync(file, "utf8"), { phone: business.phoneDisplay, isNotFound })) {
    failures.push(`${rel}: ${e}`);
  }
}

// Area pages: exactly the towns with a description.
const expectedAreas = business.serviceAreas.filter((a) => a.description?.trim()).map((a) => a.slug).sort();
const areasDir = join(OUT, "areas");
const builtAreas = existsSync(areasDir) ? readdirSync(areasDir).filter((d) => existsSync(join(areasDir, d, "index.html"))).sort() : [];
if (JSON.stringify(builtAreas) !== JSON.stringify(expectedAreas)) {
  failures.push(`areas: built [${builtAreas}] but expected [${expectedAreas}] (towns with a description)`);
}

// Every service page and the fixed pages exist; 404.html exists for the Worker.
const required = ["index.html", "privacy/index.html", "404.html", ...business.services.map((s) => `services/${s.slug}/index.html`)];
if (existsSync("src/app/book")) required.push("book/index.html");
for (const r of required) if (!existsSync(join(OUT, r))) failures.push(`missing out/${r}`);

if (failures.length) {
  console.error(`check-build-output ✗ ${failures.length} problem(s) in ${files.length} page(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`check-build-output ✓ ${files.length} page(s) OK`);
