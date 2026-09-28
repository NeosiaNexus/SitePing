import { defineConfig } from "tsup";
import { sitepingLibrary } from "../../tsup.preset.js";

// One entry per backend so importing ./s3 never pulls node:fs and vice versa.
// Two builds sharing dist/:
//  - neutral: every runtime-agnostic entry (Web APIs only — a node:* import
//    there fails the build instead of shipping). ./drizzle-* also belong here:
//    they only use drizzle-orm (optional peer, kept external), never a driver.
//  - node: ./filesystem alone, the only entry using Node built-ins.
// The builds run in parallel, so neither cleans dist/ (one would delete the
// other's output, .d.ts included); the package build script removes it first.
// The node build inlines the few pure helpers/constants it shares with the
// neutral entries — no state or error classes are duplicated.
export default defineConfig([
  sitepingLibrary({
    platform: "neutral",
    clean: false,
    entry: {
      index: "src/index.ts",
      memory: "src/backends/memory.ts",
      "cloudflare-images": "src/backends/cloudflare-images.ts",
      s3: "src/backends/s3.ts",
      "drizzle-pg": "src/backends/drizzle-pg.ts",
      "drizzle-libsql": "src/backends/drizzle-libsql.ts",
    },
    external: [/^drizzle-orm(\/|$)/],
  }),
  sitepingLibrary({
    platform: "node",
    clean: false,
    entry: { filesystem: "src/backends/filesystem.ts" },
  }),
]);
