import { type Column, getTableColumns, is, SQL, sql, type Table } from "drizzle-orm";
import { VALUES_LIST_ALIAS } from "../constants/sql.js";

/** Wrap a bound parameter so the dialect reads it as the target column's type. */
export type EncodeParam = (param: SQL, column: Column) => SQL;

const keepParamAsIs: EncodeParam = (param) => param;

/**
 * The columns a record is read from — every column except the internal
 * `position` ordinal of annotations and comments, which only drives the
 * ordering.
 *
 * @param columns - `getTableColumns(annotationsTable)` or `getTableColumns(commentsTable)`.
 * @returns The same columns without `position`.
 */
export function recordColumns<Columns extends { position: Column }>(columns: Columns): Omit<Columns, "position"> {
  const { position: _position, ...record } = columns;
  return record;
}

/**
 * `SELECT * FROM (VALUES …) AS alias WHERE <condition>` over `rows`, for
 * `db.insert(table).select(…)`: the insert lands only when `condition` holds,
 * inside the same statement or batch as the rest of the write.
 *
 * Values follow `getTableColumns` order — the column list Drizzle writes for
 * an insert-select (these tables have no generated columns) — and go through
 * each column's driver mapping (JSON, timestamps); a value that already is
 * SQL, such as a subquery, is inlined as is.
 *
 * @param table - The table inserted into.
 * @param rows - One value per column key, per row (non-empty).
 * @param condition - Guard evaluated once per statement (e.g. "the feedback row exists").
 * @param encodeParam - Dialect hook to type each parameter (PostgreSQL casts, SQLite needs nothing).
 */
export function selectValues(
  table: Table,
  rows: ReadonlyArray<Record<string, unknown>>,
  condition: SQL,
  encodeParam: EncodeParam = keepParamAsIs,
): SQL {
  const columns = Object.entries(getTableColumns(table));
  const tuples = rows.map((row) => {
    const values = columns.map(([key, column]) => {
      const value = row[key];
      return is(value, SQL) ? value : encodeParam(sql`${sql.param(value ?? null, column)}`, column);
    });
    return sql`(${sql.join(values, sql`, `)})`;
  });
  return sql`SELECT * FROM (VALUES ${sql.join(tuples, sql`, `)}) AS ${sql.identifier(VALUES_LIST_ALIAS)} WHERE ${condition}`;
}
