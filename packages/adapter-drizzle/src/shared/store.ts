import {
  buildCommentRecord,
  buildFeedbackRecord,
  type CommentCreateInput,
  type CommentRecord,
  clampPagination,
  type FeedbackCreateInput,
  type FeedbackCreateOutcome,
  type FeedbackPage,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackUpdateInput,
  isStoreDuplicate,
  isStoreNotFound,
  isStorePersistence,
  isUnreachableOffset,
  MAX_COMMENTS_PER_FEEDBACK,
  type ScreenshotStorage,
  type SitepingStore,
  StoreLimitError,
  StoreNotFoundError,
  StorePersistenceError,
  screenshotMimeType,
} from "@siteping/core";
import { PROJECT_DELETE_CHUNK_SIZE } from "../constants/deletes.js";
import { DRIZZLE_STORE_MESSAGE_PREFIX, type DrizzleStoreMutation } from "../constants/errors.js";
import {
  INLINE_SCREENSHOT_URL_PREFIX,
  SCREENSHOT_DELETE_CONCURRENCY,
  SCREENSHOT_REFERENCE_LOOKUP_BATCH_SIZE,
} from "../constants/screenshots.js";
import { settleWithConcurrencyLimit } from "./concurrency.js";
import { withDriverErrors } from "./errors.js";
import type {
  AnnotationRow,
  CommentRow,
  DeleteFeedbacksOptions,
  FeedbackFilter,
  FeedbackRow,
  SitepingSqlGateway,
} from "./gateway.js";
import { toStorableText, toStorableValue } from "./text.js";

/**
 * The store returned by the dialect factories — the full contract, including
 * the ownership check, the atomic `createFeedbackIfAbsent` and discussion
 * threads.
 */
export type DrizzleStore = SitepingStore &
  Required<Pick<SitepingStore, "verifyProjectOwnership" | "createFeedbackIfAbsent" | "addComment" | "deleteComment">>;

/**
 * Where the store reports degraded-but-non-fatal situations (failed
 * screenshot uploads or cleanups, inline screenshots). `console` satisfies it.
 */
export interface DrizzleStoreLogger {
  warn(message: string, context: Record<string, unknown>): void;
}

export interface DrizzleStoreOptions {
  /**
   * Upload screenshots to external storage (S3, R2, Cloudflare Images…) and
   * persist only the returned URL. Without it, the base64 data URL is stored
   * inline (warned once) — fine for development, heavy for production.
   */
  screenshotStorage?: ScreenshotStorage | undefined;
  /**
   * Degraded-path reporting (failed uploads/cleanups, inline screenshots).
   * The store never picks a logging backend itself: without one these events
   * are dropped, so pass your application's logger (or `console`) to see them.
   */
  logger?: DrizzleStoreLogger | undefined;
  /**
   * Clock for record timestamps: `createdAt` of new feedbacks and comments,
   * `updatedAt` of status updates. Defaults to the system clock.
   */
  now?: (() => Date) | undefined;
}

/** Logger of stores created without one: drops every event, leaving the logging policy to the host application. */
const silentLogger: DrizzleStoreLogger = {
  warn() {},
};

/** Clock of stores created without one. */
const systemClock = (): Date => new Date();

/** Whether a store error already carries its contract meaning and must propagate untouched. */
function isStoreContractError(error: unknown): boolean {
  return isStoreNotFound(error) || isStoreDuplicate(error) || isStorePersistence(error);
}

/**
 * Run database calls a mutation makes (its write, or a read it depends on),
 * reporting any database failure (read-only or full database, lost
 * connection, rejected statement…) as `StorePersistenceError`, the
 * `SitepingStore` mutation contract, with the driver's own error as `cause`.
 *
 * @param mutation - Store method being served, for the message.
 * @param identifiers - Minimal ids to debug the failure (never payload data).
 * @param run - The database calls.
 */
