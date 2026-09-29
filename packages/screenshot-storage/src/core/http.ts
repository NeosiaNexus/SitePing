import { OBJECT_STORE_REQUEST_FAILED_CODE } from "../constants/errors.js";
import {
  HTTP_STATUS_TOO_MANY_REQUESTS,
  OBJECT_STORE_REQUEST_MAX_ATTEMPTS,
  OBJECT_STORE_REQUEST_TIMEOUT_MS,
  OBJECT_STORE_RETRY_BASE_DELAY_MS,
} from "../constants/http.js";
import { hasErrorCode } from "./error-code.js";
import { ScreenshotUploadRejectedError } from "./object-store.js";

/**
 * A backend call that failed — method (or SQL statement), path (or key) and
 * status, never credentials. Its `cause` is the network error, or the
 * backend's error code and message: never the raw error body, which may echo
 * the signed request, nor a database error quoting the query's parameters.
 * Match it with {@link isObjectStoreRequestError} rather than `instanceof`
 * (CommonJS entry points each bundle their own copy of the class).
 */
export class ObjectStoreRequestError extends Error {
  readonly code = OBJECT_STORE_REQUEST_FAILED_CODE;
  constructor(
    readonly backend: string,
    readonly method: string,
    readonly path: string,
    /** HTTP status of the failed response: `null` without one (network error, timeout, database). */
    readonly status: number | null,
    options?: { cause?: unknown },
  ) {
    super(`[siteping] ${backend} ${method} ${path} failed${status === null ? "" : ` with status ${status}`}`, options);
    this.name = "ObjectStoreRequestError";
  }
}

/**
 * Whether `error` is a failed backend request, matched on its stable `code`
 * so it holds across bundle copies of the class.
 *
 * @param error - Any thrown value.
 */
export function isObjectStoreRequestError(error: unknown): error is ObjectStoreRequestError {
  return hasErrorCode(error, OBJECT_STORE_REQUEST_FAILED_CODE);
}

export interface BackendRequest {
  backend: string;
  url: URL;
  init: RequestInit;
  fetch: typeof fetch;
  /** Budget of the whole call: every attempt, the waits between them and the response body. */
  timeoutMs?: number;
  /**
   * Whether sending the request again has the effect of sending it once (an
   * S3 `PUT` of the same bytes under the same key, a `GET`, a `DELETE`): it
   * is then retried after a network error or a 5xx too, not only after a 429.
   */
  idempotent: boolean;
  /** Statuses that count as success besides 2xx (e.g. 404 on delete = already gone). */
  acceptStatuses?: readonly number[];
  /**
   * A 3xx or 4xx on this call means nothing was stored, unless an earlier
   * attempt may have — report it as a definitive rejection. No backend stores
   * an object it answers with a redirect: S3 answers `301 PermanentRedirect`
   * to a path-style request sent to another region's endpoint (fetch follows
   * the redirects it can).
   */
  isUpload?: boolean;
  /**
   * The error code and message of a failed response's body, kept as the
   * failure's `cause`. Never the whole body: S3's `SignatureDoesNotMatch`
   * echoes the canonical request, whose signed headers carry the session
   * token of temporary credentials, and the cause reaches server logs.
   */
  describeError: (body: string) => string | undefined;
}

const HTTP_SERVER_ERROR_MIN = 500; // standard HTTP range

/**
 * Fetch a backend, retrying what may succeed on another attempt; turns the
 * final failure into an `ObjectStoreRequestError`, or a definitive upload
 * rejection.
 *
 * A 429 is retried, and so are a network error and a 5xx when the request is
 * `idempotent`, up to {@link OBJECT_STORE_REQUEST_MAX_ATTEMPTS} attempts — a
 * single transient failure would otherwise cost the screenshot. The wait
 * follows the backend's `Retry-After`, or a random backoff; no retry starts
 * that `timeoutMs`, the budget of the whole call, could not wait for.
 */
export async function sendBackendRequest({
  backend,
  url,
  init,
  fetch: fetchImplementation,
  timeoutMs = OBJECT_STORE_REQUEST_TIMEOUT_MS,
  idempotent,
  acceptStatuses = [],
  isUpload = false,
  describeError,
}: BackendRequest): Promise<Response> {
  const method = init.method ?? "GET";
  const deadline = Date.now() + timeoutMs;
  const signal = AbortSignal.timeout(timeoutMs);
  // Set once an attempt may have reached the backend's storage: a refusal of a
  // later attempt then no longer proves that nothing was stored.
  let mayHaveStored = false;
  for (let attempt = 1; ; attempt++) {
    let response: Response | undefined;
    let networkError: unknown;
    try {
      response = await fetchImplementation(url, { ...init, signal });
    } catch (error) {
      networkError = error;
    }
    if (response && (response.ok || acceptStatuses.includes(response.status))) return response;
    const status = response?.status ?? null;
    const failure = new ObjectStoreRequestError(backend, method, url.pathname, status, {
      cause: response ? describeError(await response.text().catch(() => "")) : networkError,
    });
    const transient = status === null || status >= HTTP_SERVER_ERROR_MIN;
    mayHaveStored ||= transient;
    if (
      attempt < OBJECT_STORE_REQUEST_MAX_ATTEMPTS &&
      (status === HTTP_STATUS_TOO_MANY_REQUESTS || (idempotent && transient))
    ) {
      const delay = retryDelayMs(attempt, response);
      if (Date.now() + delay < deadline) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
    // Neither this attempt nor an earlier one may have stored anything: a 3xx or a 4xx.
    if (isUpload && !mayHaveStored) {
      throw new ScreenshotUploadRejectedError(failure.message, { cause: failure });
    }
    throw failure;
  }
}

/**
 * Wait before retry number `attempt`: the `Retry-After` of the failed
 * response (seconds or an HTTP date), otherwise a random delay up to
 * {@link OBJECT_STORE_RETRY_BASE_DELAY_MS}, doubled per retry (full jitter,
 * so concurrent uploads refused together do not retry together).
 */
function retryDelayMs(attempt: number, response: Response | undefined): number {
  const retryAfter = response?.headers.get("retry-after")?.trim();
  if (retryAfter) {
    if (/^\d+$/.test(retryAfter)) return Number(retryAfter) * 1_000;
    const date = Date.parse(retryAfter);
    if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  }
  return Math.random() * OBJECT_STORE_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
}
