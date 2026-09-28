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
      memory: "src/memory/index.ts",
      "cloudflare-images": "src/cloudflare-images/index.ts",
      s3: "src/s3/index.ts",
      "drizzle-pg": "src/drizzle-pg/index.ts",
      "drizzle-libsql": "src/drizzle-libsql/index.ts",
    },
    external: [/^drizzle-orm(\/|$)/],
  }),
  sitepingLibrary({
    platform: "node",
    clean: false,
    entry: { filesystem: "src/filesystem/index.ts" },
  }),
]);