async function persistMutation<Result>(
  mutation: DrizzleStoreMutation,
  identifiers: Record<string, string>,
  run: () => Promise<Result>,
): Promise<Result> {
  try {
    return await run();
  } catch (error) {
    if (isStoreContractError(error)) throw error;
    const context = Object.entries(identifiers)
      .map(([name, value]) => `${name}=${value}`)
      .join(" ");
    throw new StorePersistenceError(`${DRIZZLE_STORE_MESSAGE_PREFIX}.${mutation} failed to write (${context})`, {
      cause: error,
    });
  }
}

/** Rows grouped by their `feedbackId`, each group in the order the rows came. */
function groupByFeedback<Row extends { feedbackId: string }>(rows: readonly Row[]): Map<string, Row[]> {
  const byFeedback = new Map<string, Row[]>();
  for (const row of rows) {
    const siblings = byFeedback.get(row.feedbackId);
    if (siblings) siblings.push(row);
    else byFeedback.set(row.feedbackId, [row]);
  }
  return byFeedback;
}

/** Whether a stored `screenshotUrl` points at an object the storage owns (inline data URLs were never uploaded). */
function isUploadedScreenshotUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.length > 0 && !url.startsWith(INLINE_SCREENSHOT_URL_PREFIX);
}

/**
 * `SitepingStore` over a dialect gateway: ids, timestamps, clientId
 * idempotency, screenshot upload/cleanup and the error contract live here,
 * SQL lives in the gateway. Every string a method receives goes through
 * {@link toStorableText} before it reaches the gateway.
 * @internal
 */
export class DrizzleSitepingStore implements DrizzleStore {
  private readonly gateway: SitepingSqlGateway;
  private readonly screenshotStorage: ScreenshotStorage | undefined;
  private readonly logger: DrizzleStoreLogger;
  private readonly now: () => Date;
  private inlineScreenshotWarned = false;

  constructor(gateway: SitepingSqlGateway, options: DrizzleStoreOptions = {}) {
    this.gateway = withDriverErrors(gateway);
    this.screenshotStorage = options.screenshotStorage;
    this.logger = options.logger ?? silentLogger;
    this.now = options.now ?? systemClock;
  }

  async createFeedback(data: FeedbackCreateInput): Promise<FeedbackRecord> {
    return (await this.createFeedbackIfAbsent(data)).feedback;
  }

  /**
   * Insert the feedback unless a row with the same `clientId` exists. The
   * unique `client_id` index plus `ON CONFLICT DO NOTHING` make the check
   * atomic across store instances and processes: of N concurrent calls, only
   * the one whose insert lands reports `created: true`.
   *
   * @throws `StorePersistenceError` when a database call fails: the lookup
   *   of the `clientId`, the insert, or — when the insert loses the race — the
   *   read-back of the winning row. If that row was deleted in the meantime,
   *   an `Error` naming the `clientId` is thrown (the caller may retry the
   *   submission). On every failure path, the screenshot this attempt uploaded
   *   is discarded first — no committed row references it.
   */
  async createFeedbackIfAbsent(submitted: FeedbackCreateInput): Promise<FeedbackCreateOutcome> {
    const data = toStorableValue(submitted);
    const identifiers = { clientId: data.clientId };
    const existing = await persistMutation("createFeedback", identifiers, () => this.findByClientId(data.clientId));
    if (existing) return { feedback: existing, created: false };

    // Fresh per attempt: racing creates of one clientId upload under distinct
    // ids, so the winner's object is never overwritten by a loser's upload.
    const id = crypto.randomUUID();
    const screenshotUrl = await this.persistScreenshot(data.screenshotDataUrl, {
      feedbackId: id,
      clientId: data.clientId,
    });
    const { annotations, ...feedback } = buildFeedbackRecord(data, {
      id,
      annotationId: () => crypto.randomUUID(),
      // The clock value as is: rows created in the same millisecond — by this
      // or any other instance — are ordered by the database-wide insertion
      // ordinal, so a later insert always lists first.
      now: this.now(),
    });
    const row: FeedbackRow = { ...feedback, screenshotUrl };

    let inserted: boolean;
    try {
      inserted = await persistMutation("createFeedback", identifiers, () =>
        this.gateway.insertFeedback(row, annotations),
      );
    } catch (error) {
      // A failure reported after the commit (e.g. a dropped connection) may
      // have stored this attempt's row: the reference check keeps its screenshot.
      await this.discardScreenshots([screenshotUrl], { clientId: data.clientId });
      throw error;
    }
    if (inserted) {
      return { feedback: { ...row, annotations, comments: [] }, created: true };
    }

    // Lost a race against the same clientId: the stored row keeps its own
    // screenshot, uploaded under its own id, so the one just uploaded is an
    // orphan no row references (screenshot URLs are unique per feedback id).
    // It is discarded however the winner lookup ends — found, deleted in the
    // meantime, or rejected.
    let winner: FeedbackRecord | null;
    try {
      winner = await persistMutation("createFeedback", identifiers, () => this.findByClientId(data.clientId));
    } finally {
      await this.discardScreenshots([screenshotUrl], { clientId: data.clientId });
    }
    if (!winner) {
      throw new Error(
        `${DRIZZLE_STORE_MESSAGE_PREFIX}.createFeedbackIfAbsent: clientId ${data.clientId} conflicted but no row was found (the winning row was deleted before it could be read back)`,
      );
    }
    return { feedback: winner, created: false };
  }

