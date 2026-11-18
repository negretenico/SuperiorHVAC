import { describe, expect, it } from "vitest";
import type { Env } from "./contracts";
import { buildServices } from "./deps";
import { hashIp } from "./ip-hash";
import { LogNotifier } from "./notify/log";
import { ResendNotifier } from "./notify/resend";
import { D1Store } from "./store/d1";

function fakeEnv(over: Partial<Env> = {}) {
  const limited: string[] = [];
  const env = {
    ASSETS: { fetch: async () => new Response("") },
    DB: {} as D1Database,
    BOOKING_RATE_LIMITER: { limit: async ({ key }: { key: string }) => { limited.push(key); return { success: true }; } },
    RESEND_API_KEY: "re_test",
    TURNSTILE_SECRET_KEY: "ts_secret",
    OWNER_EMAIL: "owner@example.com",
    FROM_EMAIL: "Superior HVAC <bookings@example.com>",
    REPLY_TO_EMAIL: "reply@example.com",
    OPS_EMAIL: "ops@example.com",
    IP_HASH_SALT: "salt",
    ...over,
  } as unknown as Env;
  return { env, limited };
}

function recordingFetch() {
  const urls: string[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    urls.push(String(input));
    return new Response(JSON.stringify({ success: true, body: String(init?.body) }), { status: 200 });
  }) as typeof fetch;
  return { fetchFn, urls };
}

describe("buildServices", () => {
  it("uses the D1 store and Resend by default", () => {
    const s = buildServices(fakeEnv().env);
    expect(s.store).toBeInstanceOf(D1Store);
    expect(s.booking.notifiers).toHaveLength(1);
    expect(s.booking.notifiers[0]).toBeInstanceOf(ResendNotifier);
    expect(s.cron.notifiers).toBe(s.booking.notifiers);
  });

  it("uses the log notifier when NOTIFIER=log, and never fetches for ops alerts", async () => {
    const { fetchFn, urls } = recordingFetch();
    const s = buildServices(fakeEnv({ NOTIFIER: "log" }).env, { fetch: fetchFn, write: () => {} });
    expect(s.booking.notifiers[0]).toBeInstanceOf(LogNotifier);
    await s.cron.alertOps("subject", "body");
    expect(urls).toEqual([]);
  });

  it("sends ops alerts through Resend in resend mode", async () => {
    const { fetchFn, urls } = recordingFetch();
    const s = buildServices(fakeEnv().env, { fetch: fetchFn });
    await s.cron.alertOps("subject", "body");
    expect(urls).toEqual(["https://api.resend.com/emails"]);
  });

  it("wires the rate limiter binding, salted IP hash and Turnstile secret", async () => {
    const { env, limited } = fakeEnv();
    const { fetchFn, urls } = recordingFetch();
    const s = buildServices(env, { fetch: fetchFn });

    expect(await s.booking.rateLimit("203.0.113.7")).toBe(true);
    expect(limited).toEqual(["203.0.113.7"]);

    expect(await s.booking.hashIp("203.0.113.7")).toBe(await hashIp("salt", "203.0.113.7"));

    expect(await s.booking.verifyTurnstile("tok", "203.0.113.7")).toBe(true);
    expect(urls).toEqual(["https://challenges.cloudflare.com/turnstile/v0/siteverify"]);
  });

  it("generates uuid booking ids", () => {
    const s = buildServices(fakeEnv().env);
    expect(s.booking.newId()).toMatch(/^[0-9a-f-]{36}$/);
  });
});
