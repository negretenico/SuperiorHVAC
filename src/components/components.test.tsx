import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { business, todo } from "../config/business";
import { Fill } from "./Fill";
import { PhoneLink } from "./PhoneLink";
import { JsonLd } from "./JsonLd";
import { Testimonials } from "./home/Testimonials";

describe("<Fill>", () => {
  const render = (value: unknown, env: string) =>
    renderToStaticMarkup(
      <Fill value={value as string} env={env}>
        {(v) => <p>{v}</p>}
      </Fill>,
    );

  it("renders the value", () => {
    expect(render("Hi", "production")).toBe("<p>Hi</p>");
  });
  it("renders nothing for todo() in production", () => {
    expect(render(todo("bio"), "production")).toBe("");
  });
  it("renders a TODO marker in dev", () => {
    expect(render(todo("bio"), "development")).toContain("TODO: bio");
  });
});

describe("<PhoneLink>", () => {
  it("is a tel: link showing the display number", () => {
    expect(renderToStaticMarkup(<PhoneLink />)).toBe(
      `<a class="num" href="tel:${business.phoneE164}">${business.phoneDisplay}</a>`,
    );
  });
  it("keeps the number in the accessible name when labelled", () => {
    const html = renderToStaticMarkup(<PhoneLink>Call</PhoneLink>);
    expect(html).toContain(`href="tel:${business.phoneE164}"`);
    expect(html).toContain(`aria-label="Call ${business.phoneDisplay}"`);
  });
});

describe("<Testimonials>", () => {
  it("renders nothing when there are none", () => {
    expect(renderToStaticMarkup(<Testimonials items={[]} index="03" />)).toBe("");
  });
  it("renders real quotes when present", () => {
    const html = renderToStaticMarkup(<Testimonials items={[{ author: "Pat", town: "Huron", quote: "Fast." }]} index="03" />);
    expect(html).toContain("Fast.");
    expect(html).toContain("Pat, Huron");
  });
});

describe("<JsonLd>", () => {
  it("renders an escaped ld+json script", () => {
    const html = renderToStaticMarkup(<JsonLd data={{ a: "</script>" }} />);
    expect(html).toMatch(/^<script type="application\/ld\+json">/);
    expect(html).not.toContain("</script><");
  });
});
