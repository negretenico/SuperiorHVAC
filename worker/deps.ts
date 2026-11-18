/** Builds production dependencies from Cloudflare bindings + secrets. No business logic. */
import type { BookingDeps, BookingStore, CronDeps, Env, Logger, Notifier } from "./contracts";
import { hashIp } from "./ip-hash";
import { consoleLogger } from "./logger";
import { LogNotifier, createLogOpsAlert } from "./notify/log";
import { ResendNotifier, createResendOpsAlert } from "./notify/resend";
import { createRateLimit } from "./rate-limit";
import { D1Store } from "./store/d1";
import { verifyTurnstile } from "./turnstile";

export interface Services {
  store: BookingStore;
  booking: BookingDeps;
  cron: CronDeps;
}

export interface BuildOptions {
  /** Outbound fetch (Turnstile, Resend). Tests inject a stub. */
  fetch?: typeof fetch;
  /** Output for NOTIFIER=log. */
  write?: (s: string) => void;
  log?: Logger;
}

export function buildServices(env: Env, opts: BuildOptions = {}): Services {
  const fetchFn = opts.fetch ?? ((input, init) => fetch(input, init));
  const log = opts.log ?? consoleLogger;
  const store = new D1Store(env.DB);
  const logMode = env.NOTIFIER === "log";

  const notifiers: readonly Notifier[] = logMode
    ? [new LogNotifier({ ownerEmail: env.OWNER_EMAIL, write: opts.write })]
    : [
        new ResendNotifier({
          apiKey: env.RESEND_API_KEY,
          from: env.FROM_EMAIL,
          replyTo: env.REPLY_TO_EMAIL,
          ownerEmail: env.OWNER_EMAIL,
          fetch: fetchFn,
        }),
      ];

  const alertOps = logMode
    ? createLogOpsAlert(opts.write)
    : createResendOpsAlert({ apiKey: env.RESEND_API_KEY, from: env.FROM_EMAIL, opsEmail: env.OPS_EMAIL, fetch: fetchFn });

  const now = () => new Date();

  return {
    store,
    booking: {
      store,
      verifyTurnstile: (token, ip) => verifyTurnstile({ secret: env.TURNSTILE_SECRET_KEY, token, ip, fetch: fetchFn }),
      rateLimit: createRateLimit(env.BOOKING_RATE_LIMITER, log),
      hashIp: (ip) => hashIp(env.IP_HASH_SALT, ip),
      notifiers,
      newId: () => crypto.randomUUID(),
      now,
      log,
    },
    cron: { store, notifiers, alertOps, now, log },
  };
}
