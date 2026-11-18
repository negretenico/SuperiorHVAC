import type { Logger } from "./contracts";
import { errorMessage } from "./http";

/** The part of the Workers rate-limit binding we use (env.BOOKING_RATE_LIMITER). */
export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * true = allowed. Fails OPEN: if the binding itself errors we let the request through
 * (Turnstile still guards the form) and log a warning, rather than turning customers away.
 */
export function createRateLimit(binding: RateLimitBinding, log: Logger) {
  return async (key: string): Promise<boolean> => {
    try {
      const { success } = await binding.limit({ key });
      return success;
    } catch (err) {
      log.warn("rate limit binding failed; allowing request", { error: errorMessage(err) });
      return true;
    }
  };
}
