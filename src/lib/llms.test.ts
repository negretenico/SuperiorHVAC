import { describe, expect, it } from "vitest";
import { business, todo, type Business } from "../config/business";
import { llmsTxt } from "./llms";

describe("llmsTxt", () => {
  const txt = llmsTxt(business);

  it("starts with the business name as the H1 and a one-line summary", () => {
    const [h1, , summary = ""] = txt.split("\n");
    expect(h1).toBe(`# ${business.name}`);
    expect(summary.startsWith("> ")).toBe(true);
    expect(summary).toContain(business.address.city);
  });

  it("states the contact facts exactly as configured", () => {
    expect(txt).toContain(business.phoneDisplay);
    expect(txt).toContain(business.email);
    expect(txt).toContain(business.about);
  });

  it("lists every service and service area", () => {
    for (const s of business.services) {
      expect(txt).toContain(`[${s.name}](https://superiorhvacoh.com/services/${s.slug}/)`);
      expect(txt).toContain(s.summary);
    }
    for (const a of business.serviceAreas) expect(txt).toContain(a.name);
  });

  it("links the booking page with an absolute URL", () => {
    expect(txt).toContain("https://superiorhvacoh.com/book/");
  });

  it("never leaks todo() values", () => {
    const withTodos: Business = { ...business, socials: { ...business.socials, google: todo("gbp") } };
    expect(llmsTxt(withTodos)).not.toContain("__todo");
    expect(llmsTxt(withTodos)).not.toContain("[object Object]");
  });
});
