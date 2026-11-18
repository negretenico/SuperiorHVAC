/**
 * Pure booking-flow logic. These tests use a local stub validator, so they do NOT depend on
 * Agent A's validateBooking implementation. The contract tests against the real validator
 * live in flow.contract.test.ts.
 */
import { describe, expect, it } from "vitest";
import type { BookingField, ValidationResult } from "../../lib/booking";
import { business } from "../../config/business";
import {
  STEP_FIELDS,
  TURNSTILE_PENDING_MESSAGE,
  buildRequestBody,
  climatePositions,
  confirmationFor,
  createReducer,
  detailsRemaining,
  firstErrorStep,
  initialState,
  interpretResponse,
  parsePreselect,
  stepErrors,
  stepForField,
  type FlowState,
  type FormValues,
} from "./flow";

/** Minimal stand-in for validateBooking: required-ness only, one message per field. */
function stubValidate(body: unknown): ValidationResult {
  const b = body as Record<string, unknown>;
  const errors: Partial<Record<BookingField, string>> = {};
  const req: BookingField[] = ["service", "timeWindow", "name", "phone", "email", "zip", "turnstileToken"];
  for (const f of req) if (!b[f]) errors[f] = `bad ${f}`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      service: String(b.service),
      details: "",
      timeWindow: "asap",
      name: String(b.name),
      phone: "+14195550142",
      email: String(b.email),
      street: "",
      zip: String(b.zip),
    },
    turnstileToken: String(b.turnstileToken),
    honeypotTripped: false,
  };
}

const filled: FormValues = {
  service: "ac-repair",
  details: "Warm air",
  timeWindow: "morning",
  name: "Pat Example",
  phone: "(419) 555-0142",
  email: "pat@example.com",
  street: "",
  zip: "44857",
  company: "",
};

const reduce = createReducer(stubValidate);

function stateAt(step: 1 | 2 | 3, over: Partial<FlowState> = {}): FlowState {
  return { ...initialState(), step, values: { ...filled }, ...over };
}

describe("parsePreselect", () => {
  it("returns a known service slug", () => {
    expect(parsePreselect("ac-repair")).toBe("ac-repair");
  });
  it.each([null, "", "plumbing", "AC-REPAIR", " ac-repair"])("ignores %j", (v) => {
    expect(parsePreselect(v)).toBeNull();
  });
});

describe("stepForField / firstErrorStep", () => {
  it("maps every field to exactly one step", () => {
    const all = [...STEP_FIELDS[1], ...STEP_FIELDS[2], ...STEP_FIELDS[3]];
    expect(new Set(all).size).toBe(all.length);
    expect(stepForField("service")).toBe(1);
    expect(stepForField("details")).toBe(1);
    expect(stepForField("timeWindow")).toBe(2);
    expect(stepForField("zip")).toBe(3);
    expect(stepForField("turnstileToken")).toBe(3);
  });
  it("picks the earliest step that has an error", () => {
    expect(firstErrorStep({ zip: "x", timeWindow: "y" })).toBe(2);
    expect(firstErrorStep({ email: "x" })).toBe(3);
    expect(firstErrorStep({ details: "x", email: "y" })).toBe(1);
    expect(firstErrorStep({})).toBeNull();
  });
});

describe("stepErrors", () => {
  it("only reports errors that belong to the given step", () => {
    const empty = initialState().values;
    expect(Object.keys(stepErrors(1, empty, null, stubValidate))).toEqual(["service"]);
    expect(Object.keys(stepErrors(2, empty, null, stubValidate))).toEqual(["timeWindow"]);
    expect(Object.keys(stepErrors(3, empty, null, stubValidate)).sort()).toEqual(
      ["email", "name", "phone", "turnstileToken", "zip"].sort(),
    );
  });
  it("uses a plain 'wait for the spam check' message for a missing token", () => {
    expect(stepErrors(3, filled, null, stubValidate).turnstileToken).toBe(TURNSTILE_PENDING_MESSAGE);
  });
  it("is empty when the step is valid", () => {
    expect(stepErrors(3, filled, "tok", stubValidate)).toEqual({});
  });
});

