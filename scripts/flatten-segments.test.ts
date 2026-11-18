import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { flattenSegmentFiles } from "./flatten-segments.ts";

function fixture() {
  const out = mkdtempSync(join(tmpdir(), "flatten-"));
  mkdirSync(join(out, "book", "__next.book"), { recursive: true });
  writeFileSync(join(out, "book", "__next.book", "__PAGE__.txt"), "book-page");
  mkdirSync(join(out, "services", "ac-repair", "__next.services", "$d$slug"), { recursive: true });
  writeFileSync(join(out, "services", "ac-repair", "__next.services", "$d$slug", "__PAGE__.txt"), "svc-page");
  writeFileSync(join(out, "__next.__PAGE__.txt"), "home-page"); // already flat
  return out;
}

describe("flattenSegmentFiles", () => {
  it("copies nested segment payloads to the dot-joined names the client router requests", () => {
    const out = fixture();
    const written = flattenSegmentFiles(out);
    expect(readFileSync(join(out, "book", "__next.book.__PAGE__.txt"), "utf8")).toBe("book-page");
    expect(readFileSync(join(out, "services", "ac-repair", "__next.services.$d$slug.__PAGE__.txt"), "utf8")).toBe("svc-page");
    expect(written).toHaveLength(2);
  });

  it("keeps the originals and leaves already-flat files alone", () => {
    const out = fixture();
    flattenSegmentFiles(out);
    expect(existsSync(join(out, "book", "__next.book", "__PAGE__.txt"))).toBe(true);
    expect(readFileSync(join(out, "__next.__PAGE__.txt"), "utf8")).toBe("home-page");
  });

  it("is idempotent", () => {
    const out = fixture();
    flattenSegmentFiles(out);
    expect(flattenSegmentFiles(out)).toHaveLength(2);
  });
});
