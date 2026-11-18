/** Router: /api/* to handlers, everything else to the static export. */
import { handleBooking } from "./booking";
import type { Env } from "./contracts";
import { runCron } from "./cron";
import type { Services } from "./deps";
import { handleHealth } from "./health";
import { errorMessage, json, methodNotAllowed } from "./http";

export type { Services } from "./deps";

export function createWorker(build: (env: Env) => Services) {
  return {
    async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
      const { pathname } = new URL(request.url);
      if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

      const services = build(env);
      try {
        return await routeApi(pathname, request, services);
      } catch (err) {
        services.booking.log.error("unhandled API error", { path: pathname, error: errorMessage(err) });
        return json({ ok: false, error: "server" }, 500);
      }
    },

    async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
      ctx.waitUntil(runCron(build(env).cron));
    },
  } satisfies ExportedHandler<Env>;
}

async function routeApi(pathname: string, request: Request, services: Services): Promise<Response> {
  switch (pathname) {
    case "/api/booking":
      return handleBooking(request, services.booking);
    case "/api/health": {
      if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed("GET, HEAD");
      const res = await handleHealth(services.store);
      return request.method === "HEAD" ? new Response(null, { status: res.status, headers: res.headers }) : res;
    }
    default:
      return json({ ok: false, error: "not_found" }, 404);
  }
}
