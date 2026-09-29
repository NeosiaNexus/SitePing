import type { CommentCreateInput, FeedbackCreateInput, FeedbackRecord, SitepingStore } from "@siteping/core";
import type { WebhookConfig } from "./webhooks.js";

/** HTTP methods served by `createSitepingHandler`. */
export type SitepingHttpMethod = "GET" | "POST" | "PATCH" | "DELETE" | "OPTIONS";

/** What a request does, as `SitepingAccessControl.authorize` sees it. */
export type SitepingAction = "create" | "list" | "update" | "delete" | "deleteAll" | "createComment" | "deleteComment";

/** The request being served, and who sent it. */
export interface SitepingRequestContext<Principal> {
  request: Request;
  /** Whoever `access.authenticate` resolved — always `null` under the `apiKey` policy. */
  principal: Principal;
}

/** What `SitepingAccessControl.authorize` decides about. */
export interface SitepingAuthorizationContext<Principal> extends SitepingRequestContext<Principal> {
  action: SitepingAction;
  /** Project the request targets: the body's for writes, the query's for reads. */
  projectName: string;
  /** Target record of `update` and `delete`; the feedback whose thread `createComment` and `deleteComment` target. */
  feedbackId?: string;
  /**
   * Target comment of `deleteComment` — absent on a `dryRun`, whose answer
   * covers the feedback's whole thread.
   */
  commentId?: string;
  /**
   * `true` when nothing is being done: the handler fills in the
   * `permissions` of a response — see `SitepingAccessControl.authorize`.
   * `request` is then the response's own (a `GET`, `POST` or `PATCH`),
   * whatever `action` asks about: decide by `action`, not `request.method`.
   */
  dryRun?: boolean;
}

/**
 * Who `access.authenticate` may resolve: a user object, an id, a token's
 * claims. Never a boolean — a `false` check would read as a signed-in caller.
 */
export type SitepingPrincipal = object | string | number;

/**
 * A custom access policy — sessions, JWTs, roles — resolved from the standard
 * `Request` (a cookie, a header, a proxy identity…), in place of `apiKey`.
 *
 * - `authenticate` resolving a falsy value (`null`, `undefined`, `""`, `0`,
 *   or `false` from plain JavaScript) → 401, on every method but `OPTIONS`.
 * - `authorize` resolving `false` → 403. Defaults to allowing every
 *   authenticated principal. When set, the store must implement
 *   `verifyProjectOwnership`: PATCH/DELETE address records by id, and the
 *   check is what binds the authorized `projectName` to the record. It is
 *   also asked, with `dryRun: true`, to fill in the `permissions` of every
 *   feedback a response carries — `update`, `delete`, `createComment` and
 *   `deleteComment` (without a `commentId`) per feedback, plus `deleteAll`
 *   once per list — so clients hide what it would refuse. A dry run that
 *   throws refuses that permission (logged) rather than failing the
 *   response. Keep it fast: a page of 50 feedbacks takes 201 dry runs, 8
 *   at a time, sharing the one `request` — cache lookups per request. That
 *   request is the response's whatever the action, and `authenticate` is
 *   not asked again: a principal it admits on some methods only needs
 *   `authorize` to refuse it the other actions.
 * - `canReadAuthorEmail` decides whether responses include `authorEmail`
 *   (reviewer PII), on feedbacks and their comments — the list, the PATCH
 *   answer and the POST answer alike. Only `true` includes it: without the
 *   callback, every response blanks it. A policy that serves anonymous
 *   visitors resolves a principal for them too, so being authenticated says
 *   nothing about who may read reviewers' emails.
 * - `canCommentAsTeam` decides whether a comment that asks for the `team`
 *   role keeps it; otherwise it is stamped `client`. Defaults to the
 *   principal's `canReadAuthorEmail` answer (whoever may read reviewer
 *   emails is on the project side), so a policy that sets neither never
 *   lets a caller speak as the team.
 *
 * A throw from any of them answers a logged 500.
 */
