/**
 * Pluggable storage for feedback screenshots.
 *
 * `adapter-prisma` accepts an optional `screenshotStorage` config. When
 * provided, the adapter forwards the widget-supplied data URL to `upload()`
 * and persists the returned URL on `Feedback.screenshotUrl`. When not
 * provided, the adapter falls back to inline base64 (with a one-time warn) —
 * fine for dev and small deployments, a footgun for production Postgres.
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
   */
  upload(dataUrl: string, ctx: { feedbackId: string; mimeType: string }): Promise<{ url: string }>;
  /**
   * Optional cleanup hook called when the feedback is deleted. Adapters
   * call this best-effort and swallow errors — orphaned objects are
   * preferred over failed deletes.
   */
  delete?: (url: string) => Promise<void>;
}
