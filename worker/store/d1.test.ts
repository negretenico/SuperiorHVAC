/**
 * Real SQL against a local, in-memory D1 (workerd via wrangler's getPlatformProxy).
 * The migration in db/migrations is applied fresh before each test.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import type { NotificationRecord, StoredBooking } from "../contracts";
import { D1Store } from "./d1";

const migration = readFileSync(fileURLToPath(new URL("../../db/migrations/0001_init.sql", import.meta.url)), "utf8");

let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
let db: D1Database;
let store: D1Store;

/** Split a migration file into statements (no semicolons inside our string literals). */
function statements(sql: string): string[] {
  return sql
    .replace(/--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

beforeAll(async () => {
  proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: fileURLToPath(new URL("../test/wrangler.d1-test.toml", import.meta.url)),
    persist: false,
  });
  db = proxy.env.DB;
}, 60_000);

afterAll(async () => {
  await proxy?.dispose();
});

beforeEach(async () => {
  await db.batch([db.prepare("DROP TABLE IF EXISTS notifications"), db.prepare("DROP TABLE IF EXISTS bookings")]);
  await db.batch(statements(migration).map((s) => db.prepare(s)));
  store = new D1Store(db);
});

function booking(id: string, over: Partial<StoredBooking> = {}): StoredBooking {
  return {
    id,
    createdAt: "2026-11-17T15:00:00.000Z",
    ipHash: "abc123",
    service: "ac-repair",
    details: "Blowing warm air.",
    timeWindow: "morning",
    name: "Pat Example",
    phone: "+14195550142",
    email: "pat@example.com",
    street: "12 Main St",
    zip: "44857",
    ...over,
  };
}

function note(bookingId: string, over: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    bookingId,
    notifierId: "resend-email",
    kind: "owner_alert",
    status: "failed",
    attempts: 1,
    lastError: "boom",
    updatedAt: "2026-11-17T15:00:00.000Z",
    ...over,
  };
}

describe("D1Store", () => {
  it("round-trips a booking", async () => {
    const b = booking("b1");
    await store.insertBooking(b);
    expect(await store.getBooking("b1")).toEqual(b);
    expect(await store.getBooking("missing")).toBeNull();
  });

  it("rejects a duplicate booking id", async () => {
    await store.insertBooking(booking("b1"));
    await expect(store.insertBooking(booking("b1"))).rejects.toThrow();
  });

  it("upserts notifications by (booking, notifier, kind)", async () => {
    await store.insertBooking(booking("b1"));
    await store.upsertNotification(note("b1", { attempts: 1 }));
    await store.upsertNotification(note("b1", { attempts: 2, lastError: "again" }));
    await store.upsertNotification(note("b1", { kind: "customer_confirmation", status: "sent", lastError: null }));
    const rows = await db.prepare("SELECT * FROM notifications ORDER BY kind").all();
    expect(rows.results).toHaveLength(2);
    expect(rows.results[1]).toMatchObject({ kind: "owner_alert", attempts: 2, last_error: "again" });
    expect(rows.results[0]).toMatchObject({ kind: "customer_confirmation", status: "sent", last_error: null });
  });

  it("refuses notifications for unknown bookings (foreign key)", async () => {
    await expect(store.upsertNotification(note("nope"))).rejects.toThrow();
  });

  it("lists only failed rows under the attempt cap, oldest first, limited", async () => {
    for (const id of ["b1", "b2", "b3", "b4", "b5"]) await store.insertBooking(booking(id));
    await store.upsertNotification(note("b1", { updatedAt: "2026-11-17T12:00:00.000Z" }));
    await store.upsertNotification(note("b2", { updatedAt: "2026-11-17T10:00:00.000Z", attempts: 4 }));
    await store.upsertNotification(note("b3", { attempts: 5 })); // exhausted
    await store.upsertNotification(note("b4", { status: "sent", lastError: null }));
    await store.upsertNotification(note("b5", { updatedAt: "2026-11-17T11:00:00.000Z" }));

    const all = await store.listRetryable(5, 10);
    expect(all.map((r) => r.bookingId)).toEqual(["b2", "b5", "b1"]);
    expect(all[0]).toEqual(note("b2", { updatedAt: "2026-11-17T10:00:00.000Z", attempts: 4 }));

    expect((await store.listRetryable(5, 2)).map((r) => r.bookingId)).toEqual(["b2", "b5"]);
  });

  it("purges old bookings and cascades to their notifications", async () => {
    await store.insertBooking(booking("old", { createdAt: "2024-11-16T00:00:00.000Z" }));
    await store.insertBooking(booking("keep", { createdAt: "2024-11-18T00:00:00.000Z" }));
    await store.upsertNotification(note("old"));
    await store.upsertNotification(note("keep"));

    expect(await store.purgeBefore(new Date("2024-11-17T15:00:00.000Z"))).toBe(1);
    expect(await store.getBooking("old")).toBeNull();
    expect(await store.getBooking("keep")).not.toBeNull();
    const left = await db.prepare("SELECT booking_id FROM notifications").all();
    expect(left.results).toEqual([{ booking_id: "keep" }]);
  });

  it("pings", async () => {
    await expect(store.ping()).resolves.toBeUndefined();
  });
});

describe("db/schema.sql", () => {
  it("matches the migrations statement for statement", () => {
    const schema = readFileSync(fileURLToPath(new URL("../../db/schema.sql", import.meta.url)), "utf8");
    expect(statements(schema)).toEqual(statements(migration));
  });
});
