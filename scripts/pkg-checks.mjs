#!/usr/bin/env node
// Package-health gate: publint (packaging mistakes) + attw --pack (type
// resolution across module systems) over every published package. Runs the
// pinned local binaries, so `bun run pkg-checks` reproduces exactly what CI
// enforces. Requires a prior `bun run build`.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../.release-please-manifest.json", import.meta.url), "utf8"));
const packages = Object.keys(manifest);

let failed = false;

for (const pkg of packages) {
  for (const [label, bin, args] of [
    ["publint", "./node_modules/.bin/publint", [pkg]],
    ["attw", "./node_modules/.bin/attw", [pkg, "--pack"]],
  ]) {
    console.log(`\n=== ${label} ${pkg} ===`);
    try {
      execFileSync(bin, args, { stdio: "inherit" });
    } catch {
      failed = true;
    }
  }
}

if (failed) {
  console.error("\npkg-checks: FAILED — see output above.");
  process.exit(1);
}
console.log("\npkg-checks: all packages healthy.");
