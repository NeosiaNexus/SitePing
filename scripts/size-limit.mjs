// File lists for the packages' size-limit budgets (`.size-limit.mjs`).
//
// A budget on an entry file alone undercounts: with code splitting, the
// entry imports shared chunks statically, and the browser downloads all of
// them before the entry runs. `firstLoad` is that set — the entry plus every
// chunk it imports statically, transitively. `lazyLoad` is what a dynamic
// `import()` adds on top of it (the widget panel, a locale dictionary).
// size-limit gzips each listed file on its own and sums them, as they travel.
//
// The built files are minified ES modules: a static import or re-export
// reads `from"./chunk.js"` (or `import"./chunk.js"` for a side-effect
// import), a dynamic one `import("./chunk.js")`.

import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";

const STATIC_IMPORT = /\b(?:from|import)\s*(["'])(\.\/[^"']+)\1/g;
const DYNAMIC_IMPORT = /\bimport\(\s*(["'])(\.\/[^"']+)\1\s*\)/g;

function read(dir, file) {
  const path = join(dir, file);
  if (!existsSync(path)) throw new Error(`[size-limit] ${file} not found — build the package first`);
  return readFileSync(path, "utf8");
}

/** `entry` and every file it imports statically, transitively — paths relative to `dir`. */
export function firstLoad(dir, entry) {
  const files = new Set();
  const visit = (file) => {
    if (files.has(file)) return;
    files.add(file);
    for (const [, , specifier] of read(dir, file).matchAll(STATIC_IMPORT)) {
      visit(posix.join(posix.dirname(file), specifier));
    }
  };
  visit(entry);
  return [...files];
}

/**
 * The files the dynamic imports reached from `entry` load on top of its first
 * load, keeping only the imports whose target file name matches `name`.
 */
export function lazyLoad(dir, entry, name) {
  const initial = firstLoad(dir, entry);
  const targets = new Set();
  for (const file of initial) {
    for (const [, , specifier] of read(dir, file).matchAll(DYNAMIC_IMPORT)) {
      const target = posix.join(posix.dirname(file), specifier);
      if (name.test(posix.basename(target))) targets.add(target);
    }
  }
  if (targets.size === 0) throw new Error(`[size-limit] no dynamic import of ${name} from ${entry}`);
  const loaded = new Set(initial);
  return [...new Set([...targets].flatMap((target) => firstLoad(dir, target)))].filter((file) => !loaded.has(file));
}
