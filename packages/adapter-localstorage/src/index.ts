import {
  createCollectionStore,
  type FeedbackCreateInput,
  type FeedbackPage,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackUpdateInput,
  type Serialized,
  type SitepingStore,
  StorePersistenceError,
} from "@siteping/core";

export type { SitepingStore } from "@siteping/core";
export { isStorePersistence, StoreDuplicateError, StoreNotFoundError, StorePersistenceError } from "@siteping/core";

const DEFAULT_KEY = "siteping_feedbacks";

export interface LocalStorageStoreOptions {
  /** localStorage key prefix — defaults to `'siteping_feedbacks'` */
  key?: string | undefined;
}

/**
 * Client-side `SitepingStore` implementation backed by `localStorage`.
 *
 * Designed for demos, prototyping, and static sites that don't need a server.
 * Data persists across page reloads but is scoped to the current origin.
 *
 * All store semantics (clientId dedup, filtering, pagination, error
 * contract, screenshot-drop retry on quota) come from core's
 * `createCollectionStore` engine — this class only supplies the storage
 * primitives: JSON persistence with Date revival, quota-safe writes, an id
 * generator.
 *
 * Note: localStorage has its own ~5 MB hard cap; inline screenshots are OK
 * for prototyping but will hit the cap quickly. Production users should use
 * adapter-prisma with a configured `ScreenshotStorage`.
 *
 * @example
 * ```ts
 * import { initSiteping } from '@siteping/widget'
 * import { LocalStorageStore } from '@siteping/adapter-localstorage'
 *
 * const store = new LocalStorageStore()
 *
 * initSiteping({
 *   store,
 *   projectName: 'my-demo',
 * })
 * ```
 */
export class LocalStorageStore implements SitepingStore {
  private readonly key: string;

  private readonly engine = createCollectionStore({
    load: () => this.load(),
    persist: (next) => {
      this.persist(next);
    },
    generateId: () => this.generateId(),
  });

  constructor(options?: LocalStorageStoreOptions) {
    this.key = options?.key ?? DEFAULT_KEY;
  }

  // ---------------------------------------------------------------------------
  // Storage primitives
  // ---------------------------------------------------------------------------

  private load(): FeedbackRecord[] {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return [];
      const data = JSON.parse(raw) as Serialized<FeedbackRecord>[];
      return data.map(reviveFeedback);
    } catch {
      return [];
    }
  }

  /**
   * Persist the full feedback array, or throw `StorePersistenceError` (with
   * the underlying exception as `cause` — quota, storage disabled, …) when the
   * write fails. Centralized here so no mutating method can accidentally
   * report a phantom success on a lost write.
   */
  private persist(feedbacks: FeedbackRecord[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(feedbacks));
    } catch (cause) {
      throw new StorePersistenceError(undefined, { cause });
    }
  }

  private generateId(): string {
    try {
      return crypto.randomUUID();
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }

  // ---------------------------------------------------------------------------
  // SitepingStore implementation — delegated to the collection engine
  // ---------------------------------------------------------------------------

  createFeedback(data: FeedbackCreateInput): Promise<FeedbackRecord> {
    return this.engine.createFeedback(data);
  }

  getFeedbacks(query: FeedbackQuery): Promise<FeedbackPage> {
    return this.engine.getFeedbacks(query);
  }

  findByClientId(clientId: string): Promise<FeedbackRecord | null> {
    return this.engine.findByClientId(clientId);
  }

  updateFeedback(id: string, data: FeedbackUpdateInput): Promise<FeedbackRecord> {
    return this.engine.updateFeedback(id, data);
  }

  deleteFeedback(id: string): Promise<void> {
    return this.engine.deleteFeedback(id);
  }

  deleteAllFeedbacks(projectName: string): Promise<void> {
    return this.engine.deleteAllFeedbacks(projectName);
  }

  verifyProjectOwnership(id: string, projectName: string): Promise<boolean> {
    return this.engine.verifyProjectOwnership(id, projectName);
  }

  /** Remove all data from localStorage for this store key. */
  clear(): void {
    localStorage.removeItem(this.key);
  }
}

// ---------------------------------------------------------------------------
// JSON revival — localStorage stores the Serialized<FeedbackRecord> wire
// shape; Dates come back as ISO strings and must be revived.
// ---------------------------------------------------------------------------

function reviveFeedback(raw: Serialized<FeedbackRecord>): FeedbackRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    resolvedAt: raw.resolvedAt ? new Date(raw.resolvedAt) : null,
    annotations: raw.annotations.map((ann) => ({
      ...ann,
      createdAt: new Date(ann.createdAt),
    })),
    // Legacy records (pre-diagnostics / pre-region) won't have these keys.
    // Default to null so the fields are always present on the in-memory
    // shape. screenshotRegion is a plain JSON object (no Date inside), so
    // it survives the round-trip verbatim — no revival needed.
    screenshotRegion: raw.screenshotRegion ?? null,
    diagnostics: raw.diagnostics ?? null,
  };
}
