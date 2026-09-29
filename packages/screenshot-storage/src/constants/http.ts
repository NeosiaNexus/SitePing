/** Time budget of one backend call, retries included, in milliseconds. */
export const OBJECT_STORE_REQUEST_TIMEOUT_MS = 5_000;

/** Most attempts of one backend call: the first and two retries, as the AWS SDK does by default. */
export const OBJECT_STORE_REQUEST_MAX_ATTEMPTS = 3;

/** Longest random wait before the first retry, in milliseconds; it doubles for each further retry. */
export const OBJECT_STORE_RETRY_BASE_DELAY_MS = 100;

/** Longest delay a timer holds, in milliseconds (2^31 - 1, about 24.8 days). */
export const TIMER_MAX_DELAY_MS = 2_147_483_647;

/** Status meaning "already gone" on a delete — a successful outcome for cleanup. */
export const HTTP_STATUS_NOT_FOUND = 404;

/**
 * Status S3 answers for a missing object when the credentials lack
 * `s3:ListBucket` — indistinguishable from a real denial without its error code.
 */
export const HTTP_STATUS_FORBIDDEN = 403;

/** Status of a request rate limiting refused before the backend acted on it — safe to send again. */
export const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
