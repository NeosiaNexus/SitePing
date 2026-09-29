/** Prefix of inline screenshots — stored as-is, never uploaded, nothing to clean up. */
export const INLINE_SCREENSHOT_URL_PREFIX = "data:";

/**
 * Screenshot URLs checked per reference lookup before a cleanup — keeps each
 * `IN (…)` list far below the bound-parameter limits of PostgreSQL (65 535)
 * and SQLite (32 766), however many rows a project delete removed.
 */
export const SCREENSHOT_REFERENCE_LOOKUP_BATCH_SIZE = 500;

/** SQL `LIKE` pattern matching inline screenshots ({@link INLINE_SCREENSHOT_URL_PREFIX} contains no wildcard). */
export const INLINE_SCREENSHOT_URL_LIKE_PATTERN = `${INLINE_SCREENSHOT_URL_PREFIX}%`;
