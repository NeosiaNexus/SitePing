/**
 * Stable `code` of each error class this package exports. Every entry point
 * (`index`, `s3`, `cloudflare-images`…) is a separate CommonJS bundle with its
 * own copy of the classes, so consumers match on these codes — through
 * `isScreenshotUploadRejectedError`, `isObjectStoreRequestError` and
 * `isInvalidScreenshotError` — never on `instanceof`.
 */
export const SCREENSHOT_UPLOAD_REJECTED_CODE = "SCREENSHOT_UPLOAD_REJECTED";

/** Stable `code` of `ObjectStoreRequestError` — see {@link SCREENSHOT_UPLOAD_REJECTED_CODE}. */
export const OBJECT_STORE_REQUEST_FAILED_CODE = "OBJECT_STORE_REQUEST_FAILED";

/** Stable `code` of `InvalidScreenshotError` — see {@link SCREENSHOT_UPLOAD_REJECTED_CODE}. */
export const INVALID_SCREENSHOT_CODE = "INVALID_SCREENSHOT";
