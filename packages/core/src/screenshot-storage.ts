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
 * Implementations typically wrap an object store: S3, Cloudflare R2,
 * Backblaze B2, Cloudflare Images, local filesystem, etc. They are
 * intentionally not shipped from this package — wire your own based on
 * existing infra.
 *
 * @example
 * ```ts
 * // Minimal S3 implementation
 * import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
 *
 * const s3 = new S3Client({ region: "eu-west-3" });
 * const screenshotStorage: ScreenshotStorage = {
 *   async upload(dataUrl, ctx) {
 *     const buf = Buffer.from(dataUrl.split(",")[1], "base64");
 *     const key = `feedback/${ctx.feedbackId}.jpg`;
 *     await s3.send(new PutObjectCommand({
 *       Bucket: "my-bucket", Key: key, Body: buf, ContentType: ctx.mimeType,
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
   * `ctx.feedbackId` identifies the upload. Adapters that upload before the
   * record exists pass the *client-generated* `clientId` (Prisma); the
   * Drizzle adapter passes the server-generated id the create attempt will
   * insert the record under — unique per attempt, so racing submissions of
   * one `clientId` never write the same object key.
   *
   * **URL ownership:** the returned URL must be unique to `ctx.feedbackId` —
   * key the object by it (as the example does), never by a content hash or a
   * fixed name. Adapters treat each URL as the property of the record that
   * stores it and may pass it to `delete` once that record is deleted or its
   * upload discarded. A URL shared by several records (content-addressed or
   * id-ignoring keys) breaks this contract: deleting one record can remove
   * the object another record still points at.
   *
   * **Security note:** treat `ctx.feedbackId` as attacker-controlled:
   * sanitize before using it in filesystem paths or object keys, even though
   * server adapters validate its shape upstream.
   */
  upload(dataUrl: string, ctx: { feedbackId: string; mimeType: string }): Promise<{ url: string }>;
  /**
   * Optional cleanup hook called when the feedback is deleted, and for an
   * object uploaded by a create whose record was not stored: one rejected
   * because its `clientId` is already stored, or — in adapters that key
   * uploads per attempt, like Drizzle — one whose insert failed. An object a
   * stored row still references (a deterministic key reused by the replay)
   * is kept. Receives only URLs returned by {@link ScreenshotStorage.upload}.
   * Adapters call this best-effort and swallow errors — orphaned objects are
   * preferred over failed deletes.
   */
  delete?: (url: string) => Promise<void>;
}
