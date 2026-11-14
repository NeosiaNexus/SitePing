#!/usr/bin/env node
// Post-`svelte-package` step: make dist/ self-contained without @siteping/core.
//
// Core is an Internal Package (raw TS, never published), and svelte-package
// transpiles src/ file by file, leaving every `@siteping/core` import as is.
// So:
//
//  1. collect the runtime names dist/ imports from core (JS and .svelte files);
//  2. bundle exactly those into dist/siteping-core/index.js (tsup → esbuild,
//     tree-shaken);
//  3. copy core's declarations into dist/siteping-core/ — their own folder,
//     since core's `types.d.ts` & co. would collide with ours at the root;
//  4. rewrite every `@siteping/core` specifier in dist/ (JS, .svelte,
//     declarations) to the relative path of that folder, and fail on any
//     subpath import left behind.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "tsup";

const distDir = resolve(process.argv[2] ?? "dist");
const scriptDir = dirname(fileURLToPath(import.meta.url));
const coreDist = resolve(scriptDir, "..", "..", "core", "dist");
const vendorDir = join(distDir, "siteping-core");

for (const [label, dir] of [
  ["dist", distDir],
  ["core dist (build @siteping/core first)", coreDist],
]) {
  if (!existsSync(dir)) {
    console.error(`[link-core] ${label} does not exist: ${dir}`);
    process.exit(1);
  }
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return path === vendorDir ? [] : walk(path);
    return [path];
  });
}

const files = walk(distDir).filter((file) => /\.(js|svelte|d\.ts)$/.test(file));
const CORE_IMPORT = /\b(import|export)\s*(type\s*)?\{([^}]*)\}\s*from\s*["']@siteping\/core["']/g;

// 1. Runtime names imported from core (type-only imports and specifiers skipped).
const names = new Set();
for (const file of files.filter((f) => !f.endsWith(".d.ts"))) {
  for (const match of readFileSync(file, "utf8").matchAll(CORE_IMPORT)) {
    if (match[2]) continue;
    for (const raw of match[3].split(",")) {
      const spec = raw.trim();
      if (spec && !spec.startsWith("type ")) names.add(spec.split(/\s+as\s+/)[0]);
    }
  }
}
if (names.size === 0) {
  console.error("[link-core] found no @siteping/core import in dist/ — did svelte-package run?");
  process.exit(1);
}

// 2. Bundle them, and nothing else.
mkdirSync(vendorDir, { recursive: true });
const entry = join(vendorDir, "entry.ts");
writeFileSync(entry, `export { ${[...names].sort().join(", ")} } from "@siteping/core";\n`);
try {
  await build({
    entry: { index: entry },
    outDir: vendorDir,
    format: ["esm"],
    target: "es2022",
    platform: "browser",
    dts: false,
    sourcemap: false,
    clean: false,
    treeshake: true,
    silent: true,
    config: false,
    noExternal: [/^@siteping\/core(\/|$)/],
  });
} finally {
  rmSync(entry);
}

// 3. Core's declarations, next to the bundle (`index.d.ts` types `index.js`).
let copied = 0;
for (const file of readdirSync(coreDist)) {
  if (!file.endsWith(".d.ts") || file === "testing.d.ts") continue;
  writeFileSync(join(vendorDir, file), readFileSync(join(coreDist, file)));
  copied += 1;
}

// 4. Point every shipped file at the vendored copy.
let patched = 0;
for (const file of files) {
  const content = readFileSync(file, "utf8");
  if (!content.includes("@siteping/core")) continue;
  let target = relative(dirname(file), join(vendorDir, "index.js")).split(sep).join("/");
  if (!target.startsWith(".")) target = `./${target}`;
  const next = content.replace(/(["'])@siteping\/core\1/g, `$1${target}$1`);
  if (next.includes("@siteping/core")) {
    console.error(`[link-core] UNRESOLVED @siteping/core reference (subpath import?) in ${relative(distDir, file)}`);
    process.exit(1);
  }
  writeFileSync(file, next);
  patched += 1;
}

console.log(
  `[link-core] bundled ${names.size} core exports, copied ${copied} core declarations, patched ${patched} files`,
);