export interface SitepingAccessControl<Principal extends SitepingPrincipal> {
  authenticate(request: Request): Principal | null | undefined | Promise<Principal | null | undefined>;
  authorize?(context: SitepingAuthorizationContext<Principal>): boolean | Promise<boolean>;
  canReadAuthorEmail?(principal: Principal): boolean | Promise<boolean>;
  canCommentAsTeam?(principal: Principal): boolean | Promise<boolean>;
}

/**
 * What a DELETE removes: one record, or a whole project (`deleteAll`) —
 * never a comment, whose deletion runs no hook.
 */
export type SitepingDeletionTarget =
  | { kind: "single"; id: string; projectName: string }
  | { kind: "project"; projectName: string };

/**
 * Side effects around persistence — issue trackers, chat notifications,
 * search indexes, audit logs. Hooks receive the stored record, `clientId` and
 * `authorEmail` included.
 *
 * `onCreated`, `onUpdated` and `onDeleted` are awaited before the response
 * (so serverless runtimes do not freeze them mid-flight); a throw is logged
 * and never fails the request — the write already happened. `onCreated`
 * runs once per inserted feedback, never for a replayed `clientId`.
 * `onDeleting` runs before the delete: throw to abort it (the record is kept
 * and the request answers 502), e.g. when a resource tied to the feedback
 * could not be cleaned up and the delete must be retried.
 */
export interface SitepingLifecycleHooks<Principal> {
  onCreated?(feedback: FeedbackRecord, context: SitepingRequestContext<Principal>): void | Promise<void>;
  onUpdated?(feedback: FeedbackRecord, context: SitepingRequestContext<Principal>): void | Promise<void>;
  onDeleting?(target: SitepingDeletionTarget, context: SitepingRequestContext<Principal>): void | Promise<void>;
  onDeleted?(target: SitepingDeletionTarget, context: SitepingRequestContext<Principal>): void | Promise<void>;
}

/**
 * Where the handler reports unexpected failures. Defaults to `console.error`.
 * A logger that throws, or returns a promise that rejects (a log shipper
 * down), falls back to `console.error`: it never fails the request, nor
 * leaves a rejection unhandled.
 *
 * The arguments come in console's and winston's order. pino's `error` takes
 * the context first and type-checks here anyway, then drops the context:
 * adapt it — `{ error: (message, { error, ...context }) => log.error({ err: error, ...context }, message) }`.
 */
export interface SitepingLogger {
  error(message: string, context: Record<string, unknown>): void | Promise<void>;
}

