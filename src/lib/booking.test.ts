import { describe, expect, it } from "vitest";
import { LIMITS, validateBooking } from "./booking";
import { validBody } from "./booking.fixtures";

function errorsOf(body: unknown) {
  const r = validateBooking(body);
  if (r.ok) throw new Error("expected validation to fail");
  return r.errors;
}

describe("validateBooking", () => {
  it("accepts a valid payload and normalizes it", () => {
    const r = validateBooking(validBody());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toEqual({
      service: "ac-repair",
      details: "Blowing warm air since Tuesday.",
      timeWindow: "morning",
      name: "Pat Example",
      phone: "+14195550142",
      email: "pat@example.com",
      street: "12 Main St",
      zip: "44857",
    });
    expect(r.turnstileToken).toBe("pass");
    expect(r.honeypotTripped).toBe(false);
  });

  it("treats details and street as optional", () => {
    const r = validateBooking(validBody({ details: undefined, street: undefined }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.details).toBe("");
      expect(r.data.street).toBe("");
    }
  });

  it.each([
    ["(419) 555-0142", "+14195550142"],
    ["419.555.0142", "+14195550142"],
    ["4195550142", "+14195550142"],
    ["+1 419 555 0142", "+14195550142"],
    ["1-419-555-0142", "+14195550142"],
  ])("normalizes phone %s → %s", (input, expected) => {
    const r = validateBooking(validBody({ phone: input }));
    expect(r.ok && r.data.phone).toBe(expected);
  });

  it.each(["555-0142", "12345678901234", "abc", "", "+44 20 7946 0958"])("rejects phone %j", (phone) => {
    expect(errorsOf(validBody({ phone })).phone).toBeTruthy();
  });

  it("rejects an unknown service", () => {
    expect(errorsOf(validBody({ service: "plumbing" })).service).toBeTruthy();
  });

  it("rejects an unknown time window", () => {
    expect(errorsOf(validBody({ timeWindow: "midnight" })).timeWindow).toBeTruthy();
  });

  it.each(["", " ", "A", "x".repeat(LIMITS.nameMax + 1)])("rejects name %j", (name) => {
    expect(errorsOf(validBody({ name })).name).toBeTruthy();
  });

  it.each(["", "nope", "a@b", "@example.com", "pat@@example.com"])("rejects email %j", (email) => {
    expect(errorsOf(validBody({ email })).email).toBeTruthy();
  });

  it("accepts ZIP+4 and keeps 5 digits", () => {
    const r = validateBooking(validBody({ zip: "44857-1234" }));
    expect(r.ok && r.data.zip).toBe("44857");
  });

  it.each(["", "4485", "ABCDE", "448577"])("rejects zip %j", (zip) => {
    expect(errorsOf(validBody({ zip })).zip).toBeTruthy();
  });

  it("rejects details over the limit", () => {
    expect(errorsOf(validBody({ details: "x".repeat(LIMITS.detailsMax + 1) })).details).toBeTruthy();
  });

  it("requires a turnstile token", () => {
    expect(errorsOf(validBody({ turnstileToken: "" })).turnstileToken).toBeTruthy();
  });

  it("reports every invalid field at once", () => {
    const e = errorsOf({ service: "x", timeWindow: "x", name: "", phone: "", email: "", zip: "", turnstileToken: "" });
    expect(Object.keys(e).sort()).toEqual(
      ["email", "name", "phone", "service", "timeWindow", "turnstileToken", "zip"].sort(),
    );
  });

  it.each([null, undefined, 42, "string", []])("rejects non-object body %j without throwing", (body) => {
    expect(validateBooking(body).ok).toBe(false);
  });

  it("rejects non-string field types without throwing", () => {
    expect(errorsOf(validBody({ name: { $gt: "" } })).name).toBeTruthy();
  });

  it("flags a filled honeypot without failing validation", () => {
    const r = validateBooking(validBody({ company: "Spam LLC" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.honeypotTripped).toBe(true);
  });

  it("gives user-facing messages that say how to fix it", () => {
    const e = errorsOf(validBody({ phone: "123" }));
    expect(e.phone).toMatch(/phone/i);
    expect(e.phone!.length).toBeGreaterThan(10);
  });
});
