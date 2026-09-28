import { createApiKeyGate } from "./access.js";
import { preflightResponse } from "./cors.js";
import { createFeedbackOperation } from "./operations/create-feedback.js";
import { deleteFeedbackOperation } from "./operations/delete-feedback.js";
import { listFeedbacksOperation } from "./operations/list-feedbacks.js";
import { updateFeedbackOperation } from "./operations/update-feedback.js";
import type { SitepingHandler, SitepingHandlerOptions, SitepingLogger } from "./options.js";
import { createPipeline } from "./pipeline.js";
import type { WebhookConfig } from "./webhooks.js";

const consoleLogger: SitepingLogger = {
  error(message, context) {
    console.error(message, context);
  },
};

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
 * @throws Error without a `store`, or in production without `apiKey` (see
 * `requireAuthForDestructive`).
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
export function createSitepingHandler(options: SitepingHandlerOptions): SitepingHandler {
  const { store, allowedOrigins, webhooks, logger = consoleLogger, describeError } = options;
  if (!store) {
    throw new Error("[siteping] createSitepingHandler requires a `store`.");
  }

  const pipeline = createPipeline({ gate: createApiKeyGate(options), allowedOrigins, logger, describeError });
  // Normalised once so every POST skips the allocation; an empty list
  // short-circuits dispatch.
  const webhookList: ReadonlyArray<WebhookConfig> = webhooks
    ? Array.isArray(webhooks)
      ? (webhooks as ReadonlyArray<WebhookConfig>)
      : [webhooks as WebhookConfig]
    : [];

  return {
    OPTIONS: (request: Request): Response => preflightResponse(request, allowedOrigins),
    POST: createFeedbackOperation({ store, pipeline, webhooks: webhookList }),
    GET: listFeedbacksOperation({ store, pipeline }),
    PATCH: updateFeedbackOperation({ store, pipeline }),
    DELETE: deleteFeedbackOperation({ store, pipeline }),
  };
}
