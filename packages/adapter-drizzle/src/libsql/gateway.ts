import { and, count, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { CASE_INSENSITIVE_LIKE_OPERATOR } from "../constants/search.js";
import { GREATEST_VALUE_FUNCTION } from "../constants/sql.js";
import { guardedCommentInsert } from "../shared/comments.js";
import { deletedFeedbackColumns, toDeletedFeedbacks } from "../shared/deletes.js";
import { feedbackRecordColumns, newestFeedbackFirst } from "../shared/feedbacks.js";
import { buildFeedbackWhere, withSearchableMessage } from "../shared/filters.js";
import type { FeedbackFilter, SitepingSqlGateway } from "../shared/gateway.js";
import { recordColumns, selectValues } from "../shared/rows.js";
import { monotonicUpdatedAt } from "../shared/timestamps.js";
import type { SitepingSqliteTables } from "./tables.js";

/** Any Drizzle libSQL database — Turso (remote / embedded replica) or a local libSQL/SQLite file. */
// biome-ignore lint/suspicious/noExplicitAny: accepts every schema generic.
export type AnyLibSQLDatabase = LibSQLDatabase<any>;

/** The libSQL SQL behind `createLibSQLSitepingStore`. */
export function createLibSQLGateway(
  db: AnyLibSQLDatabase,
  { sitepingFeedbacks, sitepingAnnotations, sitepingComments }: SitepingSqliteTables,
): SitepingSqlGateway {
  const whereClause = (filter: FeedbackFilter) =>
    buildFeedbackWhere(sitepingFeedbacks, filter, CASE_INSENSITIVE_LIKE_OPERATOR.sqlite);
  const feedbackColumns = feedbackRecordColumns(getTableColumns(sitepingFeedbacks));
  const commentColumns = recordColumns(getTableColumns(sitepingComments));
  /** Number of feedback rows matching a where clause — the page `total`. */
  const countMatching = async (where: ReturnType<typeof whereClause>): Promise<number> => {
    const [totals] = await db.select({ total: count() }).from(sitepingFeedbacks).where(where);
    return totals?.total ?? 0;
  };
  // SQLite's implicit rowid is the insertion ordinal: the database assigns it on
  // every insert — the store's, or the host application's through the exported
  // table — under its single-writer lock, above every existing row's rowid
  // (without AUTOINCREMENT a deleted maximum may be reused, which still ranks
  // the new row after every row that remains).
  const insertionOrder = sql`${sitepingFeedbacks}.rowid`;

  // Multi-statement writes go through `db.batch`, never an interactive
  // `db.transaction`: libSQL runs a batch as one transaction without yielding
  // between its statements, so no write lock is held across an `await` and
  // the host application's own writes on the same database never hit
  // SQLITE_BUSY because of the store.
  return {
    async insertFeedback(feedback, annotations) {
      const insertFeedbackRow = db
        .insert(sitepingFeedbacks)
        .values(withSearchableMessage(feedback))
        .onConflictDoNothing({ target: sitepingFeedbacks.clientId })
        .returning({ id: sitepingFeedbacks.id });
      if (annotations.length === 0) return (await insertFeedbackRow).length > 0;

      // The feedback id is fresh, so it exists only when this batch inserted it.
      const [inserted] = await db.batch([
        insertFeedbackRow,
        db.insert(sitepingAnnotations).select(
          selectValues(
            sitepingAnnotations,
            annotations.map((annotation, position) => ({ ...annotation, position })),
            sql`EXISTS (SELECT 1 FROM ${sitepingFeedbacks} WHERE ${sitepingFeedbacks.id} = ${feedback.id})`,
          ),
        ),
      ]);
      return inserted.length > 0;
    },
    async findFeedbacks(filter, { limit, offset }) {
      const where = whereClause(filter);
      const [rows, total] = await Promise.all([
        db
          .select(feedbackColumns)
          .from(sitepingFeedbacks)
          .where(where)
          .orderBy(...newestFeedbackFirst(sitepingFeedbacks.createdAt, insertionOrder))
          .limit(limit)
          .offset(offset),
        countMatching(where),
      ]);
      return { rows, total };
    },
    async countFeedbacks(filter) {
      return countMatching(whereClause(filter));
    },
    async findAnnotations(feedbackIds) {
      return db
        .select(recordColumns(getTableColumns(sitepingAnnotations)))
        .from(sitepingAnnotations)
        .where(inArray(sitepingAnnotations.feedbackId, [...feedbackIds]))
        .orderBy(sitepingAnnotations.createdAt, sitepingAnnotations.position);
    },
    async findComments(feedbackIds) {
      return db
        .select(commentColumns)
        .from(sitepingComments)
        .where(inArray(sitepingComments.feedbackId, [...feedbackIds]))
        .orderBy(sitepingComments.createdAt, sitepingComments.position);
    },
    async findCommentByClientId(clientId) {
      const [row] = await db
        .select(commentColumns)
        .from(sitepingComments)
        .where(eq(sitepingComments.clientId, clientId))
        .limit(1);
      return row ?? null;
    },
    async insertComment(comment, maxComments) {
      const { values, condition } = guardedCommentInsert(
        { feedbacks: sitepingFeedbacks, comments: sitepingComments },
        comment,
        maxComments,
      );
      const inserted = await db
        .insert(sitepingComments)
        .select(selectValues(sitepingComments, [values], condition))
        .onConflictDoNothing({ target: sitepingComments.clientId })
        .returning({ id: sitepingComments.id });
      return inserted.length > 0;
    },
    async deleteComment(feedbackId, commentId) {
      const deleted = await db
        .delete(sitepingComments)
        .where(and(eq(sitepingComments.id, commentId), eq(sitepingComments.feedbackId, feedbackId)))
        .returning({ id: sitepingComments.id });
      return deleted.length > 0;
    },
    async findByClientId(clientId) {
      const [row] = await db
        .select(feedbackColumns)
        .from(sitepingFeedbacks)
        .where(eq(sitepingFeedbacks.clientId, clientId))
        .limit(1);
      return row ?? null;
    },
    async findProjectName(id) {
      const [row] = await db
        .select({ projectName: sitepingFeedbacks.projectName })
        .from(sitepingFeedbacks)
        .where(eq(sitepingFeedbacks.id, id))
        .limit(1);
      return row?.projectName ?? null;
    },
    async updateStatus(id, { status, resolvedAt, updatedAt }) {
      const [row] = await db
        .update(sitepingFeedbacks)
        .set({
          status,
          resolvedAt,
          updatedAt: monotonicUpdatedAt(sitepingFeedbacks, updatedAt, GREATEST_VALUE_FUNCTION.sqlite),
        })
        .where(eq(sitepingFeedbacks.id, id))
        .returning(feedbackColumns);
      return row ?? null;
    },
    async deleteById(id, options) {
      // Annotations and comments cascade only with `PRAGMA foreign_keys = ON`,
      // which libSQL does not guarantee — delete them explicitly in the same batch.
      const [, , deleted] = await db.batch([
        db.delete(sitepingAnnotations).where(eq(sitepingAnnotations.feedbackId, id)),
        db.delete(sitepingComments).where(eq(sitepingComments.feedbackId, id)),
        db
          .delete(sitepingFeedbacks)
          .where(eq(sitepingFeedbacks.id, id))
          .returning(deletedFeedbackColumns(sitepingFeedbacks, options)),
      ]);
      return deleted.length > 0 ? toDeletedFeedbacks(deleted) : null;
    },
    async deleteByProject(projectName) {
      const projectFeedbackIds = db
        .select({ id: sitepingFeedbacks.id })
        .from(sitepingFeedbacks)
        .where(eq(sitepingFeedbacks.projectName, projectName));
      await db.batch([
        db.delete(sitepingAnnotations).where(inArray(sitepingAnnotations.feedbackId, projectFeedbackIds)),
        db.delete(sitepingComments).where(inArray(sitepingComments.feedbackId, projectFeedbackIds)),
        db.delete(sitepingFeedbacks).where(eq(sitepingFeedbacks.projectName, projectName)),
      ]);
    },
    async deleteProjectChunk(projectName, chunkSize) {
      // Ordered by the primary key, every statement of the batch picks the same
      // rows: nothing else writes the feedback table between them.
      const chunkIds = db
        .select({ id: sitepingFeedbacks.id })
        .from(sitepingFeedbacks)
        .where(eq(sitepingFeedbacks.projectName, projectName))
        .orderBy(sitepingFeedbacks.id)
        .limit(chunkSize);
      const [, , deleted] = await db.batch([
        db.delete(sitepingAnnotations).where(inArray(sitepingAnnotations.feedbackId, chunkIds)),
        db.delete(sitepingComments).where(inArray(sitepingComments.feedbackId, chunkIds)),
        db
          .delete(sitepingFeedbacks)
          .where(inArray(sitepingFeedbacks.id, chunkIds))
          .returning(deletedFeedbackColumns(sitepingFeedbacks, { collectScreenshotUrls: true })),
      ]);
      return toDeletedFeedbacks(deleted);
    },
    async findReferencedScreenshotUrls(screenshotUrls) {
      const rows = await db
        .selectDistinct({ screenshotUrl: sitepingFeedbacks.screenshotUrl })
        .from(sitepingFeedbacks)
        .where(inArray(sitepingFeedbacks.screenshotUrl, [...screenshotUrls]));
      return new Set(rows.flatMap((row) => (row.screenshotUrl === null ? [] : [row.screenshotUrl])));
    },
  };
}
