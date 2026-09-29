import { OBJECT_STORE_REQUEST_FAILED_CODE } from "../constants/errors.js";
import { OBJECT_STORE_REQUEST_TIMEOUT_MS } from "../constants/http.js";
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
  timeoutMs?: number;
  /** Statuses that count as success besides 2xx (e.g. 404 on delete = already gone). */
  acceptStatuses?: readonly number[];
  /**
   * A 3xx or 4xx on this call means nothing was stored — report it as a
   * definitive rejection. No backend stores an object it answers with a
   * redirect: S3 answers `301 PermanentRedirect` to a path-style request sent
   * to another region's endpoint (fetch follows the redirects it can).
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

const HTTP_REDIRECTION_MIN = 300; // standard HTTP ranges
const HTTP_SERVER_ERROR_MIN = 500;

/** Fetch with a timeout; turns failures into `ObjectStoreRequestError` (or a definitive upload rejection). */
export async function sendBackendRequest({
  backend,
  url,
  init,
  fetch: fetchImplementation,
  timeoutMs = OBJECT_STORE_REQUEST_TIMEOUT_MS,
  acceptStatuses = [],
  isUpload = false,
  describeError,
}: BackendRequest): Promise<Response> {
  const method = init.method ?? "GET";
  let response: Response;
  try {
    response = await fetchImplementation(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (cause) {
    throw new ObjectStoreRequestError(backend, method, url.pathname, null, { cause });
  }
  if (response.ok || acceptStatuses.includes(response.status)) return response;
  const failure = new ObjectStoreRequestError(backend, method, url.pathname, response.status, {
    cause: describeError(await response.text().catch(() => "")),
  });
  if (isUpload && response.status >= HTTP_REDIRECTION_MIN && response.status < HTTP_SERVER_ERROR_MIN) {
    throw new ScreenshotUploadRejectedError(failure.message, { cause: failure });
  }
  throw failure;
}
