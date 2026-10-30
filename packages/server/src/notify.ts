import type { SitepingHandlerBaseOptions } from "./options.js";
import type { Pipeline, Scope } from "./pipeline.js";
import {
  deliverySubject,
  dispatchDelivery,
  subscribesTo,
  type WebhookConfig,
  type WebhookDelivery,
} from "./webhooks.js";

/**
 * Notify the webhooks subscribed to `delivery`'s event, once its write has
 * succeeded. Fire-and-forget: never awaited, so the client isn't held back on
 * slow Slack/Discord/generic receivers, and never throws — the delivery traps
 * its own errors and reports them through `WebhookConfig.onError`.
 */
export type Notify<Principal> = (scope: Scope<Principal>, delivery: WebhookDelivery) => void;

export function createNotifier<Principal>(
  webhooks: ReadonlyArray<WebhookConfig>,
  waitUntil: SitepingHandlerBaseOptions<Principal>["waitUntil"],
  pipeline: Pipeline<Principal>,
): Notify<Principal> {
  return (scope, delivery) => {
    // No subscriber, no work handed to the runtime.
    if (!webhooks.some((config) => subscribesTo(config, delivery.event))) return;
    const pending = dispatchDelivery(webhooks, delivery);
    try {
      waitUntil?.(pending);
    } catch (error) {
      const { feedbackId, projectName } = deliverySubject(delivery);
      pipeline.logError(scope, "[siteping] waitUntil failed", {
        error,
        event: delivery.event,
        ...(feedbackId ? { feedbackId } : {}),
        projectName,
      });
    }
  };
}
