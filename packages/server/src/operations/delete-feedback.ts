import { isStoreNotFound, type SitepingStore } from "@siteping/core";
import { ERROR_MESSAGES } from "../constants.js";
import type { SitepingDeletionTarget, SitepingLifecycleHooks } from "../options.js";
import type { Pipeline, Scope } from "../pipeline.js";
import { feedbackDeleteSchema } from "../validation.js";

interface DeleteFeedbackDependencies<Principal> {
  store: SitepingStore;
  pipeline: Pipeline<Principal>;
  onDeleting: SitepingLifecycleHooks<Principal>["onDeleting"];
  onDeleted: SitepingLifecycleHooks<Principal>["onDeleted"];
}

/** `DELETE` — remove one feedback, or every feedback of a project (`deleteAll`). */
export function deleteFeedbackOperation<Principal>({
  store,
  pipeline,
  onDeleting,
  onDeleted,
}: DeleteFeedbackDependencies<Principal>) {
  return async (scope: Scope<Principal>, body: unknown): Promise<Response> => {
    const payload = pipeline.validate(scope, feedbackDeleteSchema, body);
    if (!payload.ok) return payload.response;
    const target: SitepingDeletionTarget =
      "deleteAll" in payload.value
        ? { kind: "project", projectName: payload.value.projectName }
        : { kind: "single", id: payload.value.id, projectName: payload.value.projectName };

    try {
      const refusal = await pipeline.authorize(
        scope,
        target.kind === "project"
          ? { action: "deleteAll", projectName: target.projectName }
          : { action: "delete", projectName: target.projectName, feedbackId: target.id },
      );
      if (refusal) return refusal;

      // Cross-project guard — see the PATCH operation.
      if (
        target.kind === "single" &&
        store.verifyProjectOwnership &&
        !(await store.verifyProjectOwnership(target.id, target.projectName))
      ) {
        return pipeline.error(scope, 404, ERROR_MESSAGES.feedbackNotFound);
      }

      if (onDeleting) {
        try {
          await onDeleting(target, scope.context);
        } catch (error) {
          pipeline.logError(scope, "[siteping] Hook onDeleting aborted the deletion", { error, target });
          return pipeline.error(scope, 502, ERROR_MESSAGES.deletionAborted);
        }
      }

      if (target.kind === "project") await store.deleteAllFeedbacks(target.projectName);
      else await store.deleteFeedback(target.id);
      if (onDeleted) await pipeline.runHook(scope, "onDeleted", { target }, () => onDeleted(target, scope.context));
      return pipeline.json(scope, { deleted: true });
    } catch (error) {
      if (isStoreNotFound(error)) return pipeline.error(scope, 404, ERROR_MESSAGES.feedbackNotFound);
      return pipeline.fail(scope, "[siteping] Failed to delete feedback", error);
    }
  };
}