  async getFeedbacks(submittedQuery: FeedbackQuery): Promise<FeedbackPage> {
    const query = toStorableValue(submittedQuery);
    const { limit, skip } = clampPagination(query);
    const filter: FeedbackFilter = { projectName: query.projectName };
    if (query.type) filter.type = query.type;
    // A non-empty `statuses` bucket wins over the exact `status` filter.
    if (query.statuses && query.statuses.length > 0) filter.statuses = query.statuses;
    else if (query.status) filter.statuses = [query.status];
    if (query.url) filter.url = query.url;
    if (query.urlPattern) filter.urlPattern = query.urlPattern;
    if (query.search) filter.search = query.search;

    // A huge `page` from a direct caller yields an offset PostgreSQL and
    // SQLite reject as `OFFSET`: answer the empty page the in-memory stores
    // return, with the real total, without issuing the `OFFSET` query.
    if (isUnreachableOffset(skip)) {
      return { feedbacks: [], total: await this.gateway.countFeedbacks(filter) };
    }

    const { rows, total } = await this.gateway.findFeedbacks(filter, { limit, offset: skip });
    return { feedbacks: await this.withRelations(rows), total };
  }

  async findByClientId(clientId: string): Promise<FeedbackRecord | null> {
    const row = await this.gateway.findByClientId(toStorableText(clientId));
    return row ? ((await this.withRelations([row]))[0] ?? null) : null;
  }

  /**
   * Update a feedback's status. Its annotations and thread are read before the
   * update — annotations never change after the insert, and the thread is the
   * one at the time of the update: once the update commits, no database call
   * is left that could fail and make the caller retry an applied update.
   *
   * @throws `StoreNotFoundError` when no row has that id.
   * @throws `StorePersistenceError` when reading the annotations, the thread
   *   or the update fails — a failed read leaves the row untouched.
   */
  async updateFeedback(submittedId: string, data: FeedbackUpdateInput): Promise<FeedbackRecord> {
    const id = toStorableText(submittedId);
    const { relationsOf, row } = await persistMutation("updateFeedback", { id }, async () => {
      const relationsOf = await this.readRelations([id]);
      // The gateway clamps updatedAt to the row's createdAt, which another
      // process whose clock runs ahead may have stamped later than this clock.
      const row = await this.gateway.updateStatus(id, {
        status: data.status,
        resolvedAt: data.resolvedAt,
        updatedAt: this.now(),
      });
      return { relationsOf, row };
    });
    if (!row) throw new StoreNotFoundError();
    return { ...row, ...relationsOf(id) };
  }

  async deleteFeedback(submittedId: string): Promise<void> {
    const id = toStorableText(submittedId);
    const deleted = await persistMutation("deleteFeedback", { id }, () =>
      this.gateway.deleteById(id, this.deleteOptions()),
    );
    if (!deleted) throw new StoreNotFoundError();
    await this.discardScreenshots(deleted.screenshotUrls);
  }

