/**
 * Next 16 static export writes per-segment prefetch payloads as nested folders,
 *   out/services/ac-repair/__next.services/$d$slug/__PAGE__.txt
 * but the client router requests the dot-joined name,
 *   /services/ac-repair/__next.services.$d$slug.__PAGE__.txt
 * so every <Link> prefetch 404s on a plain static host (harmless, but a console error on
 * every page). This copies each nested payload to the flat name. Originals are kept.
 * Re-check after Next upgrades: if `npm run build` stops producing `__next.*` folders,
 * this becomes a no-op.
 */
import { copyFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function filesUnder(dir: string, prefix: string[] = []): string[][] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? filesUnder(p, [...prefix, name]) : [[...prefix, name]];
  });
}

/** Returns the flat file paths written. */
export function flattenSegmentFiles(outDir: string): string[] {
  const written: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (!statSync(p).isDirectory() || name === "_next") continue;
      if (name.startsWith("__next.")) {
        for (const parts of filesUnder(p)) {
          const flat = join(dir, [name, ...parts].join("."));
          copyFileSync(join(p, ...parts), flat);
          written.push(flat);
        }
      } else {
        walk(p);
      }
    }
  };
  walk(outDir);
  return written;
}
