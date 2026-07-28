#!/usr/bin/env node
// Prints the repo-relative directory of every published package, one per
// line — derived from .release-please-manifest.json, the single place a
// package registers for release. CI loops (publint/attw, pkg-pr-new) and
// scripts/pkg-checks.mjs consume this instead of hand-maintained lists, so
// a new package can no longer be silently skipped by a gate.

import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../.release-please-manifest.json", import.meta.url), "utf8"));

for (const pkgPath of Object.keys(manifest)) {
  console.log(pkgPath);
}
