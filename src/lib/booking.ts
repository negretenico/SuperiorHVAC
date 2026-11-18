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
export function validateBooking(body: unknown): ValidationResult {
  const b: Record<string, unknown> =
    typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const errors: Partial<Record<BookingField, string>> = {};

  const service = str(b.service);
  if (!SERVICE_SLUGS.includes(service)) errors.service = "Please choose the kind of service you need.";

  const details = optionalStr(b.details);
  if (details === null) errors.details = "Please describe the problem in plain text.";
  else if (details.length > LIMITS.detailsMax)
    errors.details = `Please keep the description under ${LIMITS.detailsMax} characters.`;

  const timeWindow = str(b.timeWindow);
  if (!isTimeWindow(timeWindow)) errors.timeWindow = "Please pick a time that works for you.";

  const name = str(b.name);
  if (name.length < LIMITS.nameMin) errors.name = "Please enter your name so we know who to ask for.";
  else if (name.length > LIMITS.nameMax) errors.name = `Please keep your name under ${LIMITS.nameMax} characters.`;

  const phone = normalizeUsPhone(str(b.phone));
  if (phone === null) errors.phone = "Please enter a 10-digit US phone number, like 419-555-0142.";

  const email = str(b.email).toLowerCase();
  if (email.length > LIMITS.emailMax || !EMAIL_RE.test(email))
    errors.email = "Please enter a valid email address, like name@example.com.";

  const street = optionalStr(b.street);
  if (street === null) errors.street = "Please enter your street address as plain text.";
  else if (street.length > LIMITS.streetMax)
    errors.street = `Please keep the street address under ${LIMITS.streetMax} characters.`;

  const zipMatch = /^(\d{5})(?:-\d{4})?$/.exec(str(b.zip));
  if (!zipMatch) errors.zip = "Please enter your 5-digit ZIP code.";

  const turnstileToken = str(b.turnstileToken);
  if (!turnstileToken) errors.turnstileToken = "Please complete the quick check that you're not a robot.";

  if (Object.keys(errors).length > 0 || phone === null || !zipMatch || details === null || street === null || !isTimeWindow(timeWindow)) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    data: { service, details, timeWindow, name, phone, email, street, zip: zipMatch[1]! },
    turnstileToken,
    honeypotTripped: b.company !== undefined && b.company !== null && b.company !== "",
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/** Trimmed string, or "" for anything that is not a string. */
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Optional string field: "" when missing, trimmed when a string, null when some other type. */
function optionalStr(v: unknown): string | null {
  if (v === undefined || v === null) return "";
  return typeof v === "string" ? v.trim() : null;
}

function isTimeWindow(v: string): v is TimeWindow {
  return (TIME_WINDOWS as readonly string[]).includes(v);
}

/** US (NANP) number → E.164, or null. Allows digits, spaces, dots, dashes, parens, one leading "+". */
function normalizeUsPhone(raw: string): string | null {
  if (!/^\+?[\d\s().-]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  else if (raw.startsWith("+")) return null; // "+" must be followed by the US country code
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return `+1${digits}`;
}

/** Response shapes from POST /api/booking. */
export type BookingResponse =
  | { ok: true; id: string }
  | { ok: false; error: "validation"; errors: Partial<Record<BookingField, string>> }
  | { ok: false; error: "turnstile" | "rate_limited" | "bad_request" | "server" };