describe("buildRequestBody", () => {
  it("produces the BookingRequestBody shape, including the honeypot", () => {
    expect(buildRequestBody({ ...filled, company: "" }, "tok")).toEqual({
      service: "ac-repair",
      details: "Warm air",
      timeWindow: "morning",
      name: "Pat Example",
      phone: "(419) 555-0142",
      email: "pat@example.com",
      street: "",
      zip: "44857",
      company: "",
      turnstileToken: "tok",
    });
  });
});

describe("interpretResponse", () => {
  it("200 ok → ok", () => {
    expect(interpretResponse(200, { ok: true, id: "bk_1" })).toEqual({ kind: "ok" });
  });
  it("400 validation → field errors", () => {
    expect(interpretResponse(400, { ok: false, error: "validation", errors: { zip: "Bad ZIP" } })).toEqual({
      kind: "validation",
      errors: { zip: "Bad ZIP" },
    });
  });
  it("drops unknown or non-string error entries from the server", () => {
    expect(
      interpretResponse(400, { ok: false, error: "validation", errors: { zip: "Bad", evil: "x", name: 3 } }),
    ).toEqual({ kind: "validation", errors: { zip: "Bad" } });
  });
  it("400 validation with no usable errors → server", () => {
    expect(interpretResponse(400, { ok: false, error: "validation", errors: {} })).toEqual({ kind: "server" });
  });
  it("403 → turnstile", () => {
    expect(interpretResponse(403, { ok: false, error: "turnstile" })).toEqual({ kind: "turnstile" });
  });
  it("429 → rate_limited, even without a JSON body", () => {
    expect(interpretResponse(429, null)).toEqual({ kind: "rate_limited" });
  });
  it.each([
    [500, { ok: false, error: "server" }],
    [400, { ok: false, error: "bad_request" }],
    [502, null],
    [200, null],
    [200, { ok: false }],
    [404, "<html>"],
  ])("%i %j → server", (status, body) => {
    expect(interpretResponse(status, body)).toEqual({ kind: "server" });
  });
});

describe("confirmationFor", () => {
  it("uses the first name and a readable phone", () => {
    expect(confirmationFor({ ...filled, name: "  Pat  Q. Example " })).toEqual({
      firstName: "Pat",
      phone: "419-555-0142",
    });
  });
  it.each([
    ["+1 419 555 0142", "419-555-0142"],
    ["1-419-555-0142", "419-555-0142"],
    ["419.555.0142", "419-555-0142"],
  ])("formats %s as %s", (input, out) => {
    expect(confirmationFor({ ...filled, phone: input }).phone).toBe(out);
  });
  it("falls back to what the user typed if it is not a 10-digit number", () => {
    expect(confirmationFor({ ...filled, phone: " 555 " }).phone).toBe("555");
  });
});

describe("detailsRemaining", () => {
  it("is null until near the limit, then counts down", () => {
    expect(detailsRemaining("")).toBeNull();
    expect(detailsRemaining("x".repeat(400))).toBeNull();
    expect(detailsRemaining("x".repeat(450))).toBe(50);
    expect(detailsRemaining("x".repeat(500))).toBe(0);
  });
});

describe("climatePositions", () => {
  const pos = climatePositions(business.services);
  it("puts heat at the ember end and cool at the ice end", () => {
    for (const s of business.services) {
      if (s.climate === "heat") expect(pos[s.slug]).toBe(0);
      if (s.climate === "cool") expect(pos[s.slug]).toBe(1);
    }
  });
  it("places 'both' services strictly between, each distinct", () => {
    const both = business.services.filter((s) => s.climate === "both").map((s) => pos[s.slug]!);
    for (const p of both) expect(p > 0 && p < 1).toBe(true);
    expect(new Set(both).size).toBe(both.length);
  });
});

