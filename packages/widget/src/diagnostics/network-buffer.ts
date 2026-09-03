/**
 * Network buffer — capture the last N failed `fetch` / `XMLHttpRequest`
 * calls (HTTP >= 400 or network error) so they ship with each feedback.
 *
 * Captures only failures because:
 *  - successful requests are usually irrelevant for the "this thing is
 *    broken" workflow,
 *  - keeping the volume tiny means we can ship the full payload to the
 *    server without bloating Postgres.
 *
 * Both wrappers preserve the original semantics — return values, throws,
 * AbortController behaviour, etc. The only side effect is recording a
 * `NetworkEntry` on failure.
 */

const DEFAULT_MAX_ENTRIES = 20;
const MAX_URL_LENGTH = 2000;

/** Per-entry shape — sent to the server in the diagnostics payload. */
export interface NetworkEntry {
  url: string;
  method: string;
  /** HTTP status or 0 when the request never reached the server (network error / CORS / abort). */
  status: number;
  /** End-to-end duration in ms, rounded to the nearest integer. */
  durationMs: number;
  /** ISO 8601 timestamp at the moment the request was initiated. */
  timestamp: string;
}

function truncateUrl(url: string): string {
  if (url.length <= MAX_URL_LENGTH) return url;
  return `${url.slice(0, MAX_URL_LENGTH - 1)}…`;
}

function urlString(input: unknown): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  // `Request` instances expose `.url`
  if (typeof input === "object" && input !== null && "url" in (input as { url?: unknown })) {
    const candidate = (input as { url?: unknown }).url;
    if (typeof candidate === "string") return candidate;
  }
  try {
    return String(input);
  } catch {
    return "(unknown)";
  }
}

/**
 * Bounded ring buffer of failed network requests.
 *
 * Construction monkey-patches `globalThis.fetch` and `XMLHttpRequest` and
 * stores the originals for `dispose()`. Wrappers are designed so that
 * multiple instances can coexist (each captures independently into its own
 * buffer, and the last one disposed restores the chain correctly via the
 * stored originals).
 */
export class NetworkBuffer {
  private readonly maxEntries: number;
  private readonly entries: NetworkEntry[] = [];
  private originalFetch: typeof fetch | null = null;
  private originalXhrOpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXhrSend: typeof XMLHttpRequest.prototype.send | null = null;
  /** The wrappers we installed — `dispose()` only restores when they are still in place. */
  private wrappedFetch: typeof fetch | null = null;
  private wrappedXhrOpen: typeof XMLHttpRequest.prototype.open | null = null;
  private wrappedXhrSend: typeof XMLHttpRequest.prototype.send | null = null;
  private disposed = false;

  constructor(maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = Math.min(Math.max(Math.floor(maxEntries), 0), 500);
    this.installFetch();
    this.installXhr();
  }

  private push(entry: NetworkEntry): void {
    if (this.maxEntries === 0) return;
    if (this.entries.length >= this.maxEntries) {
      this.entries.shift();
    }
    this.entries.push(entry);
  }

  private installFetch(): void {
    if (typeof globalThis.fetch !== "function") return;
    const original = globalThis.fetch;
    this.originalFetch = original;

    const wrapped: typeof fetch = async (input, init) => {
      const startedAt = new Date();
      const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
      const url = truncateUrl(urlString(input));
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

      try {
        const response = await original(input, init);
        if (!response.ok) {
          const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
          this.push({
            url,
            method,
            status: response.status,
            durationMs: Math.round(t1 - t0),
            timestamp: startedAt.toISOString(),
          });
        }
        return response;
      } catch (err) {
        const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
        this.push({
          url,
          method,
          status: 0,
          durationMs: Math.round(t1 - t0),
          timestamp: startedAt.toISOString(),
        });
        throw err;
      }
    };

    this.wrappedFetch = wrapped;
    globalThis.fetch = wrapped;
  }

  private installXhr(): void {
    if (typeof XMLHttpRequest === "undefined") return;
    const proto = XMLHttpRequest.prototype;
    const originalOpen = proto.open;
    const originalSend = proto.send;
    this.originalXhrOpen = originalOpen;
    this.originalXhrSend = originalSend;
    const buffer = this;

    // Store the open metadata on the XHR instance via a side-channel WeakMap
    // so each request is fully isolated even with concurrent opens.
    const meta = new WeakMap<XMLHttpRequest, { method: string; url: string; startedAt: Date; t0: number }>();

    const wrappedOpen = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
      try {
        meta.set(this, {
          method: method.toUpperCase(),
          url: truncateUrl(urlString(url)),
          startedAt: new Date(),
          t0: typeof performance !== "undefined" ? performance.now() : Date.now(),
        });
      } catch {
        // Ignore — metadata is best-effort, the underlying open() still runs.
      }
      // XHR.open has two overloaded signatures (3-arg sync, 5-arg async with
      // user/password). Cast to a loose function shape to forward every arg
      // without re-enumerating the overloads here.
      const looseOpen = originalOpen as unknown as (this: XMLHttpRequest, ...a: unknown[]) => void;
      return looseOpen.call(this, method, url, ...rest);
    } as typeof proto.open;

    const wrappedSend = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
      const info = meta.get(this);
      if (info) {
        // `loadend` fires for both success and failure — we just inspect the
        // status to decide whether to log. Use `once: true` so a re-sent XHR
        // doesn't accumulate listeners.
        const onEnd = () => {
          try {
            const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
            const status = this.status; // 0 on network error / abort
            if (status === 0 || status >= 400) {
              buffer.push({
                url: info.url,
                method: info.method,
                status,
                durationMs: Math.round(t1 - info.t0),
                timestamp: info.startedAt.toISOString(),
              });
            }
          } catch {
            // Listener must not throw — would surface as an "Uncaught" in
            // the host's console and pollute their logs.
          }
        };
        try {
          this.addEventListener("loadend", onEnd, { once: true });
        } catch {
          // Older engines without options object — fall back to plain listener.
          try {
            this.addEventListener("loadend", onEnd);
          } catch {
            // No-op
          }
        }
      }
      return originalSend.call(this, body ?? null);
    } as typeof proto.send;

    this.wrappedXhrOpen = wrappedOpen;
    this.wrappedXhrSend = wrappedSend;
    proto.open = wrappedOpen;
    proto.send = wrappedSend;
  }

  /** Snapshot of captured entries — returns a new array each call. */
  getEntries(): NetworkEntry[] {
    return this.entries.slice();
  }

  /**
   * Restore the original fetch + XHR methods. Idempotent.
   *
   * Each global is restored only if our wrapper is still the one installed —
   * if another library (an error tracker, a RUM agent) wrapped on top of us
   * after init, writing the original back would silently rip its wrapper
   * out. Our patch then stays in the chain but is inert: it still forwards to
   * the original, and a disposed buffer merely records entries nobody reads.
   * Same rule the launcher applies to the History API.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (this.originalFetch && globalThis.fetch === this.wrappedFetch) {
      try {
        globalThis.fetch = this.originalFetch;
      } catch {
        // Best-effort
      }
    }
    if (typeof XMLHttpRequest !== "undefined") {
      try {
        const proto = XMLHttpRequest.prototype;
        if (this.originalXhrOpen && proto.open === this.wrappedXhrOpen) proto.open = this.originalXhrOpen;
        if (this.originalXhrSend && proto.send === this.wrappedXhrSend) proto.send = this.originalXhrSend;
      } catch {
        // Best-effort
      }
    }
  }
}
