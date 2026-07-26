[![npm version](https://img.shields.io/npm/v/@siteping/adapter-prisma)](https://www.npmjs.com/package/@siteping/adapter-prisma)
[![Docs](https://img.shields.io/badge/docs-siteping.dev-0066ff)](https://siteping.dev/docs/adapters/prisma)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @siteping/adapter-prisma

The production server adapter for [SitePing](https://github.com/NeosiaNexus/SitePing) — one endpoint that validates, authenticates, and persists client feedback in your database.

**[Documentation](https://siteping.dev/docs/adapters/prisma)** · **[live demo](https://siteping.dev/demo)**

## Install

```bash
npm install @siteping/adapter-prisma
```

**Peer dependency:** `@prisma/client` ^5 || ^6 || ^7 · Node ≥ 20.

## Quick start

```ts
// app/api/siteping/route.ts — Next.js App Router
import { createSitepingHandler } from "@siteping/adapter-prisma";
import { prisma } from "@/lib/prisma";

export const { GET, POST, PATCH, DELETE, OPTIONS } = createSitepingHandler({
  prisma,
  apiKey: process.env.SITEPING_API_KEY,        // Bearer auth
  allowedOrigins: ["https://my-site.com"],     // exact-match CORS
});
```

The handlers are Web-standard `Request` → `Response` — mount them from any framework (Remix, SvelteKit, Hono, …). Generate the required Prisma models with `npx @siteping/cli sync`.

## Highlights

- **Safe by default** — status changes and deletes require the `apiKey`; in production the factory refuses to start without one. Author emails are redacted for unauthenticated readers and `clientId` never leaves the server
- **Screenshot storage hook** — upload images to S3/R2/GCS instead of inlining data URLs
- **Webhooks** — Slack, Discord, or generic POST on each new feedback (5 s timeout, never blocks the submission)
- **Any store behind the same HTTP surface** — pass `store` instead of `prisma` to mount an in-memory or custom store with identical validation and auth

## Documentation

All options with their real defaults, the full HTTP reference (bodies, query params, errors, validation limits), the exact Prisma schema, and the security model: **[siteping.dev/docs/adapters/prisma](https://siteping.dev/docs/adapters/prisma)**.

## License

[MIT](https://github.com/NeosiaNexus/SitePing/blob/main/LICENSE)
