#!/usr/bin/env node
// Scaffold a new first-party store adapter: `bun run new:adapter drizzle [--platform=node]`
//
// Creates packages/adapter-<name>/ with the exact layout the CI gates
// expect (dual-exports package.json with the fix-dts build chain, shared
// tsup preset, tsconfig, a SitepingStore skeleton, a test file pre-wired to
// the conformance suite) and registers it in the release-please config +
// manifest. The remaining manual step — release.yml wiring — is printed at
// the end and enforced by scripts/check-consistency.mjs until done.
//
// Third-party adapters (outside this repo) should depend on
// @siteping/adapter-kit instead — see docs/adapters/writing-an-adapter.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const name = process.argv[2];
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error("Usage: bun run new:adapter <name> [--platform=node|browser|neutral]");
  process.exit(1);
}
const platform = (process.argv.find((a) => a.startsWith("--platform=")) ?? "--platform=neutral").split("=")[1];
if (!["node", "browser", "neutral"].includes(platform)) {
  console.error(`Unknown platform "${platform}" — use node, browser or neutral.`);
  process.exit(1);
}

const root = new URL("..", import.meta.url).pathname;
const pkgDir = `packages/adapter-${name}`;
const abs = (p) => join(root, p);

if (existsSync(abs(pkgDir))) {
  console.error(`${pkgDir} already exists.`);
  process.exit(1);
}

const className = `${name[0].toUpperCase()}${name.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Store`;

mkdirSync(abs(`${pkgDir}/src`), { recursive: true });
mkdirSync(abs(`${pkgDir}/__tests__`), { recursive: true });

// --- package.json (mirrors the real adapters, not a drifting doc template) ---

writeFileSync(
  abs(`${pkgDir}/package.json`),
  `${JSON.stringify(
    {
      name: `@siteping/adapter-${name}`,
      version: "0.0.0",
      description: `${className} adapter for Siteping`,
      type: "module",
      sideEffects: false,
      exports: {
        ".": {
          import: { types: "./dist/index.d.ts", default: "./dist/index.js" },
          require: { types: "./dist/index.d.cts", default: "./dist/index.cjs" },
        },
      },
      main: "./dist/index.cjs",
      module: "./dist/index.js",
      types: "./dist/index.d.ts",
      files: ["dist"],
      scripts: {
        build: "tsup && node ../../scripts/fix-dts.mjs dist",
        check: "tsc --noEmit",
        clean: "rm -rf dist",
      },
      keywords: ["siteping", name, "adapter", "feedback", "typescript"],
      author: "neosianexus",
      license: "MIT",
      homepage: "https://siteping.dev",
      repository: {
        type: "git",
        url: "git+https://github.com/NeosiaNexus/SitePing.git",
        directory: pkgDir,
      },
      bugs: { url: "https://github.com/NeosiaNexus/SitePing/issues" },
      publishConfig: { access: "public" },
      engines: { node: ">=20" },
      devDependencies: { "@siteping/core": "workspace:*" },
    },
    null,
    2,
  )}\n`,
);

// --- tsconfig / tsup ---------------------------------------------------------

writeFileSync(
  abs(`${pkgDir}/tsconfig.json`),
  `${JSON.stringify({ extends: "../../tsconfig.base.json", include: ["src", "__tests__"] }, null, 2)}\n`,
);

writeFileSync(
  abs(`${pkgDir}/tsup.config.ts`),
  `import { defineConfig } from "tsup";
import { sitepingLibrary } from "../../tsup.preset.js";

export default defineConfig(sitepingLibrary({ platform: "${platform}" }));
`,
);

// --- src skeleton ------------------------------------------------------------

