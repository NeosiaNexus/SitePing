#!/usr/bin/env node
// Post-release guard (issue #184): every version in the release-please
// manifest must exist on npm. Catches both observed silent-failure modes —
// a publish job that failed after its tag was created (release run #166),
// and publish jobs skipped because releases_created came out false despite
// the tag (run #182). Runs at the end of every release.yml push run, so a
// gap keeps failing the workflow until it is repaired (rescue:
// workflow_dispatch with publish=true).
//
// Usage: node verify-npm-publish.mjs [manifest-path]
// Env:   VERIFY_PUBLISH_ATTEMPTS (default 4) and VERIFY_PUBLISH_DELAY_MS
//        (default 20000) — the retries absorb npm read-after-publish lag.

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const manifestPath = process.argv[2] ?? ".release-please-manifest.json";
// CI-only knobs — this script never runs through a turbo task, so declaring
// them in turbo.json (what noUndeclaredEnvVars asks for) would be wrong.
// biome-ignore lint/suspicious/noUndeclaredEnvVars: not a turbo task input
const attempts = Number(process.env.VERIFY_PUBLISH_ATTEMPTS ?? 4);
// biome-ignore lint/suspicious/noUndeclaredEnvVars: not a turbo task input
const delayMs = Number(process.env.VERIFY_PUBLISH_DELAY_MS ?? 20_000);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** True when name@version is visible on the npm registry. */
function isPublished(name, version) {
  try {
    const out = execFileSync("npm", ["view", `${name}@${version}`, "version", "--loglevel=error"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return out.trim() === version;
  } catch {
    // npm exits non-zero with E404 when the exact version does not exist —
    // and a just-published version can 404 briefly, hence the retry loop.
    return false;
  }
}

const targets = Object.entries(manifest).flatMap(([pkgPath, version]) => {
  // "0.0.0" is the pre-first-release placeholder for a newly registered
  // package — release-please bumps it before ever publishing, so there is
  // no npm version to verify yet.
  if (version === "0.0.0") return [];
  const pkg = JSON.parse(readFileSync(join(pkgPath, "package.json"), "utf8"));
  return pkg.private ? [] : [{ name: pkg.name, version }];
});

let missing = targets;
for (let attempt = 1; attempt <= attempts && missing.length > 0; attempt++) {
  if (attempt > 1) {
    console.log(`Retrying ${missing.length} package(s) in ${delayMs / 1000}s (attempt ${attempt}/${attempts})…`);
    await sleep(delayMs);
  }
  missing = missing.filter(({ name, version }) => !isPublished(name, version));
}

const rows = targets.map(({ name, version }) => {
  const ok = !missing.some((m) => m.name === name);
  console.log(`${ok ? "OK     " : "MISSING"} ${name}@${version}`);
  return `| ${name} | ${version} | ${ok ? "✅ published" : "❌ missing"} |`;
});

// biome-ignore lint/suspicious/noUndeclaredEnvVars: GitHub Actions built-in, not a turbo task input
const stepSummary = process.env.GITHUB_STEP_SUMMARY;
if (stepSummary) {
  appendFileSync(
    stepSummary,
    `## npm publish verification\n\n| Package | Manifest version | npm |\n|---|---|---|\n${rows.join("\n")}\n`,
  );
}

if (missing.length > 0) {
  console.error(
    `\n${missing.length} manifest version(s) missing from npm — a tag/release exists without its publication (issue #184).\n` +
      "Rescue: re-run the Release workflow via workflow_dispatch with publish=true.",
  );
  process.exit(1);
}
console.log(`\nAll ${targets.length} manifest versions are live on npm.`);
