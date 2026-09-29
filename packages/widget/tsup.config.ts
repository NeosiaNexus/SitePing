import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { minify } from "terser";
import { defineConfig } from "tsup";
import { cssLiteralsPlugin } from "./scripts/css-literals.js";

// Three parallel builds:
//  - ESM+CJS main: ESM is code-split so dynamic imports (Panel, locale
//    chunks) ship as separate files and only load when actually used; the
//    CJS twin is a single file (splitting is ESM-only) for require()
//    consumers — Jest setups, legacy bundlers (#220).
//  - IIFE main: single global script for <script src> consumers — splitting is
//    incompatible with IIFE, so everything is inlined. It is the one bundle
//    browsers run exactly as shipped (no consumer bundler minifies it again),
//    so Terser takes a second pass after esbuild's minifier (`terserPass`).
//  - ESM+CJS React entry (`@siteping/widget/react`): React stays external so
//    consumers pin their own version.
//
// `cssLiteralsPlugin` minifies the `/* css */`-marked template literals —
// the stylesheet and inline styles — which the JS minifier ships verbatim.
//
// `esbuildOptions.pure` strips `console.debug` / `console.info` calls in the
// production minifier — they're dev-only diagnostics. `console.warn` and
// `console.error` are kept because they signal real problems consumers need
// to see in their dashboards.
const pureCalls = ["console.debug", "console.info"] as const;

// Identity define: pins `process.env.NODE_ENV` to itself so esbuild's
// browser-platform auto-define cannot fold it to `"production"` at our build
// (issue #104 — the fold used to delete the production guard from dist).
// The literal survives into the shipped bundles, where the consumer's own
// bundler (webpack DefinePlugin, Vite, esbuild) can inline THEIR environment;
// plain browsers without `process` fall through via readNodeEnv's try/catch.
// `scripts/verify-dist-guard.mjs` asserts this after every build.
const keepNodeEnvLiteral = { "process.env.NODE_ENV": "process.env.NODE_ENV" } as const;

// Terser runs on the finished file rather than through tsup's
// `minify: "terser"`, which ships the esbuild output when Terser fails and
// names that intermediate bundle by its absolute path in the source map.
// Given esbuild's map, Terser chains the two maps itself and leaves the code
// that has no original position unmapped.
async function terserPass(file: string): Promise<void> {
  const name = basename(file);
  const [code, map] = await Promise.all([readFile(file, "utf8"), readFile(`${file}.map`, "utf8")]);
  const result = await minify(
    { [name]: code },
    { compress: { passes: 2 }, sourceMap: { content: map, url: `${name}.map` } },
  );
  if (result.code === undefined || typeof result.map !== "string") {
    throw new Error(`Terser returned no output for ${file}`);
  }
  await Promise.all([writeFile(file, result.code), writeFile(`${file}.map`, result.map)]);
}

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    platform: "browser",
    target: "es2022",
    dts: true,
    sourcemap: true,
    clean: true,
    minify: true,
    splitting: true,
    treeshake: "recommended",
    noExternal: ["@medv/finder", "@siteping/core"],
    esbuildPlugins: [cssLiteralsPlugin],
    esbuildOptions(o) {
      o.pure = [...pureCalls];
      o.define = { ...o.define, ...keepNodeEnvLiteral };
    },
  },
  {
    entry: ["src/index.ts"],
    format: ["iife"],
    globalName: "SitePing",
    platform: "browser",
    target: "es2022",
    dts: false,
    sourcemap: true,
    clean: false,
    minify: true,
    splitting: false,
    treeshake: "recommended",
    noExternal: ["@medv/finder", "@siteping/core"],
    esbuildPlugins: [cssLiteralsPlugin],
    esbuildOptions(o) {
      o.pure = [...pureCalls];
      o.define = { ...o.define, ...keepNodeEnvLiteral };
    },
    onSuccess: () => terserPass("dist/index.global.js"),
  },
  {
    entry: ["src/react.ts"],
    format: ["esm", "cjs"],
    platform: "browser",
    target: "es2022",
    dts: true,
    sourcemap: true,
    clean: false,
    minify: true,
    splitting: true,
    treeshake: "recommended",
    noExternal: ["@medv/finder", "@siteping/core"],
    external: ["react"],
    esbuildPlugins: [cssLiteralsPlugin],
    esbuildOptions(o) {
      o.pure = [...pureCalls];
      o.define = { ...o.define, ...keepNodeEnvLiteral };
    },
  },
]);
