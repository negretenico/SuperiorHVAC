import { describe, expect, it } from "vitest";
import { SITEVERIFY_URL, verifyTurnstile } from "./turnstile";

type Call = { url: string; init: RequestInit | undefined };

function stubFetch(respond: () => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return respond();
  }) as typeof fetch;
  return { fetchFn, calls };
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("verifyTurnstile", () => {
  it("returns true when siteverify says success", async () => {
    const { fetchFn } = stubFetch(() => ok({ success: true }));
    await expect(verifyTurnstile({ secret: "s", token: "t", ip: null, fetch: fetchFn })).resolves.toBe(true);
  });

  it("returns false when siteverify says failure", async () => {
    const { fetchFn } = stubFetch(() => ok({ success: false, "error-codes": ["invalid-input-response"] }));
    await expect(verifyTurnstile({ secret: "s", token: "t", ip: null, fetch: fetchFn })).resolves.toBe(false);
  });

  it("posts secret, response and remoteip to siteverify", async () => {
    const { fetchFn, calls } = stubFetch(() => ok({ success: true }));
    await verifyTurnstile({ secret: "sekret", token: "tok", ip: "203.0.113.7", fetch: fetchFn });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(SITEVERIFY_URL);
    expect(calls[0]!.init?.method).toBe("POST");
    const form = new URLSearchParams(String(calls[0]!.init?.body));
    expect(form.get("secret")).toBe("sekret");
    expect(form.get("response")).toBe("tok");
    expect(form.get("remoteip")).toBe("203.0.113.7");
  });

  it("omits remoteip when the IP is unknown", async () => {
    const { fetchFn, calls } = stubFetch(() => ok({ success: true }));
    await verifyTurnstile({ secret: "s", token: "t", ip: null, fetch: fetchFn });
    expect(new URLSearchParams(String(calls[0]!.init?.body)).has("remoteip")).toBe(false);
  });

  it("throws on a non-200 response", async () => {
    const { fetchFn } = stubFetch(() => new Response("oops", { status: 502 }));
    await expect(verifyTurnstile({ secret: "s", token: "t", ip: null, fetch: fetchFn })).rejects.toThrow(/502/);
  });

  it("throws on a network error", async () => {
    const { fetchFn } = stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    await expect(verifyTurnstile({ secret: "s", token: "t", ip: null, fetch: fetchFn })).rejects.toThrow(/fetch failed/);
  });

  it("treats a malformed response as failure", async () => {
    const { fetchFn } = stubFetch(() => ok({ success: "yes" }));
    await expect(verifyTurnstile({ secret: "s", token: "t", ip: null, fetch: fetchFn })).resolves.toBe(false);
  });
});
