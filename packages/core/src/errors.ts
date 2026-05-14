/**
 * Typed error hierarchy for Siteping client/server boundaries.
 *
 * Consumers can `instanceof`-check or read `code` / `retryable` instead of
 * pattern-matching error messages. Designed to be additive on top of the
 * existing store errors (`StoreNotFoundError`, `StoreDuplicateError`) which
 * remain the canonical signals for server-side store implementations.
 *
 * Usage on the widget side (api-client.ts):
 *   - fetch failures / aborts / timeouts → `SitepingNetworkError` (retryable)
 *   - HTTP 4xx (except 401/403)         → `SitepingValidationError` (not retryable)
 *   - HTTP 401 / 403                    → `SitepingAuthError` (not retryable)
 *   - everything else                   → `SitepingError` generic
 *
 * `retryable` is meta information surfaced to host apps that want to wire
 * their own retry/queue/backoff strategy — the widget already retries
 * network failures via its built-in retry queue.
 */

export class SitepingError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable: boolean) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.name = "SitepingError";
  }
}

/** Network-level failure: connection refused, DNS, CORS, timeout, abort. Retryable. */
export class SitepingNetworkError extends SitepingError {
  constructor(message: string) {
    super(message, "NETWORK", true);
    this.name = "SitepingNetworkError";
  }
}

/** Server rejected the request (4xx, not auth). Validation problem on the client side. */
export class SitepingValidationError extends SitepingError {
  constructor(message: string) {
    super(message, "VALIDATION", false);
    this.name = "SitepingValidationError";
  }
}

/** Server rejected auth (401 or 403). Not retryable without fresh credentials. */
export class SitepingAuthError extends SitepingError {
  constructor(message: string) {
    super(message, "AUTH", false);
    this.name = "SitepingAuthError";
  }
}
