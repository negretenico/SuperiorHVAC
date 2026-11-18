import { describe, expect, it } from "vitest";
import type { StoredBooking } from "../contracts";
import { RESEND_URL, ResendNotifier, createResendOpsAlert } from "./resend";

const booking: StoredBooking = {
  id: "bk_1",
  createdAt: "2026-11-17T15:00:00.000Z",
  ipHash: "h",
  service: "ac-repair",
  details: "Warm air.",
  timeWindow: "morning",
  name: "Pat Example",
  phone: "+14195550142",
  email: "pat@example.com",
  street: "",
  zip: "44857",
};

function stubFetch(status = 200, body: unknown = { id: "email_1" }) {
  const calls: Array<{ url: string; init: RequestInit; payload: Record<string, unknown> }> = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init!, payload: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return { fetchFn, calls };
}

function notifier(fetchFn: typeof fetch, ownerEmail = "owner@example.com") {
  return new ResendNotifier({
    apiKey: "re_test",
    from: "Superior HVAC <bookings@example.com>",
    replyTo: "reply@example.com",
    ownerEmail,
    fetch: fetchFn,
  });
}

describe("ResendNotifier", () => {
  it("handles both kinds under a stable id", () => {
    const n = notifier(stubFetch().fetchFn);
    expect(n.id).toBe("resend-email");
    expect([...n.kinds].sort()).toEqual(["customer_confirmation", "owner_alert"]);
  });

  it("POSTs the owner alert to Resend with auth, to every owner address", async () => {
    const { fetchFn, calls } = stubFetch();
    await notifier(fetchFn, "joey@example.com, backup@example.com").send("owner_alert", booking);
    expect(calls).toHaveLength(1);
    const { url, init, payload } = calls[0]!;
    expect(url).toBe(RESEND_URL);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer re_test");
    expect(new Headers(init.headers).get("content-type")).toMatch(/application\/json/);
    expect(payload).toMatchObject({
      from: "Superior HVAC <bookings@example.com>",
      to: ["joey@example.com", "backup@example.com"],
      subject: "New request: AC Repair, Pat Example",
      reply_to: "pat@example.com", // owner hits reply → customer
    });
    expect(payload.text).toContain("419-555-0142");
    expect(payload.html).toContain("tel:+14195550142");
  });

  it("sends the customer confirmation to the customer with reply_to set", async () => {
    const { fetchFn, calls } = stubFetch();
    await notifier(fetchFn).send("customer_confirmation", booking);
    expect(calls[0]!.payload).toMatchObject({ to: ["pat@example.com"], reply_to: "reply@example.com" });
    expect(calls[0]!.payload.text).toMatch(/got your request/i);
  });

  it("throws a useful error on a non-2xx response", async () => {
    const { fetchFn } = stubFetch(422, { name: "validation_error", message: "Invalid `to` field." });
    await expect(notifier(fetchFn).send("owner_alert", booking)).rejects.toThrow(/Resend.*422.*Invalid `to` field/);
  });

  it("propagates network errors", async () => {
    const fetchFn = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expect(notifier(fetchFn).send("owner_alert", booking)).rejects.toThrow(/fetch failed/);
  });
});

describe("createResendOpsAlert", () => {
  it("sends a plain-text alert to OPS_EMAIL", async () => {
    const { fetchFn, calls } = stubFetch();
    const alert = createResendOpsAlert({ apiKey: "re_test", from: "f@example.com", opsEmail: "ops@example.com", fetch: fetchFn });
    await alert("Something broke", "Details here");
    expect(calls[0]!.payload).toMatchObject({ to: ["ops@example.com"], text: "Details here" });
    expect(String(calls[0]!.payload.subject)).toContain("Something broke");
  });
});
