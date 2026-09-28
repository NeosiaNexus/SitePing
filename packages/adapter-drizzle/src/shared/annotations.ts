import { type Column, getTableColumns, type SQL, sql, type Table } from "drizzle-orm";
import { ANNOTATION_VALUES_ALIAS } from "../constants/sql.js";
import type { AnnotationRow } from "./gateway.js";

/** Wrap a bound parameter so the dialect reads it as the target column's type. */
export type EncodeAnnotationParam = (param: SQL, column: Column) => SQL;

const keepParamAsIs: EncodeAnnotationParam = (param) => param;

/**
 * The columns an `AnnotationRecord` is read from — every column except the
 * internal `position` ordinal, which only drives the ordering.
 *
 * @param columns - `getTableColumns(annotationsTable)`.
 * @returns The same columns without `position`.
 */
export function annotationRecordColumns<Columns extends { position: Column }>(
  columns: Columns,
): Omit<Columns, "position"> {
  const { position: _position, ...recordColumns } = columns;
  return recordColumns;
}

/**
 * `SELECT * FROM (VALUES …) AS alias WHERE <condition>` over the annotation
 * rows, for `db.insert(annotations).select(…)`: the insert lands only when
 * `condition` holds, inside the same statement or batch as the feedback
 * insert. Each row gets its submission index as `position`.
 *
 * Values follow `getTableColumns` order — the column list Drizzle writes for
 * an insert-select (the annotation tables have no generated columns) — and go
 * through each column's driver mapping (JSON, timestamps).
 *
 * @param table - The annotations table.
 * @param annotations - Rows in submission order (non-empty).
 * @param condition - Guard evaluated once per statement (e.g. "the feedback row was inserted").
 * @param encodeParam - Dialect hook to type each parameter (PostgreSQL casts, SQLite needs nothing).
 */
export function selectAnnotationValues(
  table: Table,
  annotations: readonly AnnotationRow[],
  condition: SQL,
  encodeParam: EncodeAnnotationParam = keepParamAsIs,
): SQL {
  const columns = Object.entries(getTableColumns(table));
  const rows = annotations.map((annotation, position) => {
    const values: Record<string, unknown> = { ...annotation, position };
    const params = columns.map(([key, column]) => encodeParam(sql`${sql.param(values[key] ?? null, column)}`, column));
    return sql`(${sql.join(params, sql`, `)})`;
  });
  return sql`SELECT * FROM (VALUES ${sql.join(rows, sql`, `)}) AS ${sql.identifier(ANNOTATION_VALUES_ALIAS)} WHERE ${condition}`;
}
