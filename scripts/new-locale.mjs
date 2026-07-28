#!/usr/bin/env node
// Scaffold a new built-in locale: `bun run new:locale nl`
//
// Does every mechanical step of the "Adding a Locale" runbook:
//   1. appends the code to BUILTIN_LOCALES (packages/core/src/types.ts);
//   2. copies en.ts to <code>.ts in the widget AND dashboard i18n dirs,
//      renaming the export and adding a TODO banner;
//   3. inserts the lazy-loader entry in both i18n/index.ts loader maps.
//
// Everything it does is also enforced by the compiler (the loader maps are
// typed against BUILTIN_LOCALES) and by scripts/check-consistency.mjs — the
// script is convenience, not correctness. Idempotent: done steps are
// skipped.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const code = process.argv[2];
if (!code || !/^[a-z]{2,3}$/.test(code)) {
  console.error("Usage: bun run new:locale <code>   (2-3 lowercase letters, e.g. nl)");
  process.exit(1);
}
if (code === "en") {
  console.error("en is the source catalog — nothing to scaffold.");
  process.exit(1);
}

const root = new URL("..", import.meta.url).pathname;
const changed = [];

// --- 1. BUILTIN_LOCALES ------------------------------------------------------

const typesPath = join(root, "packages/core/src/types.ts");
let types = readFileSync(typesPath, "utf8");
const localesRe = /(BUILTIN_LOCALES = \[)([^\]]+)(\])/;
const m = types.match(localesRe);
if (!m) {
  console.error("Could not find BUILTIN_LOCALES in packages/core/src/types.ts");
  process.exit(1);
}
const codes = [...m[2].matchAll(/"([a-z-]+)"/g)].map((x) => x[1]);
if (codes.includes(code)) {
  console.log(`  = BUILTIN_LOCALES already contains "${code}"`);
} else {
  types = types.replace(localesRe, (_, open, list, close) => `${open}${list.trimEnd()}, "${code}"${close}`);
  writeFileSync(typesPath, types, "utf8");
  changed.push("packages/core/src/types.ts");
  console.log(`  + Added "${code}" to BUILTIN_LOCALES`);
}

// --- 2 + 3. Dictionaries + loader entries ------------------------------------

for (const pkg of ["widget", "dashboard"]) {
  const i18nDir = join(root, `packages/${pkg}/src/i18n`);

  const dictPath = join(i18nDir, `${code}.ts`);
  const en = readFileSync(join(i18nDir, "en.ts"), "utf8");
  const dict = en
    .replace(/export const en(:| =)/, `export const ${code}$1`)
    .replace(
      /^/,
      `// TODO: translate every value below (copied from en.ts).\n// Keys are enforced by the Translations interface — extra or missing keys fail \`bun run check\`.\n`,
    );
  try {
    // "wx" creates atomically and throws EEXIST when the file is already
    // there — no check-then-write race, idempotent re-runs keep the
    // (possibly already translated) existing file.
    writeFileSync(dictPath, dict, { encoding: "utf8", flag: "wx" });
    changed.push(`packages/${pkg}/src/i18n/${code}.ts`);
    console.log(`  + Created packages/${pkg}/src/i18n/${code}.ts (copy of en — translate it!)`);
  } catch (err) {
    if (err?.code !== "EEXIST") throw err;
    console.log(`  = packages/${pkg}/src/i18n/${code}.ts already exists`);
  }

  const indexPath = join(i18nDir, "index.ts");
  let index = readFileSync(indexPath, "utf8");
  const loaderLine = `  ${code}: () => import("./${code}.js").then((m) => m.${code}),`;
  if (index.includes(loaderLine)) {
    console.log(`  = Loader entry already present in packages/${pkg}/src/i18n/index.ts`);
  } else {
    // Insert in alphabetical position among the existing loader entries.
    const entryRe = /^ {2}([a-z]{2,3}): \(\) => import\("\.\/\1\.js"\)\.then\(\(m\) => m\.\1\),$/gm;
    const entries = [...index.matchAll(entryRe)];
    if (entries.length === 0) {
      console.error(
        `Could not find the loader map in packages/${pkg}/src/i18n/index.ts — add this line manually:\n${loaderLine}`,
      );
      process.exit(1);
    }
    const after = entries.filter((e) => e[1] < code).at(-1) ?? null;
    if (after) {
      index = index.replace(after[0], `${after[0]}\n${loaderLine}`);
    } else {
      index = index.replace(entries[0][0], `${loaderLine}\n${entries[0][0]}`);
    }
    writeFileSync(indexPath, index, "utf8");
    changed.push(`packages/${pkg}/src/i18n/index.ts`);
    console.log(`  + Added loader entry to packages/${pkg}/src/i18n/index.ts`);
  }
}

// -----------------------------------------------------------------------------

console.log(`
Done${changed.length ? "" : " (nothing to do)"}. Next steps:
  1. Translate the values in packages/widget/src/i18n/${code}.ts (~120 keys)
     and packages/dashboard/src/i18n/${code}.ts (~70 keys). Keep every
     {placeholder} token — a parity test enforces them.
  2. Update the locale lists/counts in the docs + READMEs
     (scripts/check-consistency.mjs will point at any stale count).
  3. bun run verify
No test edits needed — the i18n suites iterate BUILTIN_LOCALES.`);
