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

// Identity define: pins `process.env.NODE_ENV` to itself so esbuild's
// browser-platform auto-define cannot fold it to `"production"` at our build
// (issue #104 — the fold used to delete the production guard from dist).
// The literal survives into the shipped bundles, where the consumer's own
// bundler (webpack DefinePlugin, Vite, esbuild) can inline THEIR environment;
// plain browsers without `process` fall through via readNodeEnv's try/catch.
// `scripts/verify-dist-guard.mjs` asserts this after every build.
const keepNodeEnvLiteral = { "process.env.NODE_ENV": "process.env.NODE_ENV" } as const;

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
    esbuildOptions(o) {
      o.pure = [...pureCalls];
      o.define = { ...o.define, ...keepNodeEnvLiteral };
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
      o.define = { ...o.define, ...keepNodeEnvLiteral };
    },
  },
]);
