#!/usr/bin/env node
// The npm dist-tag a version is published under: `next` for a prerelease
// (`1.0.0-rc.1` — semver marks one with a hyphen after the patch number),
// `latest` for a release, so a release candidate never becomes what
// `npm install @siteping/<package>` resolves to. Shared by the publish jobs of
// .github/workflows/release.yml — run from a package directory, it prints the
// tag for that package.json — and by scripts/verify-npm-publish.mjs.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** `next` for a prerelease version, `latest` otherwise. */
export function distTag(version) {
  return /^\d+\.\d+\.\d+-/.test(version) ? "next" : "latest";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { version } = JSON.parse(readFileSync("package.json", "utf8"));
  process.stdout.write(distTag(version));
}
