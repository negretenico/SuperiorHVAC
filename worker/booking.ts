import { validateBooking, type BookingResponse } from "../src/lib/booking";
import type { BookingDeps, NotificationKind, Notifier, StoredBooking } from "./contracts";
import { errorMessage, json, methodNotAllowed } from "./http";

/** Requests larger than this are rejected before parsing. */
export const MAX_BODY_BYTES = 10 * 1024;

const KINDS: readonly NotificationKind[] = ["owner_alert", "customer_confirmation"];

const reply = (body: BookingResponse, status: number) => json(body, status);

/**
 * POST /api/booking. Spec: worker/booking.test.ts.
 * Order: method → rate limit → parse JSON → validate → honeypot → Turnstile → store → notify.
 * Notification failures never fail the request once the booking is stored.
 */
export async function handleBooking(req: Request, deps: BookingDeps): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed("POST");

  const ip = req.headers.get("cf-connecting-ip");
  if (!(await deps.rateLimit(ip ?? "unknown"))) {
    deps.log.warn("booking rate limited");
    return reply({ ok: false, error: "rate_limited" }, 429);
  }

  const body = await readJson(req);
  if (body === BAD) return reply({ ok: false, error: "bad_request" }, 400);

  const v = validateBooking(body);
  if (!v.ok) return reply({ ok: false, error: "validation", errors: v.errors }, 400);

  if (v.honeypotTripped) {
    // Look like success so bots learn nothing; store and send nothing.
    deps.log.info("booking honeypot tripped");
    return reply({ ok: true, id: deps.newId() }, 200);
  }

  let human: boolean;
  try {
    human = await deps.verifyTurnstile(v.turnstileToken, ip);
  } catch (err) {
    deps.log.error("turnstile verification errored", { error: errorMessage(err) });
    human = false;
  }
  if (!human) return reply({ ok: false, error: "turnstile" }, 403);

  const booking: StoredBooking = {
    ...v.data,
    id: deps.newId(),
    createdAt: deps.now().toISOString(),
    ipHash: ip ? await deps.hashIp(ip) : "",
  };
  try {
    await deps.store.insertBooking(booking);
  } catch (err) {
    deps.log.error("booking insert failed", { bookingId: booking.id, error: errorMessage(err) });
    return reply({ ok: false, error: "server" }, 500);
  }
  deps.log.info("booking stored", { bookingId: booking.id, service: booking.service });

  await notifyAll(booking, deps);
  return reply({ ok: true, id: booking.id }, 200);
}

/** Send every kind through every notifier that handles it and record each outcome. Never throws. */
async function notifyAll(booking: StoredBooking, deps: BookingDeps): Promise<void> {
  const jobs: Array<[Notifier, NotificationKind]> = [];
  for (const kind of KINDS) for (const n of deps.notifiers) if (n.kinds.includes(kind)) jobs.push([n, kind]);
  await Promise.all(jobs.map(([n, kind]) => notifyOne(n, kind, booking, deps)));
}

async function notifyOne(notifier: Notifier, kind: NotificationKind, booking: StoredBooking, deps: BookingDeps) {
  const ctx = { bookingId: booking.id, kind, notifierId: notifier.id };
  let status: "sent" | "failed" = "sent";
  let lastError: string | null = null;
  try {
    await notifier.send(kind, booking);
    deps.log.info("notification sent", ctx);
  } catch (err) {
    status = "failed";
    lastError = errorMessage(err);
    deps.log.error("notification failed", { ...ctx, error: lastError });
  }
  try {
    await deps.store.upsertNotification({
      bookingId: booking.id,
      notifierId: notifier.id,
      kind,
      status,
      attempts: 1,
      lastError,
      updatedAt: deps.now().toISOString(),
    });
  } catch (err) {
    deps.log.error("notification status write failed", { ...ctx, status, error: errorMessage(err) });
  }
}

const BAD = Symbol("bad_request");

/** Parse a JSON body no larger than MAX_BODY_BYTES; BAD for anything else. */
async function readJson(req: Request): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return BAD;
  try {
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.byteLength > MAX_BODY_BYTES) return BAD;
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return BAD;
  }
}
