import {
  type FeedbackPayload,
  type FeedbackResponse,
  type FeedbackResponseList,
  type FeedbackStatus,
  type FeedbackType,
  SitepingAuthError,
  SitepingError,
  SitepingNetworkError,
  SitepingValidationError,
} from "@siteping/core";
import type { Identity } from "./identity.js";

/**
 * Map a non-OK Response to the appropriate typed error.
 *   - 401 / 403 → `SitepingAuthError`
 *   - 4xx       → `SitepingValidationError`
 *   - 5xx (or anything else) → generic `SitepingError`
 *
 * We consume the response body via `.text()` so the caller can keep the
 * server-supplied message in the thrown error. `text()` is awaited inside
 * a try/catch because some upstreams return `Content-Length: 0` with a
 * non-text type and `.text()` rejects.
 */
async function errorFromResponse(response: Response, label: string): Promise<SitepingError> {
  // Match the legacy fallback string ("Unknown error") so host apps that
  // already grep error messages don't break on the migration.
  const text = await response.text().catch(() => "Unknown error");
  const detail = text ? `${response.status} ${text}` : `${response.status}`;
  const message = `${label}: ${detail}`;
  if (response.status === 401 || response.status === 403) return new SitepingAuthError(message);
  if (response.status >= 400 && response.status < 500) return new SitepingValidationError(message);
  return new SitepingError(message, "SERVER", false);
}

/**
 * Normalise an exception thrown by `fetch` (or our timeout AbortController)
 * into a `SitepingNetworkError`. We treat AbortErrors as network failures
 * because in our code path they always come from the internal timeout, not
 * a user-driven cancellation.
 */
function networkErrorFromException(error: unknown, label: string): SitepingNetworkError {
  if (error instanceof SitepingNetworkError) return error;
  const detail = error instanceof Error ? error.message : String(error);
  return new SitepingNetworkError(`${label}: ${detail}`);
}

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

/** Options accepted by `WidgetClient.getFeedbacks`. */
export interface GetFeedbacksOptions {
  page?: number;
  limit?: number;
  type?: FeedbackType;
  status?: FeedbackStatus;
  search?: string;
  /** Restrict to feedbacks created on this exact URL (path). */
  url?: string;
  /** Restrict to feedbacks created on this URL pattern (e.g. `/orders/:orderId`). */
  urlPattern?: string;
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

function readQueue(): RetryEntry[] {
  const raw = localStorage.getItem(RETRY_QUEUE_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? (parsed as RetryEntry[]) : [];
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
 */
export async function flushRetryQueue(endpoint: string, currentIdentity?: Identity | null): Promise<void> {
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
      for (const entry of toRetry) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry.payload),
          });
          if (!res.ok) {
            failed.push(entry);
          }
        } catch {
          failed.push(entry);
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
  ) {}

  async sendFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
    // Match the legacy contract: every failure path (network or HTTP) queues
    // for retry. Tests + host apps already rely on this — narrowing to
    // network-only would be a silent behaviour change.
    try {
      let response: Response;
      try {
        response = await resilientFetch(this.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        throw networkErrorFromException(error, "Failed to send feedback");
      }

      if (!response.ok) {
        throw await errorFromResponse(response, "Failed to send feedback");
      }

      return parseJsonAs<FeedbackResponse>(response);
    } catch (error) {
      queueForRetry(this.endpoint, payload);
      throw error;
    }
  }

  async getFeedbacks(projectName: string, options?: GetFeedbacksOptions): Promise<FeedbackResponseList> {
    const params = new URLSearchParams({ projectName });
    if (options?.page) params.set("page", String(options.page));
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.type) params.set("type", options.type);
    if (options?.status) params.set("status", options.status);
    if (options?.search) params.set("search", options.search);
    if (options?.url) params.set("url", options.url);
    if (options?.urlPattern) params.set("urlPattern", options.urlPattern);

    let response: Response;
    try {
      response = await resilientFetch(`${this.endpoint}?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
