import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashIp } from "./ip-hash";

describe("hashIp", () => {
  it("is SHA-256(salt + ip) as lowercase hex", async () => {
    const expected = createHash("sha256").update("pepper203.0.113.7").digest("hex");
    await expect(hashIp("pepper", "203.0.113.7")).resolves.toBe(expected);
  });

  it("depends on the salt and never contains the raw IP", async () => {
    const a = await hashIp("salt-a", "203.0.113.7");
    const b = await hashIp("salt-b", "203.0.113.7");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("203.0.113.7");
  });
});
