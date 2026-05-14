/**
 * Shared feedback-record filtering and pagination — extracted from
 * `adapter-memory` and `adapter-localstorage` which previously kept two
 * near-identical copies of the same logic. Any adapter that holds an
 * in-memory snapshot of feedbacks can use it.
 *
 * Filtering order matches the historical adapter behaviour:
 *   1. projectName  (always required)
 *   2. type
 *   3. status
 *   4. url
 *   5. urlPattern
 *   6. search       (lowercase substring match on `message`)
 *
 * Pagination clamps `limit` to a maximum of 100 and treats `page` as 1-based,
 * matching the public API contract documented on `getFeedbacks`.
 */

import type { FeedbackQuery, FeedbackRecord } from "./types.js";

/** Default page size when the caller omits `query.limit`. */
const DEFAULT_LIMIT = 50;
/** Maximum allowed page size — defends against memory blow-ups on hostile callers. */
const MAX_LIMIT = 100;

export interface FilterResult {
  feedbacks: FeedbackRecord[];
  total: number;
}

/**
 * Apply the standard feedback filter + pagination pipeline against an
 * in-memory snapshot. Used by `MemoryStore.getFeedbacks` and
 * `LocalStorageStore.getFeedbacks` so the two never drift.
 *
 * @param items  All known feedback records (already include `annotations`).
 * @param query  Filter and pagination options. `projectName` is required.
 */
export function applyFeedbackFilters(items: readonly FeedbackRecord[], query: FeedbackQuery): FilterResult {
  let results: FeedbackRecord[] = items.filter((f) => f.projectName === query.projectName);

  if (query.type) results = results.filter((f) => f.type === query.type);
  if (query.status) results = results.filter((f) => f.status === query.status);
  if (query.url) results = results.filter((f) => f.url === query.url);
  if (query.urlPattern) results = results.filter((f) => f.urlPattern === query.urlPattern);
  if (query.search) {
    const s = query.search.toLowerCase();
    results = results.filter((f) => f.message.toLowerCase().includes(s));
  }

  const total = results.length;
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const start = (page - 1) * limit;

  return { feedbacks: results.slice(start, start + limit), total };
}
