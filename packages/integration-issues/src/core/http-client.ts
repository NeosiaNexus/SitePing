import { TRACKER_REQUEST_TIMEOUT_MS } from "../constants/http.js";

/** A tracker API call that failed — carries what is needed to debug it, never the token. */
export class IssueTrackerRequestError extends Error {
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
  /** Path appended to `baseUrl`, or an absolute URL (pagination links). */
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
    const url = /^https?:\/\//.test(path) ? new URL(path) : new URL(`${baseUrl.replace(/\/$/, "")}${path}`);
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
    return (await response.json()) as Response;
  };
}

