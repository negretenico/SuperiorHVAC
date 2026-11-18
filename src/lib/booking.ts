/**
 * Booking contract shared by the browser form (src/) and the Worker API (worker/).
 * Keep this file dependency-free and runtime-agnostic (no DOM, no Workers APIs).
 */
import { business } from "../config/business";

export const SERVICE_SLUGS = business.services.map((s) => s.slug);
export type ServiceSlug = string;

export const TIME_WINDOWS = ["asap", "morning", "afternoon", "evening"] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];

export const LIMITS = {
  nameMin: 2,
  nameMax: 80,
  detailsMax: 500,
  streetMax: 120,
  emailMax: 254,
} as const;

/** Raw payload POSTed to /api/booking (JSON). Everything is untrusted. */
export interface BookingRequestBody {
  service: unknown;
  details?: unknown;
  timeWindow: unknown;
  name: unknown;
  phone: unknown;
  email: unknown;
  street?: unknown;
  zip: unknown;
  turnstileToken: unknown;
  /** Honeypot: real users leave it empty. */
  company?: unknown;
}

/** Normalized, validated booking. */
export interface BookingInput {
  service: ServiceSlug;
  details: string; // "" when omitted
  timeWindow: TimeWindow;
  name: string;
  /** Normalized to E.164, e.g. "+14195551234" */
  phone: string;
  email: string; // lower-cased, trimmed
  street: string; // "" when omitted
  zip: string; // 5 digits
}

export type BookingField = keyof BookingInput | "turnstileToken";

export type ValidationResult =
  | { ok: true; data: BookingInput; turnstileToken: string; honeypotTripped: boolean }
  | { ok: false; errors: Partial<Record<BookingField, string>> };

/**
 * Validate + normalize an untrusted payload. Pure function, used on both sides.
 * Error messages are user-facing, plain, and say how to fix the problem.
 *
 * Rules (tests in src/lib/booking.test.ts are the spec):
 * - service: one of SERVICE_SLUGS
 * - details: optional string, trimmed, ≤ LIMITS.detailsMax
 * - timeWindow: one of TIME_WINDOWS
 * - name: trimmed, LIMITS.nameMin..nameMax chars
 * - phone: US number; accepts "(419) 555-1234", "419.555.1234", "+1 419 555 1234"; → E.164
 * - email: trimmed, lower-cased, basic shape check, ≤ LIMITS.emailMax
 * - street: optional, trimmed, ≤ LIMITS.streetMax
 * - zip: 5 digits (ZIP+4 accepted and truncated to 5)
 * - turnstileToken: non-empty string
 * - company (honeypot): any non-empty value sets honeypotTripped = true (not an error)
 */
export function validateBooking(_body: unknown): ValidationResult {
  throw new Error("not implemented: validateBooking");
}

/** Response shapes from POST /api/booking. */
export type BookingResponse =
  | { ok: true; id: string }
  | { ok: false; error: "validation"; errors: Partial<Record<BookingField, string>> }
  | { ok: false; error: "turnstile" | "rate_limited" | "bad_request" | "server" };
