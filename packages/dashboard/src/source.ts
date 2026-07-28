import {
  type FeedbackPage,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackResponse,
  type FeedbackResponseList,
  type FeedbackStatus,
  SitepingAuthError,
  SitepingError,
  SitepingNetworkError,
  type SitepingStore,
  SitepingValidationError,
  toFeedbackUpdate,
} from "@siteping/core";
import type { EndpointSourceOptions, InboxSource } from "./types.js";

// ---------------------------------------------------------------------------
// Date revival — API responses carry ISO strings, the inbox works with Dates
// ---------------------------------------------------------------------------

/** Convert a serialized `FeedbackResponse` into a `FeedbackRecord` with real `Date` objects. */
function reviveRecord(response: FeedbackResponse): FeedbackRecord {
  return {
    ...response,
    // API responses omit clientId (server-side dedupe concern) — not needed for triage.
    clientId: "",
    resolvedAt: response.resolvedAt === null ? null : new Date(response.resolvedAt),
    createdAt: new Date(response.createdAt),
    updatedAt: new Date(response.updatedAt),
    annotations: response.annotations.map((annotation) => ({
      ...annotation,
      createdAt: new Date(annotation.createdAt),
    })),
  };
}

// ---------------------------------------------------------------------------
// Error mapping — mirrors the widget api-client (minus retries: the dashboard
// is interactive, the user retries)
// ---------------------------------------------------------------------------

/**
 * Map a non-OK Response to the appropriate typed error.
 *   - 401 / 403 → `SitepingAuthError`
 *   - 4xx       → `SitepingValidationError`
 *   - 5xx (or anything else) → generic `SitepingError` (code `"SERVER"`)
 */
async function errorFromResponse(response: Response, label: string): Promise<SitepingError> {
  const text = await response.text().catch(() => "Unknown error");
  const detail = text ? `${response.status} ${text}` : `${response.status}`;
  const message = `${label}: ${detail}`;
  if (response.status === 401 || response.status === 403) return new SitepingAuthError(message);
  if (response.status >= 400 && response.status < 500) return new SitepingValidationError(message);
  return new SitepingError(message, "SERVER", false);
}

/** Normalise an exception thrown by `fetch` into a `SitepingNetworkError`. */
function networkErrorFromException(error: unknown, label: string): SitepingNetworkError {
  if (error instanceof SitepingNetworkError) return error;
  const detail = error instanceof Error ? error.message : String(error);
  return new SitepingNetworkError(`${label}: ${detail}`);
}

/** Parse a JSON body and assert its TypeScript shape — server-side Zod is the source of truth. */
async function parseJsonAs<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Endpoint source — HTTP mode against the adapter request handlers
// ---------------------------------------------------------------------------

/**
 * Build an `InboxSource` talking HTTP to a Siteping endpoint (e.g. the
 * `@siteping/adapter-prisma` request handlers mounted at `/api/siteping`).
 *
 * Auth: `apiKey` becomes `Authorization: Bearer <apiKey>`; `headers` (static
 * or per-request function, sync or async) are merged on top, so an explicit
 * `Authorization` header wins over `apiKey`.
 */
export function createEndpointSource(options: EndpointSourceOptions): InboxSource {
  const { endpoint, apiKey, headers, fetchFn } = options;
  // Wrap the global to keep `fetch` bound to globalThis (avoids "Illegal invocation").
  const doFetch: typeof fetch = fetchFn ?? ((input, init) => globalThis.fetch(input, init));

  async function buildHeaders(json: boolean): Promise<Record<string, string>> {
    const merged: Record<string, string> = {};
    if (json) merged["Content-Type"] = "application/json";
    if (apiKey) merged.Authorization = `Bearer ${apiKey}`;
    const extra = typeof headers === "function" ? await headers() : headers;
    if (extra) Object.assign(merged, extra);
    return merged;
  }

  async function request(label: string, url: string, init: RequestInit): Promise<Response> {
    let response: Response;
    try {
      response = await doFetch(url, init);
    } catch (error) {
      throw networkErrorFromException(error, label);
    }
    if (!response.ok) throw await errorFromResponse(response, label);
    return response;
  }

  return {
    async list(query: FeedbackQuery): Promise<FeedbackPage> {
      const params = new URLSearchParams({ projectName: query.projectName });
      if (query.page) params.set("page", String(query.page));
      if (query.limit) params.set("limit", String(query.limit));
      if (query.status) params.set("status", query.status);
      if (query.type) params.set("type", query.type);
      if (query.search) params.set("search", query.search);
      if (query.url) params.set("url", query.url);
      if (query.urlPattern) params.set("urlPattern", query.urlPattern);

      const response = await request("Failed to fetch feedbacks", `${endpoint}?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: await buildHeaders(false),
      });
      const body = await parseJsonAs<FeedbackResponseList>(response);
      return { feedbacks: body.feedbacks.map(reviveRecord), total: body.total };
    },

    async setStatus(id: string, projectName: string, status: FeedbackStatus): Promise<FeedbackRecord> {
      const response = await request("Failed to update feedback", endpoint, {
        method: "PATCH",
        headers: await buildHeaders(true),
        body: JSON.stringify({ id, projectName, status }),
      });
      return reviveRecord(await parseJsonAs<FeedbackResponse>(response));
    },

    async remove(id: string, projectName: string): Promise<void> {
      await request("Failed to delete feedback", endpoint, {
        method: "DELETE",
        headers: await buildHeaders(true),
        body: JSON.stringify({ id, projectName }),
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Store source — direct SitepingStore (client-side mode, no server)
// ---------------------------------------------------------------------------

/**
 * Build an `InboxSource` over a `SitepingStore` directly (client-side mode).
 *
 * Closure semantics live at this edge: `resolvedAt` is set when a feedback
 * enters a closed status and cleared otherwise — the store persists what it
 * is given.
 */
export function createStoreSource(store: SitepingStore): InboxSource {
  return {
    list(query: FeedbackQuery): Promise<FeedbackPage> {
      return store.getFeedbacks(query);
    },
    setStatus(id: string, _projectName: string, status: FeedbackStatus): Promise<FeedbackRecord> {
      return store.updateFeedback(id, toFeedbackUpdate(status));
    },
    async remove(id: string, _projectName: string): Promise<void> {
      await store.deleteFeedback(id);
    },
  };
}