writeFileSync(
  abs(`${pkgDir}/src/index.ts`),
  `import {
  type FeedbackCreateInput,
  type FeedbackPage,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackUpdateInput,
  type SitepingStore,
} from "@siteping/core";

export type { SitepingStore } from "@siteping/core";
export { isStorePersistence, StoreDuplicateError, StoreNotFoundError, StorePersistenceError } from "@siteping/core";

/**
 * ${className} — \`SitepingStore\` implementation backed by TODO.
 *
 * Two implementation strategies:
 * - Snapshot backend (KV, file, browser storage): delegate everything to
 *   \`createCollectionStore({ load, persist, generateId })\` from
 *   @siteping/core — see adapter-memory for the reference.
 * - Query backend (SQL, ORM): implement the 6 methods below directly;
 *   \`buildFeedbackRecord\`/\`buildAnnotationRecord\` handle record
 *   construction, and the SitepingStore JSDoc documents the error contract.
 */
export class ${className} implements SitepingStore {
  async createFeedback(_data: FeedbackCreateInput): Promise<FeedbackRecord> {
    throw new Error("TODO: implement createFeedback (idempotent on clientId)");
  }

  async getFeedbacks(_query: FeedbackQuery): Promise<FeedbackPage> {
    throw new Error("TODO: implement getFeedbacks (filters + pagination)");
  }

  async findByClientId(_clientId: string): Promise<FeedbackRecord | null> {
    throw new Error("TODO: implement findByClientId (null when missing)");
  }

  async updateFeedback(_id: string, _data: FeedbackUpdateInput): Promise<FeedbackRecord> {
    throw new Error("TODO: implement updateFeedback (StoreNotFoundError when missing)");
  }

  async deleteFeedback(_id: string): Promise<void> {
    throw new Error("TODO: implement deleteFeedback (StoreNotFoundError when missing)");
  }

  async deleteAllFeedbacks(_projectName: string): Promise<void> {
    throw new Error("TODO: implement deleteAllFeedbacks (no-op when none)");
  }

  async verifyProjectOwnership(_id: string, _projectName: string): Promise<boolean> {
    throw new Error("TODO: implement verifyProjectOwnership (or delete this optional method)");
  }
}
`,
);

// --- conformance test --------------------------------------------------------

writeFileSync(
  abs(`${pkgDir}/__tests__/${name}-store.test.ts`),
  `import { testSitepingStore } from "@siteping/core/testing";
import { ${className} } from "../src/index.js";

// The shared conformance suite (~44 tests) verifies the full SitepingStore
// contract. Options: { duplicateBehavior: "return" | "throw",
// caseInsensitiveSearch: boolean } for backends whose contract legitimately
// varies.
testSitepingStore(() => new ${className}());
`,
);

// --- README ------------------------------------------------------------------

writeFileSync(
  abs(`${pkgDir}/README.md`),
  `# @siteping/adapter-${name}

${className} adapter for [Siteping](https://siteping.dev).

**[Documentation → siteping.dev/docs](https://siteping.dev/docs)**

## License

MIT
`,
);

writeFileSync(abs(`${pkgDir}/CHANGELOG.md`), "# Changelog\n");

// --- release-please registration --------------------------------------------

const rpConfigPath = abs("release-please-config.json");
const rpConfig = JSON.parse(readFileSync(rpConfigPath, "utf8"));
rpConfig.packages[pkgDir] = {
  "release-type": "node",
  component: `adapter-${name}`,
  "bump-minor-pre-major": true,
};
writeFileSync(rpConfigPath, `${JSON.stringify(rpConfig, null, 2)}\n`);

const manifestPath = abs(".release-please-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest[pkgDir] = "0.0.0";
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

// -----------------------------------------------------------------------------

console.log(`
Created ${pkgDir}/ and registered it in release-please (config + manifest).

Next steps:
  1. bun install                          # link the new workspace
  2. Implement the store in ${pkgDir}/src/index.ts
     until the conformance suite passes:
       ./node_modules/.bin/vitest run ${pkgDir}
  3. Wire .github/workflows/release.yml (4 spots — copy an existing
     publish job): release_created output, artifact path, publish job,
     verify-publish needs. \`bun run check:consistency\` fails until done.
  4. Docs page: apps/demo/content/docs/adapters/ (EN + FR).
  5. bun run verify && bun run pkg-checks
`);