describe("reducer", () => {
  it("starts on step 1 with nothing chosen", () => {
    const s = initialState();
    expect(s.step).toBe(1);
    expect(s.values.service).toBe("");
    expect(s.status).toBe("idle");
  });

  it("preselects a service only while nothing is chosen", () => {
    let s = reduce(initialState(), { type: "preselect", service: "ac-repair" });
    expect(s.values.service).toBe("ac-repair");
    s = reduce(reduce(s, { type: "set", field: "service", value: "maintenance-tune-ups" }), {
      type: "preselect",
      service: "ac-repair",
    });
    expect(s.values.service).toBe("maintenance-tune-ups");
  });

  it("set updates the value and clears that field's error", () => {
    const s = reduce(stateAt(3, { errors: { zip: "bad", name: "bad" } }), { type: "set", field: "zip", value: "1" });
    expect(s.values.zip).toBe("1");
    expect(s.errors).toEqual({ name: "bad" });
  });

  it("next stays put and shows errors when the step is invalid, focusing the first invalid field", () => {
    const s = reduce(initialState(), { type: "next" });
    expect(s.step).toBe(1);
    expect(s.errors.service).toBeTruthy();
    expect(s.focus.target).toBe("field:service");
  });

  it("next advances and focuses the heading when the step is valid", () => {
    const before = stateAt(1);
    const s = reduce(before, { type: "next" });
    expect(s.step).toBe(2);
    expect(s.errors).toEqual({});
    expect(s.focus.target).toBe("heading");
    expect(s.focus.n).toBe(before.focus.n + 1);
  });

  it("back keeps every entered value", () => {
    const s = reduce(stateAt(3), { type: "back" });
    expect(s.step).toBe(2);
    expect(s.values).toEqual(filled);
    expect(s.focus.target).toBe("heading");
    expect(reduce(stateAt(1), { type: "back" }).step).toBe(1);
  });

  it("submit with invalid fields shows the summary and does not send", () => {
    const s = reduce(stateAt(3, { values: { ...filled, email: "" } }), { type: "submit" });
    expect(s.status).toBe("idle");
    expect(s.errors.email).toBeTruthy();
    expect(s.focus.target).toBe("summary");
  });

  it("submit with valid fields goes to sending, and a second submit is ignored", () => {
    const s = reduce(stateAt(3, { token: "tok" }), { type: "submit" });
    expect(s.status).toBe("sending");
    expect(reduce(s, { type: "submit" })).toBe(s);
  });

  it("ok → confirmation focused", () => {
    const s = reduce(stateAt(3, { token: "tok", status: "sending" }), { type: "result", outcome: { kind: "ok" } });
    expect(s.step).toBe("done");
    expect(s.status).toBe("idle");
    expect(s.focus.target).toBe("confirmation");
  });

  it("validation → jumps to the earliest failing step and keeps all field errors", () => {
    const s = reduce(stateAt(3, { token: "tok", status: "sending" }), {
      type: "result",
      outcome: { kind: "validation", errors: { timeWindow: "Pick a time", zip: "Bad ZIP" } },
    });
    expect(s.step).toBe(2);
    expect(s.errors).toEqual({ timeWindow: "Pick a time", zip: "Bad ZIP" });
    expect(s.focus.target).toBe("summary");
    expect(s.status).toBe("idle");
  });

  it("turnstile → banner, token cleared, widget reset requested", () => {
    const before = stateAt(3, { token: "tok", status: "sending" });
    const s = reduce(before, { type: "result", outcome: { kind: "turnstile" } });
    expect(s.step).toBe(3);
    expect(s.banner).toBe("turnstile");
    expect(s.token).toBeNull();
    expect(s.turnstileReset).toBe(before.turnstileReset + 1);
    expect(s.focus.target).toBe("summary");
  });

  it.each(["rate_limited", "server"] as const)("%s → banner on step 3, values kept", (kind) => {
    const s = reduce(stateAt(3, { token: "tok", status: "sending" }), { type: "result", outcome: { kind } });
    expect(s.step).toBe(3);
    expect(s.banner).toBe(kind);
    expect(s.values).toEqual(filled);
    expect(s.status).toBe("idle");
  });

  it("a new submit clears the old banner", () => {
    const s = reduce(stateAt(3, { token: "tok", banner: "server" }), { type: "submit" });
    expect(s.banner).toBeNull();
  });

  it("token updates clear the token error", () => {
    const s = reduce(stateAt(3, { errors: { turnstileToken: "wait" } }), { type: "token", token: "tok" });
    expect(s.token).toBe("tok");
    expect(s.errors.turnstileToken).toBeUndefined();
    expect(reduce(s, { type: "token", token: null }).token).toBeNull();
  });
});
