[![npm version](https://img.shields.io/npm/v/@siteping/adapter-prisma)](https://www.npmjs.com/package/@siteping/adapter-prisma)
[![Live Demo](https://img.shields.io/badge/demo-try%20it%20live-22c55e)](https://siteping.dev/demo)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @siteping/adapter-prisma

Server-side Prisma adapter for [Siteping](https://github.com/NeosiaNexus/SitePing) — handles API request validation and database persistence.

Part of the [@siteping](https://github.com/NeosiaNexus/SitePing) monorepo — **[try the live demo](https://siteping.dev/demo)**.

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

export const { GET, POST, PATCH, DELETE, OPTIONS } = createSitepingHandler({ prisma })
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
| `type` | `string` | `question` \| `change` \| `bug` \| `other` |
| `status` | `string` | `open` \| `resolved` |
| `search` | `string` | Full-text search on message content |
| `url` | `string` | Restrict to feedbacks created on this exact URL — used by the panel's "this page" filter |
| `urlPattern` | `string` | Restrict to feedbacks created on this URL template (e.g. `/orders/:id`) — used by the panel's "this type of page" filter |
| `page` | `number` | Pagination (default: 1) |
| `limit` | `number` | Items per page (default: 50, max: 100) |

## Validation Constraints

All incoming requests are validated with Zod before hitting the database.

### POST — Create feedback (`feedbackCreateSchema`)

| Field | Constraint |
|-------|-----------|
| `projectName` | Non-empty string |
| `type` | `"question"` \| `"change"` \| `"bug"` \| `"other"` |
| `message` | 1 to **5000** characters |
| `url` | Valid URL format |
| `viewport` | Non-empty string |
| `userAgent` | Non-empty string |
| `authorName` | 1 to **200** characters |
| `authorEmail` | Valid email format, max **200** characters |
| `clientId` | Non-empty string (client-generated UUID for deduplication) |
| `urlPattern` | Optional string (max 2000) or `null` — parameterized route template for cross-instance grouping |
| `annotations` | Array of annotation objects (see below) |

**Annotation fields:** `cssSelector`, `xpath`, `elementTag` must be non-empty. `wPct`, `hPct` must be positive. `viewportW`, `viewportH` must be positive integers. `devicePixelRatio` must be positive (defaults to `1`). `anchorKey` is optional (max 200 chars) — semantic anchor identifier from the closest `data-feedback-anchor` ancestor.

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

## Authentication

By default, all endpoints are publicly accessible. To protect read/update/delete operations, pass an `apiKey`:

```ts
export const { GET, POST, PATCH, DELETE, OPTIONS } = createSitepingHandler({
  prisma,
  apiKey: process.env.SITEPING_API_KEY,
  allowedOrigins: ["https://your-site.com"],
})
```

When `apiKey` is set:

- **POST** and **OPTIONS** remain public (the browser widget needs to submit feedback and perform CORS preflight without authentication).
- **GET**, **PATCH**, and **DELETE** require a `Bearer <apiKey>` token in the `Authorization` header.

## Framework Compatibility

The handler uses the **Web Standard `Request`/`Response` API** and works natively with:

- **Next.js App Router** (route handlers)
- **Bun** (`Bun.serve`)
- **Deno** (`Deno.serve`)
- **Hono** (lightweight Web Standard framework)

For **Express** or **Fastify**, you need an adapter to convert between `(req, res)` and `Request`/`Response`. If you're starting a new project and want something lightweight, [Hono](https://hono.dev) is a good Web Standard alternative.

## Edge Runtime

The adapter uses `node:crypto` (`timingSafeEqual`) for timing-safe API key comparison. This requires the **Node.js runtime** and is not available in pure edge/V8 environments.

- **Cloudflare Workers**: enable the [`nodejs_compat`](https://developers.cloudflare.com/workers/runtime-apis/nodejs/) compatibility flag.
- **Vercel Edge Runtime**: use the Node.js runtime (`export const runtime = "nodejs"`) instead of the edge runtime.

## DELETE Request Body

DELETE operations send their payload in the **request body** (JSON), not as URL query parameters. This follows the REST convention for structured delete requests (single item by `id`, or bulk delete by `projectName`).

> **Note:** Some CDNs and reverse proxies strip the body from DELETE requests. If you experience issues, verify that your infrastructure forwards DELETE bodies correctly.

## Privacy and Data Collection

The widget collects and stores the following data per feedback submission:

| Data | Purpose |
|------|---------|
| Author name and email | Identify the feedback author |
| Feedback message | The feedback content itself |
| Page URL | Where the feedback was submitted (sensitive query params like `token`, `key`, `password` are stripped) |
| Viewport size | Reproduce layout context |
| User agent | Browser/device identification |
| CSS selector, XPath, text snippet | Anchor annotations to specific DOM elements |
| Annotation coordinates (% relative) | Position annotations on the page |

**Not collected:** screenshots, full DOM snapshots, cookies, localStorage, or any data beyond what is listed above.

## Related Packages

| Package | Description |
|---------|-------------|
| [`@siteping/widget`](https://www.npmjs.com/package/@siteping/widget) | Browser feedback widget |
| [`@siteping/adapter-memory`](https://www.npmjs.com/package/@siteping/adapter-memory) | In-memory adapter (testing, demos) |
| [`@siteping/adapter-localstorage`](https://www.npmjs.com/package/@siteping/adapter-localstorage) | Client-side localStorage adapter |
| [`@siteping/cli`](https://www.npmjs.com/package/@siteping/cli) | CLI for project setup |

## License

[MIT](https://github.com/NeosiaNexus/SitePing/blob/main/LICENSE)
