/**
 * Pluggable storage for feedback screenshots.
 *
 * `adapter-prisma` and `adapter-drizzle` accept an optional
 * `screenshotStorage` config. When provided, the adapter forwards the
 * widget-supplied data URL to `upload()` and persists the returned URL on
 * `Feedback.screenshotUrl`. When not provided, the adapter falls back to
 * inline base64 (with a one-time warn) — fine for dev and small
 * deployments, a footgun for production Postgres.
 *
 * `@siteping/screenshot-storage` implements it over any S3-compatible
 * bucket (AWS S3, Cloudflare R2, Backblaze B2, MinIO…), Cloudflare Images,
 * a database table, the local filesystem or memory. Implement it yourself
 * for anything else.
 *
 * @example
 * ```ts
 * // Minimal S3 implementation
 * import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
 *
 * const s3 = new S3Client({ region: "eu-west-3" });
 * const screenshotStorage: ScreenshotStorage = {
 *   async upload(dataUrl, { mimeType }) {
 *     const body = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
 *     const key = `siteping/${crypto.randomUUID()}`; // fresh per upload, see URL ownership
 *     await s3.send(new PutObjectCommand({
 *       Bucket: "my-bucket", Key: key, Body: body, ContentType: mimeType,
 *     }));
 *     return { url: `https://cdn.example.com/${key}` };
 *   },
 * };
 *
 * createSitepingHandler({ prisma, screenshotStorage });
 * ```
 */
export interface ScreenshotStorage {
  /**
   * Persist a base64 data URL and return the URL the widget will use as
   * `<img src>`. Implementations decide the underlying storage and any
   * post-processing (resize, virus scan, content-type sniff).
   *
   * Adapters call this synchronously inside `createFeedback` — keep it
   * fast or move to a queue if needed.
   *
   * `ctx.feedbackId` is the id the feedback is stored under. The record does
   * not exist yet, so the store draws it before the upload — fresh for each
   * create attempt, never client-supplied — and inserts the row under it.
   * Two submissions of one `clientId` therefore upload under two ids, and
   * only one of them is stored.
   *
   * **URL ownership:** every call must return a URL no other call returns —
   * key the object by a fresh random value (`crypto.randomUUID()`, as the
   * example does), never by `ctx.feedbackId` alone nor by a content hash.
   * Adapters treat each URL as the property of the one record that stores it
   * and may pass it to `delete` once that record is deleted, or once its
   * create lost a race: the object of the submission that is not stored is
   * deleted, and a URL shared by several records would let deleting one
   * remove the object another still points at.
   *
   * **Security note:** the bundled stores generate `ctx.feedbackId`, but a
   * third-party one may not honour the contract: sanitize it before using it
   * in a filesystem path or an object key.
   */
  upload(dataUrl: string, ctx: { feedbackId: string; mimeType: string }): Promise<{ url: string }>;
  /**
   * Optional cleanup hook called when the feedback is deleted, and for an
   * object uploaded by a create whose record was not stored: one rejected
   * because its `clientId` is already stored, or one whose insert failed. An
   * object a stored row still references (a storage that broke URL
   * ownership) is kept. Receives only URLs returned by {@link ScreenshotStorage.upload}.
   * Adapters call this best-effort and swallow errors — orphaned objects are
   * preferred over failed deletes.
   */
  delete?: (url: string) => Promise<void>;
}

/**
 * Most `ScreenshotStorage.delete` calls one cleanup keeps in flight — a
 * project delete may free thousands of objects, and firing them all at once
 * can exhaust sockets (one per request with `fetch`) or memory and trip
 * object-store rate limits. It stays under the 50 sockets the AWS SDK opens
 * per client by default, yet a project delete, which waits for its cleanup,
 * is not serialised: 1,000 objects take 32 rounds. Adapters run their
 * deletes through `settleWithConcurrencyLimit` with this bound.
 */
export const SCREENSHOT_DELETE_CONCURRENCY = 32;

/**
 * MIME type an adapter reports to {@link ScreenshotStorage.upload}: the one
 * an image data URL declares (`data:image/png;base64,…` → `image/png`),
 * limited to the JPEG, PNG and WebP the HTTP schema accepts. Stores are
 * public and may be fed unvalidated data URLs, and an `image/svg+xml` label
 * would make the stored object script-capable when served inline. Anything
 * else — including a data URL that declares no type — reports JPEG, the
 * widget's capture format.
 */
export function screenshotMimeType(dataUrl: string): string {
  return /^data:(image\/(?:jpeg|png|webp))[;,]/i.exec(dataUrl)?.[1]?.toLowerCase() ?? "image/jpeg";
}
