/** A payload that passes validation. Shared by unit tests (src + worker) and Playwright. */
export function validBody(over: Record<string, unknown> = {}) {
  return {
    service: "ac-repair",
    details: "Blowing warm air since Tuesday.",
    timeWindow: "morning",
    name: "Pat Example",
    phone: "(419) 555-0142",
    email: "Pat@Example.com ",
    street: "12 Main St",
    zip: "44857",
    turnstileToken: "pass",
    ...over,
  };
}
