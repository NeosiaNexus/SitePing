import {
  type AnnotationPayload,
  type CommentCreateInput,
  type CommentResponse,
  errorFromResponse,
  type FeedbackPayload,
  type FeedbackQuery,
  type FeedbackResponse,
  type FeedbackResponseList,
  feedbackQueryToSearchParams,
  hasOwn,
  mergeRequestHeaders,
  networkErrorFromException,
  type Prettify,
  SitepingAuthError,
  SitepingError,
  type SitepingHeadersOption,
  type SitepingIdentity,
  SitepingNetworkError,
  withSearchParams,
} from "@siteping/core";
import { ownFeedback } from "./own-feedback.js";

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
  /** Post a reply on a feedback's thread — idempotent on `input.clientId`, so a resend never duplicates it. */
  addComment(feedbackId: string, input: CommentCreateInput): Promise<CommentResponse>;
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

const MAX_RETRIES = 3;
const TIMEOUT_MS = 10_000;
/**
 * Longest `Retry-After` waited out while a call is in flight (the popup holds
 * the visitor meanwhile). A longer one ends the retries at once: a send is
 * queued for the next page load, a read or a reply reports its error.
 */
const MAX_RETRY_AFTER_MS = 10_000;
/**
 * A project delete can legitimately run long — an issue tracker closing each
 * issue, a screenshot store emptying its objects (#413) — so it gets its own
 * window, and is never sent again after it: the server may still be running
 * the first request.
 */
const DELETE_ALL_TIMEOUT_MS = 60_000;
const RETRY_QUEUE_KEY = "siteping_retry_queue";
const MAX_QUEUE_SIZE = 20;

/**
 * Settle like `promise`, or reject with `onTimeout()` once `ms` elapse; the
 * timer is cleared either way. The underlying work is not cancelled — use it
 * where nothing can abort the call (a store write, a host headers factory).
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(onTimeout()), ms);
  });
  return Promise.race([promise, expired]).finally(() => clearTimeout(timer));
}

/**
 * Build the headers for one request: `Content-Type` when the request
 * carries a JSON body, then `Bearer` from `apiKey`, then `headers` merged on
 * top case-insensitively, so an explicit `Authorization` in any casing wins.
 *
 * A function `headers` resolves once per call — retries inside
 * `resilientFetch` reuse the values for the whole retry sequence. A factory
 * that throws, rejects, or does not settle within 10 s fails the request
 * like a network error — nothing may hold a send forever.
 */
export async function buildRequestHeaders(auth: ApiClientAuth, json: boolean): Promise<Record<string, string>> {
  const defaults: Record<string, string> = {};
  if (json) defaults["Content-Type"] = "application/json";
  if (auth.apiKey) defaults.Authorization = `Bearer ${auth.apiKey}`;
  const extra =
    typeof auth.headers === "function"
      ? await withTimeout(
          Promise.resolve(auth.headers()),
          TIMEOUT_MS,
          () => new Error(`headers factory did not settle within ${TIMEOUT_MS / 1000} s`),
        )
      : auth.headers;
  return mergeRequestHeaders(defaults, extra);
}

// ---------------------------------------------------------------------------
// Core fetch with retry + exponential backoff + jitter
// ---------------------------------------------------------------------------

/**
 * One HTTP call with retry + exponential backoff + jitter: each attempt is
 * aborted if its headers take more than TIMEOUT_MS. Network failures and
 * transient statuses (5xx, 408, 429) retry, after the response's
 * `Retry-After` when it sets one; the final response is read through
 * `errorFromResponse` for a non-OK status, `read` for a 2xx.
 *
 * With `boundBody` (the send path, #342), the body gets its own TIMEOUT_MS
 * window under the same abort, so one that stalls after the headers errors
 * instead of holding the popup forever — a non-OK status still maps to its
 * typed error, just without the server's detail. Reads leave it unbounded:
 * a page of inline screenshots can legitimately take longer on a slow link.
 *
 * `timeoutMs` widens each attempt's window, and `resendOnTimeout: false`
 * stops at an attempt that timed out instead of sending it again: a request
 * the server may still be running must not start twice. Network failures
 * before an answer and transient statuses keep their retries.
 *
 * Failures come out typed: a non-OK status as `errorFromResponse` maps it,
 * anything else (fetch, abort, body read or parse) as a `SitepingNetworkError`.
 */
