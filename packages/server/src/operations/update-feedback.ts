import { isStoreNotFound, type SitepingStore, toFeedbackUpdate } from "@siteping/core";
import { ERROR_MESSAGES } from "../constants.js";
import type { Pipeline } from "../pipeline.js";
import { feedbackPatchSchema } from "../validation.js";

interface UpdateFeedbackDependencies<Principal> {
  store: SitepingStore;
  pipeline: Pipeline<Principal>;
}

/** `PATCH` — change a feedback's status. */
export function updateFeedbackOperation<Principal>({ store, pipeline }: UpdateFeedbackDependencies<Principal>) {
  return async (request: Request): Promise<Response> => {
    const entry = await pipeline.enter(request, "PATCH");
    if (!entry.ok) return entry.response;
    const scope = entry.value;

    const payload = await pipeline.readBody(scope, feedbackPatchSchema);
    if (!payload.ok) return payload.response;
    const { id, projectName, status } = payload.value;

    try {
      const refusal = await pipeline.authorize(scope, { action: "update", projectName, feedbackId: id });
      if (refusal) return refusal;

      // Verify project ownership before updating. Any store implementing
      // the optional SitepingStore.verifyProjectOwnership gets the check;
      // duck-typing instead of `instanceof` keeps it bundling-safe and
      // open to third-party adapters. The handler refuses to start with a
      // custom `authorize` over a store without it.
      if (store.verifyProjectOwnership && !(await store.verifyProjectOwnership(id, projectName))) {
        return pipeline.error(scope, 404, ERROR_MESSAGES.feedbackNotFound);
      }

      // resolvedAt is the CLOSURE timestamp — set when the feedback enters
      // a terminal status (resolved / wont_fix), cleared otherwise. The
      // derivation lives here at the edge; stores persist what they're given.
      const feedback = await store.updateFeedback(id, toFeedbackUpdate(status));

      // PATCH can be made public via publicEndpoints / requireAuthForDestructive:
      // false — the scope keeps the author's email out of the update response.
      return pipeline.json(scope, pipeline.present(scope, feedback));
    } catch (error) {
      if (isStoreNotFound(error)) return pipeline.error(scope, 404, ERROR_MESSAGES.feedbackNotFound);
      return pipeline.fail(scope, "[siteping] Failed to update feedback", error);
    }
  };
}
