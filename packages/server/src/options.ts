import type { SitepingStore } from "@siteping/core";
import type { WebhookConfig } from "./webhooks.js";

/** HTTP methods served by `createSitepingHandler`. */
export type SitepingHttpMethod = "GET" | "POST" | "PATCH" | "DELETE" | "OPTIONS";

/** Where the handler reports unexpected failures. Defaults to `console.error`. */
export interface SitepingLogger {
  error(message: string, context: Record<string, unknown>): void;
}

/** Options of `createSitepingHandler`. */
export interface SitepingHandlerOptions {
  /** Persistence backend — any `SitepingStore` (Prisma, Drizzle, memory, your own). */
  store: SitepingStore;
  /**
   * Shared secret expected as `Authorization: Bearer {apiKey}`.
   *
   * - **When set:** every request not listed in `publicEndpoints` must include
   *   it. Requests without a valid token receive a 401 Unauthorized response.
   * - **When not set:** the API is public — anyone can create and read
   *   feedbacks, and update or delete them once `requireAuthForDestructive`
   *   is turned off.
   * - **Recommendation:** always set `apiKey` in production environments.
   */
  apiKey?: string | undefined;
  /**
   * HTTP methods that don't require API key authentication.
   * Defaults to `['POST', 'OPTIONS']` when `apiKey` is set — POST must stay open
   * because the browser widget submits feedback from unauthenticated contexts.
   */
  publicEndpoints?: ReadonlyArray<SitepingHttpMethod>;
  /**
   * Whether destructive endpoints (DELETE, PATCH) require `apiKey`.
   *
   * Defaults to `true` and intentionally cannot be disabled in production:
   * - `NODE_ENV === "production"` without `apiKey` throws at startup. The
   *   factory refuses to return an unauthenticated destructive surface.
   * - `NODE_ENV !== "production"` without `apiKey` keeps the handler running
   *   for local dev/tests, but DELETE/PATCH return 401 until you set
   *   `apiKey` or explicitly opt out with `requireAuthForDestructive: false`.
   *
   * Set to `false` only when you wrap the handler in your own auth
   * middleware (session, OAuth, etc.) and want SitePing to stay open.
   */
  requireAuthForDestructive?: boolean;
  /**
   * Blank `authorEmail` in GET/PATCH responses to requests that do not carry
   * a valid `Authorization: Bearer <apiKey>` header. Defaults to `true`:
   * reviewer emails are PII and the widget needs GET to be reachable, so an
   * unauthenticated response must not enumerate them (issue #105).
   *
   * Set to `false` ONLY when the handler sits behind your own auth layer
   * that covers GET as well (e.g. `requireAuthForDestructive: false` behind
   * session middleware) — the handler cannot see that layer, and without it
   * every visitor who can reach the endpoint can read reviewer emails.
   * `clientId` is stripped from responses regardless of this option.
   */
  redactUnauthenticatedEmails?: boolean;
  /**
   * Allowed CORS origins (exact match) — when set, only these origins get CORS
   * headers. When unset, no CORS headers are emitted and browsers block
   * cross-origin widgets.
   */
  allowedOrigins?: ReadonlyArray<string> | undefined;
  /**
   * Outgoing webhooks fired after a feedback is successfully persisted.
   *
   * Pass a single config or an array — every entry receives a POST with a
   * type-specific payload (Slack, Discord, or generic JSON). Dispatch is
   * fire-and-forget: the HTTP response is returned to the widget before
   * webhook delivery completes, so a slow receiver never blocks the client.
   * Provide `onError` on each config to observe failures.
   */
  webhooks?: WebhookConfig | ReadonlyArray<WebhookConfig>;
  /** Where unexpected failures are reported. Defaults to `console.error`. */
  logger?: SitepingLogger;
  /**
   * Map an unexpected failure to the `error` string sent to the client.
   * Return `undefined` for the default (`"Internal server error"`). Store
   * adapters use it for setup hints (e.g. "table not found, run migrations");
   * never return the failure's own details, which may leak internals.
   */
  describeError?(error: unknown): string | undefined;
}

/**
 * Object returned by `createSitepingHandler` — one handler per HTTP method.
 */
export interface SitepingHandler {
  OPTIONS: (request: Request) => Response;
  POST: (request: Request) => Promise<Response>;
  GET: (request: Request) => Promise<Response>;
  PATCH: (request: Request) => Promise<Response>;
  DELETE: (request: Request) => Promise<Response>;
}
