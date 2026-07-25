#!/usr/bin/env node
// Fixes .d.ts files that reference the unpublished @siteping/core package.
//
// Core is an Internal Package: its JS is bundled into consumers via tsup
// `noExternal`, but its type declarations are emitted per-module by `tsc`
// (errors.d.ts, types.d.ts, ... with relative `./x.js` imports). Shipping a
// subset used to leave dangling imports in the published tarballs — the
// attw `internal-resolution-error` class tracked in #220. So:
//
//  1. copy EVERY core declaration file (except test-only testing.d.ts),
//     renaming index.d.ts -> siteping-core.d.ts, so relative imports resolve;
//  2. emit a .d.cts twin of each copy (specifiers rewritten .js -> .cjs) so
//     the `require` condition resolves CJS-interpreted types end to end;
//  3. rewrite '@siteping/core' imports in the consumer's own declarations to
//     './siteping-core.js' (in .d.ts) or './siteping-core.cjs' (in .d.cts).
//
// Cross-platform replacement for fix-dts.sh (no sed/cp).

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = process.argv[2];
if (!distDir) {
  console.error("Usage: node fix-dts.mjs <dist-dir>");
  process.exit(1);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const coreDist = resolve(scriptDir, "..", "packages", "core", "dist");
const targetDir = resolve(distDir);

if (!existsSync(targetDir)) {
  console.error(`Target directory does not exist: ${targetDir}`);
  process.exit(1);
}

if (!existsSync(coreDist)) {
  console.error(`Core dist directory does not exist: ${coreDist}`);
  process.exit(1);
}

// Relative specifiers in declaration files are always quoted import/export
// paths — a global quoted-specifier rewrite is safe there.
const toCjsSpecifiers = (content) => content.replace(/(["'])\.\/([^"']+)\.js\1/g, "$1./$2.cjs$1");

// 1 + 2. Copy core declarations (and their .d.cts twins).
const coreFiles = readdirSync(coreDist).filter((f) => f.endsWith(".d.ts") && f !== "testing.d.ts");

for (const file of coreFiles) {
  const content = readFileSync(join(coreDist, file), "utf8");
  const base = file === "index.d.ts" ? "siteping-core" : file.slice(0, -".d.ts".length);
  writeFileSync(join(targetDir, `${base}.d.ts`), content, "utf8");
  writeFileSync(join(targetDir, `${base}.d.cts`), toCjsSpecifiers(content), "utf8");
  console.log(`  Copied: ${file} -> ${base}.d.ts + ${base}.d.cts`);
}

// 3. Point the consumer's own declarations at the copies, per interpretation.
// (The copies themselves never reference @siteping/core — no-op for them.)
const dtsFiles = readdirSync(targetDir).filter((f) => f.endsWith(".d.ts") || f.endsWith(".d.cts"));

for (const file of dtsFiles) {
  const filePath = join(targetDir, file);
  let content = readFileSync(filePath, "utf8");
  const original = content;
  const replacement = file.endsWith(".d.cts") ? "./siteping-core.cjs" : "./siteping-core.js";

  content = content.replaceAll("'@siteping/core'", `'${replacement}'`);
  content = content.replaceAll('"@siteping/core"', `"${replacement}"`);

  if (content.includes("@siteping/core")) {
    console.error(`  UNRESOLVED reference to @siteping/core (subpath import?) in ${file}`);
    process.exit(1);
  }

  if (content !== original) {
    writeFileSync(filePath, content, "utf8");
    console.log(`  Patched: ${file}`);
  }
}

console.log("fix-dts: done");
