# Contributing to SitePing

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Prerequisites

- [Bun](https://bun.sh/) (latest) — used as the package manager (workspaces, scripts, lockfile)
- Node.js >= 20 — every package declares `engines.node >= 20`, and CI runs the suite on 20, 22, and 24
- A Chromium-based browser (for Playwright E2E tests)

## Setup

```bash
git clone https://github.com/NeosiaNexus/SitePing.git
cd SitePing
bun install
```

## Development Workflow

```bash
bun run build     # build all packages (via Turborepo, cached)
bun run check     # TypeScript type-checking (via Turborepo, cached)
bun run clean     # clean all dist/ directories
bun run test      # run unit tests (watch mode)
bun run test:run  # run unit tests once
bun run test:e2e  # run Playwright E2E tests
bun run lint      # lint with Biome
bun run lint:fix  # auto-fix lint issues
```

Always run `check`, `test:run`, and `build` before submitting a PR.

## Architecture

Monorepo with bun workspaces + Turborepo. Libraries live in `packages/`, the website in `apps/`:

| Package | npm | Target | Description |
|---------|-----|--------|-------------|
| `@siteping/core` | private | — | Shared types, schema, store errors, helpers, conformance tests |
| `@siteping/widget` | published | Browser | Feedback widget (Shadow DOM, closed). Accepts `store` for client-side mode |
| `@siteping/adapter-prisma` | published | Node | Prisma database adapter |
| `@siteping/adapter-memory` | published | Any | In-memory adapter (testing, demos, serverless) |
| `@siteping/adapter-localstorage` | published | Browser | localStorage adapter (demos, prototyping) |
| `@siteping/cli` | published | Node | CLI tool (`npx @siteping/cli init/sync/status/doctor`) |
| `@siteping/demo` (`apps/demo`) | private | Next.js | [siteping.dev](https://siteping.dev) — landing, live demo, **and the documentation site** ([editing it](#editing-the-documentation)) |

- **Core** is an Internal Package — it exports raw TypeScript (no build step). Consumers bundle it via `noExternal: ["@siteping/core"]` in their tsup config.
- **Turborepo** handles build orchestration, dependency ordering, and local caching.
- Each published package is built independently with tsup.

> **`noEmit` in tsconfig:** `tsconfig.base.json` sets `noEmit: true` (type-check only — tsup handles emit for published packages). Core overrides this with `noEmit: false` because it uses `tsc` directly to emit `.d.ts` files. If you add a package that emits via `tsc` instead of tsup, you must also override `noEmit: false` in its `tsconfig.json`.

## Editing the Documentation

All end-user documentation lives at **[siteping.dev/docs](https://siteping.dev/docs)**, built from MDX in this repo — the package READMEs are deliberately thin npm cards that point at it. Every docs page has an "Edit on GitHub" link that drops you straight on the right file.

```bash
cd apps/demo
bun run dev          # http://localhost:3000/docs
```

### Where things live

| Path | What it is |
|------|------------|
| `apps/demo/content/docs/**/*.mdx` | The pages. One file per page, frontmatter `title` + `description` required |
| `apps/demo/content/docs/**/meta.json` | Sidebar folder title and page order |
| `apps/demo/src/app/(docs)/` | The Fumadocs route group (layout, page, i18n plumbing) |
| `apps/demo/src/lib/docs/` | Loader, i18n config, URL helpers |

### The rule that matters: document the code, not the README

**Every option, default, and behavior on the docs site is verified against the source before it ships.** Open the implementation, confirm the value, then write it down — do not copy an existing README, and do not describe intended behavior. A previous audit found 96 places where the READMEs had drifted from the code; that is the drift this rule exists to prevent.

If you find the code is wrong rather than the docs, say so in the PR (or open an issue) instead of documenting the bug as a feature.

### Translations

English is the source language and lives at bare URLs (`/docs/widget`). Other languages are prefixed (`/fr/docs/widget`).

- To translate a page, add a sibling with the language code before the extension: `configuration.mdx` → `configuration.fr.mdx`. Same for sidebar labels: `meta.json` → `meta.fr.json`.
- **Internal links must carry the locale prefix** — `/fr/docs/widget/configuration`, not `/docs/widget/configuration`.
- A page without a translation still resolves in that language, served in English (`fallbackLanguage: "en"`), so partial translations never 404.
- Adding a language means one entry in `apps/demo/src/lib/docs/i18n.ts` plus its UI dictionary in `apps/demo/src/lib/docs/ui.ts`, and a `localeMap` entry in `apps/demo/src/app/api/search/route.ts` so search uses the right stemmer.

> **French is currently 100% translated** (18/18 pages). Adding a new English page without its `.fr.mdx` twin silently drops that page back to English for French readers — please add both, or flag it in the PR so a translator can pick it up.

### Before you open the PR

```bash
cd apps/demo && bun run build   # catches broken MDX, bad frontmatter, and type errors
```

New pages are picked up automatically — the sitemap, the search index, and the hreflang alternates are all generated from the content tree.

## Adding a New Package

To add a new package to the monorepo (e.g. `@siteping/adapter-drizzle`):

### 1. Create the package directory

```
packages/adapter-drizzle/
├── src/
│   └── index.ts
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

### 2. `package.json`

```jsonc
{
  "name": "@siteping/adapter-drizzle",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "check": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "author": "neosianexus",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/NeosiaNexus/SitePing.git",
    "directory": "packages/adapter-drizzle"
  },
  // If you import from @siteping/core:
  "devDependencies": {
    "@siteping/core": "workspace:*"
  }
}
```

> **Important:** `@siteping/core` must be a `devDependency`, never a `dependency` — it is bundled at build time and not published to npm.

### 3. `tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### 4. `tsup.config.ts`

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "node",    // or "browser"
  target: "node18",    // or "es2022"
  dts: true,
  sourcemap: true,
  clean: true,
  noExternal: ["@siteping/core"],  // bundle core (not published)
});
```

### 5. Register in release-please

**`release-please-config.json`** — add the package:
```json
"packages/<name>": {
  "release-type": "node",
  "component": "<name>",
  "bump-minor-pre-major": true
}
```

**`.release-please-manifest.json`** — add initial version:
```json
"packages/<name>": "0.1.0"
```

### 6. Add publish job in `.github/workflows/release.yml`

Add an output in the `release-please` job:
```yaml
<name>-release_created: ${{ steps.release.outputs['packages/<name>--release_created'] }}
```

Add a publish job (copy an existing one and update the name, condition, and working-directory):
```yaml
publish-<name>:
  needs: release-please
  if: |
    always() &&
    (needs.release-please.outputs.<name>-release_created == 'true' ||
     (github.event_name == 'workflow_dispatch' && inputs.publish))
  # ... same steps as other publish jobs, with:
  #   working-directory: packages/<name>
