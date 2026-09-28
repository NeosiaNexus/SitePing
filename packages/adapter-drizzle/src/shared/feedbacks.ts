import { type Column, desc, type SQL } from "drizzle-orm";

/**
 * Internal feedback columns that are never part of the feedback record: the
 * `creationSequence` ordinal (drives the ordering on PostgreSQL; SQLite uses
 * its implicit `rowid` instead, so the libSQL table has no such column) and the
 * `messageSearch` normalized copy of the message (drives the text search).
 */
export interface InternalFeedbackColumns {
  creationSequence?: Column;
  messageSearch: Column;
}

/**
 * The columns a feedback row is read from — every column except the internal
 * ones (`creationSequence`, `messageSearch`).
 *
 * @param columns - `getTableColumns(feedbacksTable)`.
 * @returns The same columns without the internal ones.
 */
export function feedbackRecordColumns<Columns extends InternalFeedbackColumns>(
  columns: Columns,
): Omit<Columns, keyof InternalFeedbackColumns> {
  const { creationSequence: _creationSequence, messageSearch: _messageSearch, ...recordColumns } = columns;
  return recordColumns;
}

/**
 * `ORDER BY` of the feedback list: newest `createdAt` first, ties broken by the
 * database-wide insertion ordinal. `createdAt` is the injected clock
 * value as is, so rows created in the same millisecond — by one store
 * instance, several processes or the host application inserting directly —
 * would otherwise come back in an undefined order, and offset pages would
 * overlap or skip rows.
 *
 * @param createdAt - The feedback `createdAt` column.
 * @param insertionOrder - Ordinal the database assigns on every insert, the
 *   store's or not: the PostgreSQL identity column, SQLite's `rowid`.
 */
export function newestFeedbackFirst(createdAt: Column, insertionOrder: Column | SQL): SQL[] {
  return [desc(createdAt), desc(insertionOrder)];
}
