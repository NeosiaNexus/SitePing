import { hasOwn } from "./type-utils.js";

/**
 * Typed error hierarchy for Siteping client/server boundaries.
 *
 * Consumers match an error with a guard — `isSitepingError`,
 * `isSitepingConfigError`, a store guard such as `isStoreNotFound` — then
 * read `code` / `retryable` instead of pattern-matching messages. The guards
 * are structural, never `instanceof`: every published package bundles its
 * own copy of these classes (tsup `noExternal`), so an error one package
 * throws fails `instanceof` against another's class. The widget and the
 * dashboard export the guard and the types, not the classes.
 *
 * Usage on the widget side (api-client.ts):
 *   - fetch failures / aborts / timeouts → `SitepingNetworkError` (retryable)
 *   - HTTP 4xx (except 401/403/408/429) → `SitepingValidationError` (not retryable)
 *   - HTTP 401 / 403                    → `SitepingAuthError` (not retryable)
 *   - HTTP 5xx / 408 / 429              → `SitepingError` code `"SERVER"` (retryable)
 *
 * Store mode (store-client.ts): a `createFeedback` that does not settle in
 * time → `SitepingError` with code `"TIMEOUT"` (retryable); a reply to a
 * store that keeps no comments → `"SERVER"`, not retryable.
 *
 * `retryable` says whether the same request may succeed later, unchanged —
 * meta information for host apps that wire their own retry/queue/backoff
 * strategy; the widget already retries and queues transient failures itself.
 */

/** Discriminant string carried by every `SitepingError`. */
export type SitepingErrorCode = "NETWORK" | "VALIDATION" | "AUTH" | "SERVER" | "TIMEOUT";

export class SitepingError<TCode extends SitepingErrorCode = SitepingErrorCode> extends Error {
  readonly code: TCode;
  readonly retryable: boolean;

  constructor(message: string, code: TCode, retryable: boolean) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.name = "SitepingError";
  }
}

/** Network-level failure: connection refused, DNS, CORS, timeout, abort. Retryable. */
export class SitepingNetworkError extends SitepingError<"NETWORK"> {
  constructor(message: string) {
    super(message, "NETWORK", true);
    this.name = "SitepingNetworkError";
  }
}

/**
 * Server rejected the request (4xx, not auth). Validation problem on the
 * client side. `status` is the HTTP status when a response said so: a 404
 * (the target is gone) and a 409 (a full thread) call for other answers
 * than a 400.
 */
export class SitepingValidationError extends SitepingError<"VALIDATION"> {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message, "VALIDATION", false);
    this.name = "SitepingValidationError";
    this.status = status;
  }
}

/** Server rejected auth (401 or 403). Not retryable without fresh credentials. */
export class SitepingAuthError extends SitepingError<"AUTH"> {
  /**
   * `401`: the credentials are missing or no longer work — drop a dead token
   * on this one. `403`: they work, and the server's policy refuses this request.
   */
  readonly status: 401 | 403;

  constructor(message: string, status: 401 | 403) {
    super(message, "AUTH", false);
    this.name = "SitepingAuthError";
    this.status = status;
  }
}

/**
 * Every error the widget and the dashboard report for a failed call, told
 * apart by `code`: narrowing on it reaches a subclass's own fields, such as
 * an `AUTH` error's `status`.
 */
export type SitepingClientError =
  | SitepingNetworkError
  | SitepingValidationError
  | SitepingAuthError
  | SitepingError<"SERVER" | "TIMEOUT">;

const SITEPING_ERROR_CODES: readonly string[] = [
  "NETWORK",
  "VALIDATION",
  "AUTH",
  "SERVER",
  "TIMEOUT",
] satisfies readonly SitepingErrorCode[];

/**
 * Whether `error` is a `SitepingError` (any subclass) — matched on its
 * fields, a known `code` and a boolean `retryable`, so it holds for an error
 * another package's copy of the class threw. Anything else reaching an
 * `onError` (a store's own error, a panel action's) fails it.
 */
export function isSitepingError(error: unknown): error is SitepingClientError {
  return (
    hasOwn(error, "code") &&
    hasOwn(error, "retryable") &&
    typeof error.retryable === "boolean" &&
    typeof error.code === "string" &&
    SITEPING_ERROR_CODES.includes(error.code)
  );
}

/** Stable codes of the errors a handler factory throws for options it cannot run with. */
export type SitepingConfigErrorCode =
  | "CONFIG_STORE_MISSING"
  | "CONFIG_MAX_BODY_BYTES_INVALID"
  | "CONFIG_OWNERSHIP_CHECK_MISSING"
  | "CONFIG_WEBHOOK_TIMEOUT_INVALID"
  | "CONFIG_API_KEY_REQUIRED";

/**
 * Thrown by `createSitepingHandler` while it is created, never per request,
 * when its options cannot run safely. The message says how to fix it; branch
 * on `code`, after {@link isSitepingConfigError}.
 */
export class SitepingConfigError extends Error {
  readonly code: SitepingConfigErrorCode;

  constructor(code: SitepingConfigErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "SitepingConfigError";
  }
}

/**
 * Whether `error` is a `SitepingConfigError` — matched on its `name` and a
 * `CONFIG_` code rather than `instanceof`, for the same cross-bundle reason
 * as {@link isSitepingError}.
 */
export function isSitepingConfigError(error: unknown): error is SitepingConfigError {
  return (
    hasOwn(error, "name") &&
    error.name === "SitepingConfigError" &&
    hasOwn(error, "code") &&
    typeof error.code === "string" &&
    error.code.startsWith("CONFIG_")
  );
}
