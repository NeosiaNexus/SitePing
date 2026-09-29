/**
 * Record-construction helpers and the collection-store engine.
 *
 * Every snapshot-style adapter (memory, localStorage, flat file, KV, …)
 * needs the same three ingredients: turn a `FeedbackCreateInput` into a
 * `FeedbackRecord` (null-normalizing optional fields, stamping ids and
 * timestamps), filter/paginate with `applyFeedbackFilters`, and implement
 * the dedup/update/delete choreography of the `SitepingStore` contract.
 *
 * `buildFeedbackRecord` / `buildAnnotationRecord` / `buildCommentRecord`
 * cover the first part for any adapter. `createCollectionStore` covers all
 * of it: give it `load`, `persist`, and `generateId`, and it returns a fully
 * conformant `SitepingStore` — writing a new snapshot adapter is ~20 lines
 * plus its storage specifics.
 */

import { applyFeedbackFilters } from "./filters.js";
import type {
  AnnotationCreateInput,
  AnnotationRecord,
  CommentCreateInput,
  CommentRecord,
  FeedbackCreateInput,
  FeedbackCreateOutcome,
  FeedbackPage,
  FeedbackQuery,
  FeedbackRecord,
  FeedbackUpdateInput,
  SitepingStore,
} from "./types.js";
import { MAX_COMMENTS_PER_FEEDBACK, StoreLimitError, StoreNotFoundError } from "./types.js";

// ---------------------------------------------------------------------------
// Record construction
// ---------------------------------------------------------------------------

/**
 * Build a persisted `AnnotationRecord` from its create input — normalizes
 * the optional anchor fields to `null` and stamps identity/timestamp.
 */
export function buildAnnotationRecord(
  input: AnnotationCreateInput,
  ctx: { id: string; feedbackId: string; now: Date },
): AnnotationRecord {
  return {
    id: ctx.id,
    feedbackId: ctx.feedbackId,
    cssSelector: input.cssSelector,
    xpath: input.xpath,
    textSnippet: input.textSnippet,
    elementTag: input.elementTag,
    elementId: input.elementId ?? null,
    textPrefix: input.textPrefix,
    textSuffix: input.textSuffix,
    fingerprint: input.fingerprint,
    neighborText: input.neighborText,
    anchorKey: input.anchorKey ?? null,
    xPct: input.xPct,
    yPct: input.yPct,
    wPct: input.wPct,
    hPct: input.hPct,
    scrollX: input.scrollX,
    scrollY: input.scrollY,
    viewportW: input.viewportW,
    viewportH: input.viewportH,
    devicePixelRatio: input.devicePixelRatio,
    createdAt: ctx.now,
  };
}

/** Build a persisted `CommentRecord` from its create input — stamps identity, thread and timestamp. */
export function buildCommentRecord(
  input: CommentCreateInput,
  ctx: { id: string; feedbackId: string; now?: Date },
): CommentRecord {
  return {
    id: ctx.id,
    feedbackId: ctx.feedbackId,
    body: input.body,
    authorName: input.authorName,
    authorEmail: input.authorEmail,
    authorRole: input.authorRole,
    clientId: input.clientId,
    createdAt: ctx.now ?? new Date(),
  };
}

/**
 * Build a persisted `FeedbackRecord` (with its annotations) from a create
 * input — normalizes every optional field to `null` and stamps ids and
 * timestamps. Adapters without external screenshot storage keep the data
 * URL inline on `screenshotUrl`, which is what this helper does; adapters
 * with a `ScreenshotStorage` upload first and override `screenshotUrl`.
 * It leaves `comments` out, so the record minus its `annotations` stays an
 * insertable feedback row; a store with threads returns `comments: []` itself.
 */
export function buildFeedbackRecord(
  input: FeedbackCreateInput,
  ctx: { id: string; annotationId: () => string; now?: Date },
): FeedbackRecord {
  const now = ctx.now ?? new Date();
  return {
    id: ctx.id,
    type: input.type,
    message: input.message,
    status: input.status,
    projectName: input.projectName,
    url: input.url,
    urlPattern: input.urlPattern ?? null,
    authorName: input.authorName,
    authorEmail: input.authorEmail,
    viewport: input.viewport,
    userAgent: input.userAgent,
    clientId: input.clientId,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
    annotations: input.annotations.map((ann) =>
      buildAnnotationRecord(ann, { id: ctx.annotationId(), feedbackId: ctx.id, now }),
    ),
    screenshotUrl: input.screenshotDataUrl ?? null,
    screenshotRegion: input.screenshotRegion ?? null,
    diagnostics: input.diagnostics ?? null,
  };
}

// ---------------------------------------------------------------------------
// Collection-store engine
// ---------------------------------------------------------------------------

/**
 * Storage primitives behind a collection store. `load`/`persist` may be
 * sync or async, so in-memory arrays, localStorage and async KV stores all
 * fit the same three functions. When both are sync, a mutation runs from
 * `load` to `persist` without yielding, so no other code in the realm can
 * write in between; an async backend is only serialized against the
 * engine's own queue.
 */
