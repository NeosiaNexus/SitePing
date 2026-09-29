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
 * How long a write may hang before it fails — a status change, a delete, a
 * reply. Without a bound, a stalled request keeps its control busy until the
 * drawer closes; nothing retries here, so the bound is generous.
 */
const WRITE_TIMEOUT_MS = 30_000;

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

  /**
   * Send a write and read its answer within `WRITE_TIMEOUT_MS`. A controller
   * and a timer rather than `AbortSignal.timeout`, which Safari lacks before 16.
   */
  async function write<T>(
    label: string,
    method: "POST" | "PATCH" | "DELETE",
    payload: object,
    read: (response: Response) => Promise<T>,
  ): Promise<T> {
    const headers = await buildHeaders(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WRITE_TIMEOUT_MS);
    try {
      const response = await request(label, endpoint, {
        method,
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      return await read(response);
    } finally {
      clearTimeout(timer);
    }
  }

  const ignoreBody = async (): Promise<void> => {};

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
      const body = await write(
        "Failed to update feedback",
        "PATCH",
        { id, projectName, status },
        parseJsonAs<FeedbackResponse>,
      );
      return reviveRecord(body);
    },

    async remove(id: string, projectName: string): Promise<void> {
      await write("Failed to delete feedback", "DELETE", { id, projectName }, ignoreBody);
    },

    // Threads share the endpoint: a `feedbackId` routes a POST to one, a
    // `commentId` a DELETE.
    async addComment(feedbackId: string, projectName: string, input: CommentCreateInput): Promise<CommentRecord> {
      const body = await write(
        "Failed to post comment",
        "POST",
        { ...input, projectName, feedbackId },
        parseJsonAs<CommentResponse>,
      );
      return reviveComment(body);
    },

    async removeComment(feedbackId: string, projectName: string, commentId: string): Promise<void> {
      await write("Failed to delete comment", "DELETE", { projectName, feedbackId, commentId }, ignoreBody);
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
