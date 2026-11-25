import { type FeedbackResponse, isClosedStatus, OPEN_FEEDBACK_STATUSES, type PageScope } from "@siteping/core";
import type { GetFeedbacksOptions } from "./api-client.js";
import { PAGE_SIZE } from "./constants.js";

/** Which feedback gets a marker on the page, from the widget's config. */
export interface MarkerFilter {
  /** Only the current page's feedback (`scopeAnnotationsByUrl`). */
  byUrl: boolean;
  /** Closed feedback too (`showClosedMarkers`). */
  closed: boolean;
}

/** The page markers' query, run by the launcher, and by the panel when its list shows another one. */
export function markerQuery(scope: PageScope, filter: MarkerFilter): GetFeedbacksOptions & { limit: number } {
  const query: GetFeedbacksOptions & { limit: number } = { limit: PAGE_SIZE };
  if (filter.byUrl) query.url = scope.url;
  if (!filter.closed) query.statuses = OPEN_FEEDBACK_STATUSES;
  return query;
}

/**
 * The feedback of a result that gets a marker. Applies the query's filters
 * again client-side: a backend may ignore `url` or `statuses`.
 */
export function pageMarkers(feedbacks: FeedbackResponse[], scope: PageScope, filter: MarkerFilter): FeedbackResponse[] {
  return feedbacks.filter(
    (feedback) => (!filter.byUrl || feedback.url === scope.url) && (filter.closed || !isClosedStatus(feedback.status)),
  );
}
