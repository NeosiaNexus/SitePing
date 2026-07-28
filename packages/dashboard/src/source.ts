import {
  errorFromResponse,
  type FeedbackPage,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackResponse,
  type FeedbackResponseList,
  type FeedbackStatus,
  feedbackQueryToSearchParams,
  networkErrorFromException,
  type SitepingStore,
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
      // Shared serializer from core — the previous local copy silently
      // dropped the `statuses` bucket filter.
      const params = feedbackQueryToSearchParams(query);

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
