// Post-build invariants of the shipped dist/ (issue #280).
//
// Both entries must open with the `"use client"` directive, so a React Server
// Component can import `<SitepingInbox />` without a client wrapper. No unit
// test sees it: Rollup and Terser drop directives from the code, and the build
// writes it back as a Terser preamble (tsup.config.ts). The directive only
// counts as the first statement of the file — after `"use strict"` is fine
// (one directive prologue), after anything else it is an inert string.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DIRECTIVE = '"use client";';
const errors = [];

for (const entry of ["index.js", "index.cjs"]) {
  const code = readFileSync(fileURLToPath(new URL(`../dist/${entry}`, import.meta.url)), "utf8");
  if (!code.startsWith(DIRECTIVE)) {
    errors.push(
      `${entry} does not start with ${DIRECTIVE} (found \`${code.slice(0, 40)}…\`) — ` +
        "check the Terser preamble in tsup.config.ts",
    );
  }
}

if (errors.length > 0) {
  console.error("[verify-dist] FAILED:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`[verify-dist] OK — index.js and index.cjs open with ${DIRECTIVE}`);
