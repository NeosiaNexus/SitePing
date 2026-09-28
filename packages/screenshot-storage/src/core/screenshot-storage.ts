import type { ScreenshotStorage } from "@siteping/core";
import {
  DEFAULT_ALLOWED_CONTENT_TYPES,
  DEFAULT_KEY_PREFIX,
  DEFAULT_MAX_SCREENSHOT_BYTES,
  UNCERTAIN_UPLOAD_RECLAIM_DELAYS_MS,
} from "../constants/screenshots.js";
import { MAX_TIMER_DELAY_MS } from "../constants/timers.js";
import { assertInertContentTypes } from "./active-content.js";
import { assertMaxBytes, assertParsableContentTypes, decodeImageDataUrl, normalizeContentTypes } from "./data-url.js";
import { assertKeyableContentTypes, assertKeyPrefix, generateKey, isGeneratedKey } from "./generated-key.js";
import { safeWarn } from "./logger.js";
import { isScreenshotUploadRejected, type ScreenshotObjectStore } from "./object-store.js";
import {
  assertReclaimDelays,
  createUncertainUploadReclaimer,
  type ReclaimScheduler,
  type ScreenshotStorageLogger,
  scheduleWithTimer,
  type UncertainUploadHook,
} from "./uncertain-upload.js";

export type { ReclaimScheduler, ScreenshotStorageLogger, UncertainUploadHook } from "./uncertain-upload.js";

export interface ScreenshotStorageOptions {
  /**
   * Image types accepted. Defaults to JPEG, PNG and WebP. Entries are
   * case-insensitive and trimmed (`"IMAGE/GIF"` means `image/gif`). Each type must map to
   * a key extension of 1–10 lowercase letters or digits (`image/gif` → `gif`,
   * `image/x-icon` → `ico`), and active formats (`image/svg+xml`, which can run
   * scripts when opened directly) are refused; `createScreenshotStorage` throws otherwise.
   */
  allowedContentTypes?: readonly string[];
  /**
   * Largest decoded image accepted, in bytes. Defaults to 1.5 MB. Must be a
   * positive integer — `NaN`, `Infinity`, `0` or a fraction throw, since they
   * could not enforce a limit.
   */
  maxBytes?: number;
  /**
   * Prefix of generated keys (lowercase letters, digits, `-`, `_`). Defaults to
   * `siteping-`. `delete` only removes keys with this prefix, so keep it
   * distinctive when the bucket or CDN is shared with other objects, and pass
   * the same value to `createScreenshotServeHandler`, which only serves it.
   */
  keyPrefix?: string;
  /**
   * Receives warnings for degraded-but-handled situations. Defaults to
   * `console.warn`. A logger that throws is ignored: it never replaces an
   * upload error, skips a reclaim step nor makes `delete` throw.
   */
  logger?: ScreenshotStorageLogger;
  /**
   * When an upload's outcome is unknown (timeout, 5xx), its key is removed
   * right away and again after each of these delays (ms from the failure), so
   * an upload the backend commits late is still reclaimed. Defaults to
   * 5 s, 30 s and 2 min; `[]` keeps only the immediate removal. Each delay
   * must be a finite, non-negative number and, with the default
   * `scheduleReclaim`, at most 2,147,483,647 ms (~24.8 days, the longest
   * `setTimeout` honors) — a custom `scheduleReclaim` lifts that cap.
   */
  uncertainUploadReclaimDelaysMs?: readonly number[];
  /**
   * Runs the delayed reclaim attempts. Defaults to a `setTimeout` that does not
   * keep Node.js alive. If it throws, that attempt is logged and skipped; the
   * other attempts, `onUncertainUpload` and the upload error still follow.
   */
  scheduleReclaim?: ReclaimScheduler;
  /**
   * Receives the key of every upload whose outcome is unknown: enqueue it in
   * a durable job when the process may exit before the delayed attempts run
   * (serverless). Awaited before the upload error is rethrown; its own errors
   * are logged, never thrown.
   */
  onUncertainUpload?: UncertainUploadHook;
}

const defaultLogger: ScreenshotStorageLogger = {
  warn(message, context) {
    console.warn(message, context);
  },
};

