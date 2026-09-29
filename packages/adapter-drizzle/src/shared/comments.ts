import type { CommentRecord } from "@siteping/core";
import { type Column, type SQL, sql, type Table } from "drizzle-orm";

/** The columns a comment insert reads besides its own values — satisfied by both dialects' tables. */
export interface CommentInsertTables {
  feedbacks: Table & { id: Column };
  comments: Table & { feedbackId: Column; position: Column; authorRole: Column };
}

/**
 * Values and guard of a comment insert-select, one statement on both
 * dialects: the comment lands as the last of its thread (`position` one past
 * the thread's highest), and only when its feedback exists and — for a
 * `client` comment — its thread holds fewer than `maxComments` of them.
 *
 * @param tables - The feedback and comment tables of the dialect.
 * @param comment - The comment to insert.
 * @param maxComments - Most `client` comments a thread holds.
 */
export function guardedCommentInsert(
  { feedbacks, comments }: CommentInsertTables,
  comment: CommentRecord,
  maxComments: number,
): { values: Record<string, unknown>; condition: SQL } {
  const inThread = sql`${comments.feedbackId} = ${comment.feedbackId}`;
  const exists = sql`EXISTS (SELECT 1 FROM ${feedbacks} WHERE ${feedbacks.id} = ${comment.feedbackId})`;
  return {
    values: {
      ...comment,
      position: sql`(SELECT COALESCE(MAX(${comments.position}) + 1, 0) FROM ${comments} WHERE ${inThread})`,
    },
    condition:
      comment.authorRole === "client"
        ? sql`${exists} AND (SELECT COUNT(*) FROM ${comments} WHERE ${inThread} AND ${comments.authorRole} = 'client') < ${maxComments}`
        : exists,
  };
}
