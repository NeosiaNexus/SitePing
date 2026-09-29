/** Per-request timeout for tracker APIs, in milliseconds. */
export const TRACKER_REQUEST_TIMEOUT_MS = 5_000;

/** Longest delay a timer holds, in milliseconds (2^31 - 1, about 24.8 days). */
export const TIMER_MAX_DELAY_MS = 2_147_483_647;

/**
 * Default upper bound of pages (of 100) listed when a lookup falls back to
 * the label listing or reads comments, to cap API usage.
 */
export const TRACKER_MAX_LISTED_PAGES = 10;
