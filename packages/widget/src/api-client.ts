import type { FeedbackPayload, FeedbackResponse, FeedbackStatus, FeedbackType } from "@siteping/core";

/**
 * Abstract client interface used by the widget internals.
 *
 * `ApiClient` (HTTP mode) and `StoreClient` (direct store mode) both satisfy
 * this interface, allowing the widget to work identically in either mode.
 */
export interface WidgetClient {
  sendFeedback(payload: FeedbackPayload): Promise<FeedbackResponse>;
  getFeedbacks(
    projectName: string,
    options?: GetFeedbacksOptions,
  ): Promise<{ feedbacks: FeedbackResponse[]; total: number }>;
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
  /** Restrict to feedbacks created on this URL pattern (e.g. "/orders/:orderId"). */
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

type RetryEntry = { endpoint: string; payload: FeedbackPayload };

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

function queueForRetry(endpoint: string, payload: FeedbackPayload): void {
  // Fire-and-forget — we don't want to block the caller on the lock
  void withRetryLock(() => {
    try {
      const raw = localStorage.getItem(RETRY_QUEUE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const queue: RetryEntry[] = Array.isArray(parsed) ? (parsed as RetryEntry[]) : [];

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

export async function flushRetryQueue(endpoint: string): Promise<void> {
  await withRetryLock(async () => {
    try {
      const raw = localStorage.getItem(RETRY_QUEUE_KEY);
      if (!raw) return;

      const parsed: unknown = JSON.parse(raw);
      const queue: RetryEntry[] = Array.isArray(parsed) ? (parsed as RetryEntry[]) : [];

      const toRetry = queue.filter((e) => e.endpoint === endpoint);
      if (toRetry.length === 0) return;

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
      const remaining = queue.filter((e) => e.endpoint !== endpoint).concat(failed);
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

export class ApiClient {
  constructor(
    private readonly endpoint: string,
    private readonly projectName: string,
  ) {}

  async sendFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
    try {
      const response = await resilientFetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "Unknown error");
        throw new Error(`Failed to send feedback: ${response.status} ${text}`);
      }

      return (await response.json()) as FeedbackResponse; // Server validates via Zod
    } catch (error) {
      queueForRetry(this.endpoint, payload);
      throw error;
    }
  }

  async getFeedbacks(
    projectName: string,
    options?: GetFeedbacksOptions,
  ): Promise<{ feedbacks: FeedbackResponse[]; total: number }> {
    const params = new URLSearchParams({ projectName });
    if (options?.page) params.set("page", String(options.page));
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.type) params.set("type", options.type);
    if (options?.status) params.set("status", options.status);
    if (options?.search) params.set("search", options.search);
    if (options?.url) params.set("url", options.url);
    if (options?.urlPattern) params.set("urlPattern", options.urlPattern);

    const response = await resilientFetch(`${this.endpoint}?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch feedbacks: ${response.status}`);
    }

    return (await response.json()) as { feedbacks: FeedbackResponse[]; total: number }; // Server validates via Zod
  }

  async resolveFeedback(id: string, resolved: boolean): Promise<FeedbackResponse> {
    const response = await resilientFetch(this.endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, projectName: this.projectName, status: resolved ? "resolved" : "open" }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update feedback: ${response.status}`);
    }

    return (await response.json()) as FeedbackResponse; // Server validates via Zod
  }

  async deleteFeedback(id: string): Promise<void> {
    const response = await resilientFetch(this.endpoint, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, projectName: this.projectName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete feedback: ${response.status}`);
    }
  }

  async deleteAllFeedbacks(projectName: string): Promise<void> {
    const response = await resilientFetch(this.endpoint, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName, deleteAll: true }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete all feedbacks: ${response.status}`);
    }
  }
}
