// Post-build invariants for the production guard (issue #104).
//
// The guard's whole value depends on a build artifact property no unit test
// can see: the literal `process.env.NODE_ENV` must survive our own
// esbuild/minify pass (identity define in tsup.config.ts) so that a
// consumer's bundler can inline THEIR environment into it. This script fails
// the build when either invariant breaks:
//   1. every shipped bundle still contains the literal (our build didn't
//      fold it — the exact regression that produced #104), and
//   2. a simulated consumer production build CAN fold it (the literal is
//      still in a define-replaceable position).
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
// esbuild is a transitive dep (via tsup) — hoisted installs expose it at the
// root, isolated installs (bun) only next to tsup's real location.
function resolveEsbuild() {
  try {
    return require("esbuild");
  } catch {
    return createRequire(require.resolve("tsup"))("esbuild");
  }
}
const esbuild = resolveEsbuild();

const distDir = new URL("../dist", import.meta.url).pathname;
const LITERAL = "process.env.NODE_ENV";

const jsFiles = readdirSync(distDir).filter((f) => f.endsWith(".js"));
const sources = new Map(jsFiles.map((f) => [f, readFileSync(join(distDir, f), "utf8")]));

// The IIFE bundle is self-contained; ESM entries may carry the launcher in a
// shared chunk — check bundle *groups*, not individual files.
const groups = {
  "index.global.js (iife)": ["index.global.js"],
  "index.js (+chunks)": jsFiles.filter((f) => f === "index.js" || f.startsWith("chunk-")),
  "react.js (+chunks)": jsFiles.filter((f) => f === "react.js" || f.startsWith("chunk-")),
};

const errors = [];

for (const [label, files] of Object.entries(groups)) {
  if (files.length === 0) {
    errors.push(`${label}: no files found in dist/`);
    continue;
  }
  const occurrences = files.reduce((n, f) => n + (sources.get(f)?.split(LITERAL).length - 1 || 0), 0);
  // 2 uses in source: the production guard and the test-env shadow-mode check
  if (occurrences < 2) {
    errors.push(
      `${label}: found ${occurrences} occurrence(s) of \`${LITERAL}\` (expected >= 2) — ` +
        "the build folded the guard again; check the identity define in tsup.config.ts",
    );
  }
}

// Simulate a consumer bundling the shipped IIFE for production: the define
// must be able to replace the literal (otherwise "dev-only by default" is
// dead for bundled deployments).
const iife = sources.get("index.global.js");
if (iife) {
  const folded = await esbuild.transform(iife, {
    minify: true,
    define: { [LITERAL]: '"production"' },
  });
  if (folded.code.includes(LITERAL)) {
    errors.push(
      "index.global.js: a consumer production define left the literal in place — " +
        "the guard is no longer in a define-replaceable position",
    );
  }
}

if (errors.length > 0) {
  console.error("[verify-dist-guard] FAILED:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`[verify-dist-guard] OK — ${LITERAL} literal intact and consumer-replaceable in all bundles`);
