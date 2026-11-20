import { securityTxt } from "../../../lib/securitytxt";

// Required for `output: "export"`: render to a static out/.well-known/security.txt at build time.
export const dynamic = "force-static";

export function GET() {
  return new Response(securityTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
