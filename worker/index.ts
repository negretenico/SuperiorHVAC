/**
 * Worker entry: serves the Next.js static export via the ASSETS binding and handles /api/*.
 * Wires real dependencies (D1 store, Turnstile, rate limiter, notifiers) into the handlers.
 * Owned by agent A. Keep this file thin: no business logic here.
 */
import type { Env } from "./contracts";

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ ok: false, error: "not_implemented" }), {
        status: 501,
        headers: { "content-type": "application/json" },
      });
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(_controller: ScheduledController, _env: Env, _ctx: ExecutionContext): Promise<void> {
    // wired by agent A: runCron(...)
  },
} satisfies ExportedHandler<Env>;
