import {
  errorFromResponse,
  type FeedbackPayload,
  type FeedbackQuery,
  type FeedbackResponse,
  type FeedbackResponseList,
  feedbackQueryToSearchParams,
  hasOwn,
  networkErrorFromException,
  type Prettify,
  type SitepingHeadersOption,
  SitepingNetworkError,
} from "@siteping/core";
import type { Identity } from "./identity.js";

/**
 * Abstract client interface used by the widget internals.
 *
 * `ApiClient` (HTTP mode) and `StoreClient` (direct store mode) both satisfy
 * this interface, allowing the widget to work identically in either mode.
 */
export interface WidgetClient {
  sendFeedback(payload: FeedbackPayload): Promise<FeedbackResponse>;
  getFeedbacks(projectName: string, options?: GetFeedbacksOptions): Promise<FeedbackResponseList>;
  resolveFeedback(id: string, resolved: boolean): Promise<FeedbackResponse>;
  deleteFeedback(id: string): Promise<void>;
  deleteAllFeedbacks(projectName: string): Promise<void>;
}

/**
 * Options accepted by `WidgetClient.getFeedbacks` — core's `FeedbackQuery`
 * minus the `projectName` the client already knows. Derived, so a new query
 * filter added to core flows to both the HTTP and store clients
 * automatically.
 */
export type GetFeedbacksOptions = Prettify<Omit<FeedbackQuery, "projectName">>;

/** Auth options for `ApiClient` / `flushRetryQueue` (HTTP mode). */
export interface ApiClientAuth {
  /** Sent as `Authorization: Bearer <apiKey>` on every request. */
  apiKey?: string | undefined;
  /** Extra headers, static or per-request factory. An explicit `Authorization` entry wins over `apiKey`. */
  headers?: SitepingHeadersOption | undefined;
}

/**
 * Build the headers for one request — mirrors the dashboard's
 * `createEndpointSource` semantics: `Content-Type` when the request carries a
 * JSON body, then `Bearer` from `apiKey`, then `headers` merged on top so an
 * explicit `Authorization` wins.
 *
 * A function `headers` resolves once per call — retries inside
 * `resilientFetch` reuse the values for the whole retry sequence — up to
 * ~45s worst case with 4 attempts x 10s timeout plus backoff (the dashboard
 * has the same per-request semantics, without retries). A
 * throwing/rejecting factory fails the request like a network error.
 */
export async function buildRequestHeaders(auth: ApiClientAuth, json: boolean): Promise<Record<string, string>> {
  const merged: Record<string, string> = {};
  if (json) merged["Content-Type"] = "application/json";
  if (auth.apiKey) merged.Authorization = `Bearer ${auth.apiKey}`;
  const extra = typeof auth.headers === "function" ? await auth.headers() : auth.headers;
  if (extra) Object.assign(merged, extra);
  return merged;
}

const MAX_RETRIES = 3;
const TIMEOUT_MS = 10_000;
const RETRY_QUEUE_KEY = "siteping_retry_queue";
const MAX_QUEUE_SIZE = 20;

// ---------------------------------------------------------------------------
// Core fetch with retry + exponential backoff + jitter
// ---------------------------------------------------------------------------

async function resilientFetch(url: string, init: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // Don't retry client errors (4xx) — only server errors (5xx)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      if (attempt === retries) return response;
    } catch (error) {
      clearTimeout(timeout);
      if (attempt === retries) throw error;
    }

    // Exponential backoff with jitter: 1s, 2s, 4s + random ±500ms
    const baseDelay = 1000 * 2 ** attempt;
    const jitter = Math.random() * 1000 - 500;
    await new Promise((r) => setTimeout(r, baseDelay + jitter));
  }

  throw new Error("Max retries exceeded");
}

// ---------------------------------------------------------------------------
// Retry queue — persist failed feedbacks for retry on next page load
// ---------------------------------------------------------------------------

