/**
 * Record-construction helpers and the collection-store engine.
 *
 * Every snapshot-style adapter (memory, localStorage, flat file, KV, …)
 * needs the same three ingredients: turn a `FeedbackCreateInput` into a
 * `FeedbackRecord` (null-normalizing optional fields, stamping ids and
 * timestamps), filter/paginate with `applyFeedbackFilters`, and implement
 * the dedup/update/delete choreography of the `SitepingStore` contract.
 *
 * `buildFeedbackRecord` / `buildAnnotationRecord` cover the first part for
 * any adapter. `createCollectionStore` covers all of it: give it `load`,
 * `persist`, and `generateId`, and it returns a fully conformant
 * `SitepingStore` — writing a new snapshot adapter is ~20 lines plus its
 * storage specifics.
 */

import { applyFeedbackFilters } from "./filters.js";
import type {
  AnnotationCreateInput,
  AnnotationRecord,
  FeedbackCreateInput,
  FeedbackPage,
  FeedbackQuery,
  FeedbackRecord,
  FeedbackUpdateInput,
  SitepingStore,
} from "./types.js";
import { StoreNotFoundError } from "./types.js";

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

/**
 * Build a persisted `FeedbackRecord` (with its annotations) from a create
 * input — normalizes every optional field to `null` and stamps ids and
 * timestamps. Adapters without external screenshot storage keep the data
 * URL inline on `screenshotUrl`, which is what this helper does; adapters
 * with a `ScreenshotStorage` upload first and override `screenshotUrl`.
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
 * sync or async — the engine awaits both, so in-memory arrays, localStorage
 * and async KV stores all fit the same three functions.
 */
export interface CollectionStoreBackend {
  /** Return the current full snapshot of feedback records. */
  load(): FeedbackRecord[] | Promise<FeedbackRecord[]>;
  /**
   * Persist the full snapshot. Throw `StorePersistenceError` when the write
   * is lost (quota, storage disabled, …) — never swallow the failure.
   */
  persist(feedbacks: FeedbackRecord[]): void | Promise<void>;
  /** Generate a unique id for a new feedback or annotation record. */
  generateId(): string;
}

/**
 * A `SitepingStore` with the optional `verifyProjectOwnership` guaranteed —
 * what `createCollectionStore` returns.
 */
export type CollectionStore = SitepingStore & Required<Pick<SitepingStore, "verifyProjectOwnership">>;

/**
 * Build a fully conformant `SitepingStore` on top of a snapshot backend.
 *
 * The engine implements the whole store contract: clientId dedup (idempotent
 * create), newest-first ordering, the standard filter/pagination pipeline,
 * `StoreNotFoundError` on missing update/delete, project-scoped bulk delete,
 * and `verifyProjectOwnership`. When `persist` fails during `createFeedback`
 * and the record carries an inline screenshot, the engine retries once
 * without the screenshot (by far the heaviest field) so the text feedback
 * survives a storage-quota hit; if that also fails, the error propagates —
 * returning the record would claim a success that was never persisted.
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
 *   });
 *   createFeedback = this.store.createFeedback;
 *   // …delegate the remaining methods the same way
 * }
 * ```
 */
export function createCollectionStore(backend: CollectionStoreBackend): CollectionStore {
  return {
    async createFeedback(data: FeedbackCreateInput): Promise<FeedbackRecord> {
      const feedbacks = await backend.load();

      // ClientId dedup — idempotent
      const existing = feedbacks.find((f) => f.clientId === data.clientId);
      if (existing) return existing;

      const record = buildFeedbackRecord(data, {
        id: backend.generateId(),
        annotationId: () => backend.generateId(),
      });

      feedbacks.unshift(record);
      try {
        await backend.persist(feedbacks);
      } catch (err) {
        if (!record.screenshotUrl) throw err;
        record.screenshotUrl = null;
        await backend.persist(feedbacks);
      }
      return record;
    },

    async getFeedbacks(query: FeedbackQuery): Promise<FeedbackPage> {
      return applyFeedbackFilters(await backend.load(), query);
    },

    async findByClientId(clientId: string): Promise<FeedbackRecord | null> {
      return (await backend.load()).find((f) => f.clientId === clientId) ?? null;
    },

    async updateFeedback(id: string, data: FeedbackUpdateInput): Promise<FeedbackRecord> {
      const feedbacks = await backend.load();
      const fb = feedbacks.find((f) => f.id === id);
      if (!fb) throw new StoreNotFoundError();

      fb.status = data.status;
      fb.resolvedAt = data.resolvedAt;
      fb.updatedAt = new Date();
      await backend.persist(feedbacks);
      return fb;
    },

    async deleteFeedback(id: string): Promise<void> {
      const feedbacks = await backend.load();
      const idx = feedbacks.findIndex((f) => f.id === id);
      if (idx === -1) throw new StoreNotFoundError();

      feedbacks.splice(idx, 1);
      await backend.persist(feedbacks);
    },

    async deleteAllFeedbacks(projectName: string): Promise<void> {
      const feedbacks = await backend.load();
      await backend.persist(feedbacks.filter((f) => f.projectName !== projectName));
    },

    async verifyProjectOwnership(id: string, projectName: string): Promise<boolean> {
      const fb = (await backend.load()).find((f) => f.id === id);
      return fb !== undefined && fb.projectName === projectName;
    },
  };
}