```

### 7. Verify

```bash
bun install              # resolve the new workspace package
bun run build            # Turborepo picks it up automatically
bun run check            # type-check
bun run lint             # lint
```

No changes needed in `turbo.json` or root `package.json` — Turborepo discovers new packages via the `workspaces` glob.

## Creating a New Adapter

Adapters implement the `SitepingStore` interface from `@siteping/core`. To create a new one (e.g. `adapter-drizzle`):

1. Copy `packages/adapter-memory/` as a starting point (simplest adapter)
2. Implement the 6 methods of `SitepingStore`:
   - `createFeedback` — idempotent on `clientId` (return existing or throw `StoreDuplicateError`)
   - `getFeedbacks` — paginated query with filters (type, status, search)
   - `findByClientId` — return `null` when not found (no error)
   - `updateFeedback` — throw `StoreNotFoundError` when id doesn't exist
   - `deleteFeedback` — throw `StoreNotFoundError` when id doesn't exist
   - `deleteAllFeedbacks` — no-op when none exist (no error)
3. Use the shared conformance test suite to verify your implementation:

```ts
// __tests__/my-store.test.ts
import { testSitepingStore } from '@siteping/core/testing'
import { MyStore } from '../src/index.js'

// Runs 22 conformance tests covering the full SitepingStore contract
testSitepingStore(() => new MyStore(testConfig))

// Add adapter-specific tests below (connection handling, serialization, etc.)
```

4. Re-export error types from your package for consumer convenience:
```ts
export { StoreNotFoundError, StoreDuplicateError } from '@siteping/core'
```

5. Use `flattenAnnotation()` from `@siteping/core` if your adapter handles HTTP payloads.

## Code Style

- **TypeScript strict mode** with `exactOptionalPropertyTypes` enabled.
- **Conventional Commits** for all commit messages: `type(scope): description`.
  - Examples: `feat(widget): add color picker`, `fix(cli): handle missing config`.
- **i18n** — Built-in locales: English (default), French, German, Spanish, Italian, Brazilian Portuguese, Russian. See [Adding a Locale](#adding-a-locale) below.
- Keep functions small and focused. Prefer composition over inheritance.

## Adding a Locale

The widget ships with a small set of built-in locales (`en`, `fr`, `de`, `es`, `it`, `pt`, `ru`). Unknown locales fall back to English. Adding a new built-in locale takes four small steps:

### 1. Create the translation file

Copy `packages/widget/src/i18n/en.ts` to `packages/widget/src/i18n/<code>.ts` (use a 2-letter ISO code) and translate every value. Keep the keys and `{placeholders}` exactly the same — values may be reordered for readability but the set must match `en.ts`.

```ts
// packages/widget/src/i18n/de.ts
import type { Translations } from "./types.js";

