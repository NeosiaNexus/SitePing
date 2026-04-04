# Contributing to SitePing

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Prerequisites

- [Bun](https://bun.sh/) (latest) — used as the package manager (workspaces, scripts, lockfile)
- Node.js >= 18 — required for development and post-build scripts (cross-platform compatible)
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

Monorepo with bun workspaces + Turborepo. All packages live in `packages/`:

| Package | npm | Target | Description |
|---------|-----|--------|-------------|
| `@siteping/core` | private | — | Shared types + schema definitions (Internal Package, raw TS) |
| `@siteping/widget` | published | Browser | Feedback widget (Shadow DOM, closed) |
| `@siteping/adapter-prisma` | published | Node | Prisma database adapter |
| `@siteping/cli` | published | Node | CLI tool (`siteping init/sync/status/doctor`) |

- **Core** is an Internal Package — it exports raw TypeScript (no build step). Consumers bundle it via `noExternal: ["@siteping/core"]` in their tsup config.
- **Turborepo** handles build orchestration, dependency ordering, and local caching.
- Each published package is built independently with tsup.

> **`noEmit` in tsconfig:** `tsconfig.base.json` sets `noEmit: true` (type-check only — tsup handles emit for published packages). Core overrides this with `noEmit: false` because it uses `tsc` directly to emit `.d.ts` files. If you add a package that emits via `tsc` instead of tsup, you must also override `noEmit: false` in its `tsconfig.json`.

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

## Code Style

- **TypeScript strict mode** with `exactOptionalPropertyTypes` enabled.
- **Conventional Commits** for all commit messages: `type(scope): description`.
  - Examples: `feat(widget): add color picker`, `fix(cli): handle missing config`.
- **French UI labels** in the widget — the target audience is French-speaking freelance clients.
- Keep functions small and focused. Prefer composition over inheritance.

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

| Commit prefix | Version bump | Example |
|--------------|-------------|---------|
| `fix(scope):` | Patch (0.2.2 → 0.2.3) | `fix(widget): prevent double submit` |
| `feat(scope):` | Minor (0.2.2 → 0.3.0) | `feat(panel): add dark mode` |
| `feat(scope)!:` | Major (0.3.0 → 1.0.0) | `feat(api)!: redesign payload format` |
| `docs:` / `test:` / `chore:` | Patch | `docs(widget): clarify config` |

> **Note:** The commit scope (`widget`, `cli`) is cosmetic. Release-please routes commits to packages based on which **files** the commit touches, not the scope name.

> While the version is < 1.0.0, breaking changes bump minor instead of major.

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
