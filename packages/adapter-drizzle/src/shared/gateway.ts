import type { AnnotationRecord, CommentRecord, FeedbackQuery, FeedbackRecord, FeedbackStatus } from "@siteping/core";

/** A stored feedback row — the record without its annotations and comments relations. */
export type FeedbackRow = Omit<FeedbackRecord, "annotations" | "comments">;

/**
 * An annotation row as the store reads and writes it — identical to the
 * record. The tables also hold an internal `position` (submission index),
 * which the gateway writes from the array order and reads back only as the
 * ordering.
 */
export type AnnotationRow = AnnotationRecord;

/**
 * A comment row as the store reads and writes it — identical to the record.
 * The tables also hold an internal `position` (posting index within the
 * thread), which the insert assigns and reads use only as the ordering.
 */
export type CommentRow = CommentRecord;

/** Filters of `getFeedbacks`, already normalized (bucket vs exact status resolved). */
export interface FeedbackFilter {
  projectName: string;
  type?: FeedbackQuery["type"];
  statuses?: readonly FeedbackStatus[];
  url?: string;
  urlPattern?: string;
  search?: string;
}

/**
 * The dialect-specific SQL a Drizzle-backed store needs. Each dialect entry
 * (`./pg`, `./libsql`) implements it with its own tables and query builder;
 * `DrizzleSitepingStore` owns every contract semantic on top of it.
 * @internal
 */
export interface SitepingSqlGateway {
  /**
   * Insert the feedback and its annotations atomically — without an
   * interactive `db.transaction` (one statement or one batch), so no driver
   * lock is held across an `await`. Returns `false` without writing when a
   * row with the same `clientId` already exists. Annotations keep their
   * array order when read back.
   */
  insertFeedback(feedback: FeedbackRow, annotations: readonly AnnotationRow[]): Promise<boolean>;
  findFeedbacks(
    filter: FeedbackFilter,
    page: { limit: number; offset: number },
  ): Promise<{ rows: FeedbackRow[]; total: number }>;
  /** Number of rows matching the filter — for a page no row can reach, without an `OFFSET` query. */
  countFeedbacks(filter: FeedbackFilter): Promise<number>;
  /** Annotations of the given feedbacks, each feedback's in submission order. */
  findAnnotations(feedbackIds: readonly string[]): Promise<AnnotationRow[]>;
  /** Comments of the given feedbacks, each thread in posting order. */
  findComments(feedbackIds: readonly string[]): Promise<CommentRow[]>;
  /** The comment with this `clientId`, on any thread; `null` when there is none. */
  findCommentByClientId(clientId: string): Promise<CommentRow | null>;
  /**
   * Insert a comment as the last of its thread, in one statement: nothing is
   * written when its feedback does not exist, its thread already holds
   * `maxComments`, or a comment with its `clientId` exists. Returns whether
   * it was inserted.
   */
  insertComment(comment: CommentRow, maxComments: number): Promise<boolean>;
  /** Delete one comment of one thread; `false` when that thread has no such comment. */
  deleteComment(feedbackId: string, commentId: string): Promise<boolean>;
  findByClientId(clientId: string): Promise<FeedbackRow | null>;
  /**
   * Project of one row, `null` when no row has that id. Reads only that
   * column: the row may hold a megabyte-sized inline screenshot, diagnostics
   * and PII the ownership check never needs.
   */
  findProjectName(id: string): Promise<string | null>;
  /**
   * Update one row's status. `updatedAt` is the store clock's time: the stored value
   * is never earlier than the row's own `createdAt` / `updatedAt`.
   */
  updateStatus(
    id: string,
    update: { status: FeedbackStatus; resolvedAt: Date | null; updatedAt: Date },
  ): Promise<FeedbackRow | null>;
  /** Delete one row, its annotations and its comments; `null` when no row has that id. */
  deleteById(id: string, options: DeleteFeedbacksOptions): Promise<DeletedFeedbacks | null>;
  /**
   * Delete every row of a project, their annotations and their comments atomically (one
   * statement or one batch), reading nothing back however many (possibly
   * inline, megabyte-sized) screenshots the rows hold.
   */
  deleteByProject(projectName: string): Promise<void>;
  /**
   * Delete at most `chunkSize` rows of a project, their annotations and their comments
   * atomically (one statement or one batch), reading back their uploaded
   * screenshot URLs — the response stays bounded however large the project.
   * The chunk is picked in `id` order. `deletedCount` is `0` once the project
   * has no row left, but also when a concurrent delete removed every row the
   * chunk picked.
   */
  deleteProjectChunk(projectName: string, chunkSize: number): Promise<DeletedFeedbacks>;
  /**
   * The given screenshot URLs that some stored feedback row still references —
   * e.g. the row of an insert that committed although the driver reported a
   * failure. Screenshot URLs are unique per feedback (`ScreenshotStorage`
   * contract); this lookup also keeps objects a contract-breaking storage
   * shares across rows. The caller bounds the list size.
   */
  findReferencedScreenshotUrls(screenshotUrls: readonly string[]): Promise<Set<string>>;
}

/** What a feedback delete reads back from the removed rows. */
export interface DeleteFeedbacksOptions {
  /**
   * Read back the removed rows' `screenshotUrl` — only worth it when a
   * `ScreenshotStorage.delete` hook will clean them up.
   */
  collectScreenshotUrls: boolean;
}

/** Outcome of a feedback delete. */
export interface DeletedFeedbacks {
  /** Number of feedback rows removed. */
  deletedCount: number;
  /**
   * Uploaded screenshot URLs of the removed rows (`null` for rows without one
   * or with an inline data URL); empty unless `collectScreenshotUrls`.
   */
  screenshotUrls: Array<string | null>;
}
