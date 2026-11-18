import type { BookingRequestBody } from "../../lib/booking";
import { interpretResponse, type Outcome } from "./flow";

export const BOOKING_ENDPOINT = "/api/booking";

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/** POST the booking and turn whatever comes back (or doesn't) into a UI outcome. Never throws. */
export async function sendBooking(body: BookingRequestBody, fetcher: Fetcher = (input, init) => fetch(input, init)): Promise<Outcome> {
  let res: Response;
  try {
    res = await fetcher(BOOKING_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { kind: "server" };
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON (proxy error page, empty body): status alone decides.
  }
  return interpretResponse(res.status, data);
}
