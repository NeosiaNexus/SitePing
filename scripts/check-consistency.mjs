#!/usr/bin/env node
// Consistency gate for the hand-maintained lists that CI cannot derive.
// Fails the build when:
//   1. a locale exists in core's BUILTIN_LOCALES without its dictionary
//      file in the widget AND dashboard i18n directories (the TS loader map
//      already enforces the loader entries at compile time);
//   2. a doc/README/landing page states a "N built-in locales" count that
//      no longer matches BUILTIN_LOCALES.length or lists the locales without
//      one of them, or a demo locale picker does not offer exactly
//      BUILTIN_LOCALES;
//   3. a non-private packages/* package is missing from the release-please
//      config/manifest, or a manifest package is missing its release.yml
//      wiring (output + publish job);
//   4. a published package's build script forgot the fix-dts chain its
//      declarations need (cli is exempt: it ships no .d.ts);
//   5. the root esbuild override drifted from the widget's esbuild spec;
//   6. Node tooling (configs, scripts/, e2e/) takes a filesystem path from a
//      file URL's .pathname instead of fileURLToPath();
//   7. adapter-prisma's source imports @prisma/client, which it declares as
//      an optional peer dependency, or integration-issues' source imports
//      @siteping/server, which it does not declare at all;
//   8. a published package depends on another through `workspace:` without
//      the release.yml step that pins the range before `npm publish`, or
//      its publish job does not wait for the dependency's;
//   9. a workspace's `engines.node` differs from core's, or something that
//      follows that floor did not move with it (adapter scaffold, oldest CI
//      node-compat lane, publish jobs' Node, demo runtime image, docs and
//      README "Node N+" claims);
//  10. a widget `keydown` listener that handles Tab is added with a plain
//      addEventListener instead of addSurfaceKeydownListener, so a host
//      modal's capture-phase focus trap would take the Tab first.

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

