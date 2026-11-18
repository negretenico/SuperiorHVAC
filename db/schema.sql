-- Human-readable copy of the current schema. NOT applied by anything.
-- Source of truth: db/migrations/*.sql (applied in order by `wrangler d1 migrations apply`).
-- worker/store/d1.test.ts fails if this file drifts from the migrations.

-- Superior HVAC bookings + notification delivery status.
-- Applied with `npm run db:init:local` / `npm run db:init:remote` (wrangler d1 migrations apply).
-- Times are ISO 8601 UTC strings (e.g. 2026-11-17T15:00:00.000Z), which sort chronologically.

CREATE TABLE IF NOT EXISTS bookings (
  id          TEXT PRIMARY KEY,           -- uuid
  created_at  TEXT NOT NULL,
  service     TEXT NOT NULL,              -- service slug from src/config/business.ts
  details     TEXT NOT NULL DEFAULT '',
  time_window TEXT NOT NULL,              -- asap | morning | afternoon | evening
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,              -- E.164
  email       TEXT NOT NULL,
  street      TEXT NOT NULL DEFAULT '',
  zip         TEXT NOT NULL,
  ip_hash     TEXT NOT NULL               -- salted SHA-256 hex of the client IP; never the raw IP
);

-- Retention purge (cron) and "recent bookings" queries.
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at);

CREATE TABLE IF NOT EXISTS notifications (
  booking_id  TEXT NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  notifier_id TEXT NOT NULL,              -- e.g. resend-email
  kind        TEXT NOT NULL CHECK (kind IN ('owner_alert', 'customer_confirmation')),
  status      TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (booking_id, notifier_id, kind)
);

-- Cron retry scan: status = 'failed' AND attempts < max.
CREATE INDEX IF NOT EXISTS idx_notifications_status_attempts ON notifications (status, attempts);
