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
- **Monorepo** with bun workspaces — 7 packages in `packages/`:
  - `@siteping/core` — shared types, schema, store errors + helpers (internal, not published, no release-please entry, no npm publish job)
  - `@siteping/widget` — browser feedback widget (Shadow DOM, closed mode). Accepts `store` option for client-side mode (no server needed)
  - `@siteping/dashboard` — Linear-style triage inbox React component (`<SitepingInbox />` + headless `useSitepingInbox()`); no Shadow DOM — scoped `spd-` classes + `--spd-*` CSS vars injected once
  - `@siteping/adapter-prisma` — server-side Prisma request handlers
  - `@siteping/adapter-memory` — in-memory adapter (testing, demos, serverless)
  - `@siteping/adapter-localstorage` — client-side localStorage adapter (demos, prototyping)
  - `@siteping/cli` — CLI tool for project setup (`npx @siteping/cli init/sync/status/doctor` — there is no bare `siteping` package on npm)
- Widget uses Shadow DOM (mode: closed), overlay lives outside Shadow DOM
- DOM anchoring: @medv/finder CSS selector + XPath fallback + text snippet fallback
- Annotations stored as % relative to anchor element bounding box
- Core is an Internal Package (exports raw TS, no build step), bundled into consumers via `noExternal: ["@siteping/core"]` in tsup
- Turborepo handles build orchestration, dependency ordering (`^build`), and local caching
- **Docs site** — `apps/demo` (private, Next.js) serves siteping.dev: landing, `/demo`, and `/docs` (Fumadocs). Pages are MDX in `apps/demo/content/docs/`; EN at bare URLs, other locales prefixed (`/fr/docs/...`), `.fr.mdx` siblings + `meta.fr.json` for sidebar labels, `fallbackLanguage: "en"`. **Docs are written from the source code, never copied from a README** — package READMEs are thin npm cards pointing at the site. Sitemap, search index, and hreflang are all derived from the content tree. See CONTRIBUTING.md "Editing the Documentation".

## Code Style
- TypeScript strict mode with exactOptionalPropertyTypes
- Conventional Commits: `type(scope): description`
- i18n: built-in locales = en (default), fr, de, es, it, pt (Brazilian), ru — same set in widget and dashboard (each has its own `src/i18n/`). Primary audience is French freelance clients; other locales are community contributions. See CONTRIBUTING.md "Adding a Locale" before adding more.
- Feedback statuses: `open` / `in_progress` / `resolved` / `wont_fix` (`FEEDBACK_STATUSES` in core). `resolvedAt` = closure timestamp for `resolved` AND `wont_fix` (`isClosedStatus()`), derived at the edge (HTTP handler / dashboard), never inside store adapters. Widget actions stay binary (resolve/reopen).
