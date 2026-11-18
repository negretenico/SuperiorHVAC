/**
 * Pure checks over exported HTML (no deps, regex-level parsing of Next's predictable output).
 * Used by scripts/check-build-output.mts after `npm run build`.
 */

const stripNonVisible = (html: string) =>
  html
    .replace(/<head[\s>][\s\S]*?<\/head>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<template[\s\S]*?<\/template>/gi, "");

/** Counts occurrences of `phone` in visible text that are NOT inside an <a href="tel:…">. */
export function phoneOutsideTelLinks(html: string, phone: string): number {
  const body = stripNonVisible(html);
  const tokens = body.split(/(<[^>]+>)/);
  const anchors: boolean[] = []; // stack: is this <a> a tel: link?
  let bad = 0;
  for (const t of tokens) {
    if (t.startsWith("<")) {
      if (/^<a[\s>]/i.test(t)) anchors.push(/\shref="tel:[^"]+"/i.test(t));
      else if (/^<\/a\s*>/i.test(t)) anchors.pop();
      continue;
    }
    const count = t.split(phone).length - 1;
    if (count && !anchors.at(-1)) bad += count;
  }
  return bad;
}

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`, "i").exec(tag)?.[1];

export function checkPage(html: string, opts: { phone: string; isNotFound: boolean }): string[] {
  const errors: string[] = [];

  const h1s = html.match(/<h1[\s>]/gi)?.length ?? 0;
  if (h1s !== 1) errors.push(`expected exactly one <h1>, found ${h1s}`);

  const canonicalTag = html.match(/<link[^>]*rel="canonical"[^>]*>/i)?.[0];
  if (!opts.isNotFound && !(canonicalTag && attr(canonicalTag, "href"))) errors.push("missing canonical link");

  const descTag = html.match(/<meta[^>]*name="description"[^>]*>/i)?.[0];
  if (!(descTag && attr(descTag, "content")?.trim())) errors.push("missing meta description");

  const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((m) => m[1]!);
  const parsed: unknown[] = [];
  for (const raw of lds) {
    try {
      parsed.push(JSON.parse(raw));
    } catch {
      errors.push("JSON-LD block does not parse");
    }
  }
  if (!parsed.some((d) => (d as { "@type"?: string })?.["@type"] === "HVACBusiness"))
    errors.push("missing HVACBusiness JSON-LD");

  if (html.includes("__todo")) errors.push('contains "__todo" (a todo() value leaked)');
  if (html.includes("TODO:")) errors.push('contains "TODO:" marker (dev-only)');

  const bad = phoneOutsideTelLinks(html, opts.phone);
  if (bad) errors.push(`${bad} phone number occurrence(s) not inside a tel: link`);

  return errors;
}
