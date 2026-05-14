import { defineConfig } from "tsup";

// Three parallel builds:
//  - ESM main: code-split so dynamic imports (Panel, locale chunks) ship as
//    separate files and only load when actually used.
//  - IIFE main: single global script for <script src> consumers — splitting is
//    incompatible with IIFE, so everything is inlined.
//  - ESM React entry (`@siteping/widget/react`): React stays external so
//    consumers pin their own version.
//
// `esbuildOptions.pure` strips `console.debug` / `console.info` calls in the
// production minifier — they're dev-only diagnostics. `console.warn` and
// `console.error` are kept because they signal real problems consumers need
// to see in their dashboards.
const pureCalls = ["console.debug", "console.info"] as const;

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    platform: "browser",
    target: "es2022",
    dts: true,
    sourcemap: true,
    clean: true,
    minify: true,
    splitting: true,
    treeshake: "recommended",
    noExternal: ["@medv/finder", "@siteping/core"],
    esbuildOptions(o) {
      o.pure = [...pureCalls];
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
    esbuildOptions(o) {
      o.pure = [...pureCalls];
    },
  },
  {
    entry: ["src/react.ts"],
    format: ["esm"],
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
    esbuildOptions(o) {
      o.pure = [...pureCalls];
    },
  },
]);
