import type { BookingDeps } from "./contracts";

/**
 * POST /api/booking. Spec: worker/booking.test.ts.
 * Order: method → rate limit → parse JSON → validate → honeypot → Turnstile → store → notify.
 * Notification failures never fail the request once the booking is stored.
 */
export async function handleBooking(_req: Request, _deps: BookingDeps): Promise<Response> {
  throw new Error("not implemented: handleBooking");
}
