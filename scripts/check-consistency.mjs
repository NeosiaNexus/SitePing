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
//      declarations need (cli is exempt: it ships no .d.ts);
//   5. the root esbuild override drifted from the widget's esbuild spec;
//   6. Node tooling (configs, scripts/, e2e/) takes a filesystem path from a
//      file URL's .pathname instead of fileURLToPath();
//   7. adapter-prisma's source imports @prisma/client, which it declares as
//      an optional peer dependency;
//   8. a published package depends on another through `workspace:` without
//      the release.yml step that pins the range before `npm publish`.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
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

// --- 5. esbuild override ----------------------------------------------------

// The root `overrides.esbuild` is the supply-chain floor for every transitive
// esbuild (#242), and it wins over packages/widget's own devDependency. When
// Dependabot bumps only the widget spec (#269), the lockfile cannot move: the
// bump lands as a no-op and every later bun update job dies on NoChangeError.
// Keeping the two specs identical makes such a PR fail here instead, so the
// override is bumped in the same PR.
const esbuildOverride = JSON.parse(read("package.json")).overrides?.esbuild;
const widgetEsbuild = JSON.parse(read("packages/widget/package.json")).devDependencies?.esbuild;
if (esbuildOverride !== widgetEsbuild) {
  errors.push(
    `root overrides.esbuild (${esbuildOverride}) must equal packages/widget devDependencies.esbuild (${widgetEsbuild}) — bump both together`,
  );
}

// --- 6. File-URL paths in tooling -------------------------------------------

// A file URL's `.pathname` is not a filesystem path: it stays percent-encoded
// ("Mes%20projets", "D%C3%A9veloppement") and, on Windows, keeps a slash in
// front of the drive ("/C:/...", which Node resolves to "C:\C:\..."). Every
// CI job runs on ubuntu-latest from a plain path, where both give the same
// string, so nothing else in CI can catch a regression of #334.
// fileURLToPath() is right on every platform.
//
// Scanned: what Node runs as tooling, i.e. the top-level files of the root
// and of each workspace (configs, presets), their scripts/ dirs, and e2e/.
// Unit tests are out on purpose: their `vi.mock(new URL(…).pathname)` ids
// are Vite module ids, not fs paths, and they resolve under jsdom (which every
// file using them runs in). A relative specifier would be the sturdier form;
// fileURLToPath() can't be used there, as vi.mock is hoisted above imports.
// `,?` matches biome's multi-line call form, `\)+` a parenthesised
// `(new URL(…)).pathname`, `\??` an optional-chained `?.pathname`.
const FILE_URL_PATHNAME = /import\.meta\.url\s*,?\s*\)+\s*\??\.pathname/g;
const workspaceDirs = JSON.parse(read("package.json")).workspaces.flatMap((glob) => {
  if (!glob.endsWith("/*")) return [glob];
  const parent = glob.slice(0, -2);
  return readdirSync(join(root, parent), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `${parent}/${e.name}`);
});
const toolingDirs = [".", "scripts", "e2e", ...workspaceDirs, ...workspaceDirs.map((w) => `${w}/scripts`)];
let toolingFiles = 0;

for (const dir of toolingDirs) {
  if (!existsSync(join(root, dir))) continue;
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (!entry.isFile() || !/\.[cm]?[jt]s$/.test(entry.name)) continue;
    const file = dir === "." ? entry.name : `${dir}/${entry.name}`;
    const content = read(file);
    toolingFiles++;
    for (const m of content.matchAll(FILE_URL_PATHNAME)) {
      const line = content.slice(0, m.index).split("\n").length;
      errors.push(
        `${file}:${line} takes a filesystem path from a file URL's .pathname — use fileURLToPath() (node:url)`,
      );
    }
  }
}

// --- 7. @prisma/client stays an optional peer --------------------------------

// Stores other than Prisma mount through adapter-prisma too, so its
// @prisma/client peer is optional (#306): npm, pnpm and Bun then leave it
// out. That is only safe while the source never imports it — not even as a
// type, which would leave an import the consumer may not resolve in the
// published declarations. The client shape is structural on purpose
// (SitepingPrismaClient).
const PRISMA_CLIENT_IMPORT = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*["']@prisma\/client(?:\/[^"']*)?["']/;
const prismaSourceFiles = (dir) =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? prismaSourceFiles(`${dir}/${e.name}`) : /\.[cm]?tsx?$/.test(e.name) ? [`${dir}/${e.name}`] : [],
  );
for (const file of prismaSourceFiles("packages/adapter-prisma/src")) {
  if (PRISMA_CLIENT_IMPORT.test(read(file))) {
    errors.push(`${file} imports @prisma/client — adapter-prisma declares it as an optional peer (#306)`);
  }
}

// --- 8. Workspace dependencies are pinned before publishing ------------------

// Bun links a `workspace:` range to the local package whatever its version
// (a semver range stops matching as soon as release-please bumps it), but
// `npm publish` ships the protocol verbatim, which npm cannot install. The
// publish job must rewrite each one — `npm pkg set "dependencies.<name>=…"`.
for (const pkgPath of Object.keys(manifest)) {
  const pkg = JSON.parse(read(`${pkgPath}/package.json`));
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
      if (spec.startsWith("workspace:") && !releaseYml.includes(`npm pkg set "${field}.${name}=`)) {
        errors.push(`${pkgPath} ${field} "${name}": "${spec}" is not pinned before npm publish in release.yml`);
      }
    }
  }
}

// ---------------------------------------------------------------------------

if (errors.length > 0) {
  console.error("check-consistency: FAILED\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `check-consistency: OK (${locales.length} locales, ${Object.keys(manifest).length} published packages, ${toolingFiles} tooling files)`,
);
