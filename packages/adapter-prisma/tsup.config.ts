import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "node",
  target: "node18",
  dts: true,
  sourcemap: true,
  clean: true,
  noExternal: ["@siteping/core"],
  external: ["@prisma/client"],
});
