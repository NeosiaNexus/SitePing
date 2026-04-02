import { defineConfig } from "tsup";

export default defineConfig([
  // Widget (browser) — @medv/finder bundled, server deps excluded
  {
    entry: { "widget/index": "src/widget/index.ts" },
    format: ["esm", "cjs"],
    platform: "browser",
    target: "es2022",
    outDir: "dist",
    dts: true,
    sourcemap: true,
    noExternal: ["@medv/finder"],
    external: ["@prisma/client", "zod"],
    clean: true,
  },
  // Adapter Prisma (Node.js) — @prisma/client external (peer dep)
  {
    entry: { "adapter-prisma/index": "src/adapter-prisma/index.ts" },
    format: ["esm", "cjs"],
    platform: "node",
    target: "node18",
    outDir: "dist",
    dts: true,
    sourcemap: true,
    external: ["@prisma/client"],
  },
  // CLI (Node.js, ESM only, shebang)
  {
    entry: { "cli/index": "src/cli/index.ts" },
    format: ["esm"],
    platform: "node",
    target: "node18",
    outDir: "dist",
    banner: { js: "#!/usr/bin/env node" },
    dts: false,
    sourcemap: false,
  },
]);
