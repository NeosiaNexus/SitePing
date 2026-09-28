import { SCREENSHOT_UPLOAD_REJECTED_CODE } from "../constants/errors.js";
import { hasErrorCode } from "./error-code.js";

/** A stored screenshot. */
export interface ScreenshotObject {
  key: string;
  /** Backed by a plain `ArrayBuffer` so it is a valid `BodyInit` / `BlobPart`. */
  bytes: Uint8Array<ArrayBuffer>;
  contentType: string;
}

/**
 * Where screenshot bytes live — the port every backend implements (Cloudflare
 * Images, an S3-compatible bucket, the local filesystem, a database table,
 * memory, or anything else).
 *
 * `createScreenshotStorage` owns everything backend-agnostic (data URL
 * validation, key generation, upload recovery, URL ↔ key mapping calls);
 * a backend only moves bytes.
 */
export interface ScreenshotObjectStore {
  /** Backend name, used in error messages. */
  readonly name: string;
  /** Store the object under `key`. Keys are generated, unique and safe in paths and URLs. */
  put(object: ScreenshotObject): Promise<void>;
  /** Delete the object. Must succeed when it is already absent. */
  remove(key: string): Promise<void>;
  /** URL the widget renders for `key` — known before the upload finishes. */
  urlFor(key: string): string;
  /** Key behind a URL this store produced, or `null` for any other URL. */
  keyFromUrl(url: string): string | null;
  /**
   * Read an object back. Required only by backends without their own public
   * URL (filesystem, database, memory), served through `createScreenshotServeHandler`.
   */
  get?(key: string): Promise<Omit<ScreenshotObject, "key"> | null>;
}

/**
 * Thrown by `put` when the backend definitively refused the upload (bad
 * credentials, validation error): nothing was stored, so there is nothing to
 * reclaim. Any other error is treated as an unknown outcome.
 *
 * Custom backends may throw this class or any error whose `code` is
 * `"SCREENSHOT_UPLOAD_REJECTED"`; match it with {@link isScreenshotUploadRejected}.
 */
export class ScreenshotUploadRejectedError extends Error {
  readonly code = SCREENSHOT_UPLOAD_REJECTED_CODE;
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ScreenshotUploadRejectedError";
  }
}

/**
 * Whether `error` is a definitive upload rejection. Matches on the stable
 * `code`, not `instanceof`: in CommonJS each entry point (`index`, `s3`…)
 * bundles its own copy of the class, so a backend's instance is not an
 * instance of the class the consumer imported.
 *
 * @param error - Any thrown value.
 */
export function isScreenshotUploadRejected(error: unknown): error is ScreenshotUploadRejectedError {
  return hasErrorCode(error, SCREENSHOT_UPLOAD_REJECTED_CODE);
}
