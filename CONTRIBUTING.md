# Contributing to SitePing

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Prerequisites

- [Bun](https://bun.sh/) **1.3.x** — the exact version is pinned in `packageManager` (root `package.json`) and used by CI. Bun 1.4 is known to break the demo build locally (symlinked `.bun` installs rejected by Turbopack — workaround: `bun install --linker=hoisted`); stick to the pinned line.
- Node.js >= 20 — every package declares `engines.node >= 20`, and CI runs the suite on 20, 22, and 24
- For Playwright E2E tests: `bunx playwright install` — the config runs **three engines** (Chromium, Firefox, WebKit)

## Setup

```bash
git clone https://github.com/NeosiaNexus/SitePing.git
cd SitePing
bun install
```

## Development Workflow

```bash
bun run build              # build all packages (via Turborepo, cached)
bun run check              # TypeScript type-checking, src AND tests (via Turborepo, cached)
bun run clean              # clean all dist/ directories
bun run test               # run unit tests (watch mode)
bun run test:run           # run unit + type tests once
bun run test:e2e           # run Playwright E2E tests
bun run lint               # lint with Biome (includes the type-aware rules domain)
bun run lint:fix           # auto-fix lint issues
bun run verify             # build + check + lint + test:run — the full pre-PR gate
bun run pkg-checks         # publint + attw on every published package (same script CI runs)
bun run check:consistency  # locale counts, package registration, fix-dts chains
bun run knip               # dead files / exports / dependencies
bun run new:locale <code>  # scaffold a new built-in locale (see Adding a Locale)
bun run new:adapter <name> # scaffold a new first-party adapter (see Creating a New Adapter)
```

Run `bun run verify` before submitting a PR — it is exactly what CI enforces.

> **WSL note:** if a local `vitest` run hangs or balloons in memory, use the
> real binary (`./node_modules/.bin/vitest run`) rather than `bunx vitest`
> (which fetches latest), and keep `maxForks` at the committed value in
> `vitest.config.ts`.

## Architecture

Monorepo with bun workspaces + Turborepo. Libraries live in `packages/`, the website in `apps/`:

| Package | npm | Target | Description |
|---------|-----|--------|-------------|
| `@siteping/core` | private | — | Shared types, schema, store errors, helpers, conformance tests |
| `@siteping/widget` | published | Browser | Feedback widget (Shadow DOM, closed). Accepts `store` for client-side mode |
| `@siteping/dashboard` | published | Browser (React) | Linear-style triage inbox (`<SitepingInbox />` + headless `useSitepingInbox()`) |
| `@siteping/adapter-prisma` | published | Node | Prisma database adapter |
| `@siteping/adapter-memory` | published | Any | In-memory adapter (testing, demos, serverless) |
| `@siteping/adapter-localstorage` | published | Browser | localStorage adapter (demos, prototyping) |
| `@siteping/adapter-kit` | published | Any | Everything third-party adapter authors need: store contract, helpers, `createCollectionStore`, and the conformance suite (`/testing`) |
| `@siteping/cli` | published | Node | CLI tool (`npx @siteping/cli init/sync/status/doctor`) |
| `@siteping/demo` (`apps/demo`) | private | Next.js | [siteping.dev](https://siteping.dev) — landing, live demo, **and the documentation site** ([editing it](#editing-the-documentation)) |

- **Core** is an Internal Package — it exports raw TypeScript (no build step). Consumers bundle it via `noExternal: ["@siteping/core"]` in their tsup config.
- **Turborepo** handles build orchestration, dependency ordering, and local caching.
- Each published package is built independently with tsup.

> **`noEmit` in tsconfig:** `tsconfig.base.json` sets `noEmit: true` (type-check only — tsup handles emit for published packages), and every package's `check` covers `src/` **and** `__tests__/`. Core is the exception: its `tsconfig.json` is a build config (`tsc` emits its `.d.ts` from `src/`), so its `check` runs against a separate `tsconfig.check.json` that adds the tests back. If you add a package that emits via `tsc` instead of tsup, follow core's two-config pattern.

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

For an adapter, use the scaffold — it writes every file below in the correct
final shape and registers the package in release-please:

```bash
bun run new:adapter drizzle -- --platform=node   # node | browser | neutral
```

For a non-adapter package, copy the closest existing one (`packages/adapter-memory`
is the smallest). The pieces that matter:

1. **`package.json`** — copy from a real adapter, not from memory. The
   critical parts the old hand-written template used to miss: the dual
   `import`/`require` exports map with per-condition `types`, `sideEffects: false`,
   `publishConfig.access: public`, `engines.node >= 20`, and the build script
   **must** chain fix-dts: `"build": "tsup && node ../../scripts/fix-dts.mjs dist"`
   (`bun run check:consistency` fails if it's missing). `@siteping/core` is a
   `devDependency`, never a `dependency` — it is bundled at build time and not
   published to npm.
2. **`tsconfig.json`** — `{ "extends": "../../tsconfig.base.json", "include": ["src", "__tests__"] }`.
   No `outDir`/`rootDir`: `tsc` only type-checks; tsup emits.
3. **`tsup.config.ts`** — use the shared preset:
   ```ts
   import { defineConfig } from "tsup";
   import { sitepingLibrary } from "../../tsup.preset.js";

   export default defineConfig(sitepingLibrary({ platform: "node" }));
   ```
4. **Register in release-please** — add the package to
   `release-please-config.json` (release-type `node`, `bump-minor-pre-major`)
   and to `.release-please-manifest.json` with the pre-first-release
   placeholder version `"0.0.0"` (the post-release npm check knows to skip it).
5. **Wire `.github/workflows/release.yml`** (4 spots — copy an existing
   publish job): the `release_created` output, the build-artifact path, the
   publish job itself, and the `verify-publish` needs list.
6. **Verify** — `bun install`, then `bun run verify && bun run pkg-checks && bun run check:consistency`.

The publint/attw gates and pkg-pr-new previews derive their package list from
the manifest automatically, and `check:consistency` fails CI until every
registration above is complete — nothing can be *silently* forgotten anymore.

## Creating a New Adapter

Adapters implement the `SitepingStore` interface. **Third-party adapters**
(outside this repo) depend on the published
[`@siteping/adapter-kit`](https://siteping.dev/docs/adapters/writing-an-adapter),
which exports the contract, the building blocks and the conformance suite.
**First-party adapters** start with the scaffold:

```bash
bun run new:adapter drizzle -- --platform=node
```

Two implementation strategies:

- **Snapshot backends** (KV, flat file, browser storage): hand
  `createCollectionStore({ load, persist, generateId })` from `@siteping/core`
  your three storage primitives and you get the complete store — clientId
  dedup, filtering/pagination, the error contract, `verifyProjectOwnership`,
  and the screenshot-drop retry on failed persists. `adapter-memory` is the
  ~80-line reference.
- **Query backends** (SQL, ORMs): implement the 6 methods directly. Use
  `buildFeedbackRecord` / `buildAnnotationRecord` for input→record
  construction, and follow the error contract documented on `SitepingStore`:
  `createFeedback` idempotent on `clientId` (or throw `StoreDuplicateError`),
  `updateFeedback`/`deleteFeedback` throw `StoreNotFoundError`,
  `deleteAllFeedbacks` is a no-op when empty, every lost write throws
  `StorePersistenceError`. Optionally implement `verifyProjectOwnership` so
  HTTP handlers can reject cross-project PATCH/DELETE.

Verify with the shared conformance suite (~44 tests — the scaffold pre-wires
this file):

```ts
// __tests__/my-store.test.ts
import { testSitepingStore } from "@siteping/core/testing";
import { MyStore } from "../src/index.js";

testSitepingStore(() => new MyStore(testConfig));
// Options for legitimately varying contracts:
//   testSitepingStore(factory, { duplicateBehavior: "throw", caseInsensitiveSearch: false })

// Add adapter-specific tests below (connection handling, serialization, etc.)
```

Re-export the error types for consumer convenience, and use
`flattenAnnotation()` if your adapter handles HTTP payloads directly.

## Code Style

- **TypeScript strict mode** with `exactOptionalPropertyTypes` enabled.
- **Conventional Commits** for all commit messages: `type(scope): description`.
  - Examples: `feat(widget): add color picker`, `fix(cli): handle missing config`.
- **i18n** — Built-in locales: English (default), French, German, Spanish, Italian, Brazilian Portuguese, Russian. See [Adding a Locale](#adding-a-locale) below.
- Keep functions small and focused. Prefer composition over inheritance.

## Adding a Locale

The widget and the dashboard share the same set of built-in locales (`en`,
`fr`, `de`, `es`, `it`, `pt`, `ru` — the single source of truth is
`BUILTIN_LOCALES` in `packages/core/src/types.ts`). Unknown locales fall
back to English. This is the friendliest first contribution, and the
compiler + tests do most of the review:

### 1. Scaffold

```bash
bun run new:locale nl
```

This appends the code to `BUILTIN_LOCALES`, copies `en.ts` to `nl.ts` in
**both** `packages/widget/src/i18n/` and `packages/dashboard/src/i18n/`, and
adds the lazy-loader entry to both `i18n/index.ts` files. (You can also do
those steps by hand — the loader maps are typed against `BUILTIN_LOCALES`,
so `bun run check` fails until every step is done. Nothing can be silently
forgotten.)

### 2. Translate

Translate every value in the two new files (~120 widget keys, ~70 dashboard
keys). Keep the keys and `{placeholders}` exactly as in `en.ts`:

- a missing or extra **key** fails `bun run check` (the `Translations`
  interface enforces completeness);
- a dropped or renamed **`{placeholder}`** fails the placeholder-parity test.

### 3. Done — no test edits

The i18n suites iterate `BUILTIN_LOCALES`, so the new locale is covered
automatically (lazy-load, key parity, non-empty values, placeholder parity).

### 4. Update the user-facing lists

Update the locale count/list in the docs site (`apps/demo/content/docs/widget/i18n.mdx`
and `dashboard/index.mdx`, + their `.fr.mdx` twins), the two package READMEs
and the root README. `bun run check:consistency` (run by CI) points at any
count you missed.

> **Custom locales without a PR:** both packages export `registerLocale`,
> which accepts **partial** dictionaries — end users can override a single
> string (or ship a private locale) at runtime without contributing it.

## Testing

- **Unit tests** — Vitest. Place in `packages/<name>/__tests__/`. Test code
  is type-checked under the same strict flags as `src/` (`bun run check`).
- **Type tests** — `*.test-d.ts` files run by vitest's typecheck mode
  (`expectTypeOf` + `@ts-expect-error`). Use them to lock public contracts:
  an invalid config that must NOT compile, an inferred return type that must
  not widen. See `packages/core/__tests__/contracts.test-d.ts`.
- **E2E tests** — Playwright. Place in the `e2e/` directory at the root.
- **Property tests** — [fast-check](https://fast-check.dev/), in `*.property.test.ts` next to the example-based suite.
- Cover new features with unit tests. Cover user-facing flows with E2E tests when relevant.

Reach for a property test when a function has an invariant that is awkward to
enumerate — a metric that must stay symmetric, pages that must tile a result
set exactly once, a normalizer that must be idempotent. State the law, let
fast-check hunt for the counter-example, and keep the shrunk case it finds as
a regression test. `packages/core/__tests__/filters.property.test.ts` is the
worked example: it caught a pagination bug that only surfaced for a
non-positive page number, which no hand-written case had thought to try.

## Supply-chain posture

The repo is scored by [OpenSSF Scorecard](https://scorecard.dev/viewer/?uri=github.com/NeosiaNexus/SitePing)
on every push to `main`. Three of its checks are deliberately left alone, and
each one looks like an easy win until you measure it:

- **Branch-Protection has no PAT.** Scorecard's own docs suggest handing the
  action a personal access token so it can read branch-protection settings.
  Measured on this repo, that makes the check report **3/10** instead of
  erroring out, and a check that scores counts toward the average while one
  that errors does not — so the token costs about 0.4 points overall. The
  same applies to migrating to Repo Rules, which are publicly readable and
  would start scoring without any token. Revisit only if the review
  requirements below ever become satisfiable.
- **Code-Review sits at 0** because Scorecard counts changesets carrying an
  approving review, and a solo maintainer cannot approve their own PR. It
  moves when a second reviewer does, not before. Do not "fix" it by faking
  Gerrit-style `Reviewed-by:` trailers — Scorecard trusts those, which is
  exactly why using them dishonestly is out of the question.
- **GitHub Releases carry no assets.** Scorecard skips assetless releases
  entirely, so Signed-Releases reports "no releases found" and is excluded.
  Attaching a single unsigned artifact flips it from excluded to **0/10** and
  costs roughly 0.7 points. If release artifacts are ever wanted, ship them
  with provenance (`actions/attest-build-provenance`, `.intoto.jsonl`) in the
  same change — that path scores 10.

Everything else is expected to stay green: workflow tokens least-privilege,
all actions and container images pinned by hash, and zero known
vulnerabilities in `bun.lock`. Verify a change locally before pushing:

```bash
docker run --rm -v "$PWD":/repo:ro gcr.io/openssf/scorecard:stable --local=/repo --show-details
```

(`--local` skips the checks that need the GitHub API — Code-Review,
Branch-Protection, Signed-Releases — and reports `License` and `SAST`
inaccurately for the same reason. Trust the published report for those.)

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
