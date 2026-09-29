import { hasOwn } from "@siteping/core";
import { type AccessGate, createAccessGate, createApiKeyGate } from "./access.js";
import { DEFAULT_MAX_BODY_BYTES } from "./constants.js";
import { preflightResponse } from "./cors.js";
import { createCommentOperation } from "./operations/create-comment.js";
import { createFeedbackOperation } from "./operations/create-feedback.js";
import { deleteCommentOperation } from "./operations/delete-comment.js";
import { deleteFeedbackOperation } from "./operations/delete-feedback.js";
import { listFeedbacksOperation } from "./operations/list-feedbacks.js";
import { updateFeedbackOperation } from "./operations/update-feedback.js";
import type {
  SitepingAccessHandlerOptions,
  SitepingApiKeyHandlerOptions,
  SitepingHandler,
  SitepingHandlerBaseOptions,
  SitepingHandlerOptions,
  SitepingHttpMethod,
  SitepingLogger,
  SitepingPrincipal,
} from "./options.js";
import { createPipeline, type Pipeline, type Scope } from "./pipeline.js";
import type { WebhookConfig } from "./webhooks.js";

const consoleLogger: SitepingLogger = {
  error(message, context) {
    console.error(message, context);
  },
};

/** An operation on a request that passed the access gate, with its JSON body. */
type BodyOperation<Principal> = (scope: Scope<Principal>, body: unknown) => Promise<Response>;

/**
 * One method, two resources: a JSON body carrying `commentKey` targets a
 * comment, any other body a feedback — whose payloads never carry that key.
 */
function routeByBody<Principal>(
  pipeline: Pipeline<Principal>,
  method: SitepingHttpMethod,
  commentKey: "feedbackId" | "commentId",
  comment: BodyOperation<Principal>,
  feedback: BodyOperation<Principal>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const entry = await pipeline.enter(request, method);
    if (!entry.ok) return entry.response;
    const body = await pipeline.readJson(entry.value);
    if (!body.ok) return body.response;
    return (hasOwn(body.value, commentKey) ? comment : feedback)(entry.value, body.value);
  };
}

/**
 * Create the SitePing HTTP API over any `SitepingStore`, using only the Fetch
 * API (`Request` → `Response`): one handler per method, to mount in Next.js
 * route handlers, Hono, Remix, SvelteKit, Bun, Deno or edge workers.
 *
 * **Rate limiting** is not handled by this library. Apply rate limiting at the
 * framework or reverse-proxy level (e.g. Next.js middleware, Nginx, Cloudflare).
 * The POST endpoint in particular should be rate-limited to prevent abuse, since
 * the widget typically calls it from unauthenticated browser contexts.
 *
 * Access is either the built-in `apiKey` policy or your own `access` policy
 * (sessions, JWTs, roles…) — see `SitepingAccessHandlerOptions`.
 *
 * @throws Error without a `store`; with a `maxBodyBytes` that is not a
 * positive integer; in production without `apiKey` (see
 * `requireAuthForDestructive`); or with `access.authorize` over a store
 * without `verifyProjectOwnership`, since PATCH/DELETE could then reach a
 * record of a project the caller is not authorized for.
 *
 * @example Next.js App Router — `app/api/siteping/route.ts`
 * ```ts
 * import { createSitepingHandler } from '@siteping/server'
 * import { store } from '@/lib/siteping-store'
 *
 * export const { GET, POST, PATCH, DELETE, OPTIONS } = createSitepingHandler({
 *   store,
 *   apiKey: process.env.SITEPING_API_KEY,
 * })
 * ```
 */
export function createSitepingHandler<Principal extends SitepingPrincipal>(
  options: SitepingAccessHandlerOptions<Principal>,
): SitepingHandler;
export function createSitepingHandler(options: SitepingApiKeyHandlerOptions): SitepingHandler;
/** Options assembled at runtime, either policy. */
export function createSitepingHandler<Principal extends SitepingPrincipal>(
  options: SitepingHandlerOptions<Principal>,
): SitepingHandler;
export function createSitepingHandler<Principal extends SitepingPrincipal>(
  options: SitepingHandlerOptions<Principal>,
): SitepingHandler {
  // Both policies share the callbacks, typed over `Principal` (`null` under apiKey).
  const {
    store,
    allowedOrigins,
    webhooks,
    waitUntil,
    beforeCreate,
    beforeComment,
    presentFeedback,
    hooks = {},
    logger = consoleLogger,
    describeError,
    maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  } = options as SitepingHandlerBaseOptions<Principal>;
  if (!store) {
    throw new Error("[siteping] createSitepingHandler requires a `store`.");
  }
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes <= 0) {
    throw new Error(
      `[siteping] createSitepingHandler: \`maxBodyBytes\` must be a positive integer, got ${maxBodyBytes}.`,
    );
  }
  // A custom `authorize` may scope callers to projects, but PATCH/DELETE
  // address records by id: without the ownership check, the project a caller
  // claims (and is authorized for) need not be the record's. Fail closed.
  if (options.access?.authorize && !store.verifyProjectOwnership) {
    throw new Error(
      "[siteping] createSitepingHandler: `access.authorize` needs a store implementing `verifyProjectOwnership`. " +
        "Without it, a caller authorized for one project could PATCH or DELETE another project's feedback by id.",
    );
  }

  // The `apiKey` policy never resolves a principal: its scopes carry `null`.
  const gate = options.access
    ? createAccessGate(options.access)
    : (createApiKeyGate(options) as AccessGate<unknown> as AccessGate<Principal>);
  const pipeline = createPipeline({ gate, allowedOrigins, logger, describeError, presentFeedback, maxBodyBytes });
  // Normalised once so every POST skips the allocation; an empty list
  // short-circuits dispatch.
  const webhookList: ReadonlyArray<WebhookConfig> = webhooks
    ? Array.isArray(webhooks)
      ? (webhooks as ReadonlyArray<WebhookConfig>)
      : [webhooks as WebhookConfig]
    : [];

  return {
    OPTIONS: (request: Request): Response => preflightResponse(request, allowedOrigins),
    POST: routeByBody(
      pipeline,
      "POST",
      "feedbackId",
      createCommentOperation({ store, pipeline, beforeComment }),
      createFeedbackOperation({
        store,
        pipeline,
        webhooks: webhookList,
        waitUntil,
        beforeCreate,
        // Bound so hooks written as class methods keep their `this`.
        onCreated: hooks.onCreated?.bind(hooks),
      }),
    ),
    GET: listFeedbacksOperation({ store, pipeline }),
    PATCH: updateFeedbackOperation({ store, pipeline, onUpdated: hooks.onUpdated?.bind(hooks) }),
    DELETE: routeByBody(
      pipeline,
      "DELETE",
      "commentId",
      deleteCommentOperation({ store, pipeline }),
      deleteFeedbackOperation({
        store,
        pipeline,
        onDeleting: hooks.onDeleting?.bind(hooks),
        onDeleted: hooks.onDeleted?.bind(hooks),
      }),
    ),
  };
}
