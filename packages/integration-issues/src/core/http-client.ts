import { hasOwn } from "@siteping/core";
import { ISSUE_TRACKER_REQUEST_FAILED_CODE, UNLABELLED_ISSUE_CODE } from "../constants/errors.js";
import { TRACKER_REQUEST_TIMEOUT_MS } from "../constants/http.js";

/**
 * A tracker API call that failed — carries what is needed to debug it, never the token.
 * Match it with {@link isIssueTrackerRequestError} rather than `instanceof`
 * (CommonJS entry points each bundle their own copy of the class).
 */
export class IssueTrackerRequestError extends Error {
  readonly code = ISSUE_TRACKER_REQUEST_FAILED_CODE;
  constructor(
    readonly tracker: string,
    readonly method: string,
    readonly path: string,
    readonly status: number | null,
    options?: { cause?: unknown },
  ) {
    super(
      `[siteping] ${tracker} API ${method} ${path} failed${status === null ? "" : ` with status ${status}`}`,
      options,
    );
    this.name = "IssueTrackerRequestError";
  }
}

/**
 * The tracker created the issue but dropped its `siteping` label, which
 * every later lookup filters on: status changes and deletes would silently
 * stop reaching it. Raised so the handler logs the missing permission.
 * Match it with {@link isUnlabelledIssueError} rather than `instanceof`.
 */
export class UnlabelledIssueError extends Error {
  readonly code = UNLABELLED_ISSUE_CODE;
  constructor(tracker: string, issue: string, remedy: string) {
    super(
      `[siteping] ${tracker} created issue ${issue} without its "siteping" label, so status changes and deletes cannot find it. ${remedy}`,
    );
    this.name = "UnlabelledIssueError";
  }
}

/**
 * Whether `error` is a failed tracker request. Matches on the stable `code`,
 * not `instanceof`: in CommonJS the `github` and `gitlab` entries each bundle
 * their own copy of the class, so their errors are not instances of the class
 * imported from the package root.
 *
 * @param error - Any thrown value.
 */
export function isIssueTrackerRequestError(error: unknown): error is IssueTrackerRequestError {
  return hasOwn(error, "code") && error.code === ISSUE_TRACKER_REQUEST_FAILED_CODE;
}

/**
 * Whether `error` is a tracker request that got no answer within
 * `timeoutMs`, as opposed to one that failed at once (a refused or reset
 * connection) or was refused with a status.
 */
export function isTrackerTimeout(error: unknown): boolean {
  return isIssueTrackerRequestError(error) && error.cause instanceof Error && error.cause.name === "TimeoutError";
}

/**
 * Whether `error` reports an issue created without its `siteping` label,
 * matched on its stable `code` for the reason given on {@link isIssueTrackerRequestError}.
 *
 * @param error - Any thrown value.
 */
export function isUnlabelledIssueError(error: unknown): error is UnlabelledIssueError {
  return hasOwn(error, "code") && error.code === UNLABELLED_ISSUE_CODE;
}

export interface JsonHttpClientOptions {
  /** Provider name for error messages. */
  tracker: string;
  baseUrl: string;
  headers: Record<string, string>;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface JsonRequest {
  method: "GET" | "POST" | "PUT" | "PATCH";
  /** Path appended to `baseUrl`. */
  path: string;
  query?: Record<string, string>;
  body?: unknown;
}

/** Minimal JSON client over an injected `fetch`, with a per-request timeout. */
export function createJsonHttpClient({
  tracker,
  baseUrl,
  headers,
  fetch: fetchImplementation = globalThis.fetch,
  timeoutMs = TRACKER_REQUEST_TIMEOUT_MS,
}: JsonHttpClientOptions) {
  const toUrl = (path: string, query: Record<string, string> = {}): URL => {
    const url = new URL(`${baseUrl.replace(/\/$/, "")}${path}`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    return url;
  };

  return async function request<Response>({ method, path, query, body }: JsonRequest): Promise<Response> {
    const url = toUrl(path, query);
    const logPath = url.pathname;
    let response: globalThis.Response;
    try {
      response = await fetchImplementation(url, {
        method,
        headers: body === undefined ? headers : { ...headers, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      throw new IssueTrackerRequestError(tracker, method, logPath, null, { cause });
    }
    if (!response.ok) {
      throw new IssueTrackerRequestError(tracker, method, logPath, response.status, {
        cause: await response.text().catch(() => undefined),
      });
    }
    if (response.status === 204) return undefined as Response;
    try {
      return (await response.json()) as Response;
    } catch (cause) {
      // A body the timeout cut short, or not JSON (a proxy's login page).
      throw new IssueTrackerRequestError(tracker, method, logPath, response.status, { cause });
    }
  };
}
