import { isStoreNotFound, type SitepingStore } from "@siteping/core";
import { ERROR_MESSAGES } from "../constants.js";
import type { Pipeline } from "../pipeline.js";
import { feedbackDeleteSchema } from "../validation.js";

interface DeleteFeedbackDependencies<Principal> {
  store: SitepingStore;
  pipeline: Pipeline<Principal>;
}

/** `DELETE` — remove one feedback, or every feedback of a project (`deleteAll`). */
export function deleteFeedbackOperation<Principal>({ store, pipeline }: DeleteFeedbackDependencies<Principal>) {
  return async (request: Request): Promise<Response> => {
    const entry = await pipeline.enter(request, "DELETE");
    if (!entry.ok) return entry.response;
    const scope = entry.value;

    const payload = await pipeline.readBody(scope, feedbackDeleteSchema);
    if (!payload.ok) return payload.response;
    const deletion = payload.value;

    try {
      const refusal = await pipeline.authorize(
        scope,
        "deleteAll" in deletion
          ? { action: "deleteAll", projectName: deletion.projectName }
          : { action: "delete", projectName: deletion.projectName, feedbackId: deletion.id },
      );
      if (refusal) return refusal;

      if ("deleteAll" in deletion) {
        await store.deleteAllFeedbacks(deletion.projectName);
        return pipeline.json(scope, { deleted: true });
      }

      // Cross-project guard — see the PATCH operation.
      if (store.verifyProjectOwnership && !(await store.verifyProjectOwnership(deletion.id, deletion.projectName))) {
        return pipeline.error(scope, 404, ERROR_MESSAGES.feedbackNotFound);
      }

      await store.deleteFeedback(deletion.id);
      return pipeline.json(scope, { deleted: true });
    } catch (error) {
      if (isStoreNotFound(error)) return pipeline.error(scope, 404, ERROR_MESSAGES.feedbackNotFound);
      return pipeline.fail(scope, "[siteping] Failed to delete feedback", error);
    }
  };
}
