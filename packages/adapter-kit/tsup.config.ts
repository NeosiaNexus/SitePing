import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/testing.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  // Regex so the "@siteping/core/testing" subpath is inlined too — core is
  // an internal package and must never appear in the published output.
  // vitest stays external (optional peer, only needed by ./testing).
  noExternal: [/^@siteping\/core(\/|$)/],
});