/** Every file that may state a locale count or list the locales. */
const localeDocFiles = [
  "README.md",
  "CLAUDE.md",
  "CONTRIBUTING.md",
  "packages/core/src/types.ts",
  ...readdirSync(join(root, "packages")).map((p) => `packages/${p}/README.md`),
];
const walk = (dir, ext) =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`, ext) : e.name.endsWith(ext) ? [`${dir}/${e.name}`] : [],
  );
for (const [dir, ext] of [
  ["apps/demo/content/docs", ".mdx"],
  ["apps/demo/src", ".tsx"],
]) {
  if (existsSync(join(root, dir))) localeDocFiles.push(...walk(dir, ext));
}

const englishName = new Intl.DisplayNames(["en"], { type: "language" });
// A standalone code or name: `fr` or "French", not the fr of fr-CA or fr_FR.
const mentionRe = (word) =>
  new RegExp(`(?<![\\p{L}\\p{N}_-])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_-])`, "gu");
// What separates two entries of a locale list: a closing backtick or
// parenthesis, an optional note ("(default)", "(`fr`)"), a comma and/or
// "and"/"et", then the words that may lead the next entry ("French (`fr`)",
// "Brazilian Portuguese").
const LIST_SEPARATOR =
  /^[`)]*(?:\s*\([^()\n]*\))?\s*(?:,\s*(?:(?:and|et)\s+)?|(?:and|et)\s+)(?:[\p{L} ]+\(|\p{Lu}\p{L}*\s)?`?$/u;

for (const file of localeDocFiles) {
  if (!existsSync(join(root, file))) continue;
  const content = read(file);
  // EN docs say "7 built-in locales", FR docs "7 locales intégrées", the root
  // README "7 locales", the landing page "7 languages built in".
  for (const m of content.matchAll(/(\d+)\s+(?:(?:built-in\s+)?locales\b|languages built in)/gi)) {
    if (Number(m[1]) !== locales.length) {
      errors.push(`${file} claims "${m[0]}" but BUILTIN_LOCALES has ${locales.length} entries`);
    }
  }
  // Locale codes (`fr`) or English names (French) chained by list separators
  // form a locale list. A list that names most built-in locales enumerates
  // them, so it must name every one; a shorter one ("`fr` and `ru`") is an
  // example.
  for (const name of [(code) => code, (code) => englishName.of(code)]) {
    const mentions = locales
      .flatMap((code) =>
        [...content.matchAll(mentionRe(name(code)))].map((m) => ({ code, index: m.index, end: m.index + m[0].length })),
      )
      .sort((a, b) => a.index - b.index);
    const lists = [];
    for (const [i, { code, index }] of mentions.entries()) {
      if (i > 0 && LIST_SEPARATOR.test(content.slice(mentions[i - 1].end, index))) lists.at(-1).codes.add(code);
      else lists.push({ index, codes: new Set([code]) });
    }
    for (const { index, codes } of lists) {
      if (codes.size * 2 <= locales.length) continue;
      const missing = locales.filter((code) => !codes.has(code));
      if (missing.length > 0) {
        const line = content.slice(0, index).split("\n").length;
        errors.push(`${file}:${line} lists the built-in locales without ${missing.map(name).join(", ")}`);
      }
    }
  }
}

// The demo's locale pickers are hand-written lists (each option carries its
// native label), so each must offer exactly the built-in set.
for (const file of [
  "apps/demo/src/app/(site)/demo/playground.tsx",
  "apps/demo/src/app/(site)/demo/inbox/demo-inbox.tsx",
]) {
  const list = existsSync(join(root, file)) ? read(file).match(/const LOCALES = \[([\s\S]*?)\] as const;/) : null;
  if (!list) {
    errors.push(`Could not find the LOCALES picker list in ${file}`);
    continue;
  }
  const codes = [...list[1].matchAll(/(?:code: |\[)"([a-z-]+)"/g)].map((m) => m[1]);
  if ([...codes].sort().join() !== [...locales].sort().join()) {
    errors.push(`${file} offers the locales [${codes.join(", ")}] but BUILTIN_LOCALES is [${locales.join(", ")}]`);
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

// --- 7. Packages typed structurally never import what they mirror ----------

// A source import — even a type, which would leave an import in the
// published declarations — of a package the consumer may not have:
// - Stores other than Prisma mount through adapter-prisma too, so its
//   @prisma/client peer is optional (#306): npm, pnpm and Bun then leave it
//   out. The client shape is structural on purpose (SitepingPrismaClient).
// - integration-issues declares no @siteping/server dependency, so one 0.x
//   release installs next to any server: the hook types are restated, and a
//   type test keeps them identical to the server's.
const STRUCTURAL_ONLY = [
  ["packages/adapter-prisma/src", "@prisma/client", "adapter-prisma declares it as an optional peer (#306)"],
  ["packages/integration-issues/src", "@siteping/server", "integration-issues mirrors the server's hook types"],
];
const sourceFiles = (dir) =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(`${dir}/${e.name}`) : /\.[cm]?tsx?$/.test(e.name) ? [`${dir}/${e.name}`] : [],
  );
for (const [dir, name, why] of STRUCTURAL_ONLY) {
  const importOf = new RegExp(`(?:\\bfrom|\\bimport|\\brequire)\\s*\\(?\\s*["']${name}(?:/[^"']*)?["']`);
  for (const file of sourceFiles(dir)) {
    if (importOf.test(read(file))) errors.push(`${file} imports ${name} — ${why}`);
  }
}

// --- 8. Workspace dependencies are pinned before publishing ------------------

// Bun links a `workspace:` range to the local package whatever its version
// (a semver range stops matching as soon as release-please bumps it), but
// `npm publish` ships the protocol verbatim, which npm cannot install. The
// publish job must rewrite each one — `npm pkg set "dependencies.<name>=…"`
// — and run after the dependency's, so the pinned version is on npm first.

/** release.yml jobs: name → the lines indented under it. */
const releaseJobs = [...releaseYml.matchAll(/^ {2}([\w-]+):\n((?: {4}.*\n|\s*\n)*)/gm)].map((m) => ({
  name: m[1],
  body: m[2],
}));
const publishJobOf = (pkgPath) => releaseJobs.find(({ body }) => body.includes(`working-directory: ${pkgPath}\n`));
/** Jobs a release.yml job waits for (`needs: [a, b]` or `needs: a`). */
const needsOf = (job) => job?.body.match(/^ {4}needs: \[?([^\]\n]*)/m)?.[1].split(/,\s*/) ?? [];
const pkgPathByName = new Map(
  Object.keys(manifest).map((pkgPath) => [JSON.parse(read(`${pkgPath}/package.json`)).name, pkgPath]),
);

for (const pkgPath of Object.keys(manifest)) {
  const pkg = JSON.parse(read(`${pkgPath}/package.json`));
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
      if (!spec.startsWith("workspace:")) continue;
      if (!releaseYml.includes(`npm pkg set "${field}.${name}=`)) {
        errors.push(`${pkgPath} ${field} "${name}": "${spec}" is not pinned before npm publish in release.yml`);
      }
      const dependencyJob = pkgPathByName.has(name) && publishJobOf(pkgPathByName.get(name));
      if (dependencyJob && !needsOf(publishJobOf(pkgPath)).includes(dependencyJob.name)) {
        errors.push(`${pkgPath}'s publish job does not wait for ${dependencyJob.name} (${name}) in release.yml`);
      }
    }
  }
}

// --- 9. One Node.js floor ----------------------------------------------------

