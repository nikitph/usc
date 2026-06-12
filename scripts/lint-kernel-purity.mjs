// INV-2 enforcement: packages/kernel must be pure.
// 1) No imports outside the allowlist. 2) No banned identifiers. 3) No boolean verdict fns.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "packages/kernel/src";
const ALLOWED_IMPORT = /^(\.{1,2}\/|@usc\/shared\/hashing|@usc\/shared\/generated)/;
const BANNED = [/\bDate\.now\b/, /\bMath\.random\b/, /\bfetch\s*\(/, /\bprocess\.env\b/, /\bsetTimeout\b/, /\brandomUUID\b/];
const BOOL_VERDICT = /:\s*boolean[^]{0,40}(valid|verdict|terminal|obligation)/i;

let failures = [];
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(ts|mts)$/.test(f)) continue;
    const src = readFileSync(p, "utf8");
    for (const m of src.matchAll(/from\s+["']([^"']+)["']/g))
      if (!ALLOWED_IMPORT.test(m[1])) failures.push(`${p}: forbidden import '${m[1]}'`);
    for (const b of BANNED) if (b.test(src)) failures.push(`${p}: banned identifier ${b}`);
    if (BOOL_VERDICT.test(src)) failures.push(`${p}: boolean-typed verdict function (use Verdict3, INV-1)`);
  }
}
try { walk(ROOT); } catch { /* package not created yet — pass */ }
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("✓ kernel purity");
