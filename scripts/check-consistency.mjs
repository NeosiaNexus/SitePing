#!/usr/bin/env node
// Consistency gate for the hand-maintained lists that CI cannot derive.
// Fails the build when:
//   1. a locale exists in core's BUILTIN_LOCALES without its dictionary
//      file in the widget AND dashboard i18n directories (the TS loader map
//      already enforces the loader entries at compile time);
//   2. a doc/README states a "N built-in locales" count that no longer
//      matches BUILTIN_LOCALES.length;
//   3. a non-private packages/* package is missing from the release-please
//      config/manifest, or a manifest package is missing its release.yml
//      wiring (output + publish job);
//   4. a published package's build script forgot the fix-dts chain its
//      declarations need (cli is exempt: it ships no .d.ts).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), "utf8");
const errors = [];

// --- 1 + 2. Locales ---------------------------------------------------------

const coreTypes = read("packages/core/src/types.ts");
const localesMatch = coreTypes.match(/BUILTIN_LOCALES = \[([^\]]+)\]/);
if (!localesMatch) {
  errors.push("Could not find BUILTIN_LOCALES in packages/core/src/types.ts");
}
const locales = localesMatch ? [...localesMatch[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]) : [];

for (const code of locales) {
  if (code === "en") continue;
  for (const dir of ["packages/widget/src/i18n", "packages/dashboard/src/i18n"]) {
    if (!existsSync(join(root, dir, `${code}.ts`))) {
      errors.push(`Locale "${code}" is in BUILTIN_LOCALES but ${dir}/${code}.ts does not exist`);
    }
  }
}

/** Every file that may state a locale count. */
const localeCountFiles = ["README.md", ...readdirSync(join(root, "packages")).map((p) => `packages/${p}/README.md`)];
const walk = (dir) =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith(".mdx") ? [`${dir}/${e.name}`] : [],
  );
if (existsSync(join(root, "apps/demo/content/docs"))) {
  localeCountFiles.push(...walk("apps/demo/content/docs"));
}

for (const file of localeCountFiles) {
  if (!existsSync(join(root, file))) continue;
  const content = read(file);
  // EN docs say "7 built-in locales", FR docs "7 locales intégrées".
  for (const m of content.matchAll(/(\d+)\s+(?:built-in locales|locales intégrées)/gi)) {
    if (Number(m[1]) !== locales.length) {
      errors.push(`${file} claims "${m[0]}" but BUILTIN_LOCALES has ${locales.length} entries`);
    }
  }
}

// --- 3. Package registration ------------------------------------------------

const manifest = JSON.parse(read(".release-please-manifest.json"));
const releaseConfig = JSON.parse(read("release-please-config.json"));
const releaseYml = read(".github/workflows/release.yml");

for (const dir of readdirSync(join(root, "packages"))) {
  const pkgJsonPath = join(root, "packages", dir, "package.json");
  if (!existsSync(pkgJsonPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
  if (pkg.private) continue;
  const pkgPath = `packages/${dir}`;
  if (!(pkgPath in manifest)) {
    errors.push(`${pkgPath} is public but missing from .release-please-manifest.json`);
  }
  if (!(pkgPath in releaseConfig.packages)) {
    errors.push(`${pkgPath} is public but missing from release-please-config.json`);
  }
}

for (const pkgPath of Object.keys(manifest)) {
  if (!releaseYml.includes(`${pkgPath}--release_created`)) {
    errors.push(`${pkgPath} has no release_created output in release.yml`);
  }
  if (!releaseYml.includes(`working-directory: ${pkgPath}`)) {
    errors.push(`${pkgPath} has no publish job (working-directory) in release.yml`);
  }
  if (!releaseYml.includes(`${pkgPath}/dist/`)) {
    errors.push(`${pkgPath}/dist/ is missing from the release.yml build artifact paths`);
  }
}

// --- 4. fix-dts chain -------------------------------------------------------

// cli ships no declarations (dts: false) — the only legitimate exemption.
const FIX_DTS_EXEMPT = new Set(["packages/cli"]);

for (const pkgPath of Object.keys(manifest)) {
  if (FIX_DTS_EXEMPT.has(pkgPath)) continue;
  const pkg = JSON.parse(read(`${pkgPath}/package.json`));
  if (!pkg.scripts?.build?.includes("fix-dts.mjs")) {
    errors.push(`${pkgPath} build script is missing the fix-dts chain (tsup && node ../../scripts/fix-dts.mjs dist)`);
  }
}

// ---------------------------------------------------------------------------

if (errors.length > 0) {
  console.error("check-consistency: FAILED\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`check-consistency: OK (${locales.length} locales, ${Object.keys(manifest).length} published packages)`);
