import { describe, expect, it } from "vitest";
import { handleBooking } from "./booking";
import { StubNotifier, bookingRequest, makeDeps, validBody, FIXED_NOW } from "./test/fakes";

async function json(res: Response) {
  return (await res.json()) as Record<string, unknown>;
}

describe("POST /api/booking", () => {
  describe("success", () => {
    it("stores the booking, sends both emails, returns 200 with the id", async () => {
      const { deps, store, notifier } = makeDeps();
      const res = await handleBooking(bookingRequest(validBody()), deps);

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body).toEqual({ ok: true, id: "bk_1" });

      const saved = await store.getBooking("bk_1");
      expect(saved).toMatchObject({
        id: "bk_1",
        service: "ac-repair",
        phone: "+14195550142",
        email: "pat@example.com",
        zip: "44857",
        createdAt: FIXED_NOW.toISOString(),
        ipHash: "hash(203.0.113.7)",
      });
      expect(notifier.sent.map((s) => s.kind).sort()).toEqual(["customer_confirmation", "owner_alert"]);
      expect(store.notificationFor("bk_1", "owner_alert")).toMatchObject({ status: "sent", attempts: 1, lastError: null });
      expect(store.notificationFor("bk_1", "customer_confirmation")).toMatchObject({ status: "sent", attempts: 1 });
    });

    it("never stores the raw IP", async () => {
      const { deps, store } = makeDeps();
      await handleBooking(bookingRequest(validBody()), deps);
      expect(JSON.stringify([...store.bookings.values()])).not.toContain("203.0.113.7\"");
    });

    it("fans out to every notifier that handles a kind (SMS-ready)", async () => {
      const email = new StubNotifier("email");
      const sms = new StubNotifier("sms", ["owner_alert"]);
      const { deps, store } = makeDeps({ notifiers: [email, sms] });
      await handleBooking(bookingRequest(validBody()), deps);
      expect(email.sent).toHaveLength(2);
      expect(sms.sent.map((s) => s.kind)).toEqual(["owner_alert"]);
      expect(store.notifications.size).toBe(3);
    });

    it("works without a cf-connecting-ip header", async () => {
      const { deps } = makeDeps();
      const res = await handleBooking(bookingRequest(validBody(), null), deps);
      expect(res.status).toBe(200);
    });
  });

  describe("validation errors", () => {
    it("returns 400 with per-field errors and stores nothing", async () => {
      const { deps, store, notifier } = makeDeps();
      const res = await handleBooking(bookingRequest(validBody({ phone: "123", zip: "" })), deps);
      expect(res.status).toBe(400);
      const body = await json(res);
      expect(body.ok).toBe(false);
      expect(body.error).toBe("validation");
      expect(Object.keys(body.errors as object).sort()).toEqual(["phone", "zip"]);
      expect(store.bookings.size).toBe(0);
      expect(notifier.sent).toHaveLength(0);
    });

    it("returns 400 bad_request for malformed JSON", async () => {
      const { deps } = makeDeps();
      const res = await handleBooking(bookingRequest("{not json"), deps);
      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({ ok: false, error: "bad_request" });
    });

    it("returns 400 bad_request for oversized bodies", async () => {
      const { deps } = makeDeps();
      const res = await handleBooking(bookingRequest(validBody({ details: "x".repeat(20_000) })), deps);
      expect(res.status).toBe(400);
    });

    it("returns 405 for non-POST", async () => {
      const { deps } = makeDeps();
      const res = await handleBooking(new Request("https://example.test/api/booking"), deps);
      expect(res.status).toBe(405);
      expect(res.headers.get("allow")).toBe("POST");
    });

    it("does not call Turnstile when validation fails", async () => {
      let called = false;
      const { deps } = makeDeps({ verifyTurnstile: async () => { called = true; return true; } });
      await handleBooking(bookingRequest(validBody({ email: "bad" })), deps);
      expect(called).toBe(false);
    });
  });

  describe("Turnstile failure", () => {
    it("returns 403 and stores nothing when the token is rejected", async () => {
      const { deps, store, notifier } = makeDeps();
      const res = await handleBooking(bookingRequest(validBody({ turnstileToken: "fail" })), deps);
      expect(res.status).toBe(403);
      expect(await json(res)).toEqual({ ok: false, error: "turnstile" });
      expect(store.bookings.size).toBe(0);
      expect(notifier.sent).toHaveLength(0);
    });

    it("returns 403 and logs when siteverify throws", async () => {
      const { deps, log } = makeDeps({ verifyTurnstile: async () => { throw new Error("network down"); } });
      const res = await handleBooking(bookingRequest(validBody()), deps);
      expect(res.status).toBe(403);
      expect(log.lines.some((l) => l.level === "error" && /turnstile/i.test(l.msg))).toBe(true);
    });

    it("passes the client IP to Turnstile", async () => {
      let seenIp: string | null = "unset";
      const { deps } = makeDeps({ verifyTurnstile: async (_t, ip) => { seenIp = ip; return true; } });
      await handleBooking(bookingRequest(validBody()), deps);
      expect(seenIp).toBe("203.0.113.7");
    });
  });

  describe("email failure", () => {
    it("still returns 200 when the owner alert fails, and records the failure", async () => {
      const { deps, store, notifier, log } = makeDeps();
      notifier.failing.add("owner_alert");
      const res = await handleBooking(bookingRequest(validBody()), deps);

      expect(res.status).toBe(200);
      expect(store.bookings.size).toBe(1);
      expect(store.notificationFor("bk_1", "owner_alert")).toMatchObject({
        status: "failed",
        attempts: 1,
        lastError: expect.stringContaining("owner_alert failed"),
      });
      expect(store.notificationFor("bk_1", "customer_confirmation")).toMatchObject({ status: "sent" });
      const err = log.lines.find((l) => l.level === "error");
      expect(err?.data).toMatchObject({ bookingId: "bk_1", kind: "owner_alert", notifierId: "stub-email" });
    });

    it("still returns 200 when every email fails", async () => {
      const { deps, store, notifier } = makeDeps();
      notifier.failing.add("owner_alert").add("customer_confirmation");
      const res = await handleBooking(bookingRequest(validBody()), deps);
      expect(res.status).toBe(200);
      expect([...store.notifications.values()].every((n) => n.status === "failed")).toBe(true);
    });

    it("returns 500 and sends nothing when the booking cannot be stored", async () => {
      const { deps, store, notifier, log } = makeDeps();
      store.failInsert = true;
      const res = await handleBooking(bookingRequest(validBody()), deps);
      expect(res.status).toBe(500);
      expect(await json(res)).toEqual({ ok: false, error: "server" });
      expect(notifier.sent).toHaveLength(0);
      expect(log.lines.some((l) => l.level === "error")).toBe(true);
    });
  });

  describe("abuse protection", () => {
    it("returns 429 when rate limited, before doing any work", async () => {
      let turnstileCalled = false;
      const { deps, store } = makeDeps({
        rateLimit: async () => false,
        verifyTurnstile: async () => { turnstileCalled = true; return true; },
      });
      const res = await handleBooking(bookingRequest(validBody()), deps);
      expect(res.status).toBe(429);
      expect(await json(res)).toEqual({ ok: false, error: "rate_limited" });
      expect(turnstileCalled).toBe(false);
      expect(store.bookings.size).toBe(0);
    });

    it("silently accepts but drops honeypot submissions", async () => {
      const { deps, store, notifier } = makeDeps();
      const res = await handleBooking(bookingRequest(validBody({ company: "Spam LLC" })), deps);
      expect(res.status).toBe(200);
      expect((await json(res)).ok).toBe(true);
      expect(store.bookings.size).toBe(0);
      expect(notifier.sent).toHaveLength(0);
    });
  });

  it("responds with JSON and no-store caching", async () => {
    const { deps } = makeDeps();
    const res = await handleBooking(bookingRequest(validBody()), deps);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