async function resilientFetch<T>(
  url: string,
  init: RequestInit,
  label: string,
  read: (response: Response) => Promise<T>,
  { boundBody = false, timeoutMs = TIMEOUT_MS, resendOnTimeout = true } = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    let timeout = setTimeout(() => controller.abort(), timeoutMs);
    let delay: number;
    try {
      const response = await fetch(url, { ...init, signal: controller.signal }).catch((error: unknown) => {
        if (attempt === MAX_RETRIES || (!resendOnTimeout && controller.signal.aborted)) {
          throw networkErrorFromException(error, label);
        }
        return null;
      });
      delay = retryDelay(response, attempt);
      // A non-transient status is the server's answer (a 2xx, or a verdict
      // like a 400) — final, like the last attempt or a wait too long to hold.
      if (response && (!isTransientStatus(response.status) || attempt === MAX_RETRIES || delay > MAX_RETRY_AFTER_MS)) {
        clearTimeout(timeout);
        if (boundBody) timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        if (!response.ok) throw await errorFromResponse(response, label);
        return await read(response).catch((error: unknown) => {
          throw networkErrorFromException(error, label);
        });
      }
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((r) => setTimeout(r, delay));
  }
}

/**
 * Wait before retrying a failed attempt: the response's `Retry-After`
 * (delta-seconds or an HTTP date) when it holds a valid one, otherwise
 * exponential backoff with jitter — 1 s, 2 s, 4 s, ±500 ms.
 */
function retryDelay(response: Response | null, attempt: number): number {
  const header = response?.headers.get("Retry-After");
  const wait = header ? (/^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header) - Date.now()) : Number.NaN;
  return Number.isNaN(wait) ? 1000 * 2 ** attempt + Math.random() * 1000 - 500 : Math.max(0, wait);
}

// ---------------------------------------------------------------------------
// Retry queue — persist failed feedbacks for retry on next page load
// ---------------------------------------------------------------------------

interface RetryEntry {
  endpoint: string;
  payload: FeedbackPayload;
}

/**
 * Whether a failed submission is worth replaying later. Network failures,
 * server errors (5xx), timeouts (408) and rate limits (429) are transient —
 * the same payload can succeed once the server is back or has waited. Any
 * other 4xx is the server's verdict on the payload itself (validation, auth,
 * size…): replaying it verbatim fails identically every time, so it is
 * surfaced to the host through `onError` and never queued — a queued
 * rejection used to be replayed, and rejected, on every page load.
 */
function isTransientFailure(error: unknown): boolean {
  return error instanceof SitepingNetworkError || (error instanceof SitepingError && error.code === "SERVER");
}

/** Same verdict from a status: retried in flight, kept queued for the next flush — the rest is final. */
function isTransientStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
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
 * catch. Bad entries are dropped individually instead. The author fields are
 * checked because the flush itself reads them (identity match); anything
 * else wrong with a payload is the server's verdict (4xx → dropped).
 */
function isRetryEntry(value: unknown): value is RetryEntry {
  if (!hasOwn(value, "endpoint") || typeof value.endpoint !== "string" || !hasOwn(value, "payload")) return false;
  const { payload } = value;
  return (
    hasOwn(payload, "authorName") &&
    typeof payload.authorName === "string" &&
    hasOwn(payload, "authorEmail") &&
    typeof payload.authorEmail === "string"
  );
}

function readQueue(): RetryEntry[] {
  const raw = localStorage.getItem(RETRY_QUEUE_KEY);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // The widget only ever writes JSON.stringify output here, so an external
    // writer put this value in place. Nothing in it can be replayed; clear it
    // so the queue works again instead of every write failing on this parse.
    localStorage.removeItem(RETRY_QUEUE_KEY);
    console.warn(`[siteping] discarded an unreadable retry queue from localStorage (${raw.length} chars)`);
    return [];
  }
  return Array.isArray(parsed) ? parsed.filter(isRetryEntry) : [];
}

function queueForRetry(endpoint: string, payload: FeedbackPayload): void {
  // Fire-and-forget — we don't want to block the caller on the lock
  void withRetryLock(() => {
    try {
      // A resend from the same popup reuses its clientId: replace the earlier
      // attempt so the replay carries the latest edit (the server's clientId
      // dedupe would otherwise keep the stale first one).
      const queue = readQueue().filter((entry) => entry.payload.clientId !== payload.clientId);

      // Cap queue size to prevent unbounded localStorage growth
      if (queue.length >= MAX_QUEUE_SIZE) {
        queue.shift(); // Drop oldest entry
      }

      queue.push({ endpoint, payload });
      if (tryWriteQueue(queue)) return;

      // Quota exceeded: screenshots (base64 JPEG data URLs) dominate each
      // entry, and up to MAX_QUEUE_SIZE entries share the origin's ~5 MB
      // localStorage budget with the host page. Shed screenshots (the
      // heaviest, least essential part of a replay) one at a time, oldest
      // first like the eviction above, so no more are lost than the quota
      // requires; the message, annotations and diagnostics still replay.
      // If even the screenshot-free queue does not fit, evict the oldest
      // entries.
      const kept = queue.slice();
      let stripped = 0;
      for (const [index, entry] of kept.entries()) {
        if (!hasScreenshot(entry)) continue;
        kept[index] = withoutScreenshot(entry);
        stripped += 1;
        if (tryWriteQueue(kept)) {
          console.warn(
            `[siteping] retry queue exceeded the localStorage quota — dropped the screenshot of ${stripped} of ${queue.length} queued feedback(s)`,
          );
          return;
        }
      }
      while (kept.length > 1) {
        kept.shift();
        if (tryWriteQueue(kept)) {
          const dropped = queue.length - kept.length;
          const lost = queue.slice(dropped).filter(hasScreenshot).length;
          console.warn(
            `[siteping] retry queue exceeded the localStorage quota — dropped the ${dropped} oldest of ${queue.length} queued feedback(s)${lost > 0 ? `, and the screenshot of ${lost} of the rest` : ""}`,
          );
          return;
        }
      }
      // Every write failed, so the queue already stored is left as it was.
      console.warn("[siteping] feedback could not be queued for retry — localStorage is full or unavailable");
    } catch {
      // localStorage unavailable — the new entry is dropped
    }
  });
}

