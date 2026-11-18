import { describe, expect, it } from "vitest";
import { BOOKING_ENDPOINT, sendBooking } from "./api";
import { buildRequestBody, initialState } from "./flow";

const body = buildRequestBody(initialState().values, "tok");

const jsonResponse = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

describe("sendBooking", () => {
  it("POSTs JSON to /api/booking", async () => {
    let seen: { url: string; init?: RequestInit } | null = null;
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      seen = { url: String(url), init };
      return jsonResponse(200, { ok: true, id: "bk_1" });
    };
    expect(await sendBooking(body, fetcher)).toEqual({ kind: "ok" });
    expect(BOOKING_ENDPOINT).toBe("/api/booking");
    expect(seen!.url).toBe("/api/booking");
    expect(seen!.init?.method).toBe("POST");
    expect(new Headers(seen!.init?.headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(String(seen!.init?.body))).toEqual(body);
  });

  it("maps a 400 validation response", async () => {
    const out = await sendBooking(body, async () =>
      jsonResponse(400, { ok: false, error: "validation", errors: { zip: "Bad ZIP" } }),
    );
    expect(out).toEqual({ kind: "validation", errors: { zip: "Bad ZIP" } });
  });

  it("treats a network failure as a server problem", async () => {
    expect(
      await sendBooking(body, async () => {
        throw new TypeError("Failed to fetch");
      }),
    ).toEqual({ kind: "server" });
  });

  it("treats a non-JSON body as a server problem", async () => {
    expect(await sendBooking(body, async () => new Response("<html>oops</html>", { status: 502 }))).toEqual({
      kind: "server",
    });
  });

  it("still recognizes 429 without a JSON body", async () => {
    expect(await sendBooking(body, async () => new Response("", { status: 429 }))).toEqual({ kind: "rate_limited" });
  });
});
