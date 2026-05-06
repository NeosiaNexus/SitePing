# @siteping/*

## Build & Test
- `bun install` — install dependencies (bun workspaces)
- `bun run build` — build all packages via Turborepo + tsup (cached)
- `bun run check` — TypeScript type-checking via Turborepo (cached)
- `bun run clean` — clean all dist/ directories
- `bun run test` — run tests in watch mode
- `bun run test:run` — run tests once
- `bun run lint` — biome check
- `bun run lint:fix` — biome auto-fix

## Architecture
- **Monorepo** with bun workspaces — 6 packages in `packages/`:
  - `@siteping/core` — shared types, schema, store errors + helpers (internal, not published)
  - `@siteping/widget` — browser feedback widget (Shadow DOM, closed mode). Accepts `store` option for client-side mode (no server needed)
  - `@siteping/adapter-prisma` — server-side Prisma request handlers
  - `@siteping/adapter-memory` — in-memory adapter (testing, demos, serverless)
  - `@siteping/adapter-localstorage` — client-side localStorage adapter (demos, prototyping)
  - `@siteping/cli` — CLI tool for project setup (`siteping init/sync/status/doctor`)
- Widget uses Shadow DOM (mode: closed), overlay lives outside Shadow DOM
- DOM anchoring: @medv/finder CSS selector + XPath fallback + text snippet fallback
- Annotations stored as % relative to anchor element bounding box
- Core is an Internal Package (exports raw TS, no build step), bundled into consumers via `noExternal: ["@siteping/core"]` in tsup
- Turborepo handles build orchestration, dependency ordering (`^build`), and local caching

## Code Style
- TypeScript strict mode with exactOptionalPropertyTypes
- Conventional Commits: `type(scope): description`
- i18n: built-in locales = en (default), fr, de, es, it, pt (Brazilian), ru. Primary audience is French freelance clients; other locales are community contributions. See CONTRIBUTING.md "Adding a Locale" before adding more.
