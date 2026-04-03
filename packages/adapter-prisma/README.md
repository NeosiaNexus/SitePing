# @siteping/adapter-prisma

Server-side Prisma adapter for [Siteping](https://github.com/NeosiaNexus/siteping) — handles API request validation and database persistence.

Part of the [@siteping](https://github.com/NeosiaNexus/siteping) monorepo.

## Install

```bash
npm install @siteping/adapter-prisma
```

**Peer dependency:** `@prisma/client` ^5.0.0 || ^6.0.0

## Quick Start

```ts
// app/api/siteping/route.ts (Next.js App Router)
import { createSitepingHandler } from '@siteping/adapter-prisma'
import { prisma } from '@/lib/prisma'

export const { GET, POST, PATCH, DELETE } = createSitepingHandler({ prisma })
```

## API Endpoints

| Method | Description | Status |
|--------|-------------|--------|
| `POST` | Create feedback with annotations | `201` |
| `GET` | List feedbacks (filterable by type, status, search) | `200` |
| `PATCH` | Resolve or unresolve a feedback | `200` |
| `DELETE` | Delete a feedback or all feedbacks for a project | `200` |

### Query Parameters (GET)

| Param | Type | Description |
|-------|------|-------------|
| `projectName` | `string` | **Required.** Filter by project |
| `type` | `string` | `question` \| `changement` \| `bug` \| `autre` |
| `status` | `string` | `open` \| `resolved` |
| `search` | `string` | Full-text search on message content |
| `page` | `number` | Pagination (default: 1) |
| `limit` | `number` | Items per page (default: 50, max: 100) |

## Validation Constraints

All incoming requests are validated with Zod before hitting the database.

### POST — Create feedback (`feedbackCreateSchema`)

| Field | Constraint |
|-------|-----------|
| `projectName` | Non-empty string |
| `type` | `"question"` \| `"changement"` \| `"bug"` \| `"autre"` |
| `message` | 1 to **5000** characters |
| `url` | Valid URL format |
| `viewport` | Non-empty string |
| `userAgent` | Non-empty string |
| `authorName` | 1 to **200** characters |
| `authorEmail` | Valid email format, max **200** characters |
| `clientId` | Non-empty string (client-generated UUID for deduplication) |
| `annotations` | Array of annotation objects (see below) |

**Annotation fields:** `cssSelector`, `xpath`, `elementTag` must be non-empty. `wPct`, `hPct` must be positive. `viewportW`, `viewportH` must be positive integers. `devicePixelRatio` must be positive (defaults to `1`).

### PATCH — Resolve/unresolve (`feedbackPatchSchema`)

| Field | Constraint |
|-------|-----------|
| `id` | Non-empty string |
| `status` | `"open"` \| `"resolved"` |

### DELETE — Remove feedback (`feedbackDeleteSchema`)

Either provide `{ id }` to delete a single feedback, or `{ projectName, deleteAll: true }` to delete all feedbacks for a project.

## Prisma Schema

Use the CLI to set up models automatically:

```bash
npx @siteping/cli init
npx prisma db push
```

## Related Packages

| Package | Description |
|---------|-------------|
| [`@siteping/widget`](https://www.npmjs.com/package/@siteping/widget) | Browser feedback widget |
| [`@siteping/cli`](https://www.npmjs.com/package/@siteping/cli) | CLI for project setup |

## License

[MIT](https://github.com/NeosiaNexus/siteping/blob/main/LICENSE)
