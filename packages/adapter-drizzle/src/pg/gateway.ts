import { and, type Column, count, eq, getTableColumns, inArray, type SQL, sql, type WithSubquery } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { CASE_INSENSITIVE_LIKE_OPERATOR } from "../constants/search.js";
import {
  GREATEST_VALUE_FUNCTION,
  INSERTED_ANNOTATIONS_CTE_ALIAS,
  INSERTED_FEEDBACK_CTE_ALIAS,
} from "../constants/sql.js";
import { guardedCommentInsert } from "../shared/comments.js";
import { deletedFeedbackColumns, toDeletedFeedbacks } from "../shared/deletes.js";
import { feedbackRecordColumns, newestFeedbackFirst } from "../shared/feedbacks.js";
import { buildFeedbackWhere, withSearchableMessage } from "../shared/filters.js";
import type { FeedbackFilter, SitepingSqlGateway } from "../shared/gateway.js";
import { recordColumns, selectValues } from "../shared/rows.js";
import { monotonicUpdatedAt } from "../shared/timestamps.js";
import type { SitepingPgTables } from "./tables.js";

/**
 * Any Drizzle PostgreSQL database — node-postgres, postgres.js, Neon
 * (serverless / HTTP), Vercel Postgres, Supabase, PGlite… The store never
 * opens an interactive `db.transaction`: every write is a single statement,
 * so drivers without interactive transactions (Neon HTTP) work too.
 */
// biome-ignore lint/suspicious/noExplicitAny: accepts every driver's query-result HKT and schema.
export type AnyPgDatabase = PgDatabase<PgQueryResultHKT, any, any>;

/**
 * Type a bound parameter as its target column: parameters inside a `VALUES`
 * list carry no type of their own in PostgreSQL.
 */
function castToColumnType(param: SQL, column: Column): SQL {
  return sql`CAST(${param} AS ${sql.raw(column.getSQLType())})`;
}

/** The PostgreSQL SQL behind `createPgSitepingStore`. */
export function createPgGateway(
  db: AnyPgDatabase,
  { sitepingFeedbacks, sitepingAnnotations, sitepingComments }: SitepingPgTables,
): SitepingSqlGateway {
  const whereClause = (filter: FeedbackFilter) =>
    buildFeedbackWhere(sitepingFeedbacks, filter, CASE_INSENSITIVE_LIKE_OPERATOR.postgres);
  const feedbackColumns = feedbackRecordColumns(getTableColumns(sitepingFeedbacks));
  const commentColumns = recordColumns(getTableColumns(sitepingComments));
  /** Number of feedback rows matching a where clause — the page `total`. */
  const countMatching = async (where: ReturnType<typeof whereClause>): Promise<number> => {
    const [totals] = await db.select({ total: count() }).from(sitepingFeedbacks).where(where);
    return totals?.total ?? 0;
  };

  return {
    /**
     * One statement, no interactive transaction (Neon HTTP has none): the
     * feedback insert is a CTE, and the annotation insert selects from it —
     * so annotations land only with the feedback row, atomically.
     */
    async insertFeedback(feedback, annotations) {
      const insertedFeedback = db
        .$with(INSERTED_FEEDBACK_CTE_ALIAS)
        .as(
          db
            .insert(sitepingFeedbacks)
            .values(withSearchableMessage(feedback))
            .onConflictDoNothing({ target: sitepingFeedbacks.clientId })
            .returning({ id: sitepingFeedbacks.id }),
        );
      const statements: WithSubquery[] = [insertedFeedback];
      if (annotations.length > 0) {
        // Data-modifying CTEs always run to completion, even unreferenced.
        statements.push(
          db.$with(INSERTED_ANNOTATIONS_CTE_ALIAS).as(
            db.insert(sitepingAnnotations).select(
              selectValues(
                sitepingAnnotations,
                annotations.map((annotation, position) => ({ ...annotation, position })),
                sql`EXISTS (SELECT 1 FROM ${insertedFeedback})`,
                castToColumnType,
              ),
            ),
          ),
        );
      }
      const inserted = await db
        .with(...statements)
        .select({ id: insertedFeedback.id })
        .from(insertedFeedback);
      return inserted.length > 0;
    },
    async findFeedbacks(filter, { limit, offset }) {
      const where = whereClause(filter);
      const [rows, total] = await Promise.all([
        db
          .select(feedbackColumns)
          .from(sitepingFeedbacks)
          .where(where)
          .orderBy(...newestFeedbackFirst(sitepingFeedbacks.createdAt, sitepingFeedbacks.creationSequence))
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
        .select(selectValues(sitepingComments, [values], condition, castToColumnType))
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
          updatedAt: monotonicUpdatedAt(sitepingFeedbacks, updatedAt, GREATEST_VALUE_FUNCTION.postgres),
        })
        .where(eq(sitepingFeedbacks.id, id))
        .returning(feedbackColumns);
      return row ?? null;
    },
    async deleteById(id, options) {
      const rows = await db
        .delete(sitepingFeedbacks)
        .where(eq(sitepingFeedbacks.id, id))
        .returning(deletedFeedbackColumns(sitepingFeedbacks, options));
      return rows.length > 0 ? toDeletedFeedbacks(rows) : null;
    },
    // Annotations and comments follow their feedback through the `ON DELETE CASCADE` foreign keys.
    async deleteByProject(projectName) {
      await db.delete(sitepingFeedbacks).where(eq(sitepingFeedbacks.projectName, projectName));
    },
    async deleteProjectChunk(projectName, chunkSize) {
      const chunkIds = db
        .select({ id: sitepingFeedbacks.id })
        .from(sitepingFeedbacks)
        .where(eq(sitepingFeedbacks.projectName, projectName))
        .orderBy(sitepingFeedbacks.id)
        .limit(chunkSize);
      const rows = await db
        .delete(sitepingFeedbacks)
        .where(inArray(sitepingFeedbacks.id, chunkIds))
        .returning(deletedFeedbackColumns(sitepingFeedbacks, { collectScreenshotUrls: true }));
      return toDeletedFeedbacks(rows);
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
