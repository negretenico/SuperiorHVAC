/**
 * Contract tests: the booking flow against the REAL shared validator (src/lib/booking.ts).
 *
 * These depend on Agent A's validateBooking implementation and fail with
 * "not implemented: validateBooking" until feat/api is merged. That is expected.
 * The flow logic itself is covered independently in flow.test.ts with a stub validator.
 */
import { describe, expect, it } from "vitest";
import { validateBooking } from "../../lib/booking";
import { validBody } from "../../lib/booking.fixtures";
import { createReducer, initialState, stepErrors, buildRequestBody, type FormValues } from "./flow";

const fromFixture = (): FormValues => {
  const b = validBody();
  return {
    service: b.service,
    details: b.details,
    timeWindow: b.timeWindow,
    name: b.name,
    phone: b.phone,
    email: b.email,
    street: b.street,
    zip: b.zip,
    company: "",
  };
};

describe("booking flow × validateBooking", () => {
  it("a fully filled form produces a body the shared validator accepts", () => {
    expect(validateBooking(buildRequestBody(fromFixture(), "pass")).ok).toBe(true);
  });

  it("step 1 needs only a service; later steps' empty fields don't block it", () => {
    const v = { ...initialState().values, service: "ac-repair" };
    expect(stepErrors(1, v, null, validateBooking)).toEqual({});
    expect(stepErrors(1, initialState().values, null, validateBooking).service).toBeTruthy();
  });

  it("step 1 flags over-long details", () => {
    const v = { ...fromFixture(), details: "x".repeat(501) };
    expect(stepErrors(1, v, "pass", validateBooking).details).toBeTruthy();
  });

  it("step 2 needs a valid time window", () => {
    expect(stepErrors(2, { ...fromFixture(), timeWindow: "" }, "pass", validateBooking).timeWindow).toBeTruthy();
    expect(stepErrors(2, fromFixture(), "pass", validateBooking)).toEqual({});
  });

  it("step 3 reports contact errors with plain messages", () => {
    const e = stepErrors(3, { ...fromFixture(), phone: "123", zip: "abc", email: "nope" }, "pass", validateBooking);
    expect(Object.keys(e).sort()).toEqual(["email", "phone", "zip"]);
    expect(e.phone).toMatch(/phone/i);
  });

  it("street is optional", () => {
    expect(stepErrors(3, { ...fromFixture(), street: "" }, "pass", validateBooking)).toEqual({});
  });

  it("walks all three steps to sending with the real validator", () => {
    const reduce = createReducer(validateBooking);
    let s = initialState();
    for (const [field, value] of Object.entries(fromFixture())) {
      s = reduce(s, { type: "set", field: field as keyof FormValues, value });
    }
    s = reduce(s, { type: "next" });
    s = reduce(s, { type: "next" });
    s = reduce(s, { type: "token", token: "pass" });
    s = reduce(s, { type: "submit" });
    expect(s.step).toBe(3);
    expect(s.status).toBe("sending");
  });
});