export const de: Translations = {
  "panel.title": "Feedbacks",
  "panel.close": "Panel schließen",
  // ... every key from en.ts
};
```

### 2. Register it in the locale map

In `packages/widget/src/i18n/index.ts`, add the import and the entry to `LOCALES` (alphabetical order):

```ts
import { de } from "./de.js";

const LOCALES: Record<string, Translations> = { de, en, /* ... */ };
```

This is enough — full locale tags like `de-DE` are resolved automatically via the language prefix.

### 3. Add tests in `packages/widget/__tests__/i18n/i18n.test.ts`

Add three tests next to the existing locales: a `createT` lookup test, a key-parity test (`en.ts and <code>.ts have the same set of keys`), and a non-empty values test. The existing `ru` / `de` / `es` blocks are good templates.

### 4. Update every place that lists the locales

A new locale is only "shipped" once these are in sync — please do all of them in the same PR:

| File | What to change |
|------|----------------|
| `packages/core/src/types.ts` | The `SitepingConfig.locale` type union — this is what gives users autocomplete |
| `packages/widget/README.md` | The locale list in **Highlights** |
| `packages/dashboard/README.md` | The "7 built-in locales" count in **Highlights** |
| `apps/demo/content/docs/widget/i18n.mdx` (+ `.fr.mdx`) | The count, the list, and the resolution notes |
| `apps/demo/content/docs/dashboard/index.mdx` (+ `.fr.mdx`) | The **Languages** section |
| `README.md` (root) | The locale count in **Features** |

> The docs site is the canonical reference for users — a locale that lands in the code but not in `apps/demo/content/docs/` is invisible to everyone who reads [siteping.dev/docs](https://siteping.dev/docs). See [Editing the Documentation](#editing-the-documentation).

The dashboard (`packages/dashboard/src/i18n/`) has its own translation set with the same structure and the same built-in locales — a new locale should land in both packages (same three steps, plus the lazy-import `switch` in each package's `i18n/index.ts`).

## Testing

- **Unit tests** — Vitest. Place in `packages/<name>/__tests__/`.
- **E2E tests** — Playwright. Place in the `e2e/` directory at the root.
- Cover new features with unit tests. Cover user-facing flows with E2E tests when relevant.

## Releases & Versioning

Releases are **fully automated** via [Release Please](https://github.com/googleapis/release-please) + Turborepo.

**How it works:**

1. Write code using [Conventional Commits](https://www.conventionalcommits.org/)
2. Push to `main` (via squash-merged PR)
3. Release Please detects which packages changed (by file paths) and opens a release PR
4. Merge the release PR → GitHub Release + npm publish happen automatically

**Version bumps are determined by your commit messages:**

| Commit prefix | Version bump (1.0+) | Pre-1.0 bump | Example |
|--------------|---------------------|-------------|---------|
| `fix(scope):` | Patch | Patch | `fix(widget): prevent double submit` |
| `feat(scope):` | Minor | Patch | `feat(panel): add dark mode` |
| `feat(scope)!:` | Major | Minor | `feat(api)!: redesign payload format` |
| `docs:` / `test:` / `chore:` | — (included in next release) | — | `docs(widget): clarify config` |

> **Note:** The commit scope (`widget`, `cli`) is cosmetic. Release-please routes commits to packages based on which **files** the commit touches, not the scope name.

> **Pre-1.0 behavior** (all current packages): `feat` bumps **patch** instead of minor, breaking changes (`!`) bump **minor** instead of major. `docs` / `test` / `chore` commits don't trigger releases on their own — they're included in the next release triggered by `feat` or `fix`.

**What you don't need to do:**
- Edit `package.json` version — Release Please does it
- Write `CHANGELOG.md` — auto-generated from commits
- Create git tags — auto-created on release
- Run `npm publish` — CI handles it

## Pull Request Guidelines

1. **One feature or fix per PR.** Keep changes focused and reviewable.
2. **Include tests** for any new behavior or bug fix.
3. **Ensure CI passes** — type-check, unit tests, and build must all succeed.
4. **Use Conventional Commits** for your PR title and individual commits.
5. **Describe what and why** in your PR description, not just what changed.

## Reporting Issues

Use the GitHub issue templates for [bug reports](.github/ISSUE_TEMPLATE/bug_report.yml) and [feature requests](.github/ISSUE_TEMPLATE/feature_request.yml).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
