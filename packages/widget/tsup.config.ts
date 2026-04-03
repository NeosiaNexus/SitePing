import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "browser",
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  noExternal: ["@medv/finder", "@siteping/core"],
});
