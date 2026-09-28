[![npm version](https://img.shields.io/npm/v/@siteping/server)](https://www.npmjs.com/package/@siteping/server)
[![Docs](https://img.shields.io/badge/docs-siteping.dev-0066ff)](https://siteping.dev/docs/server)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @siteping/server

The HTTP endpoint of [SitePing](https://github.com/NeosiaNexus/SitePing) over any store, for any framework — validation, auth, CORS, redaction, hooks and webhooks on the Fetch API. No Node built-in: it runs on Node, Bun, Deno and edge workers.

**[Documentation](https://siteping.dev/docs/server)**

## Install

```bash
npm install @siteping/server
```

Node ≥ 20, or any runtime with the Fetch API.

## Quick start

```ts
// app/api/siteping/route.ts — Next.js App Router
import { createSitepingHandler } from "@siteping/server";
import { store } from "@/lib/siteping-store"; // Drizzle, memory, Prisma or your own

export const { GET, POST, PATCH, DELETE, OPTIONS } = createSitepingHandler({
  store,
  apiKey: process.env.SITEPING_API_KEY,    // Bearer auth — or `access` for your own sessions
  allowedOrigins: ["https://my-site.com"], // exact-match CORS
});
```

One handler per method, Web-standard `Request` → `Response`: mount them from Hono, Express, Remix, SvelteKit, `Bun.serve` or a Worker.

## Documentation

Mounting recipes, every option, custom access with CSRF protection, lifecycle hooks, the full HTTP reference and webhooks: **[siteping.dev/docs/server](https://siteping.dev/docs/server)**.

## License

[MIT](https://github.com/NeosiaNexus/SitePing/blob/main/LICENSE)