export interface CollectionStoreBackend {
  /**
   * Return the current full snapshot of feedback records. The engine never
   * mutates this array — handing out a live cache is safe.
   */
  load(): FeedbackRecord[] | Promise<FeedbackRecord[]>;
  /**
   * Persist the full snapshot — always a new array, never the one `load()`
   * returned. Throw `StorePersistenceError` when the write is lost (quota,
   * storage disabled, …) — never swallow the failure. Because the loaded
   * snapshot is left untouched, a throw here leaves a cached `load()` result
   * consistent with durable storage: no phantom record, no half-applied
   * update.
   */
  persist(feedbacks: FeedbackRecord[]): void | Promise<void>;
  /** Generate a unique id for a new feedback, annotation or comment record. */
  generateId(): string;
  /**
   * Keep discussion threads on the records: the store gains `addComment` and
   * `deleteComment`, and new records start with `comments: []`. Opt in once
   * `load` hands back what `persist` wrote for them, each comment's
   * `createdAt` a `Date` again (a JSON backend revives it like the record's
   * own dates). Off by default, so an adapter written before threads never
   * gains them — over storage never written for them — on an engine update.
   */
  comments?: boolean | undefined;
}

/**
 * A `SitepingStore` with the optional `verifyProjectOwnership` guaranteed —
 * what `createCollectionStore` returns, which also guarantees
 * `createFeedbackIfAbsent`.
 */
export type CollectionStore = SitepingStore & Required<Pick<SitepingStore, "verifyProjectOwnership">>;

/**
 * Build a fully conformant `SitepingStore` on top of a snapshot backend.
 *
 * The engine implements the whole store contract: clientId dedup (idempotent
 * create, with `createFeedbackIfAbsent` reporting inserts), newest-first
 * ordering, the standard filter/pagination pipeline, `StoreNotFoundError` on
 * missing update/delete, project-scoped bulk delete,
 * `verifyProjectOwnership`, and — with `comments: true` — discussion threads
 * (`addComment`, `deleteComment`) kept on each record. The snapshot returned by `load` is
 * never mutated: every write hands `persist` a new array, so a failed write leaves
 * a cached snapshot exactly as it was. When `persist` fails during `createFeedback`
 * and the record carries an inline screenshot, the engine retries once
 * without the screenshot (by far the heaviest field) so the text feedback
 * survives a storage-quota hit; if that also fails, the error propagates —
 * returning the record would claim a success that was never persisted.
 *
 * Mutations (`createFeedbackIfAbsent`, `createFeedback`, `updateFeedback`,
 * `deleteFeedback`, `deleteAllFeedbacks`, `addComment`, `deleteComment`) run
 * one at a time through a queue owned by the returned store, so concurrent
 * calls — the widget's `Promise.all` bulk resolve/delete, a comment posted
 * while its feedback is resolved — never start from the same snapshot and
 * overwrite each other, and `createFeedbackIfAbsent` reports `created: true`
 * exactly once per `clientId`. A failed mutation rejects with its own error
 * and does not block the ones queued after it, but `load` and `persist` must
 * always settle: one that never does stalls every later mutation on the
 * store, so give network-backed primitives a timeout. Reads are not queued: they see the
 * last persisted snapshot. The guarantee is scoped to one store instance in
 * one JS realm — two instances over the same storage (two
 * `LocalStorageStore`s on one key, two browser tabs, several server
 * processes sharing a KV or a file) are not coordinated; a backend that
 * needs that must bring its own atomic primitive (a transaction, a
 * compare-and-set).
 *
 * @example
 * ```ts
 * export class MemoryStore implements SitepingStore {
 *   private feedbacks: FeedbackRecord[] = [];
 *   private readonly store = createCollectionStore({
 *     load: () => this.feedbacks,
 *     persist: (next) => {
 *       this.feedbacks = next;
 *     },
 *     generateId: () => crypto.randomUUID(),
 *     comments: true,
 *   });
 *   createFeedback = this.store.createFeedback;
 *   // …delegate the remaining methods the same way
 * }
 * ```
 */
