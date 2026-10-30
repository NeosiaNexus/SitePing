import {
  type FeedbackListPermissions,
  SITEPING_PROTOCOL_VERSION,
  type SitepingCapabilities,
  type SitepingStore,
} from "@siteping/core";
import { LIST_QUERY_KEYS } from "../constants.js";
import type { Pipeline, WireFeedback } from "../pipeline.js";
import { getQuerySchema } from "../validation.js";

/** A list response as it goes on the wire. */
export interface WireFeedbackList {
  feedbacks: WireFeedback[];
  total: number;
  /** `SITEPING_PROTOCOL_VERSION`: what a client may rely on from this server. */
  protocol: number;
  /** Every capability, `deleteComments` included. */
  capabilities: { [K in keyof SitepingCapabilities]-?: Exclude<SitepingCapabilities[K], undefined> };
  permissions: FeedbackListPermissions;
}

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
          // Lets clients rely on what a protocol version added instead of probing for fields.
          protocol: SITEPING_PROTOCOL_VERSION,
          // Lets clients hide their comment composer, and delete buttons, up front instead of meeting a 501.
          capabilities: {
            comments: store.addComment !== undefined,
            deleteComments: store.deleteComment !== undefined,
          },
          // And the actions this requester would be refused.
          permissions: { canDeleteAll },
        } satisfies WireFeedbackList,
        { headers: { "Cache-Control": pipeline.listCacheControl } },
      );
    } catch (error) {
      return pipeline.fail(scope, "[siteping] Failed to fetch feedbacks", error);
    }
  };
}
