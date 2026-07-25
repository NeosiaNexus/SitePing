import { defineConfig } from "tsup";

// Single ESM build — the dashboard is a React library, so React (and its JSX
// runtime) stays external and consumers pin their own version. `@siteping/core`
// is an Internal Package (raw TS, no build) and gets bundled in via
// `noExternal`. Splitting keeps the lazy locale dictionaries in their own
// chunks so only the requested language ships over the network.
//
// `esbuildOptions.pure` strips `console.debug` / `console.info` calls in the
// production minifier — they're dev-only diagnostics. `console.warn` and
// `console.error` are kept because they signal real problems consumers need
// to see in their dashboards.
const pureCalls = ["console.debug", "console.info"] as const;

export default defineConfig({
  entry: ["src/index.ts"],
  // CJS twin is a single file (splitting is ESM-only): require() consumers
  // lose lazy locale chunks but keep full functionality (#220).
  format: ["esm", "cjs"],
  platform: "browser",
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  minify: true,
  splitting: true,
  treeshake: "recommended",
  external: ["react", "react-dom", "react/jsx-runtime"],
  noExternal: ["@siteping/core"],
  esbuildOptions(o) {
    o.pure = [...pureCalls];
  },
});
