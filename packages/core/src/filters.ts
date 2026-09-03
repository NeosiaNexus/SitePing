/**
 * Shared feedback-record filtering and pagination — extracted from
 * `adapter-memory` and `adapter-localstorage` which previously kept two
 * near-identical copies of the same logic. Any adapter that holds an
 * in-memory snapshot of feedbacks can use it.
 *
 * Filtering order matches the historical adapter behaviour:
 *   1. projectName  (always required)
 *   2. type
 *   3. status / statuses  (`statuses` bucket wins when both are set)
 *   4. url
 *   5. urlPattern
 *   6. search       (lowercase substring match on `message`)
 *
 * Pagination goes through `clampPagination`: `limit` capped at 100, `page`
 * 1-based, both clamped up to 1 rather than indexing backwards from the end
 * of the match set. Query adapters reuse the same helper so every store
 * paginates identically.
 */

import type { FeedbackQuery, FeedbackRecord } from "./types.js";

/** Default page size when the caller omits `query.limit`. */
export const DEFAULT_PAGE_LIMIT = 50;
/** Maximum allowed page size — defends against memory blow-ups on hostile callers. */
export const MAX_PAGE_LIMIT = 100;

export interface FilterResult {
  feedbacks: FeedbackRecord[];
  total: number;
}

/** Normalised pagination window — see {@link clampPagination}. */
export interface Pagination {
  /** 1-based page number, at least 1. */
  page: number;
  /** Page size in `[1, MAX_PAGE_LIMIT]`. */
  limit: number;
  /** Offset of the first row: `(page - 1) * limit`. */
  skip: number;
}

function toPositiveInteger(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback;
}

/**
 * Normalise `page` / `limit` to the store contract: `page` is 1-based and
 * clamped up to 1, `limit` defaults to 50 and is clamped into `[1, 100]`,
 * non-finite values fall back to the defaults. `skip` is the derived row
 * offset for query backends (`OFFSET`, Prisma `skip`).
 *
 * Shared by the in-memory pipeline and query adapters (`PrismaStore`) so
 * every store paginates identically — the HTTP schema clamps the same way,
 * but direct callers (dashboard store mode, server actions) reach the store
 * without a schema in front of them.
 */
export function clampPagination(query: Pick<FeedbackQuery, "page" | "limit">): Pagination {
  const page = toPositiveInteger(query.page, 1);
  const limit = Math.min(toPositiveInteger(query.limit, DEFAULT_PAGE_LIMIT), MAX_PAGE_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
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
  // `statuses` (bucket / any-of) wins over the exact `status` filter when both
  // are present; an empty array is treated as absent.
  if (query.statuses && query.statuses.length > 0) {
    const allowed = query.statuses;
    results = results.filter((f) => allowed.includes(f.status));
  } else if (query.status) {
    results = results.filter((f) => f.status === query.status);
  }
  if (query.url) results = results.filter((f) => f.url === query.url);
  if (query.urlPattern) results = results.filter((f) => f.urlPattern === query.urlPattern);
  if (query.search) {
    const s = query.search.toLowerCase();
    results = results.filter((f) => f.message.toLowerCase().includes(s));
  }

  // Newest first is part of the store contract (PrismaStore orders by
  // createdAt desc) — sort explicitly instead of relying on insertion order.
  // Array.prototype.sort is stable, so same-millisecond records keep their
  // insertion order (newest inserted first).
  results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const total = results.length;
  // Both bounds are clamped (see `clampPagination`): `(page - 1) * limit`
  // goes negative for a non-positive page or limit, and `slice` reads
  // negative indices from the END — so `page: -1` used to return a window
  // whose position depended on how many records happened to match.
  const { limit, skip } = clampPagination(query);

  return { feedbacks: results.slice(skip, skip + limit), total };
}
