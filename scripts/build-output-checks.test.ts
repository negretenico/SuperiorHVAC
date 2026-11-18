import { describe, expect, it } from "vitest";
import { checkPage, phoneOutsideTelLinks } from "./build-output-checks.ts";

const PHONE = "419-706-1724";
const LD = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"HVACBusiness","name":"X"}</script>`;
const page = (body: string, head = `<link rel="canonical" href="https://x/"/><meta name="description" content="Hi"/>`) =>
  `<html><head>${head}</head><body>${LD}${body}</body></html>`;

describe("phoneOutsideTelLinks", () => {
  it("accepts numbers inside tel: links", () => {
    expect(phoneOutsideTelLinks(`<p>Call <a class="num" href="tel:+14197061724">${PHONE}</a></p>`, PHONE)).toBe(0);
  });
  it("flags bare numbers and numbers in non-tel links", () => {
    expect(phoneOutsideTelLinks(`<p>Call ${PHONE}</p>`, PHONE)).toBe(1);
    expect(phoneOutsideTelLinks(`<a href="/x">${PHONE}</a>`, PHONE)).toBe(1);
  });
  it("ignores scripts, styles, head and attributes", () => {
    expect(
      phoneOutsideTelLinks(
        `<head><meta content="${PHONE}"></head><a aria-label="Call ${PHONE}" href="tel:+1">Call</a><script>"${PHONE}"</script>`,
        PHONE,
      ),
    ).toBe(0);
  });
});

describe("checkPage", () => {
  it("passes a well-formed page", () => {
    expect(checkPage(page(`<h1>Hi</h1>`), { phone: PHONE, isNotFound: false })).toEqual([]);
  });
  it("reports h1 count, missing canonical/description, todo leaks, bad phone", () => {
    const errs = checkPage(page(`<h1>a</h1><h1>b</h1>TODO: x ${PHONE}`, ""), { phone: PHONE, isNotFound: false });
    expect(errs.join("\n")).toMatch(/h1/);
    expect(errs.join("\n")).toMatch(/canonical/);
    expect(errs.join("\n")).toMatch(/description/);
    expect(errs.join("\n")).toMatch(/TODO/);
    expect(errs.join("\n")).toMatch(/tel:/);
  });
  it("requires parseable HVACBusiness JSON-LD", () => {
    const html = `<html><head><link rel="canonical" href="x"/><meta name="description" content="d"/></head><body><h1>x</h1><script type="application/ld+json">{bad</script></body></html>`;
    expect(checkPage(html, { phone: PHONE, isNotFound: false }).join()).toMatch(/JSON-LD/);
  });
  it("does not require a canonical on the 404 page", () => {
    expect(checkPage(page(`<h1>Gone</h1>`, `<meta name="description" content="d"/>`), { phone: PHONE, isNotFound: true })).toEqual([]);
  });
});