/** Options shared by both access policies. */
export interface SitepingHandlerBaseOptions<Principal> {
  /** Persistence backend — any `SitepingStore` (Prisma, Drizzle, memory, your own). */
  store: SitepingStore;
  /**
   * Allowed CORS origins (exact match) — when set, only these origins get CORS
   * headers. When unset, no CORS headers are emitted and browsers block
   * cross-origin widgets. Under `access`, it also bounds which origins may
   * send POST/PATCH/DELETE.
   */
  allowedOrigins?: ReadonlyArray<string> | undefined;
  /**
   * Largest request body accepted, in bytes — 4 MiB by default, twice the
   * largest submission the validation accepts. A longer body answers 413:
   * refused on its `Content-Length`, or once that many bytes have streamed
   * in, before any of it is parsed.
   */
  maxBodyBytes?: number | undefined;
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
  /**
   * Hand the webhook deliveries to the runtime, which may otherwise freeze
   * or cancel them once the response is sent (serverless functions, edge
   * workers): Next.js `after`, `waitUntil` from `@vercel/functions` or from
   * `cloudflare:workers` — a standalone function, not an unbound method.
   * Called once per notified feedback with a promise that never rejects; a
   * throw is logged and the delivery still runs.
   */
  waitUntil?: ((promise: Promise<unknown>) => void) | undefined;
  /**
   * Rewrite the validated input before it is stored: impose the project or
   * the author from the session, redact secrets from free text, drop fields
   * you do not keep. Runs before `access.authorize`, which sees the effective
   * `projectName`. A throw answers a logged 500 and stores nothing.
   */
  beforeCreate?(
    input: FeedbackCreateInput,
    context: SitepingRequestContext<Principal>,
  ): FeedbackCreateInput | Promise<FeedbackCreateInput>;
  /**
   * Rewrite a validated comment before it is stored, as `beforeCreate` does
   * a feedback: the author's name and email are what the request sends
   * until this imposes them from the session. Runs once the comment is
   * authorized and its feedback found. The `team` role is kept only when
   * the access policy vouches for the caller, whatever this returns. A
   * throw answers a logged 500 and stores nothing.
   */
  beforeComment?(
    input: CommentCreateInput,
    context: SitepingRequestContext<Principal>,
  ): CommentCreateInput | Promise<CommentCreateInput>;
  /**
   * Transform each record right before it is serialized in a response, e.g.
   * read-time redaction. `clientId` is stripped, and `authorEmail` blanked
   * when the requester may not read it, afterwards — on the record and on
   * each comment of its thread.
   */
  presentFeedback?(feedback: FeedbackRecord, context: SitepingRequestContext<Principal>): FeedbackRecord;
  /** Lifecycle side effects — see `SitepingLifecycleHooks`. */
  hooks?: SitepingLifecycleHooks<Principal>;
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

/** The built-in shared-secret policy — `adapter-prisma`'s historical behaviour. */
export interface SitepingApiKeyHandlerOptions extends SitepingHandlerBaseOptions<null> {
  /**
   * Shared secret expected as `Authorization: Bearer {apiKey}`.
   *
   * - **When set:** every request not listed in `publicEndpoints` must include
   *   it. Requests without a valid token receive a 401 Unauthorized response.
   *   Only a request carrying it may post a comment as the `team`; any other
   *   comment is stamped `client`.
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
   * Defaults to `true`:
   * - `NODE_ENV === "production"` without `apiKey` throws at startup: the
   *   factory refuses to return an unauthenticated destructive surface by
   *   accident.
   * - `NODE_ENV !== "production"` without `apiKey` keeps the handler running
   *   for local dev/tests, but DELETE/PATCH return 401 until you set
   *   `apiKey` or explicitly opt out with `requireAuthForDestructive: false`.
   *
   * `false` lifts both, in production too: without `apiKey`, anyone who
   * reaches the endpoint may then PATCH and DELETE, `deleteAll` included.
   * Set it only behind your own middleware that authenticates every method
   * (session, OAuth, etc.).
   */
  requireAuthForDestructive?: boolean;
  /**
   * Blank `authorEmail` — of feedbacks and of their comments — in GET/PATCH
   * responses to requests that do not carry a valid
   * `Authorization: Bearer <apiKey>` header. Defaults to `true`:
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
  /** Use either the `apiKey` policy or `access`, never both. */
  access?: never;
}

/** A custom access policy (sessions, JWTs, roles) in place of `apiKey`. */
export interface SitepingAccessHandlerOptions<Principal extends SitepingPrincipal>
  extends SitepingHandlerBaseOptions<Principal> {
  /**
   * Who is calling and what they may do — see `SitepingAccessControl`.
   *
   * Such a policy may authenticate with cookies, which browsers attach to
   * forged cross-site requests too, so POST/PATCH/DELETE are guarded against
   * CSRF before anything else runs: a body that is not `application/json`
   * answers 415 (only JSON forces a CORS preflight), and with
   * `allowedOrigins` an `Origin` that is neither listed nor the endpoint's
   * own answers 403. Requests without an `Origin` (server-to-server, curl)
   * pass. Behind a proxy that rewrites `request.url`, list your public origin
   * in `allowedOrigins`. Lists are sent with `Cache-Control: no-store`: they
   * depend on the principal, which the browser cache cannot tell apart.
   */
  access: SitepingAccessControl<Principal>;
  /** `apiKey` policy only. */
  apiKey?: never;
  /** `apiKey` policy only. */
  publicEndpoints?: never;
  /** `apiKey` policy only. */
  requireAuthForDestructive?: never;
  /** `apiKey` policy only — use `access.canReadAuthorEmail`. */
  redactUnauthenticatedEmails?: never;
}

/** Options of `createSitepingHandler`: the `apiKey` policy XOR a custom `access` policy. */
export type SitepingHandlerOptions<Principal extends SitepingPrincipal = SitepingPrincipal> =
  | SitepingApiKeyHandlerOptions
  | SitepingAccessHandlerOptions<Principal>;

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
