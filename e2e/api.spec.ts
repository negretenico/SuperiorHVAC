import { expect, test } from "@playwright/test";
import { validBody } from "../src/lib/booking.fixtures";

/**
 * Worker API over real HTTP (no browser). Runs in the "api" project only, once per run:
 * POST /api/booking shares a 3-per-minute rate limit per IP, so keep the number of POSTs here small.
 * The e2e server uses the always-pass Turnstile secret, so any token string is accepted.
 */
test.describe("Worker API", () => {
  test("GET /api/health → 200 {ok:true}, not cached", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers()["cache-control"]).toBe("no-store");
  });

  test("POST /api/booking with a valid body → 200 {ok:true,id}", async ({ request }) => {
    const res = await request.post("/api/booking", { data: validBody({ turnstileToken: "e2e-any-token" }) });
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true });
    expect(typeof body.id).toBe("string");
    expect(body.id.length).toBeGreaterThan(0);
  });

  test("POST /api/booking with invalid fields → 400 validation", async ({ request }) => {
    const res = await request.post("/api/booking", { data: validBody({ phone: "123", zip: "" }) });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, error: "validation" });
    expect(Object.keys(body.errors).sort()).toEqual(["phone", "zip"]);
  });

  test("GET /api/booking → 405 with Allow: POST", async ({ request }) => {
    const res = await request.get("/api/booking");
    expect(res.status()).toBe(405);
    expect(res.headers()["allow"]).toBe("POST");
  });

  test("unknown /api/ route → 404", async ({ request }) => {
    const res = await request.get("/api/x");
    expect(res.status()).toBe(404);
  });
});
