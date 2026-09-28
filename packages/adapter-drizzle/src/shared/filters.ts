import { and, type Column, eq, inArray, isNull, type SQL, sql } from "drizzle-orm";
import {
  FOLDED_TEXT_LIKE_OPERATOR,
  LIKE_ESCAPE_CHARACTER,
  LIKE_SPECIAL_CHARACTERS,
  type LikeOperator,
} from "../constants/search.js";
import type { FeedbackFilter, FeedbackRow } from "./gateway.js";

/** Feedback columns the list filters read — satisfied by both dialects' tables. */
export interface FeedbackFilterColumns {
  projectName: Column;
  type: Column;
  status: Column;
  url: Column;
  urlPattern: Column;
  message: Column;
  /** The message lowercased in JavaScript on insert; `NULL` on rows the store did not write. */
  messageSearch: Column;
}

/** `%search%` with LIKE wildcards escaped, so the search matches literally. */
export function toContainsPattern(search: string): string {
  const escaped = search.replace(LIKE_SPECIAL_CHARACTERS, (character) => `${LIKE_ESCAPE_CHARACTER}${character}`);
  return `%${escaped}%`;
}

/**
 * Case folding of the text search — the same Unicode-aware `toLowerCase()` the
 * standard store filter (`applyFeedbackFilters` in core) applies to both the
 * message and the search, so a SQL store matches exactly what an in-memory one does.
 *
 * @param text - A message to store in its searchable form, or a search term.
 * @returns The lowercased text.
 */
export function toSearchableText(text: string): string {
  return text.toLowerCase();
}

/**
 * `target <operator> '%search%' ESCAPE '\'` — a literal substring match.
 *
 * @param target - Column or expression searched.
 * @param likeOperator - The dialect's LIKE operator.
 * @param search - The search term, matched literally.
 */
export function containsCondition(target: Column | SQL, likeOperator: LikeOperator, search: string): SQL {
  return sql`${target} ${sql.raw(likeOperator)} ${toContainsPattern(search)} ESCAPE ${LIKE_ESCAPE_CHARACTER}`;
}

/**
 * The feedback row as inserted: the record plus its `messageSearch`, so the
 * text search never depends on the database's case folding.
 *
 * @param feedback - The feedback row the store builds.
 */
export function withSearchableMessage<Row extends FeedbackRow>(feedback: Row): Row & { messageSearch: string } {
  return { ...feedback, messageSearch: toSearchableText(feedback.message) };
}

/**
 * Case-insensitive message search, folded like the standard store filter on
 * every dialect: the lowercased search is matched with a plain LIKE against
 * `message_search` (lowercased in JavaScript on insert), so neither SQLite's
 * ASCII-only LIKE nor a PostgreSQL `C` collation / `LC_CTYPE` changes the
 * result. Rows without `message_search` fall back to the raw message under the
 * dialect's case-insensitive operator, whose folding may be ASCII-only.
 *
 * @param columns - `message` and `messageSearch` of the feedback table.
 * @param fallbackLikeOperator - The dialect's case-insensitive LIKE operator.
 * @param search - The search term, matched literally.
 */
export function messageContainsCondition(
  columns: Pick<FeedbackFilterColumns, "message" | "messageSearch">,
  fallbackLikeOperator: LikeOperator,
  search: string,
): SQL {
  const foldedSearch = toSearchableText(search);
  const foldedMatch = containsCondition(columns.messageSearch, FOLDED_TEXT_LIKE_OPERATOR, foldedSearch);
  const fallbackMatch = containsCondition(columns.message, fallbackLikeOperator, foldedSearch);
  return sql`(${foldedMatch} OR (${isNull(columns.messageSearch)} AND ${fallbackMatch}))`;
}

/**
 * WHERE clause of `getFeedbacks`, built only from dialect-agnostic Drizzle
 * operators; the dialect supplies its columns and the case-insensitive LIKE
 * operator of the text-search fallback (see {@link messageContainsCondition}).
 */
export function buildFeedbackWhere(
  columns: FeedbackFilterColumns,
  filter: FeedbackFilter,
  fallbackLikeOperator: LikeOperator,
): SQL | undefined {
  const conditions: SQL[] = [eq(columns.projectName, filter.projectName)];
  if (filter.type) conditions.push(eq(columns.type, filter.type));
  if (filter.statuses) conditions.push(inArray(columns.status, [...filter.statuses]));
  if (filter.url) conditions.push(eq(columns.url, filter.url));
  if (filter.urlPattern) conditions.push(eq(columns.urlPattern, filter.urlPattern));
  if (filter.search) conditions.push(messageContainsCondition(columns, fallbackLikeOperator, filter.search));
  return and(...conditions);
}
