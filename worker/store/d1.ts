/**
 * D1 implementation of BookingStore. Schema: db/migrations/0001_init.sql.
 * Every query is a prepared statement with bound parameters.
 */
import type { TimeWindow } from "../../src/lib/booking";
import type { BookingStore, NotificationKind, NotificationRecord, NotificationStatus, StoredBooking } from "../contracts";

interface BookingRow {
  id: string;
  created_at: string;
  service: string;
  details: string;
  time_window: string;
  name: string;
  phone: string;
  email: string;
  street: string;
  zip: string;
  ip_hash: string;
}

interface NotificationRow {
  booking_id: string;
  notifier_id: string;
  kind: string;
  status: string;
  attempts: number;
  last_error: string | null;
  updated_at: string;
}

const BOOKING_COLUMNS = "id, created_at, service, details, time_window, name, phone, email, street, zip, ip_hash";
const NOTIFICATION_COLUMNS = "booking_id, notifier_id, kind, status, attempts, last_error, updated_at";

export class D1Store implements BookingStore {
  constructor(private readonly db: D1Database) {}

  async insertBooking(b: StoredBooking): Promise<void> {
    await this.db
      .prepare(`INSERT INTO bookings (${BOOKING_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(b.id, b.createdAt, b.service, b.details, b.timeWindow, b.name, b.phone, b.email, b.street, b.zip, b.ipHash)
      .run();
  }

  async upsertNotification(r: NotificationRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO notifications (${NOTIFICATION_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (booking_id, notifier_id, kind) DO UPDATE SET
           status = excluded.status,
           attempts = excluded.attempts,
           last_error = excluded.last_error,
           updated_at = excluded.updated_at`,
      )
      .bind(r.bookingId, r.notifierId, r.kind, r.status, r.attempts, r.lastError, r.updatedAt)
      .run();
  }

  async listRetryable(maxAttempts: number, limit: number): Promise<NotificationRecord[]> {
    const { results } = await this.db
      .prepare(
        `SELECT ${NOTIFICATION_COLUMNS} FROM notifications
         WHERE status = 'failed' AND attempts < ?
         ORDER BY updated_at ASC LIMIT ?`,
      )
      .bind(maxAttempts, limit)
      .all<NotificationRow>();
    return results.map(toNotification);
  }

  async getBooking(id: string): Promise<StoredBooking | null> {
    const row = await this.db
      .prepare(`SELECT ${BOOKING_COLUMNS} FROM bookings WHERE id = ?`)
      .bind(id)
      .first<BookingRow>();
    return row ? toBooking(row) : null;
  }

  async purgeBefore(cutoff: Date): Promise<number> {
    const iso = cutoff.toISOString();
    // Notifications go first explicitly, so the purge never depends on FK enforcement being on.
    const [, bookings] = await this.db.batch([
      this.db
        .prepare("DELETE FROM notifications WHERE booking_id IN (SELECT id FROM bookings WHERE created_at < ?)")
        .bind(iso),
      this.db.prepare("DELETE FROM bookings WHERE created_at < ?").bind(iso),
    ]);
    return bookings?.meta.changes ?? 0;
  }

  async ping(): Promise<void> {
    await this.db.prepare("SELECT 1").first();
  }
}

function toBooking(r: BookingRow): StoredBooking {
  return {
    id: r.id,
    createdAt: r.created_at,
    ipHash: r.ip_hash,
    service: r.service,
    details: r.details,
    timeWindow: r.time_window as TimeWindow,
    name: r.name,
    phone: r.phone,
    email: r.email,
    street: r.street,
    zip: r.zip,
  };
}

function toNotification(r: NotificationRow): NotificationRecord {
  return {
    bookingId: r.booking_id,
    notifierId: r.notifier_id,
    kind: r.kind as NotificationKind,
    status: r.status as NotificationStatus,
    attempts: r.attempts,
    lastError: r.last_error,
    updatedAt: r.updated_at,
  };
}
