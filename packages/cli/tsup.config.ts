import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node18",
  banner: {
    // The createRequire shim is load-bearing: bundled CJS deps (commander,
    // prisma-ast) require() node builtins, and esbuild's ESM output resolves
    // those through the ambient `require` — without it the binary throws
    // "Dynamic require of \"events\" is not supported" at startup under Node.
    js: [
      "#!/usr/bin/env node",
      'import { createRequire as __sitepingCreateRequire } from "node:module";',
      "const require = __sitepingCreateRequire(import.meta.url);",
    ].join("\n"),
  },
  dts: false,
  sourcemap: true,
  clean: true,
  noExternal: ["@siteping/core", "commander", "@clack/prompts", "@mrleebo/prisma-ast"],
});