  /**
   * Delete every feedback of a project. Rows go first, storage second: orphaned
   * objects are acceptable, rows pointing at deleted screenshots are not.
   *
   * Without a `ScreenshotStorage.delete` hook, one atomic statement (or batch)
   * removes the project and reads nothing back. With one, the removed URLs are
   * needed for cleanup, so rows go in chunks of
   * {@link PROJECT_DELETE_CHUNK_SIZE}, each deleted atomically and its
   * screenshots cleaned up before the next one: every driver response and the
   * URLs held in memory stay bounded however large the project. The call
   * returns once the project has no row left, whatever deletes run alongside.
   *
   * @throws `StorePersistenceError` when a chunk fails. The chunks before it
   *   stay deleted and their screenshots are already cleaned up; the delete is
   *   idempotent, so retrying it removes the remaining rows. When the failing
   *   chunk committed although the driver reported an error, its rows are gone
   *   and their screenshots are left in the storage as orphans. Also thrown
   *   when the database keeps rows it is told to delete (a row-level security
   *   policy or a trigger that skips deletes), instead of retrying forever.
   */
  async deleteAllFeedbacks(submittedProjectName: string): Promise<void> {
    const projectName = toStorableText(submittedProjectName);
    if (!this.deleteOptions().collectScreenshotUrls) {
      await persistMutation("deleteAllFeedbacks", { projectName }, () => this.gateway.deleteByProject(projectName));
      return;
    }
    let remainingAfterEmptyChunk = Number.POSITIVE_INFINITY;
    for (;;) {
      const deleted = await persistMutation("deleteAllFeedbacks", { projectName }, () =>
        this.gateway.deleteProjectChunk(projectName, PROJECT_DELETE_CHUNK_SIZE),
      );
      if (deleted.deletedCount > 0) {
        await this.discardScreenshots(deleted.screenshotUrls);
        continue;
      }
      // Neither a short nor an empty chunk means the project is empty: on
      // PostgreSQL, a concurrent delete may take some or all of the rows a chunk
      // picked (the statement waits for its locks, then skips the rows it
      // removed). Only a project left empty ends the delete. The next chunk
      // waits for the concurrent delete, so rows keep going; when none went
      // since the last empty chunk, nothing will remove them.
      const remaining = await persistMutation("deleteAllFeedbacks", { projectName }, () =>
        this.gateway.countFeedbacks({ projectName }),
      );
      if (remaining === 0) return;
      if (remaining >= remainingAfterEmptyChunk) {
        throw new StorePersistenceError(
          `${DRIZZLE_STORE_MESSAGE_PREFIX}.deleteAllFeedbacks: the database kept ${remaining} rows it was told to delete (projectName=${projectName})`,
        );
      }
      remainingAfterEmptyChunk = remaining;
    }
  }

  async verifyProjectOwnership(id: string, projectName: string): Promise<boolean> {
    return (await this.gateway.findProjectName(toStorableText(id))) === toStorableText(projectName);
  }

