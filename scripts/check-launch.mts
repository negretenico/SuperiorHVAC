/**
 * Lists every business fact still marked todo(...) in src/config/business.ts.
 * Exit 1 if anything is missing. `npm run deploy` runs this first.
 */
import { business, findTodos } from "../src/config/business.ts";

const missing = findTodos(business);
if (missing.length === 0) {
  console.log("check:launch ✓ every business detail is filled in.");
} else {
  console.error(`check:launch ✗ ${missing.length} value(s) still need filling in (src/config/business.ts):\n`);
  for (const m of missing) console.error(`  - ${m}`);
  process.exit(1);
}
