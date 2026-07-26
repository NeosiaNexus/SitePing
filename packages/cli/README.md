[![npm version](https://img.shields.io/npm/v/@siteping/cli)](https://www.npmjs.com/package/@siteping/cli)
[![Docs](https://img.shields.io/badge/docs-siteping.dev-0066ff)](https://siteping.dev/docs/cli)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @siteping/cli

Set up and check [SitePing](https://github.com/NeosiaNexus/SitePing) from the command line. Single self-contained binary, zero runtime dependencies, Node ≥ 20.

**[Documentation](https://siteping.dev/docs/cli)**

## Usage

```bash
npx @siteping/cli init
```

> Always `npx @siteping/cli …` — there is no `siteping` package on npm, so `npx siteping` only works once `@siteping/cli` is installed locally.

## Commands

| Command | What it does |
|---------|--------------|
| `init` | Interactive setup: adds the Prisma models and generates the Next.js App Router API route |
| `sync [--schema <path>]` | Non-interactive, CI-friendly schema merge — creates/updates the SitePing models, never touches your own fields |
| `status [--schema <path>]` | Health report: schema, API route, package, and widget integration (exits 1 when something's missing) |
| `doctor --url <url> --endpoint <path>` | One HTTP request against your running server to confirm a SitePing handler answers |

Commit before `sync` — it re-prints the whole schema file, so formatting normalizes across your own models too.

## Documentation

Flags, exit codes, non-TTY behavior, and what each command writes: **[siteping.dev/docs/cli](https://siteping.dev/docs/cli)**.

## License

[MIT](https://github.com/NeosiaNexus/SitePing/blob/main/LICENSE)
