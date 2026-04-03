import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "browser",
  target: "es2022",
  dts: true,
  sourcemap: false,
  clean: true,
  minify: true,
  noExternal: ["@medv/finder", "@siteping/core"],
});
