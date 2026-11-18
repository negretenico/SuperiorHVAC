import { flattenSegmentFiles } from "./flatten-segments.ts";

const written = flattenSegmentFiles("out");
console.log(`flatten-segments ✓ ${written.length} prefetch payload(s) copied to flat names`);
