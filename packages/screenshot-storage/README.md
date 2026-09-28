[![npm version](https://img.shields.io/npm/v/@siteping/screenshot-storage)](https://www.npmjs.com/package/@siteping/screenshot-storage)
[![Docs](https://img.shields.io/badge/docs-siteping.dev-0066ff)](https://siteping.dev/docs/adapters/screenshot-storage)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @siteping/screenshot-storage

Screenshot storage for the [SitePing](https://github.com/NeosiaNexus/SitePing) stores: upload screenshots to **Cloudflare R2, AWS S3** or any S3-compatible bucket, **Cloudflare Images**, **your database** through Drizzle, or **your disk**, and keep only their URL in the feedback. No AWS SDK and no runtime dependency: it runs on Node, Bun, Deno and edge workers.

**[Documentation](https://siteping.dev/docs/adapters/screenshot-storage)**

## Install

```bash
npm install @siteping/screenshot-storage
```

Node ≥ 20, or any runtime with the Fetch and Web Crypto APIs (the `/filesystem` entry needs Node). `drizzle-orm` is an optional peer, only for the `/drizzle-pg` and `/drizzle-libsql` entries.

## Quick start

```ts
import { createScreenshotStorage } from "@siteping/screenshot-storage";
import { createS3ObjectStore } from "@siteping/screenshot-storage/s3";

const screenshotStorage = createScreenshotStorage(
  createS3ObjectStore({
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    bucket: "siteping-screenshots",
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    publicBaseUrl: "https://screenshots.example.com",
  }),
);

// Prisma: createSitepingHandler({ prisma, screenshotStorage })
// Drizzle: createPgSitepingStore(db, { screenshotStorage })
```

Every upload gets a fresh random key, `delete` only removes objects it created, and backends without a public URL are served from your app by `createScreenshotServeHandler`.

## Documentation

Every backend, serving screenshots from your app, least-privilege credentials, options, delete semantics and custom backends: **[siteping.dev/docs/adapters/screenshot-storage](https://siteping.dev/docs/adapters/screenshot-storage)**.

## License

[MIT](https://github.com/NeosiaNexus/SitePing/blob/main/LICENSE)
