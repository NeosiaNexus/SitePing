import type { FeedbackListPermissions, SitepingCapabilities, SitepingStore } from "@siteping/core";
import { LIST_QUERY_KEYS } from "../constants.js";
import type { Pipeline } from "../pipeline.js";
import { getQuerySchema } from "../validation.js";

interface ListFeedbacksDependencies<Principal> {
  store: SitepingStore;
  pipeline: Pipeline<Principal>;
}

/** Only the query parameters the endpoint understands, as raw strings. */
function readListQuery(request: Request): Record<string, string> {
  const searchParams = new URL(request.url).searchParams;
  const rawQuery: Record<string, string> = {};
  for (const key of LIST_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value !== null) rawQuery[key] = value;
  }
  return rawQuery;
}

/** `GET` — a paginated, filtered page of a project's feedbacks. */
export function listFeedbacksOperation<Principal>({ store, pipeline }: ListFeedbacksDependencies<Principal>) {
  return async (request: Request): Promise<Response> => {
    const entry = await pipeline.enter(request, "GET");
    if (!entry.ok) return entry.response;
    const scope = entry.value;

    const query = pipeline.validate(scope, getQuerySchema, readListQuery(request));
    if (!query.ok) return query.response;

    try {
      const { projectName } = query.value;
      const refusal = await pipeline.authorize(scope, { action: "list", projectName });
      if (refusal) return refusal;

      // GET can be public (no apiKey, or "GET" in publicEndpoints for widget
      // hosts) — the scope redacts author emails unless the requester may read them.
      const page = await store.getFeedbacks(query.value);
      const [feedbacks, canDeleteAll] = await Promise.all([
        Promise.all(page.feedbacks.map((feedback) => pipeline.present(scope, feedback))),
        pipeline.may(scope, "DELETE", { action: "deleteAll", projectName }),
      ]);
      return pipeline.json(
        scope,
        {
          ...page,
          feedbacks,
          // Lets clients hide their comment composer, and delete buttons, up front instead of meeting a 501.
          capabilities: {
            comments: store.addComment !== undefined,
            deleteComments: store.deleteComment !== undefined,
          } satisfies SitepingCapabilities,
          // And the actions this requester would be refused.
          permissions: { canDeleteAll } satisfies FeedbackListPermissions,
        },
        { headers: { "Cache-Control": pipeline.listCacheControl } },
      );
    } catch (error) {
      return pipeline.fail(scope, "[siteping] Failed to fetch feedbacks", error);
    }
  };
}
