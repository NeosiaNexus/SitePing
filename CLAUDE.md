# @neosianexus/siteping

## Build & Test
- `bun install` — install dependencies
- `bun run build` — build all targets (widget, adapter, cli) via tsup
- `bun run check` — TypeScript type-checking
- `bun run test` — run tests in watch mode
- `bun run test:run` — run tests once

## Architecture
- Three separate builds: widget (browser), adapter-prisma (node), cli (node)
- Widget uses Shadow DOM (mode: closed), overlay lives outside Shadow DOM
- DOM anchoring: @medv/finder CSS selector + XPath fallback + text snippet fallback
- Annotations stored as % relative to anchor element bounding box

## Code Style
- TypeScript strict mode with exactOptionalPropertyTypes
- Conventional Commits: `type(scope): description`
- French UI labels in widget (target audience: French freelance clients)
