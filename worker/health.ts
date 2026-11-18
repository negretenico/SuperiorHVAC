import type { BookingStore } from "./contracts";
import { json } from "./http";

/** GET /api/health → 200 {"ok":true} | 503 {"ok":false}. Spec: worker/health.test.ts. */
export async function handleHealth(store: BookingStore): Promise<Response> {
  try {
    await store.ping();
    return json({ ok: true });
  } catch {
    return json({ ok: false }, 503);
  }
}
