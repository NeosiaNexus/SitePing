#!/usr/bin/env node
// Fixes .d.ts files that reference the unpublished @siteping/core package.
// Rewrites imports to relative paths and copies core's type declarations.
// Cross-platform replacement for fix-dts.sh (no sed/cp).

import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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

// 1. Rewrite '@siteping/core' imports to relative './siteping-core.js'
const dtsFiles = readdirSync(targetDir).filter((f) => f.endsWith(".d.ts") || f.endsWith(".d.cts"));

for (const file of dtsFiles) {
  const filePath = join(targetDir, file);
  let content = readFileSync(filePath, "utf8");
  const original = content;

  content = content.replaceAll("'@siteping/core'", "'./siteping-core.js'");
  content = content.replaceAll('"@siteping/core"', '"./siteping-core.js"');

  if (content !== original) {
    writeFileSync(filePath, content, "utf8");
    console.log(`  Patched: ${file}`);
  }
}

// 2. Copy core's .d.ts files, renaming index.d.ts to siteping-core.d.ts
const copies = [
  { src: "index.d.ts", dest: "siteping-core.d.ts" },
  { src: "types.d.ts", dest: "types.d.ts" },
  { src: "schema.d.ts", dest: "schema.d.ts" },
];

for (const { src, dest } of copies) {
  const srcPath = join(coreDist, src);
  if (!existsSync(srcPath)) {
    console.error(`Missing core type file: ${srcPath}`);
    process.exit(1);
  }
  copyFileSync(srcPath, join(targetDir, dest));
  console.log(`  Copied: ${src} -> ${dest}`);
}

console.log("fix-dts: done");