/**
 * Build a `ScreenshotStorage` (what `DrizzleStore`, `PrismaStore` and other
 * stores accept) on top of any `ScreenshotObjectStore`.
 *
 * - Validates the widget's data URL (type allowlist, size cap) before any I/O.
 *   Array options (`allowedContentTypes`, `uncertainUploadReclaimDelaysMs`)
 *   are copied when the storage is created: mutating them afterwards has no effect.
 * - Every upload gets a fresh random key, so each returned URL belongs to one
 *   upload — and therefore to one `ctx.feedbackId` — never shared between
 *   records nor content-addressed, as the core `ScreenshotStorage` URL
 *   ownership rule requires. `ctx.feedbackId` is attacker-controlled (Prisma
 *   passes the client's `clientId`) and never enters a key, so a replayed id
 *   cannot overwrite someone else's screenshot.
 * - The URL is reserved before the upload; when the upload outcome is unknown
 *   (timeout, 5xx) the key is removed at once and again after
 *   `uncertainUploadReclaimDelaysMs`, since the backend may commit it late,
 *   and handed to `onUncertainUpload`. Delayed attempts live in process
 *   memory: for a hard guarantee, add a lifecycle rule on the bucket (expire
 *   objects under `keyPrefix` no feedback references) or a durable job fed by
 *   `onUncertainUpload`.
 * - `delete` ignores URLs the backend does not own (inline data URLs, other
 *   hosts) and, under the backend's own base URL, any key outside this
 *   storage's generated namespace (`<keyPrefix><hex>.<ext>`) — so a legacy or
 *   imported URL pointing at another object of a shared bucket or CDN is never
 *   deleted. Such refusals are logged as warnings.
 *
 * @example
 * ```ts
 * import { createScreenshotStorage } from "@siteping/screenshot-storage";
 * import { createS3ObjectStore } from "@siteping/screenshot-storage/s3";
 *
 * const screenshotStorage = createScreenshotStorage(createS3ObjectStore({ … }));
 * const store = createPgSitepingStore(db, { screenshotStorage });
 * ```
 */
export function createScreenshotStorage(
  objectStore: ScreenshotObjectStore,
  {
    allowedContentTypes = DEFAULT_ALLOWED_CONTENT_TYPES,
    maxBytes = DEFAULT_MAX_SCREENSHOT_BYTES,
    keyPrefix = DEFAULT_KEY_PREFIX,
    logger = defaultLogger,
    uncertainUploadReclaimDelaysMs = UNCERTAIN_UPLOAD_RECLAIM_DELAYS_MS,
    scheduleReclaim = scheduleWithTimer,
    onUncertainUpload,
  }: ScreenshotStorageOptions = {},
): ScreenshotStorage {
  assertKeyPrefix(keyPrefix, "createScreenshotStorage");
  assertMaxBytes(maxBytes);
  // Validate and keep private snapshots of the caller's arrays: validating the
  // live references would let a later mutation bypass these checks.
  const normalizedContentTypes = normalizeContentTypes(allowedContentTypes);
  assertParsableContentTypes(normalizedContentTypes);
  assertInertContentTypes(normalizedContentTypes);
  assertKeyableContentTypes(normalizedContentTypes);
  const reclaimDelaysMs: readonly number[] = Object.freeze([...uncertainUploadReclaimDelaysMs]);
  // Only the default `setTimeout` scheduler clamps oversized delays; an
  // injected scheduler may honor longer ones (a durable queue, chunked timers).
  assertReclaimDelays(
    reclaimDelaysMs,
    scheduleReclaim === scheduleWithTimer ? MAX_TIMER_DELAY_MS : Number.POSITIVE_INFINITY,
  );
  const reclaimUncertainUpload = createUncertainUploadReclaimer({
    objectStore,
    logger,
    delaysMs: reclaimDelaysMs,
    schedule: scheduleReclaim,
    onUncertainUpload,
  });

  return {
    async upload(dataUrl) {
      const image = decodeImageDataUrl(dataUrl, { allowedContentTypes: normalizedContentTypes, maxBytes });
      const key = generateKey(keyPrefix, image.contentType);
      const url = objectStore.urlFor(key);
      try {
        await objectStore.put({ key, bytes: image.bytes, contentType: image.contentType });
      } catch (error) {
        // The upload may still land after we gave up — reclaim it so no
        // object outlives the feedback that never referenced it.
        if (!isScreenshotUploadRejected(error)) await reclaimUncertainUpload(key);
        throw error;
      }
      return { url };
    },

    async delete(url) {
      const key = objectStore.keyFromUrl(url);
      if (!key) return;
      if (!isGeneratedKey(key, keyPrefix)) {
        safeWarn(logger, `[siteping] ${objectStore.name}: refusing to delete an object this storage did not generate`, {
          key,
          keyPrefix,
        });
        return;
      }
      await objectStore.remove(key);
    },
  };
}
