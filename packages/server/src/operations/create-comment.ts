import {
  type CommentAuthorRole,
  isStoreLimit,
  isStoreNotFound,
  isStoreValueTooLong,
  type SitepingStore,
} from "@siteping/core";
import { ERROR_MESSAGES } from "../constants.js";
import type { Notify } from "../notify.js";
import type { SitepingCreatedComment, SitepingHandlerBaseOptions, SitepingLifecycleHooks } from "../options.js";
import type { Pipeline, Scope } from "../pipeline.js";
import { commentCreateSchema } from "../validation.js";

interface CreateCommentDependencies<Principal> {
  store: SitepingStore;
  pipeline: Pipeline<Principal>;
  notify: Notify<Principal>;
  beforeComment: SitepingHandlerBaseOptions<Principal>["beforeComment"];
  onCommentCreated: SitepingLifecycleHooks<Principal>["onCommentCreated"];
}

/** `POST` with a `feedbackId` — add a comment to that feedback's thread, idempotent on `clientId`. */
export function createCommentOperation<Principal>({
  store,
  pipeline,
  notify,
  beforeComment,
  onCommentCreated,
}: CreateCommentDependencies<Principal>) {
  return async (scope: Scope<Principal>, body: unknown): Promise<Response> => {
    const payload = pipeline.validate(scope, commentCreateSchema, body);
    if (!payload.ok) return payload.response;

    try {
      const { projectName, feedbackId, authorRole, ...comment } = beforeComment
        ? await beforeComment(payload.value, scope.context)
        : payload.value;
      const refusal = await pipeline.authorize(scope, { action: "createComment", projectName, feedbackId });
      if (refusal) return refusal;
      // 501, not 404: the thread may well exist — this store keeps no comments.
      if (!store.addComment) return pipeline.error(scope, 501, ERROR_MESSAGES.commentsUnsupported);

      // Cross-project guard — see the PATCH operation.
      if (store.verifyProjectOwnership && !(await store.verifyProjectOwnership(feedbackId, projectName))) {
        return pipeline.error(scope, 404, ERROR_MESSAGES.feedbackNotFound);
      }

      // POST is typically public so the widget can reply from a visitor's
      // browser: the role a request claims is kept only when the access
      // policy vouches for the caller.
      const role: CommentAuthorRole =
        authorRole === "team" && (await pipeline.canCommentAsTeam(scope)) ? "team" : "client";
      const input = { ...comment, authorRole: role };
      // Only a store that reports its inserts can tell a new reply from a
      // retried one: without `addCommentIfAbsent`, no reply counts as created
      // (the handler refuses to start with comment notifications then).
      const { comment: stored, created } = store.addCommentIfAbsent
        ? await store.addCommentIfAbsent(feedbackId, input)
        : { comment: await store.addComment(feedbackId, input), created: false };

      // A clientId is unique across every thread, so a replay that resolves to
      // another feedback's comment is a boundary violation, not a dedup.
      if (stored.feedbackId !== feedbackId) {
        return pipeline.error(scope, 409, ERROR_MESSAGES.clientIdUsedByAnotherFeedback);
      }
      if (created) {
        const reply: SitepingCreatedComment = { ...stored, projectName };
        notify(scope, { event: "comment.created", comment: reply });
        if (onCommentCreated) {
          await pipeline.runHook(scope, "onCommentCreated", { feedbackId, projectName, commentId: stored.id }, () =>
            onCommentCreated(reply, scope.context),
          );
        }
      }
      return pipeline.json(scope, pipeline.presentCreatedComment(scope, stored), { status: 201 });
    } catch (error) {
      if (isStoreNotFound(error)) return pipeline.error(scope, 404, ERROR_MESSAGES.feedbackNotFound);
      if (isStoreLimit(error)) return pipeline.error(scope, 409, ERROR_MESSAGES.tooManyComments);
      if (isStoreValueTooLong(error)) return pipeline.refuseTooLong(scope, error);
      return pipeline.fail(scope, "[siteping] Failed to add comment", error);
    }
  };
}
