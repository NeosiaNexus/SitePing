import { readFile } from "node:fs/promises";
import { defineConfig, type Options } from "tsup";
import { sitepingLibrary } from "../../tsup.preset.js";

type EsbuildPlugin = NonNullable<Options["esbuildPlugins"]>[number];

// `INBOX_CSS` is a template literal, so the JS minifier ships it verbatim —
// comments and indentation included. Minify it as CSS instead (~1.8 kB
// gzip off the ESM entry). The build fails if the literal stops being a
// plain one, rather than silently shipping it unminified.
const minifyInboxCss: EsbuildPlugin = {
  name: "minify-inbox-css",
  setup(build) {
    build.onLoad({ filter: /[\\/]src[\\/]styles\.ts$/ }, async (args) => {
      const source = await readFile(args.path, "utf8");
      const literal = /export const INBOX_CSS = `([^`]*)`;/.exec(source);
      const css = literal?.[1];
      if (!literal || !css || css.includes("${") || css.includes("\\")) {
        throw new Error("[minify-inbox-css] INBOX_CSS must stay a plain template literal (no interpolation, no escapes)");
      }
      const { code } = await build.esbuild.transform(css, { loader: "css", minify: true });
      return {
        contents: source.replace(literal[0], `export const INBOX_CSS = ${JSON.stringify(code.trim())};`),
        loader: "ts",
      };
    });
  },
};

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
    esbuildPlugins: [minifyInboxCss],
    esbuildOptions(o) {
      o.pure = ["console.debug", "console.info"];
    },
  }),
);
