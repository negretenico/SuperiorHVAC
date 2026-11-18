/**
 * Worker-side contracts. Every external dependency of the booking handler sits behind one of
 * these interfaces so tests inject fakes (worker/test/fakes.ts) and production injects
 * Cloudflare/Resend implementations. Changing these is a cross-agent change: coordinate.
 */
import type { BookingInput } from "../src/lib/booking";

export type NotificationKind = "owner_alert" | "customer_confirmation";
export type NotificationStatus = "pending" | "sent" | "failed";

export interface StoredBooking extends BookingInput {
  id: string; // uuid
  createdAt: string; // ISO 8601 UTC
  ipHash: string; // salted SHA-256 hex of client IP, never the raw IP
}

export interface NotificationRecord {
  bookingId: string;
  notifierId: string; // e.g. "resend-email", later "twilio-sms"
  kind: NotificationKind;
  status: NotificationStatus;
  attempts: number;
  lastError: string | null;
  updatedAt: string;
}

/**
 * A channel that can deliver one or more kinds of notification.
 * Adding SMS later = a new Notifier implementation registered in worker/index.ts.
 * The booking handler never changes.
 */
export interface Notifier {
  readonly id: string;
  readonly kinds: readonly NotificationKind[];
  /** Resolve on success. Throw (with a useful message) on failure. */
  send(kind: NotificationKind, booking: StoredBooking): Promise<void>;
}

/** Persistence. Production: D1 (worker/store/d1.ts). Tests: InMemoryStore. */
export interface BookingStore {
  insertBooking(b: StoredBooking): Promise<void>;
  upsertNotification(r: NotificationRecord): Promise<void>;
  /** Failed notifications with attempts < maxAttempts, oldest first. */
  listRetryable(maxAttempts: number, limit: number): Promise<NotificationRecord[]>;
  getBooking(id: string): Promise<StoredBooking | null>;
  /** Delete bookings (and their notifications) created before `cutoff`. Returns rows deleted. */
  purgeBefore(cutoff: Date): Promise<number>;
  /** Cheap liveness probe for /api/health. */
  ping(): Promise<void>;
}

export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

export interface BookingDeps {
  store: BookingStore;
  verifyTurnstile(token: string, ip: string | null): Promise<boolean>;
  /** true = allowed, false = over the limit. Keyed by client IP. */
  rateLimit(key: string): Promise<boolean>;
  hashIp(ip: string): Promise<string>;
  notifiers: readonly Notifier[];
  newId(): string;
  now(): Date;
  log: Logger;
}

export interface CronDeps {
  store: BookingStore;
  notifiers: readonly Notifier[];
  /** Sends a single alert to OPS_EMAIL when something permanently failed. */
  alertOps(subject: string, body: string): Promise<void>;
  now(): Date;
  log: Logger;
}

export const MAX_NOTIFY_ATTEMPTS = 5;
export const RETENTION_MONTHS = 24;

/** Cloudflare bindings + secrets (see wrangler.toml and .dev.vars.example). */
export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  BOOKING_RATE_LIMITER: RateLimit;
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  OWNER_EMAIL: string; // comma-separated allowed
  FROM_EMAIL: string; // e.g. "Superior HVAC <bookings@domain>"
  REPLY_TO_EMAIL: string;
  OPS_EMAIL: string;
  IP_HASH_SALT: string;
  /** "resend" (default) | "log" (local dev + e2e: never sends real email) */
  NOTIFIER?: string;
}