export function createCollectionStore(
  backend: CollectionStoreBackend & { comments: true },
): CollectionStore & Required<Pick<SitepingStore, "createFeedbackIfAbsent" | "addComment" | "deleteComment">>;
export function createCollectionStore(
  backend: CollectionStoreBackend,
): CollectionStore & Required<Pick<SitepingStore, "createFeedbackIfAbsent">>;
export function createCollectionStore(
  backend: CollectionStoreBackend,
): CollectionStore & Required<Pick<SitepingStore, "createFeedbackIfAbsent">> {
  // Every mutation is a load → modify → persist cycle over the WHOLE
  // snapshot, so two interleaved mutations would start from the same
  // snapshot and the last persist would silently drop the other's change
  // (the widget's bulk resolve/delete fires them all with `Promise.all`).
  // Mutations therefore run one at a time through this queue; `tail` never
  // rejects, so a failed mutation doesn't stall the ones queued after it.
  let tail: Promise<unknown> = Promise.resolve();
  function mutate<T>(mutation: (feedbacks: FeedbackRecord[]) => Promise<T>): Promise<T> {
    const result = tail.then(() => {
      // A sync snapshot goes to the mutation without an `await`, so on a sync
      // backend (memory, localStorage) load → persist is one uninterrupted
      // step: a write outside the queue, like `MemoryStore.clear()`, can't
      // land in between and be undone by a persist of the older snapshot.
      const loaded = backend.load();
      return Array.isArray(loaded) ? mutation(loaded) : loaded.then(mutation);
    });
    tail = result.catch(() => {});
    return result;
  }

  // Every mutation below builds a NEW array for `persist` instead of editing
  // the loaded one in place. A backend whose `load()` serves a live cache (an
  // in-memory array, a KV read-through) would otherwise see the change before
  // the write is confirmed — and when `persist` throws, the phantom record
  // stays visible, and the widget's retry of the same clientId dedups against
  // it instead of being written for real.
  const createFeedbackIfAbsent = (data: FeedbackCreateInput): Promise<FeedbackCreateOutcome> =>
    mutate(async (feedbacks) => {
      // ClientId dedup — idempotent
      const existing = feedbacks.find((f) => f.clientId === data.clientId);
      if (existing) return { feedback: existing, created: false };

      const record: FeedbackRecord = buildFeedbackRecord(data, {
        id: backend.generateId(),
        annotationId: () => backend.generateId(),
      });
      if (backend.comments) record.comments = [];

      const next = [record, ...feedbacks];
      try {
        await backend.persist(next);
      } catch (err) {
        if (!record.screenshotUrl) throw err;
        record.screenshotUrl = null;
        await backend.persist(next);
      }
      return { feedback: record, created: true };
    });

  const store: CollectionStore & Required<Pick<SitepingStore, "createFeedbackIfAbsent">> = {
    createFeedbackIfAbsent,

    async createFeedback(data: FeedbackCreateInput): Promise<FeedbackRecord> {
      return (await createFeedbackIfAbsent(data)).feedback;
    },

    async getFeedbacks(query: FeedbackQuery): Promise<FeedbackPage> {
      return applyFeedbackFilters(await backend.load(), query);
    },

    async findByClientId(clientId: string): Promise<FeedbackRecord | null> {
      return (await backend.load()).find((f) => f.clientId === clientId) ?? null;
    },

    updateFeedback: (id: string, data: FeedbackUpdateInput): Promise<FeedbackRecord> =>
      mutate(async (feedbacks) => {
        const current = feedbacks.find((f) => f.id === id);
        if (!current) throw new StoreNotFoundError();

        const updated: FeedbackRecord = {
          ...current,
          status: data.status,
          resolvedAt: data.resolvedAt,
          updatedAt: new Date(),
        };
        await backend.persist(feedbacks.map((f) => (f === current ? updated : f)));
        return updated;
      }),

    deleteFeedback: (id: string): Promise<void> =>
      mutate(async (feedbacks) => {
        if (!feedbacks.some((f) => f.id === id)) throw new StoreNotFoundError();

        await backend.persist(feedbacks.filter((f) => f.id !== id));
      }),

    deleteAllFeedbacks: (projectName: string): Promise<void> =>
      mutate(async (feedbacks) => {
        await backend.persist(feedbacks.filter((f) => f.projectName !== projectName));
      }),

    async verifyProjectOwnership(id: string, projectName: string): Promise<boolean> {
      const fb = (await backend.load()).find((f) => f.id === id);
      return fb !== undefined && fb.projectName === projectName;
    },
  };
  if (!backend.comments) return store;

  return {
    ...store,

    addComment: (feedbackId: string, data: CommentCreateInput): Promise<CommentRecord> =>
      mutate(async (feedbacks) => {
        // ClientId dedup across every thread — idempotent, like createFeedback
        const existing = feedbacks.flatMap((f) => f.comments ?? []).find((c) => c.clientId === data.clientId);
        if (existing) return existing;

        const current = feedbacks.find((f) => f.id === feedbackId);
        if (!current) throw new StoreNotFoundError();
        const thread = current.comments ?? [];
        if (
          data.authorRole === "client" &&
          thread.filter((c) => c.authorRole === "client").length >= MAX_COMMENTS_PER_FEEDBACK
        ) {
          throw new StoreLimitError(`A thread holds at most ${MAX_COMMENTS_PER_FEEDBACK} client comments`);
        }

        const comment = buildCommentRecord(data, { id: backend.generateId(), feedbackId });
        const updated: FeedbackRecord = { ...current, comments: [...thread, comment] };
        await backend.persist(feedbacks.map((f) => (f === current ? updated : f)));
        return comment;
      }),

    deleteComment: (feedbackId: string, commentId: string): Promise<void> =>
      mutate(async (feedbacks) => {
        const current = feedbacks.find((f) => f.id === feedbackId);
        const thread = current?.comments ?? [];
        // A comment of another thread is "not found" here: the caller was
        // only authorized for this one.
        if (!current || !thread.some((c) => c.id === commentId)) throw new StoreNotFoundError();

        const updated: FeedbackRecord = { ...current, comments: thread.filter((c) => c.id !== commentId) };
        await backend.persist(feedbacks.map((f) => (f === current ? updated : f)));
      }),
  };
}
