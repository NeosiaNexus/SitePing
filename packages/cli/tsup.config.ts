import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node18",
  banner: { js: "#!/usr/bin/env node" },
  dts: false,
  sourcemap: false,
  clean: true,
  noExternal: ["@siteping/core"],
});
