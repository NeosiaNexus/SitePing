/**
 * Shared feedback-record filtering and pagination — extracted from
 * `adapter-memory` and `adapter-localstorage` which previously kept two
 * near-identical copies of the same logic. Any adapter that holds an
 * in-memory snapshot of feedbacks can use it.
 *
 * A record matches when it passes every active filter (see
 * {@link matchesFeedbackQuery}):
 *   - projectName  (always required)
 *   - type
 *   - status / statuses  (`statuses` bucket wins when both are set)
 *   - url
 *   - urlPattern
 *   - search       (lowercase substring match on `message`)
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
 * Whether a {@link clampPagination} offset lies beyond any row a store can
 * hold. `clampPagination` bounds `page` from below only, so a direct caller's
 * huge `page` yields an offset past `Number.MAX_SAFE_INTEGER` — or `Infinity`
 * — that SQL backends reject (`OFFSET` is a 64-bit integer in PostgreSQL and
 * SQLite; Prisma's `skip` rejects non-integers and 64-bit overflow).
 *
 * Every safe integer fits a signed 64-bit offset and no table holds more rows
 * than that, so query adapters answer such a page as empty — with the real
 * `total` — instead of issuing the query: the same result the in-memory
 * pipeline returns.
 *
 * @param skip - The `skip` returned by {@link clampPagination}.
 * @returns `true` when no row can sit at that offset.
 */
export function isUnreachableOffset(skip: number): boolean {
  return !Number.isSafeInteger(skip);
}

/** `createdAt` in ms for newest-first sorting — an invalid date counts as the oldest. */
function sortTime(record: FeedbackRecord): number {
  const time = record.createdAt.getTime();
  // Below every valid Date (±8.64e15 ms) but finite, so two invalid dates
  // subtract to 0 — `-Infinity - -Infinity` would be NaN again.
  return Number.isNaN(time) ? Number.MIN_SAFE_INTEGER : time;
}

/**
 * Whether one record passes every filter of `query` — the filter half of
 * {@link applyFeedbackFilters}, exposed so a client holding a single record
 * (e.g. the dashboard deciding whether an optimistic edit still belongs in
 * its list) applies exactly the stores' semantics. Pagination is ignored.
 */
export function matchesFeedbackQuery(record: FeedbackRecord, query: FeedbackQuery): boolean {
  const { type, status, statuses, url, urlPattern, search } = query;
  return (
    record.projectName === query.projectName &&
    (!type || record.type === type) &&
    // `statuses` (bucket / any-of) wins over the exact `status` filter when
    // both are present; an empty array is treated as absent.
    (statuses && statuses.length > 0 ? statuses.includes(record.status) : !status || record.status === status) &&
    (!url || record.url === url) &&
    (!urlPattern || record.urlPattern === urlPattern) &&
    (!search || record.message.toLowerCase().includes(search.toLowerCase()))
  );
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
  const results = items.filter((f) => matchesFeedbackQuery(f, query));

  // Newest first is part of the store contract (PrismaStore orders by
  // createdAt desc) — sort explicitly instead of relying on insertion order.
  // Array.prototype.sort is stable, so same-millisecond records keep their
  // insertion order (newest inserted first). An invalid date (a hand-edited
  // localStorage blob) sorts as oldest: a NaN comparator result would leave
  // the order of the valid records undefined too.
  results.sort((a, b) => sortTime(b) - sortTime(a));

  const total = results.length;
  // Both bounds are clamped (see `clampPagination`): `(page - 1) * limit`
  // goes negative for a non-positive page or limit, and `slice` reads
  // negative indices from the END — so `page: -1` used to return a window
  // whose position depended on how many records happened to match.
  const { limit, skip } = clampPagination(query);

  return { feedbacks: results.slice(skip, skip + limit), total };
}
