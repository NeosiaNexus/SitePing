/** Escape character for LIKE patterns, declared on every search with `ESCAPE`. */
export const LIKE_ESCAPE_CHARACTER = "\\";

/**
 * Characters with a special meaning inside LIKE patterns: the `%` and `_`
 * wildcards plus the escape character itself. Each one is prefixed with
 * {@link LIKE_ESCAPE_CHARACTER} in a single pass, so a literal backslash in the
 * search becomes `\\` and never escapes the character after it (or the
 * trailing `%` of the contains pattern).
 */
export const LIKE_SPECIAL_CHARACTERS = /[\\%_]/g;

/** A SQL substring-match operator. */
export type LikeOperator = "ILIKE" | "LIKE";

/**
 * Operator matching the lowercased search against the `message_search` column.
 * Both operands are already lowercased in JavaScript, so a plain LIKE compares
 * them without any database case folding — identical on every dialect, locale
 * and collation.
 */
export const FOLDED_TEXT_LIKE_OPERATOR = "LIKE" satisfies LikeOperator;

/**
 * Case-insensitive substring operator per dialect, used only as the fallback
 * for rows without `message_search` (written by the host application).
 * PostgreSQL's LIKE is case-sensitive, so it needs ILIKE, which folds case
 * with the column's collation / the database's `LC_CTYPE` (ASCII-only under
 * `C`). SQLite's LIKE folds only ASCII case.
 */
export const CASE_INSENSITIVE_LIKE_OPERATOR = {
  postgres: "ILIKE",
  sqlite: "LIKE",
} as const satisfies Record<string, LikeOperator>;