  /**
   * Add a comment as the last of its thread, in one statement that also
   * checks the feedback, the thread cap and the `clientId` — atomic across
   * store instances and processes, except that posts racing for the last
   * free slot may overshoot the cap by the ones that run concurrently.
   *
   * @throws `StoreNotFoundError` when the feedback does not exist, including
   *   when it is deleted while the comment is being inserted.
   * @throws `StoreLimitError` when its thread already holds `MAX_COMMENTS_PER_FEEDBACK` comments.
   * @throws `StorePersistenceError` when a database call fails.
   */
  async addComment(submittedFeedbackId: string, submitted: CommentCreateInput): Promise<CommentRecord> {
    const feedbackId = toStorableText(submittedFeedbackId);
    const data = toStorableValue(submitted);
    const comment = buildCommentRecord(data, { id: crypto.randomUUID(), feedbackId, now: this.now() });
    const identifiers = { feedbackId, clientId: data.clientId };
    let inserted: boolean;
    try {
      inserted = await persistMutation("addComment", identifiers, () =>
        this.gateway.insertComment(comment, MAX_COMMENTS_PER_FEEDBACK),
      );
    } catch (error) {
      // PostgreSQL checks that the feedback exists on the statement's snapshot, and
      // its foreign key after it: a feedback deleted in between fails the insert
      // instead of skipping it. When the feedback is gone, that is a missing
      // feedback; when the lookup fails too, the insert's own failure stands.
      const feedbackGone = await this.gateway.findProjectName(feedbackId).then(
        (projectName) => projectName === null,
        () => false,
      );
      if (feedbackGone) throw new StoreNotFoundError();
      throw error;
    }
    if (inserted) return comment;

    // Nothing written: a replay of the clientId, a missing feedback, or a full thread.
    const replayed = await persistMutation("addComment", identifiers, () =>
      this.gateway.findCommentByClientId(data.clientId),
    );
    if (replayed) return replayed;
    const projectName = await persistMutation("addComment", identifiers, () =>
      this.gateway.findProjectName(feedbackId),
    );
    if (projectName === null) throw new StoreNotFoundError();
    throw new StoreLimitError(`A thread holds at most ${MAX_COMMENTS_PER_FEEDBACK} comments`);
  }

  async deleteComment(submittedFeedbackId: string, submittedCommentId: string): Promise<void> {
    const feedbackId = toStorableText(submittedFeedbackId);
    const commentId = toStorableText(submittedCommentId);
    const deleted = await persistMutation("deleteComment", { feedbackId, commentId }, () =>
      this.gateway.deleteComment(feedbackId, commentId),
    );
    if (!deleted) throw new StoreNotFoundError();
  }

  /**
   * Deletes read the removed screenshot URLs back only when a
   * `ScreenshotStorage.delete` hook can clean them up: without one there is
   * nothing to do with them, and inline data URLs would be materialized for
   * every deleted row.
   */
  private deleteOptions(): DeleteFeedbacksOptions {
    return { collectScreenshotUrls: typeof this.screenshotStorage?.delete === "function" };
  }

  private async withRelations(rows: readonly FeedbackRow[]): Promise<FeedbackRecord[]> {
    if (rows.length === 0) return [];
    const relationsOf = await this.readRelations(rows.map((row) => row.id));
    return rows.map((row) => ({ ...row, ...relationsOf(row.id) }));
  }

  /** Read the annotations and threads of `feedbackIds`, then hand out each feedback's. */
  private async readRelations(
    feedbackIds: readonly string[],
  ): Promise<(feedbackId: string) => { annotations: AnnotationRow[]; comments: CommentRow[] }> {
    const [annotations, comments] = await Promise.all([
      this.gateway.findAnnotations(feedbackIds),
      this.gateway.findComments(feedbackIds),
    ]);
    const annotationsOf = groupByFeedback(annotations);
    const commentsOf = groupByFeedback(comments);
    return (feedbackId) => ({
      annotations: annotationsOf.get(feedbackId) ?? [],
      comments: commentsOf.get(feedbackId) ?? [],
    });
  }

  /**
   * Value to persist on `screenshotUrl`: the storage URL, `null` when the
   * upload fails (an inline fallback would bloat the database unnoticed
   * during a storage outage), or the inline data URL without storage.
   *
   * @param dataUrl - Screenshot submitted with the feedback, if any.
   * @param attempt - `feedbackId` is the id this create attempt will insert
   *   the row under — unique per attempt and never client-supplied — so
   *   racing attempts on one `clientId` never write the same object;
   *   `clientId` is only reported in logs.
   */
  private async persistScreenshot(
    dataUrl: string | null | undefined,
    { feedbackId, clientId }: { feedbackId: string; clientId: string },
  ): Promise<string | null> {
    if (!dataUrl) return null;
    if (this.screenshotStorage) {
      try {
        const { url } = await this.screenshotStorage.upload(dataUrl, {
          feedbackId,
          mimeType: screenshotMimeType(dataUrl),
        });
        return url;
      } catch (error) {
        this.logger.warn(
          "[siteping] DrizzleStore: screenshotStorage.upload failed — feedback saved without screenshot",
          { clientId, feedbackId, error },
        );
        return null;
      }
    }
    if (!this.inlineScreenshotWarned) {
      this.inlineScreenshotWarned = true;
      this.logger.warn(
        "[siteping] DrizzleStore: no screenshotStorage configured — screenshots are stored inline as base64. Configure a ScreenshotStorage for production.",
        {},
      );
    }
    return dataUrl;
  }

