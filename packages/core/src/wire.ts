/**
 * HTTP wire helpers shared by every client that talks to a Siteping
 * endpoint (widget `ApiClient`, dashboard `createEndpointSource`).
 *
 * One definition of the query-string encoding and the HTTP→typed-error
 * mapping — two clients implementing them independently already drifted
 * once (the dashboard forgot to serialize `statuses`), so they live here
 * now.
 */

import { SitepingAuthError, SitepingError, SitepingNetworkError, SitepingValidationError } from "./errors.js";
import type { FeedbackQuery } from "./types.js";

/**
 * Encode a `FeedbackQuery` as the endpoint's expected query string.
 * Omitted/empty filters are not serialized; `statuses` uses the CSV form
 * the server's schema splits (`statuses=open,in_progress`).
 */
export function feedbackQueryToSearchParams(query: FeedbackQuery): URLSearchParams {
  const params = new URLSearchParams({ projectName: query.projectName });
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.type) params.set("type", query.type);
  if (query.status) params.set("status", query.status);
  if (query.statuses?.length) params.set("statuses", query.statuses.join(","));
  if (query.search) params.set("search", query.search);
  if (query.url) params.set("url", query.url);
  if (query.urlPattern) params.set("urlPattern", query.urlPattern);
  return params;
}

/**
 * Map a non-OK `Response` to the appropriate typed error:
 *   - 401 / 403 → `SitepingAuthError`
 *   - other 4xx → `SitepingValidationError`
 *   - 5xx (or anything else) → generic `SitepingError` (code `"SERVER"`)
 *
 * The response body is consumed via `.text()` so the caller keeps the
 * server-supplied message in the thrown error; `.text()` failures fall back
 * to `"Unknown error"` (kept verbatim — host apps grep for it).
 */
export async function errorFromResponse(response: Response, label: string): Promise<SitepingError> {
  const text = await response.text().catch(() => "Unknown error");
  const detail = text ? `${response.status} ${text}` : `${response.status}`;
  const message = `${label}: ${detail}`;
  if (response.status === 401 || response.status === 403) return new SitepingAuthError(message);
  if (response.status >= 400 && response.status < 500) return new SitepingValidationError(message);
  return new SitepingError(message, "SERVER", false);
}

/**
 * Normalise an exception thrown by `fetch` (or a timeout AbortController)
 * into a `SitepingNetworkError`. AbortErrors count as network failures —
 * in Siteping client code they always come from internal timeouts, never a
 * user-driven cancellation.
 */
export function networkErrorFromException(error: unknown, label: string): SitepingNetworkError {
  if (error instanceof SitepingNetworkError) return error;
  const detail = error instanceof Error ? error.message : String(error);
  return new SitepingNetworkError(`${label}: ${detail}`);
}
