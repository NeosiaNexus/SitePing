/**
 * MIME type reported to `ScreenshotStorage.upload` when the data URL declares
 * none — the format the widget encodes screenshots with.
 */
export const FALLBACK_SCREENSHOT_MIME_TYPE = "image/jpeg";

/**
 * Media type of a data URL (`data:<type>/<subtype>[;params][,…]`), captured
 * without its parameters. The server accepts JPEG, PNG and WebP screenshots.
 */
export const DATA_URL_MEDIA_TYPE_PATTERN = /^data:([a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+)[;,]/i;

/** Prefix of inline screenshots — stored as-is, never uploaded, nothing to clean up. */
export const INLINE_SCREENSHOT_URL_PREFIX = "data:";

/**
 * Screenshot URLs checked per reference lookup before a cleanup — keeps each
 * `IN (…)` list far below the bound-parameter limits of PostgreSQL (65 535)
 * and SQLite (32 766), however many rows a project delete removed.
 */
export const SCREENSHOT_REFERENCE_LOOKUP_BATCH_SIZE = 500;

/**
 * Most `ScreenshotStorage.delete` calls one cleanup keeps in flight — a
 * project delete may free thousands of objects, and firing them all at once
 * can exhaust sockets or memory and trip object-store rate limits.
 */
export const SCREENSHOT_DELETE_CONCURRENCY = 8;

/** SQL `LIKE` pattern matching inline screenshots ({@link INLINE_SCREENSHOT_URL_PREFIX} contains no wildcard). */
export const INLINE_SCREENSHOT_URL_LIKE_PATTERN = `${INLINE_SCREENSHOT_URL_PREFIX}%`;
