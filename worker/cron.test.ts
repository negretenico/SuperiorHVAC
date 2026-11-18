import { describe, expect, it } from "vitest";
import { runCron } from "./cron";
import { MAX_NOTIFY_ATTEMPTS, type NotificationRecord, type StoredBooking } from "./contracts";
import { FIXED_NOW, makeCronDeps } from "./test/fakes";

function booking(id: string, createdAt = FIXED_NOW.toISOString()): StoredBooking {
  return {
    id, createdAt, ipHash: "h", service: "ac-repair", details: "", timeWindow: "asap",
    name: "Pat", phone: "+14195550142", email: "pat@example.com", street: "", zip: "44857",
  };
}
function failed(bookingId: string, attempts: number, kind: NotificationRecord["kind"] = "owner_alert"): NotificationRecord {
  return { bookingId, notifierId: "stub-email", kind, status: "failed", attempts, lastError: "boom", updatedAt: "2026-11-17T14:00:00.000Z" };
}

describe("scheduled cron", () => {
  it("retries failed notifications and marks recovered ones sent", async () => {
    const { deps, store, notifier } = makeCronDeps();
    await store.insertBooking(booking("b1"));
    await store.upsertNotification(failed("b1", 1));
    const report = await runCron(deps);
    expect(notifier.sent).toHaveLength(1);
    expect(store.notificationFor("b1", "owner_alert")).toMatchObject({ status: "sent", attempts: 2 });
    expect(report).toMatchObject({ retried: 1, recovered: 1, exhausted: 0 });
  });

  it("increments attempts and keeps the error when a retry fails", async () => {
    const { deps, store, notifier, opsAlerts } = makeCronDeps();
    notifier.failing.add("owner_alert");
    await store.insertBooking(booking("b1"));
    await store.upsertNotification(failed("b1", 2));
    await runCron(deps);
    expect(store.notificationFor("b1", "owner_alert")).toMatchObject({
      status: "failed", attempts: 3, lastError: expect.stringContaining("failed"),
    });
    expect(opsAlerts).toHaveLength(0);
  });

  it("alerts ops exactly once when a notification hits the max attempts", async () => {
    const { deps, store, notifier, opsAlerts } = makeCronDeps();
    notifier.failing.add("owner_alert");
    await store.insertBooking(booking("b1"));
    await store.upsertNotification(failed("b1", MAX_NOTIFY_ATTEMPTS - 1));
    const report = await runCron(deps);
    expect(report.exhausted).toBe(1);
    expect(opsAlerts).toHaveLength(1);
    expect(opsAlerts[0]!.body).toContain("b1");
    expect(opsAlerts[0]!.body).toContain("+14195550142"); // ops can call the customer directly

    await runCron(deps); // exhausted rows are no longer retried or re-alerted
    expect(opsAlerts).toHaveLength(1);
  });

  it("skips notifications whose notifier is no longer registered, with a warning", async () => {
    const { deps, store, log } = makeCronDeps();
    await store.insertBooking(booking("b1"));
    await store.upsertNotification({ ...failed("b1", 1), notifierId: "removed-sms" });
    await runCron(deps);
    expect(log.lines.some((l) => l.level === "warn")).toBe(true);
  });

  it("purges bookings older than 24 months and keeps newer ones", async () => {
    const { deps, store } = makeCronDeps();
    await store.insertBooking(booking("old", "2024-11-16T00:00:00.000Z"));
    await store.insertBooking(booking("keep", "2024-11-18T00:00:00.000Z"));
    const report = await runCron(deps);
    expect(report.purged).toBe(1);
    expect(await store.getBooking("old")).toBeNull();
    expect(await store.getBooking("keep")).not.toBeNull();
  });

  it("keeps going when one retry throws unexpectedly, and alerts ops on cron crash", async () => {
    const { deps, store, opsAlerts } = makeCronDeps();
    store.listRetryable = async () => { throw new Error("D1 down"); };
    await expect(runCron(deps)).resolves.toBeDefined();
    expect(opsAlerts).toHaveLength(1);
  });
});
