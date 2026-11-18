import { describe, expect, it } from "vitest";
import type { StoredBooking } from "../contracts";
import { LogNotifier, createLogOpsAlert } from "./log";

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

describe("LogNotifier", () => {
  it("prints the email it would send instead of sending it", async () => {
    const out: string[] = [];
    const n = new LogNotifier({ ownerEmail: "owner@example.com", write: (s) => out.push(s) });
    await n.send("owner_alert", booking);
    await n.send("customer_confirmation", booking);
    const all = out.join("\n");
    expect(all).toContain("To: owner@example.com");
    expect(all).toContain("New request: AC Repair, Pat Example");
    expect(all).toContain("To: pat@example.com");
    expect(all).toMatch(/got your request/i);
    expect(n.kinds).toEqual(["owner_alert", "customer_confirmation"]);
  });

  it("prints ops alerts", async () => {
    const out: string[] = [];
    await createLogOpsAlert((s) => out.push(s))("Subject here", "Body here");
    expect(out.join("\n")).toContain("Subject here");
    expect(out.join("\n")).toContain("Body here");
  });
});