// The packages' `engines.node` is the oldest Node SitePing supports. Raising
// it (Node 20 → 22, #421) touches places package.json can't see: the scaffold
// new adapters copy, the oldest lane CI tests, the Node the publish jobs run,
// the demo's runtime image, and every "Node N+" a reader trusts.
const nodeFloor = JSON.parse(read("packages/core/package.json")).engines?.node;
const floorMajor = /^>=(\d+)$/.exec(nodeFloor ?? "")?.[1];
if (!floorMajor) {
  errors.push(`packages/core engines.node must read ">=<major>" (found ${JSON.stringify(nodeFloor)})`);
} else {
  for (const dir of workspaceDirs) {
    if (!existsSync(join(root, dir, "package.json"))) continue;
    const floor = JSON.parse(read(`${dir}/package.json`)).engines?.node;
    if (floor !== nodeFloor) {
      errors.push(`${dir} declares engines.node ${JSON.stringify(floor)} but packages/core declares "${nodeFloor}"`);
    }
  }
  if (!read("scripts/new-adapter.mjs").includes(`engines: { node: "${nodeFloor}" }`)) {
    errors.push(`scripts/new-adapter.mjs does not scaffold engines.node "${nodeFloor}"`);
  }
  const oldestLane = /^ +node-version: \[(\d+)/m.exec(read(".github/workflows/ci.yml"))?.[1];
  if (oldestLane !== floorMajor) {
    errors.push(`ci.yml's node-compat matrix starts at Node ${oldestLane} but the floor is Node ${floorMajor}`);
  }
  for (const m of releaseYml.matchAll(/node-version: (\S+)/g)) {
    if (m[1] !== floorMajor) errors.push(`release.yml publishes on Node ${m[1]} but the floor is Node ${floorMajor}`);
  }
  const runnerImage = /^FROM node:(\d+)-/m.exec(read("apps/demo/Dockerfile"))?.[1];
  if (runnerImage !== floorMajor) {
    errors.push(`apps/demo/Dockerfile runs on node:${runnerImage} but the floor is Node ${floorMajor}`);
  }
  // "Node 22+", "Node ≥ 22", "Node 22 or newer", "Node 22 ou plus récent".
  const NODE_CLAIM = /\bNode(?:\.js)? (?:≥ ?(\d+)|(\d+)(?:\+| or newer| ou plus récent))/g;
  const claimFiles = [
    "README.md",
    ...readdirSync(join(root, "packages")).map((d) => `packages/${d}/README.md`),
    ...walk("apps/demo/content/docs", ".mdx"),
  ].filter((file) => existsSync(join(root, file)));
  for (const file of claimFiles) {
    const content = read(file);
    for (const m of content.matchAll(NODE_CLAIM)) {
      const major = m[1] ?? m[2];
      if (major !== floorMajor) {
        const line = content.slice(0, m.index).split("\n").length;
        errors.push(`${file}:${line} says "${m[0]}" but the floor is Node ${floorMajor}`);
      }
    }
  }
}

// --- 10. Widget Tab traps go through addSurfaceKeydownListener -------------
// A `keydown` listener that handles Tab must be added with
// `addSurfaceKeydownListener` (host-isolation.ts): the guard then runs it
// ahead of a host modal's capture-phase focus trap. A plain
// `addEventListener("keydown", …)` runs after that trap, which moves the
// Tab's focus back into the host dialog (#387).
{
  /** The text from `open` (an opening bracket's index) to its matching closing bracket. */
  const balanced = (src, open) => {
    const pairs = { "(": ")", "{": "}" };
    const closer = pairs[src[open]];
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      if (src[i] === src[open]) depth++;
      else if (src[i] === closer && --depth === 0) return src.slice(open, i + 1);
    }
    return src.slice(open);
  };
  /** `text` matched literally inside a RegExp. */
  const literal = (text) => text.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  /** The body of a listener referenced by name: its assignment's function, one call deep. */
  const namedBody = (src, name) => {
    const at = src.search(new RegExp(`(?:const |let )?${literal(name)}\\s*=\\s*`));
    if (at < 0) return "";
    const brace = src.indexOf("{", at);
    const lineEnd = src.indexOf(";", at);
    if (brace >= 0 && (lineEnd < 0 || brace < lineEnd)) return balanced(src, brace);
    // An arrow that only calls a method (`(e) => this.handleKeydown(e)`): read that method.
    const method = /this\.([\w$]+)\(/.exec(src.slice(at, lineEnd))?.[1];
    const definition = method ? src.search(new RegExp(`\\n\\s*(?:private |public |protected )?${method}\\(`)) : -1;
    return definition < 0 ? "" : balanced(src, src.indexOf("{", definition));
  };
  for (const file of walk("packages/widget/src", ".ts")) {
    if (file.endsWith("/host-isolation.ts")) continue;
    const src = read(file);
    for (const m of src.matchAll(/\.addEventListener\(\s*["']keydown["']\s*,\s*/g)) {
      const start = m.index + m[0].length;
      const name = /^(?:this\.)?[\w$]+(?=\s*(?:as\b|[,)]))/.exec(src.slice(start))?.[0];
      const body = name ? namedBody(src, name) : balanced(src, src.indexOf("(", m.index));
      if (/["']Tab["']/.test(body)) {
        const line = src.slice(0, m.index).split("\n").length;
        errors.push(
          `${file}:${line} adds a keydown listener that handles Tab with addEventListener — use addSurfaceKeydownListener (host-isolation.ts), or a host modal's capture-phase focus trap takes the Tab first`,
        );
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
