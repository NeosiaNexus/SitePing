import { defineConfig } from "tsup";
import { sitepingLibrary } from "../../tsup.preset.js";

// React (and its JSX runtime) stays external so consumers pin their own
// version. Splitting keeps the lazy locale dictionaries in their own chunks
// so only the requested language ships over the network; the CJS twin is a
// single file (splitting is ESM-only) — require() consumers lose lazy locale
// chunks but keep full functionality (#220).
//
// `esbuildOptions.pure` strips `console.debug` / `console.info` calls in the
// production minifier — they're dev-only diagnostics. `console.warn` and
// `console.error` are kept because they signal real problems consumers need
// to see in their dashboards.
export default defineConfig(
  sitepingLibrary({
    platform: "browser",
    minify: true,
    splitting: true,
    treeshake: "recommended",
    external: ["react", "react-dom", "react/jsx-runtime"],
    esbuildOptions(o) {
      o.pure = ["console.debug", "console.info"];
    },
  }),
);