interface RetryEntry {
  endpoint: string;
  payload: FeedbackPayload;
}

const LOCK_NAME = "siteping_retry_queue";

/**
 * Acquire a Web Lock to serialize cross-tab access to the retry queue.
 * Falls back to running the callback without locking on older browsers.
 */
async function withRetryLock<T>(callback: () => T | Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(LOCK_NAME, () => callback());
  }
  return callback();
}

/**
 * Shape-check one queue element — localStorage can hold tampered or legacy
 * entries, and a malformed one used to abort the whole flush via the outer
 * catch. Bad entries are dropped individually instead.
 */
function isRetryEntry(value: unknown): value is RetryEntry {
  return (
    hasOwn(value, "endpoint") &&
    typeof value.endpoint === "string" &&
    hasOwn(value, "payload") &&
    typeof value.payload === "object" &&
    value.payload !== null
  );
}

function readQueue(): RetryEntry[] {
  const raw = localStorage.getItem(RETRY_QUEUE_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter(isRetryEntry) : [];
}

function queueForRetry(endpoint: string, payload: FeedbackPayload): void {
  // Fire-and-forget — we don't want to block the caller on the lock
  void withRetryLock(() => {
    try {
      const queue = readQueue();

      // Cap queue size to prevent unbounded localStorage growth
      if (queue.length >= MAX_QUEUE_SIZE) {
        queue.shift(); // Drop oldest entry
      }

      queue.push({ endpoint, payload });
      localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // localStorage full or unavailable — silently drop
    }
  });
}

function normalizeName(value: string): string {
  return value.trim();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Flush queued feedbacks for `endpoint`. When `currentIdentity` is provided,
 * entries whose stored author doesn't match it are dropped rather than replayed.
 * This prevents user A's offline feedback from being POSTed under user B's
 * identity after a session change. When omitted, all entries are replayed to
 * preserve the legacy behavior for callers that don't track identity.
 *
 * `auth` headers resolve fresh at flush time (once per flush call) — queue
 * entries persist payloads only, never headers or token material.
 */
export async function flushRetryQueue(
  endpoint: string,
  currentIdentity?: Identity | null,
  auth: ApiClientAuth = {},
): Promise<void> {
  await withRetryLock(async () => {
    try {
      const queue = readQueue();
      if (queue.length === 0) return;

      const toRetry: RetryEntry[] = [];
      const unrelated: RetryEntry[] = [];
      let dropped = 0;

      for (const entry of queue) {
        if (entry.endpoint !== endpoint) {
          unrelated.push(entry);
          continue;
        }

        if (
          !currentIdentity ||
          (normalizeName(entry.payload.authorName) === normalizeName(currentIdentity.name) &&
            normalizeEmail(entry.payload.authorEmail) === normalizeEmail(currentIdentity.email))
        ) {
          toRetry.push(entry);
        } else {
          dropped += 1;
        }
      }

      if (toRetry.length === 0 && dropped === 0) return;

      if (dropped > 0) {
        console.debug("[siteping] flushRetryQueue: dropped", dropped, "stale entries (identity changed)");
      }

      // Process items sequentially to avoid overwhelming the server
      const failed: RetryEntry[] = [];
      if (toRetry.length > 0) {
        const headers = await buildRequestHeaders(auth, true);
        for (const entry of toRetry) {
          try {
            const res = await fetch(endpoint, {
              method: "POST",
              headers,
              body: JSON.stringify(entry.payload),
            });
            if (!res.ok) {
              failed.push(entry);
            }
          } catch {
            failed.push(entry);
          }
        }
      }

      // Rebuild queue: keep unrelated entries + failed retries
      const remaining = unrelated.concat(failed);
      if (remaining.length > 0) {
        localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(RETRY_QUEUE_KEY);
      }
    } catch {
      // Ignore — localStorage may be unavailable
    }
  });
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

/** Parse a JSON body and assert its TypeScript shape — server-side Zod is the source of truth. */
async function parseJsonAs<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export class ApiClient implements WidgetClient {
  constructor(
    private readonly endpoint: string,
    private readonly projectName: string,
    private readonly auth: ApiClientAuth = {},
  ) {}

  async sendFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
    // Only put `screenshotRegion` on the wire when a region was actually
    // captured — servers that predate the field would otherwise reject an
    // explicit `screenshotRegion: null` on every legacy capture.
    const { screenshotRegion, ...rest } = payload;
    const body: FeedbackPayload = screenshotRegion ? { ...rest, screenshotRegion } : rest;
    // Match the legacy contract: every failure path (network or HTTP) queues
    // for retry. Tests + host apps already rely on this — narrowing to
    // network-only would be a silent behaviour change.
    try {
      let response: Response;
      try {
        response = await resilientFetch(this.endpoint, {
          method: "POST",
          headers: await buildRequestHeaders(this.auth, true),
          body: JSON.stringify(body),
        });
      } catch (error) {
        throw networkErrorFromException(error, "Failed to send feedback");
      }

      if (!response.ok) {
        throw await errorFromResponse(response, "Failed to send feedback");
      }

      return parseJsonAs<FeedbackResponse>(response);
    } catch (error) {
      // Queue the wire shape (region stripped when absent) so a later
      // flushRetryQueue replays exactly what a fresh POST would send.
      queueForRetry(this.endpoint, body);
      throw error;
    }
  }

  async getFeedbacks(projectName: string, options?: GetFeedbacksOptions): Promise<FeedbackResponseList> {
    const params = feedbackQueryToSearchParams({ projectName, ...options });

    let response: Response;
    try {
      // GET carries no body — only attach headers when auth produced some, so
      // the no-auth wire shape stays byte-identical to the legacy client.
      const headers = await buildRequestHeaders(this.auth, false);
      response = await resilientFetch(`${this.endpoint}?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
      });
    } catch (error) {
      throw networkErrorFromException(error, "Failed to fetch feedbacks");
    }

    if (!response.ok) {
      throw await errorFromResponse(response, "Failed to fetch feedbacks");
    }

    return parseJsonAs<FeedbackResponseList>(response);
  }

  async resolveFeedback(id: string, resolved: boolean): Promise<FeedbackResponse> {
    let response: Response;
    try {
      response = await resilientFetch(this.endpoint, {
        method: "PATCH",
        headers: await buildRequestHeaders(this.auth, true),
        body: JSON.stringify({ id, projectName: this.projectName, status: resolved ? "resolved" : "open" }),
      });
    } catch (error) {
      throw networkErrorFromException(error, "Failed to update feedback");
    }

    if (!response.ok) {
      throw await errorFromResponse(response, "Failed to update feedback");
    }

    return parseJsonAs<FeedbackResponse>(response);
  }

  async deleteFeedback(id: string): Promise<void> {
    let response: Response;
    try {
      response = await resilientFetch(this.endpoint, {
        method: "DELETE",
        headers: await buildRequestHeaders(this.auth, true),
        body: JSON.stringify({ id, projectName: this.projectName }),
      });
    } catch (error) {
      throw networkErrorFromException(error, "Failed to delete feedback");
    }

    if (!response.ok) {
      throw await errorFromResponse(response, "Failed to delete feedback");
    }
  }

  async deleteAllFeedbacks(projectName: string): Promise<void> {
    let response: Response;
    try {
      response = await resilientFetch(this.endpoint, {
        method: "DELETE",
        headers: await buildRequestHeaders(this.auth, true),
        body: JSON.stringify({ projectName, deleteAll: true }),
      });
    } catch (error) {
      throw networkErrorFromException(error, "Failed to delete all feedbacks");
    }

    if (!response.ok) {
      throw await errorFromResponse(response, "Failed to delete all feedbacks");
    }
  }
}
