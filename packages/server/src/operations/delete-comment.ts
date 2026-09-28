import { isStoreNotFound, type SitepingStore } from "@siteping/core";
import { ERROR_MESSAGES } from "../constants.js";
import type { Pipeline, Scope } from "../pipeline.js";
import { commentDeleteSchema } from "../validation.js";

interface DeleteCommentDependencies<Principal> {
  store: SitepingStore;
  pipeline: Pipeline<Principal>;
}

/** `DELETE` with a `commentId` — remove that comment from a feedback's thread. */
export function deleteCommentOperation<Principal>({ store, pipeline }: DeleteCommentDependencies<Principal>) {
  return async (scope: Scope<Principal>, body: unknown): Promise<Response> => {
    const payload = pipeline.validate(scope, commentDeleteSchema, body);
    if (!payload.ok) return payload.response;
    const { projectName, feedbackId, commentId } = payload.value;

    try {
      const refusal = await pipeline.authorize(scope, { action: "deleteComment", projectName, feedbackId, commentId });
      if (refusal) return refusal;
      if (!store.deleteComment) return pipeline.error(scope, 501, ERROR_MESSAGES.commentsUnsupported);

      // Cross-project guard — see the PATCH operation. The store then scopes
      // the delete to this feedback's thread.
      if (store.verifyProjectOwnership && !(await store.verifyProjectOwnership(feedbackId, projectName))) {
        return pipeline.error(scope, 404, ERROR_MESSAGES.feedbackNotFound);
      }

      await store.deleteComment(feedbackId, commentId);
      return pipeline.json(scope, { deleted: true });
    } catch (error) {
      if (isStoreNotFound(error)) return pipeline.error(scope, 404, ERROR_MESSAGES.commentNotFound);
      return pipeline.fail(scope, "[siteping] Failed to delete comment", error);
    }
  };
}
