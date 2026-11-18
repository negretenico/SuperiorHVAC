import type { BookingStore } from "./contracts";

/** GET /api/health → 200 {"ok":true} | 503 {"ok":false}. Spec: worker/health.test.ts. */
export async function handleHealth(_store: BookingStore): Promise<Response> {
  throw new Error("not implemented: handleHealth");
}