  /**
   * Best-effort cleanup through `ScreenshotStorage.delete` of the screenshots
   * no stored feedback references any more; inline data URLs were never
   * uploaded and are skipped.
   *
   * The `ScreenshotStorage` contract makes every URL unique to the feedback id
   * it was uploaded for, and each create attempt uploads under a fresh id, so
   * a URL passed here belongs to one row only and no concurrent create can
   * acquire it: deleting it after the reference check cannot race with a new
   * reference. The check still runs because the owning row may exist after
   * all — an insert that committed although the driver reported a failure —
   * and, as defense in depth, it keeps objects a contract-breaking storage
   * shares across rows (a concurrent create that reuses such a URL after the
   * check is outside the contract and not covered). When the check itself
   * fails, every object is kept (an orphan is acceptable, a row pointing at a
   * deleted screenshot is not).
   *
   * Deletes run through a pool of at most {@link SCREENSHOT_DELETE_CONCURRENCY}
   * concurrent calls, so a project delete freeing thousands of objects does not
   * flood the storage. Failures are logged, never thrown. Each delete runs
   * inside its own promise, so a hook that throws synchronously is settled like
   * a rejection: it neither fails an already committed delete nor skips the
   * remaining objects.
   *
   * @param urls - `screenshotUrl` values of removed rows or of a discarded upload.
   * @param context - Identifiers added to the log lines (never payload data).
   */
  private async discardScreenshots(
    urls: ReadonlyArray<string | null | undefined>,
    context: Record<string, string> = {},
  ): Promise<void> {
    const remove = this.screenshotStorage?.delete?.bind(this.screenshotStorage);
    if (!remove) return;
    const candidates = [...new Set(urls.filter(isUploadedScreenshotUrl))];
    if (candidates.length === 0) return;

    let referenced: Set<string>;
    try {
      referenced = await this.findReferencedScreenshotUrls(candidates);
    } catch (lookupError) {
      this.logger.warn(
        `${DRIZZLE_STORE_MESSAGE_PREFIX}: screenshot references could not be checked — screenshots kept`,
        { ...context, screenshotUrls: candidates, error: lookupError },
      );
      return;
    }
    const unreferenced = candidates.filter((url) => !referenced.has(url));
    const results = await settleWithConcurrencyLimit(unreferenced, SCREENSHOT_DELETE_CONCURRENCY, async (url) =>
      remove(url),
    );
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        this.logger.warn(`${DRIZZLE_STORE_MESSAGE_PREFIX}: screenshotStorage.delete failed — object left in place`, {
          ...context,
          screenshotUrl: unreferenced[index],
          error: result.reason,
        });
      }
    });
  }

  /**
   * The URLs among `screenshotUrls` that a stored row still references, looked
   * up in batches of {@link SCREENSHOT_REFERENCE_LOOKUP_BATCH_SIZE}.
   *
   * @param screenshotUrls - Distinct uploaded screenshot URLs.
   */
  private async findReferencedScreenshotUrls(screenshotUrls: readonly string[]): Promise<Set<string>> {
    const referenced = new Set<string>();
    for (let start = 0; start < screenshotUrls.length; start += SCREENSHOT_REFERENCE_LOOKUP_BATCH_SIZE) {
      const batch = screenshotUrls.slice(start, start + SCREENSHOT_REFERENCE_LOOKUP_BATCH_SIZE);
      for (const url of await this.gateway.findReferencedScreenshotUrls(batch)) referenced.add(url);
    }
    return referenced;
  }
}
