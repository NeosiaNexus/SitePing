# @siteping/screenshot-storage

Where [SitePing](https://siteping.dev) screenshots live — pick a backend, or bring your own.

```ts
import { createScreenshotStorage } from "@siteping/screenshot-storage";
import { createCloudflareImagesObjectStore } from "@siteping/screenshot-storage/cloudflare-images";

const screenshotStorage = createScreenshotStorage(
  createCloudflareImagesObjectStore({ accountId, apiToken, accountHash }),
);

// Hand it to your store: createPgSitepingStore(db, { screenshotStorage }), new PrismaStore(prisma, { screenshotStorage })…
```

| Backend | Entry | Notes |
|---|---|---|
| Cloudflare Images | `./cloudflare-images` | Served from `imagedelivery.net` (or your custom domain) |
| AWS S3, Cloudflare R2, Backblaze B2, MinIO, DigitalOcean Spaces… | `./s3` | SigV4 over WebCrypto — no AWS SDK, runs on edge runtimes |
| Local disk | `./filesystem` | Node.js; served by `createScreenshotServeHandler`. Keeps each image's content type in a `<key>.content-type` file beside it |
| Memory | `./memory` | Development and tests |
| Your own (database table, Vercel Blob, Supabase Storage…) | — | Implement `ScreenshotObjectStore`: `put`, `remove`, `urlFor`, `keyFromUrl` (+ `get` to be served by the handler) |

Without any storage, stores keep screenshots inline in the database as base64 — fine for development.

`createScreenshotStorage` handles the backend-agnostic parts: image type and size validation, a fresh random key per upload (one URL per feedback, never shared nor content-addressed, never derived from client input — as the `ScreenshotStorage` contract requires), reclaiming uploads whose outcome is unknown, and ignoring URLs it does not own on delete — including, under the backend's own base URL, any key outside its generated namespace (`<keyPrefix><random hex>.<ext>`), so a legacy or imported URL pointing at another object of a shared bucket or CDN is never deleted. A URL whose key has malformed percent-encoding (`%`, `%ZZ`, invalid UTF-8) is likewise treated as not owned, so a corrupt record never makes `delete` throw.

Options: `allowedContentTypes` (default JPEG, PNG, WebP; entries are case-insensitive and trimmed — each type must map to a 1–10 character key extension such as `image/gif` → `gif`, checked when the storage is created; active formats such as `image/svg+xml`, which can run scripts when opened directly, are refused), `maxBytes` (default 1.5 MB; must be a positive integer — `NaN`, `Infinity`, `0` or a fraction throw when the storage is created, and data URLs are bounded by their raw length — whitespace included — before parsing, then by their base64 length before decoding), `keyPrefix` (default `siteping-`), `logger`, and for uploads whose outcome is unknown (timeout, 5xx): `uncertainUploadReclaimDelaysMs` (default 5 s, 30 s, 2 min; with the default `scheduleReclaim`, each delay is capped at 2,147,483,647 ms — about 24.8 days, the longest `setTimeout` honors — and a larger one throws when the storage is created; a custom `scheduleReclaim` lifts the cap), `scheduleReclaim`, `onUncertainUpload`. Array options are copied and validated when the storage is created, so mutating them afterwards has no effect.

An upload that times out may still be committed by the backend after the immediate reclaim, so the key is removed again after each delay. Those attempts live in process memory: on serverless platforms, or for a hard guarantee, also enqueue the keys `onUncertainUpload` receives in a durable job, or add a lifecycle rule on the bucket that expires objects under `keyPrefix` no feedback references.

Match errors with `isScreenshotUploadRejected(error)` and `isObjectStoreRequestError(error)` (stable `code` checks) rather than `instanceof`: in CommonJS each entry point (`@siteping/screenshot-storage`, `/s3`…) bundles its own copy of the error classes.

S3 with least-privilege credentials: when the IAM policy grants `s3:GetObject` (plus `s3:PutObject` and `s3:DeleteObject`) but not `s3:ListBucket`, S3 answers a missing key with `403 AccessDenied` instead of `404`. Pass `treatAccessDeniedAsMissing: true` to `createS3ObjectStore` so `get` reads it as absent and the serve handler answers `404` rather than `500`. Only the `AccessDenied` code is mapped: credential failures (`SignatureDoesNotMatch`, `InvalidAccessKeyId`, `ExpiredToken`, `RequestTimeTooSkewed`…) still throw. The option is off by default because it also turns a policy missing `s3:GetObject` into `404`s; grant `s3:ListBucket` instead when you can.

Backends without a public URL are served from your app:

```ts
// app/api/siteping/screenshots/[key]/route.ts
export const { GET } = createScreenshotServeHandler(objectStore, {
  keyPrefix: "siteping-", // the same keyPrefix as createScreenshotStorage (this is the default)
  authorize: (request, { key }) => hasSession(request),
});
```

The handler only serves keys generated under its `keyPrefix` (default `siteping-`) and answers `404` to anything else, so applications sharing a directory or bucket under distinct prefixes cannot read each other's screenshots through it — pass it the same `keyPrefix` as `createScreenshotStorage`. `authorize` receives the requested key for per-screenshot decisions.

Responses are `Cache-Control: public, max-age=31536000, immutable` (keys are unguessable and never reused). With `authorize`, they are `private, no-cache` instead: a CDN or proxy never hands an authorized screenshot to a request that skipped the check, and the browser revalidates every reuse, so a logout or a revoked access applies at once. Each response carries an `ETag` (the key itself — a key always names the same bytes), so a revalidation listing it is answered `304` right after `authorize`, without reading the object from the backend; a screenshot deleted since then keeps showing from that viewer's own cache until the browser evicts it.

Every served screenshot is sandboxed (`Content-Security-Policy: default-src 'none'; sandbox`, `X-Content-Type-Options: nosniff`): even an active object that reached the backend by another path cannot act as a document of your app's origin when opened directly.

MIT
