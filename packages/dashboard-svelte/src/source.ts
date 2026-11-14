import {
  type CommentCreateInput,
  type CommentRecord,
  type CommentResponse,
  errorFromResponse,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackResponse,
  type FeedbackResponseList,
  type FeedbackStatus,
  feedbackQueryToSearchParams,
  networkErrorFromException,
  type SitepingStore,
  toFeedbackUpdate,
  withSearchParams,
} from "@siteping/core";
import type { EndpointSourceOptions, InboxRecord, InboxSource } from "./types.js";

// ---------------------------------------------------------------------------
// Date revival — API responses carry ISO strings, the inbox works with Dates
// ---------------------------------------------------------------------------

/** Convert a serialized `FeedbackResponse` into a record with real `Date` objects, its `permissions` kept. */
function reviveRecord(response: FeedbackResponse): InboxRecord {
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
    comments: response.comments?.map(reviveComment),
  };
}

/** Convert a serialized `CommentResponse` into a `CommentRecord` with a real `Date`. */
function reviveComment(response: CommentResponse): CommentRecord {
  // The wire omits the dedup key, like the feedback's.
  return { ...response, clientId: "", createdAt: new Date(response.createdAt) };
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
 * `Authorization` header (in any casing) wins over `apiKey`.
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
    // Header names are case-insensitive: drop a built-in the caller overrides
    // under another casing, or fetch sends both joined ("Bearer a, Bearer b").
    // A plain object, not `Headers`: a `fetchFn` wrapper may spread or index it.
    for (const [name, value] of Object.entries(extra ?? {})) {
      const lower = name.toLowerCase();
      for (const key of Object.keys(merged)) {
        if (key.toLowerCase() === lower) delete merged[key];
      }
      merged[name] = value;
    }
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
    async list(query: FeedbackQuery) {
      // Shared serializer from core — the previous local copy silently
      // dropped the `statuses` bucket filter.
      const params = feedbackQueryToSearchParams(query);

      const response = await request("Failed to fetch feedbacks", withSearchParams(endpoint, params), {
        method: "GET",
        cache: "no-store",
        headers: await buildHeaders(false),
      });
      const body = await parseJsonAs<FeedbackResponseList>(response);
      return {
        feedbacks: body.feedbacks.map(reviveRecord),
        total: body.total,
        // A server that predates threads advertises nothing — and has none.
        capabilities: {
          comments: body.capabilities?.comments === true,
          deleteComments: body.capabilities?.deleteComments === true,
        },
      };
    },

    async setStatus(id: string, projectName: string, status: FeedbackStatus): Promise<InboxRecord> {
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

    // Threads share the endpoint: a `feedbackId` routes a POST to one, a
    // `commentId` a DELETE.
    async addComment(feedbackId: string, projectName: string, input: CommentCreateInput): Promise<CommentRecord> {
      const response = await request("Failed to post comment", endpoint, {
        method: "POST",
        headers: await buildHeaders(true),
        body: JSON.stringify({ ...input, projectName, feedbackId }),
      });
      return reviveComment(await parseJsonAs<CommentResponse>(response));
    },

    async removeComment(feedbackId: string, projectName: string, commentId: string): Promise<void> {
      await request("Failed to delete comment", endpoint, {
        method: "DELETE",
        headers: await buildHeaders(true),
        body: JSON.stringify({ projectName, feedbackId, commentId }),
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
  const source: InboxSource = {
    list(query: FeedbackQuery) {
      return store.getFeedbacks(query);
    },
    setStatus(id: string, _projectName: string, status: FeedbackStatus): Promise<FeedbackRecord> {
      return store.updateFeedback(id, toFeedbackUpdate(status));
    },
    async remove(id: string, _projectName: string): Promise<void> {
      await store.deleteFeedback(id);
    },
  };
  // A store without threads leaves these out, which keeps the inbox's threads read-only.
  const addComment = store.addComment?.bind(store);
  const deleteComment = store.deleteComment?.bind(store);
  if (addComment) source.addComment = (feedbackId, _projectName, input) => addComment(feedbackId, input);
  if (deleteComment)
    source.removeComment = (feedbackId, _projectName, commentId) => deleteComment(feedbackId, commentId);
  return source;
}
