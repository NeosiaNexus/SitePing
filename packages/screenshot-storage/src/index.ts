/**
 * Screenshot storage for SitePing. Wrap any backend with
 * `createScreenshotStorage` and hand the result to your store
 * (`createPgSitepingStore(db, { screenshotStorage })`, `new PrismaStore(prisma, { screenshotStorage })`…):
 *
 * - `@siteping/screenshot-storage/cloudflare-images` — Cloudflare Images
 * - `@siteping/screenshot-storage/s3` — AWS S3, Cloudflare R2, Backblaze B2, MinIO…
 * - `@siteping/screenshot-storage/drizzle-pg` / `drizzle-libsql` — your database (PostgreSQL, Turso/libSQL)
 * - `@siteping/screenshot-storage/filesystem` — local disk (Node.js)
 * - `@siteping/screenshot-storage/memory` — development and tests
 *
 * Or implement `ScreenshotObjectStore` for any other backend (Vercel Blob,
 * Supabase Storage, another ORM…). Backends without their own public
 * URL are served through `createScreenshotServeHandler`.
 */
export type { ScreenshotStorage } from "@siteping/core";
export { InvalidScreenshotError } from "./core/data-url.js";
export { isObjectStoreRequestError, ObjectStoreRequestError } from "./core/http.js";
export {
  isScreenshotUploadRejected,
  type ScreenshotObject,
  type ScreenshotObjectStore,
  ScreenshotUploadRejectedError,
} from "./core/object-store.js";
export { createPublicUrlMapping } from "./core/public-url.js";
export {
  createScreenshotStorage,
  type ReclaimScheduler,
  type ScreenshotStorageLogger,
  type ScreenshotStorageOptions,
  type UncertainUploadHook,
} from "./core/screenshot-storage.js";
export {
  createScreenshotServeHandler,
  type ScreenshotServeHandlerOptions,
  type ScreenshotServeRequestTarget,
} from "./core/serve-handler.js";
