import { describe, expect, it } from "vitest";
import { createWorker, type Services } from "./app";
import type { Env } from "./contracts";
import { bookingRequest, makeCronDeps, makeDeps, validBody } from "./test/fakes";

function setup() {
  const booking = makeDeps();
  const cron = makeCronDeps({ store: booking.store });
  const assetRequests: string[] = [];
  const env = {
    ASSETS: {
      fetch: async (req: Request) => {
        assetRequests.push(new URL(req.url).pathname);
        return new Response("<!doctype html>asset", { headers: { "content-type": "text/html" } });
      },
    },
  } as unknown as Env;
  const services: Services = { store: booking.store, booking: booking.deps, cron: cron.deps };
  const worker = createWorker(() => services);
  const waited: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => waited.push(p), passThroughOnException() {} } as unknown as ExecutionContext;
  const fetch = (req: Request) => worker.fetch(req, env, ctx);
  return { worker, env, ctx, fetch, waited, assetRequests, booking, cron };
}

const get = (path: string, method = "GET") => new Request(`https://example.test${path}`, { method });

describe("worker router", () => {
  it("serves non-API paths from static assets", async () => {
    const { fetch, assetRequests } = setup();
    const res = await fetch(get("/services/ac-repair/"));
    expect(await res.text()).toContain("asset");
    expect(assetRequests).toEqual(["/services/ac-repair/"]);
  });

  it("routes POST /api/booking to the booking handler", async () => {
    const { fetch, booking } = setup();
    const res = await fetch(bookingRequest(validBody()));
    expect(res.status).toBe(200);
    expect(booking.store.bookings.size).toBe(1);
  });

  it("returns 405 for GET /api/booking", async () => {
    const { fetch } = setup();
    const res = await fetch(get("/api/booking"));
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });

  it("answers GET /api/health", async () => {
    const { fetch } = setup();
    const res = await fetch(get("/api/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("answers HEAD /api/health with no body (uptime monitors)", async () => {
    const { fetch, booking } = setup();
    booking.store.failPing = true;
    const res = await fetch(get("/api/health", "HEAD"));
    expect(res.status).toBe(503);
    expect(await res.text()).toBe("");
  });

  it("returns 405 for POST /api/health", async () => {
    const { fetch } = setup();
    const res = await fetch(get("/api/health", "POST"));
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD");
  });

  it("returns a JSON 404 for unknown API paths without touching assets", async () => {
    const { fetch, assetRequests } = setup();
    const res = await fetch(get("/api/nope"));
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: false, error: "not_found" });
    expect(assetRequests).toEqual([]);
  });

  it("returns a JSON 500 if a handler throws unexpectedly", async () => {
    const { fetch, booking } = setup();
    booking.deps.rateLimit = async () => {
      throw new Error("kaboom");
    };
    const res = await fetch(bookingRequest(validBody()));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "server" });
    expect(booking.log.lines.some((l) => l.level === "error")).toBe(true);
  });

  it("runs the cron via ctx.waitUntil on schedule", async () => {
    const { worker, env, ctx, waited, cron } = setup();
    await worker.scheduled({ cron: "*/15 * * * *", scheduledTime: Date.now(), noRetry() {} } as ScheduledController, env, ctx);
    expect(waited).toHaveLength(1);
    await Promise.all(waited);
    expect(cron.log.lines.some((l) => l.msg === "cron finished")).toBe(true);
  });
});
