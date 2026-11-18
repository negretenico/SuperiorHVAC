import { describe, expect, it } from "vitest";
import { business } from "../../src/config/business";
import type { StoredBooking } from "../contracts";
import { customerConfirmation, escapeHtml, formatUsPhone, ownerAlert } from "./messages";

function booking(over: Partial<StoredBooking> = {}): StoredBooking {
  return {
    id: "bk_1",
    createdAt: "2026-11-17T15:00:00.000Z",
    ipHash: "deadbeef",
    service: "ac-repair",
    details: "Blowing warm air since Tuesday.",
    timeWindow: "morning",
    name: "Pat Example",
    phone: "+14195550142",
    email: "pat@example.com",
    street: "12 Main St",
    zip: "44857",
    ...over,
  };
}

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;");
  });
});

describe("formatUsPhone", () => {
  it("formats E.164 like the business phone", () => {
    expect(formatUsPhone("+14195550142")).toBe("419-555-0142");
  });
});

describe("ownerAlert", () => {
  it("has a scannable subject with the service name and customer name", () => {
    expect(ownerAlert(booking()).subject).toBe("New request: AC Repair, Pat Example");
  });

  it("puts every fact the owner needs in the plain-text body", () => {
    const { text } = ownerAlert(booking());
    for (const s of ["Pat Example", "AC Repair", "419-555-0142", "12 Main St", "44857", "Morning", "Blowing warm air since Tuesday.", "pat@example.com"]) {
      expect(text).toContain(s);
    }
    expect(text).not.toContain("deadbeef"); // no ip hash
  });

  it("has a tappable phone link in the HTML", () => {
    expect(ownerAlert(booking()).html).toContain('href="tel:+14195550142"');
  });

  it("handles a booking without street or details", () => {
    const { text, html } = ownerAlert(booking({ street: "", details: "", timeWindow: "asap" }));
    expect(text).toContain("44857");
    expect(text).toMatch(/as soon as possible/i);
    expect(text).not.toContain("undefined");
    expect(html).not.toContain("undefined");
  });

  it("escapes user content in the HTML", () => {
    const { html } = ownerAlert(
      booking({ name: `<script>alert(1)</script>`, details: `"><img src=x onerror=alert(1)>`, street: "1 & 2 <St>" }),
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("1 &amp; 2 &lt;St&gt;");
  });

  it("keeps the subject on one line", () => {
    expect(ownerAlert(booking({ name: "Pat\r\nBcc: evil@example.com" })).subject).not.toMatch(/[\r\n]/);
  });
});

describe("customerConfirmation", () => {
  it("is a warm note saying we'll call to confirm", () => {
    const { subject, text } = customerConfirmation(booking());
    expect(subject).toContain(business.name);
    expect(text).toMatch(/^Hi Pat,/);
    expect(text).toMatch(/got your request/i);
    expect(text).toMatch(/call/i);
    expect(text).toContain("AC Repair");
    expect(text).toContain(business.phoneDisplay);
  });

  it("links the business phone in the HTML", () => {
    expect(customerConfirmation(booking()).html).toContain(`href="tel:${business.phoneE164}"`);
  });

  it("escapes user content in the HTML", () => {
    const { html } = customerConfirmation(booking({ name: "<b>Pat</b>" }));
    expect(html).not.toContain("<b>Pat</b>");
    expect(html).toContain("&lt;b&gt;Pat&lt;/b&gt;");
  });
});
