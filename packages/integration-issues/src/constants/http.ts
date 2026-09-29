/** Per-request timeout for tracker APIs, in milliseconds. */
export const TRACKER_REQUEST_TIMEOUT_MS = 5_000;

/**
 * Default upper bound of pages (of 100) listed when a lookup falls back to
 * the label listing or reads comments, to cap API usage.
 */
export const TRACKER_MAX_LISTED_PAGES = 10;