/**
 * Drop the queued attempt of a feedback that has just landed (a resend from
 * the same popup, same clientId), so the next page load does not re-POST a
 * payload of up to ~1.5 MB only for the server to dedupe it.
 */
function unqueue(clientId: string): void {
  void withRetryLock(() => {
    try {
      const queue = readQueue();
      const remaining = queue.filter((entry) => entry.payload.clientId !== clientId);
      if (remaining.length === queue.length) return;
      if (remaining.length > 0) localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(remaining));
      else localStorage.removeItem(RETRY_QUEUE_KEY);
    } catch {
      // localStorage unavailable — a replay of the queued copy is deduped server-side
    }
  });
}

function tryWriteQueue(queue: RetryEntry[]): boolean {
  try {
    localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

function hasScreenshot(entry: RetryEntry): boolean {
  return entry.payload.screenshotDataUrl != null;
}

/** Replay copy without the screenshot; its region is meaningless without the image. */
function withoutScreenshot(entry: RetryEntry): RetryEntry {
  const { screenshotDataUrl: _screenshotDataUrl, screenshotRegion: _screenshotRegion, ...payload } = entry.payload;
  return { endpoint: entry.endpoint, payload };
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
  currentIdentity?: SitepingIdentity | null,
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
      let rejected = 0;
      if (toRetry.length > 0) {
        const headers = await buildRequestHeaders(auth, true);
        for (const entry of toRetry) {
          // Same bound as a live send's attempt: the replay holds the
          // cross-tab lock, so one that never answers would block every
          // later queueing on this origin.
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
          try {
            const res = await fetch(endpoint, {
              method: "POST",
              headers,
              body: JSON.stringify(entry.payload),
              signal: controller.signal,
            });
            if (res.ok) {
              // Sent from this browser after all: the panel's "Mine" filter lists it
              const created: unknown = await res.json().catch(() => null);
              if (hasOwn(created, "id") && typeof created.id === "string") {
                ownFeedback(entry.payload.projectName, endpoint).add(created.id);
              }
              continue;
            }
            if (isTransientStatus(res.status)) failed.push(entry);
            else rejected += 1;
          } catch {
            failed.push(entry);
          } finally {
            clearTimeout(timeout);
          }
        }
      }

      if (rejected > 0) {
        console.warn(
          `[siteping] flushRetryQueue: dropped ${rejected} queued feedback(s) the server rejected (4xx) — they would fail identically on every replay`,
        );
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

/** The span `[start, start + size]` intersected with [0, 1], as `[start, size]`; one already inside comes back as is. */
function clipSpan(start: number, size: number): [number, number] {
  const from = Math.min(1, Math.max(0, start));
  const trimmed = size - (from - start);
  return [from, Math.max(0, from + trimmed <= 1 ? trimmed : 1 - from)];
}

/**
 * The annotation with its rect intersected with the anchor box: the server
 * schema rejects any rect field outside [0, 1], and the `document.body`
 * fallback anchor may not contain a rect drawn in blank page space (a short
 * body, its default margin). A rect fully outside collapses onto the nearest
 * edge rather than losing the feedback. Store mode has no such schema and
 * keeps the rect as drawn — markers extrapolate past the anchor box.
 */
function clipRectToAnchor(annotation: AnnotationPayload): AnnotationPayload {
  const [xPct, wPct] = clipSpan(annotation.rect.xPct, annotation.rect.wPct);
  const [yPct, hPct] = clipSpan(annotation.rect.yPct, annotation.rect.hPct);
  return { ...annotation, rect: { xPct, yPct, wPct, hPct } };
}

/** Parse a JSON body and assert its TypeScript shape — server-side Zod is the source of truth. */
async function parseJsonAs<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

/** DELETE responses carry nothing the client needs. */
async function ignoreBody(): Promise<void> {}

export class ApiClient implements WidgetClient {
  /** Whether the console already explained a refused list (see `getFeedbacks`). */
  private listRefusalExplained = false;

  constructor(
    private readonly endpoint: string,
    private readonly projectName: string,
    private readonly auth: ApiClientAuth = {},
  ) {}

  /** `buildRequestHeaders`, with a failing headers factory normalised to a `SitepingNetworkError`. */
  private async headers(json: boolean, label: string): Promise<Record<string, string>> {
    try {
      return await buildRequestHeaders(this.auth, json);
    } catch (error) {
      throw networkErrorFromException(error, label);
    }
  }

  async sendFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
    const label = "Failed to send feedback";
    // Only put `screenshotRegion` on the wire when a region was actually
    // captured — servers that predate the field would otherwise reject an
    // explicit `screenshotRegion: null` on every legacy capture.
    const { screenshotRegion, ...rest } = payload;
    const wire = { ...rest, annotations: rest.annotations.map(clipRectToAnchor) };
    const body: FeedbackPayload = screenshotRegion ? { ...wire, screenshotRegion } : wire;
    try {
      const created = await resilientFetch(
        this.endpoint,
        { method: "POST", headers: await this.headers(true, label), body: JSON.stringify(body) },
        label,
        parseJsonAs<FeedbackResponse>,
        { boundBody: true },
      );
      unqueue(body.clientId);
      return created;
    } catch (error) {
      // Queue the wire shape (region stripped when absent) so a later
      // flushRetryQueue replays exactly what a fresh POST would send — but
      // only when a replay can succeed (see `isTransientFailure`).
      if (isTransientFailure(error)) queueForRetry(this.endpoint, body);
      throw error;
    }
  }

  async getFeedbacks(projectName: string, options?: GetFeedbacksOptions): Promise<FeedbackResponseList> {
    const label = "Failed to fetch feedbacks";
    const params = feedbackQueryToSearchParams({ projectName, ...options });
    // GET carries no body — only attach headers when auth produced some, so
    // the no-auth wire shape stays byte-identical to the legacy client.
    const headers = await this.headers(false, label);
    return resilientFetch(
      withSearchParams(this.endpoint, params),
      { method: "GET", cache: "no-store", ...(Object.keys(headers).length > 0 ? { headers } : {}) },
      label,
      parseJsonAs<FeedbackResponseList>,
    ).catch((error: unknown) => {
      // With an `apiKey`, the server keeps GET behind it by default (#280): a
      // key-less widget submits fine but never shows a pin, with nothing on
      // screen to say why. Say it in the console, once per client.
      if (error instanceof SitepingAuthError && !this.listRefusalExplained) {
        this.listRefusalExplained = true;
        console.warn(
          `[siteping] Feedback list refused (${error.status}): with an apiKey, GET needs it unless publicEndpoints includes "GET"; pins and panel stay empty. https://siteping.dev/docs/server#the-security-model-honestly`,
        );
      }
      throw error;
    });
  }

  async addComment(feedbackId: string, input: CommentCreateInput): Promise<CommentResponse> {
    const label = "Failed to post comment";
    // The same endpoint as a feedback: `feedbackId` routes the POST to the
    // thread. Retries resend the same clientId, which the server dedupes.
    return resilientFetch(
      this.endpoint,
      {
        method: "POST",
        headers: await this.headers(true, label),
        body: JSON.stringify({ ...input, projectName: this.projectName, feedbackId }),
      },
      label,
      parseJsonAs<CommentResponse>,
      { boundBody: true },
    );
  }

  async resolveFeedback(id: string, resolved: boolean): Promise<FeedbackResponse> {
    const label = "Failed to update feedback";
    return resilientFetch(
      this.endpoint,
      {
        method: "PATCH",
        headers: await this.headers(true, label),
        body: JSON.stringify({ id, projectName: this.projectName, status: resolved ? "resolved" : "open" }),
      },
      label,
      parseJsonAs<FeedbackResponse>,
    );
  }

  async deleteFeedback(id: string): Promise<void> {
    const label = "Failed to delete feedback";
    await resilientFetch(
      this.endpoint,
      {
        method: "DELETE",
        headers: await this.headers(true, label),
        body: JSON.stringify({ id, projectName: this.projectName }),
      },
      label,
      ignoreBody,
    );
  }

  async deleteAllFeedbacks(projectName: string): Promise<void> {
    const label = "Failed to delete all feedbacks";
    await resilientFetch(
      this.endpoint,
      {
        method: "DELETE",
        headers: await this.headers(true, label),
        body: JSON.stringify({ projectName, deleteAll: true }),
      },
      label,
      ignoreBody,
      { timeoutMs: DELETE_ALL_TIMEOUT_MS, resendOnTimeout: false },
    );
  }
}
