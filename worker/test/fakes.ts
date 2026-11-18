/** Test doubles for every BookingDeps/CronDeps dependency. No network, deterministic. */
import type {
  BookingDeps,
  BookingStore,
  CronDeps,
  Logger,
  NotificationKind,
  NotificationRecord,
  Notifier,
  StoredBooking,
} from "../contracts";

export class InMemoryStore implements BookingStore {
  bookings = new Map<string, StoredBooking>();
  notifications = new Map<string, NotificationRecord>();
  failInsert = false;
  failPing = false;

  private key(r: Pick<NotificationRecord, "bookingId" | "notifierId" | "kind">) {
    return `${r.bookingId}|${r.notifierId}|${r.kind}`;
  }
  async insertBooking(b: StoredBooking) {
    if (this.failInsert) throw new Error("D1 insert failed (fake)");
    this.bookings.set(b.id, { ...b });
  }
  async upsertNotification(r: NotificationRecord) {
    this.notifications.set(this.key(r), { ...r });
  }
  async listRetryable(maxAttempts: number, limit: number) {
    return [...this.notifications.values()]
      .filter((n) => n.status === "failed" && n.attempts < maxAttempts)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      .slice(0, limit);
  }
  async getBooking(id: string) {
    return this.bookings.get(id) ?? null;
  }
  async purgeBefore(cutoff: Date) {
    let n = 0;
    for (const [id, b] of this.bookings) {
      if (new Date(b.createdAt) < cutoff) {
        this.bookings.delete(id);
        for (const [k, r] of this.notifications) if (r.bookingId === id) this.notifications.delete(k);
        n++;
      }
    }
    return n;
  }
  async ping() {
    if (this.failPing) throw new Error("D1 unreachable (fake)");
  }
  notificationFor(bookingId: string, kind: NotificationKind) {
    return [...this.notifications.values()].find((n) => n.bookingId === bookingId && n.kind === kind);
  }
}

export class StubNotifier implements Notifier {
  sent: Array<{ kind: NotificationKind; booking: StoredBooking }> = [];
  /** Kinds that throw on send. */
  failing = new Set<NotificationKind>();
  constructor(
    readonly id = "stub-email",
    readonly kinds: readonly NotificationKind[] = ["owner_alert", "customer_confirmation"],
  ) {}
  async send(kind: NotificationKind, booking: StoredBooking) {
    if (this.failing.has(kind)) throw new Error(`${this.id} ${kind} failed (fake)`);
    this.sent.push({ kind, booking });
  }
}

export class MemoryLogger implements Logger {
  lines: Array<{ level: "info" | "warn" | "error"; msg: string; data?: Record<string, unknown> }> = [];
  info(msg: string, data?: Record<string, unknown>) { this.lines.push({ level: "info", msg, data }); }
  warn(msg: string, data?: Record<string, unknown>) { this.lines.push({ level: "warn", msg, data }); }
  error(msg: string, data?: Record<string, unknown>) { this.lines.push({ level: "error", msg, data }); }
}

export const FIXED_NOW = new Date("2026-11-17T15:00:00.000Z");

export function makeDeps(over: Partial<BookingDeps> = {}) {
  const store = new InMemoryStore();
  const notifier = new StubNotifier();
  const log = new MemoryLogger();
  let n = 0;
  const deps: BookingDeps = {
    store,
    verifyTurnstile: async (token) => token === "pass",
    rateLimit: async () => true,
    hashIp: async (ip) => `hash(${ip})`,
    notifiers: [notifier],
    newId: () => `bk_${++n}`,
    now: () => FIXED_NOW,
    log,
    ...over,
  };
  return { deps, store, notifier, log };
}

export function makeCronDeps(over: Partial<CronDeps> = {}) {
  const store = new InMemoryStore();
  const notifier = new StubNotifier();
  const log = new MemoryLogger();
  const opsAlerts: Array<{ subject: string; body: string }> = [];
  const deps: CronDeps = {
    store,
    notifiers: [notifier],
    alertOps: async (subject, body) => { opsAlerts.push({ subject, body }); },
    now: () => FIXED_NOW,
    log,
    ...over,
  };
  return { deps, store, notifier, log, opsAlerts };
}

export { validBody } from "../../src/lib/booking.fixtures";

export function bookingRequest(body: unknown, ip: string | null = "203.0.113.7") {
  const headers = new Headers({ "content-type": "application/json" });
  if (ip) headers.set("cf-connecting-ip", ip);
  return new Request("https://example.test/api/booking", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
