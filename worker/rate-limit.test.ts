import { describe, expect, it } from "vitest";
import { createRateLimit } from "./rate-limit";
import { MemoryLogger } from "./test/fakes";

describe("createRateLimit", () => {
  it("allows when the binding reports success and passes the key", async () => {
    const keys: string[] = [];
    const binding = { limit: async ({ key }: { key: string }) => { keys.push(key); return { success: true }; } };
    const rateLimit = createRateLimit(binding, new MemoryLogger());
    await expect(rateLimit("203.0.113.7")).resolves.toBe(true);
    expect(keys).toEqual(["203.0.113.7"]);
  });

  it("blocks when the binding reports the limit is hit", async () => {
    const binding = { limit: async () => ({ success: false }) };
    await expect(createRateLimit(binding, new MemoryLogger())("k")).resolves.toBe(false);
  });

  it("fails open with a warning when the binding throws", async () => {
    const log = new MemoryLogger();
    const binding = { limit: async () => { throw new Error("binding down"); } };
    await expect(createRateLimit(binding, log)("k")).resolves.toBe(true);
    expect(log.lines).toEqual([expect.objectContaining({ level: "warn", msg: expect.stringMatching(/rate limit/i) })]);
  });
});
