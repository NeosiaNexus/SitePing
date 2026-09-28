import type { SitepingStore } from "@siteping/core";
import { LIST_QUERY_KEYS } from "../constants.js";
import type { Pipeline } from "../pipeline.js";
import { getQuerySchema } from "../validation.js";

interface ListFeedbacksDependencies {
  store: SitepingStore;
  pipeline: Pipeline;
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
export function listFeedbacksOperation({ store, pipeline }: ListFeedbacksDependencies) {
  return async (request: Request): Promise<Response> => {
    const entry = await pipeline.enter(request, "GET");
    if (!entry.ok) return entry.response;
    const scope = entry.value;

    const query = pipeline.validate(scope, getQuerySchema, readListQuery(request));
    if (!query.ok) return query.response;

    try {
      // GET can be public (no apiKey, or "GET" in publicEndpoints for widget
      // hosts) — the scope redacts author emails unless the requester may read them.
      const page = await store.getFeedbacks(query.value);
      return pipeline.json(
        scope,
        { ...page, feedbacks: page.feedbacks.map((feedback) => pipeline.present(scope, feedback)) },
        { headers: { "Cache-Control": "private, max-age=5" } },
      );
    } catch (error) {
      return pipeline.fail(scope, "[siteping] Failed to fetch feedbacks", error);
    }
  };
}
