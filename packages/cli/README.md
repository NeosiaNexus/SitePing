# @siteping/cli

CLI tool to set up [Siteping](https://github.com/NeosiaNexus/siteping) in your project — scaffolds Prisma schema and API routes.

Part of the [@siteping](https://github.com/NeosiaNexus/siteping) monorepo.

## Usage

```bash
npx @siteping/cli init
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Interactive setup: Prisma schema + API route generation |
| `sync` | Non-interactive Prisma schema sync (CI-friendly) |
| `status` | Diagnostic check of your Siteping integration |
| `doctor` | Test API endpoint connectivity |

### `init`

Walks you through setting up Siteping:
1. Detects your `prisma/schema.prisma`
2. Merges `SitepingFeedback` and `SitepingAnnotation` models (idempotent)
3. Generates the Next.js App Router API route

```bash
npx @siteping/cli init
npx prisma db push
```

### `sync`

Non-interactive schema sync, useful for CI:

```bash
npx @siteping/cli sync --schema prisma/schema.prisma
```

### `status`

Checks your integration:

```bash
npx @siteping/cli status
```

### `doctor`

Tests API connectivity:

```bash
npx @siteping/cli doctor --url http://localhost:3000
```

## Related Packages

| Package | Description |
|---------|-------------|
| [`@siteping/widget`](https://www.npmjs.com/package/@siteping/widget) | Browser feedback widget |
| [`@siteping/adapter-prisma`](https://www.npmjs.com/package/@siteping/adapter-prisma) | Server-side Prisma adapter |

## License

[MIT](https://github.com/NeosiaNexus/siteping/blob/main/LICENSE)
