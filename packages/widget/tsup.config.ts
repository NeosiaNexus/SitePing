import { defineConfig } from "tsup";

export default defineConfig([
  // Main widget entry — used by every consumer (`import { initSiteping } from
  // "@siteping/widget"`). Shipped as ESM + IIFE for both bundler and
  // script-tag use.
  {
    entry: ["src/index.ts"],
    format: ["esm", "iife"],
    globalName: "SitePing",
    platform: "browser",
    target: "es2022",
    dts: true,
    sourcemap: true,
    clean: true,
    minify: true,
    noExternal: ["@medv/finder", "@siteping/core"],
  },
  // React entry — `@siteping/widget/react`. ESM only (React projects bundle
  // ESM) and React stays external so consumers pin their own version.
  {
    entry: ["src/react.ts"],
    format: ["esm"],
    platform: "browser",
    target: "es2022",
    dts: true,
    sourcemap: true,
    clean: false,
    minify: true,
    noExternal: ["@medv/finder", "@siteping/core"],
    external: ["react"],
  },
]);
