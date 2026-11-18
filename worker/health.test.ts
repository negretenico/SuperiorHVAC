import { describe, expect, it } from "vitest";
import { handleHealth } from "./health";
import { InMemoryStore } from "./test/fakes";

describe("GET /api/health", () => {
  it("returns 200 ok when the database answers", async () => {
    const res = await handleHealth(new InMemoryStore());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 503 when the database is unreachable", async () => {
    const store = new InMemoryStore();
    store.failPing = true;
    const res = await handleHealth(store);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
  });
});
