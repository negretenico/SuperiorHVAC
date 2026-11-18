/** Small HTTP helpers shared by the API handlers. */

/** JSON response that is never cached by browsers or the edge. */
export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

export function methodNotAllowed(allow: string): Response {
  return json({ ok: false, error: "method_not_allowed" }, 405, { allow });
}

/** A short, log-safe description of a thrown value. */
export function errorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.slice(0, 500);
}
