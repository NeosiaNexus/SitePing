import {
  type AnnotationRecord,
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
 * Unreadable data is never silently destroyed. Records are revived leniently
 * (a missing `annotations` list becomes `[]`), and an entry that can't be
 * revived at all (not an object, no string `id`) is skipped without hiding
 * the others. When the stored blob was not fully readable — unparsable JSON,
 * not an array, or skipped entries — the next write first copies the raw
 * blob to `<key>.corrupt` (e.g. `siteping_feedbacks.corrupt`, replacing any
 * earlier backup) and only then overwrites `<key>`; if the backup can't be
 * written, that write throws `StorePersistenceError` and `<key>` is left as is.
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
  /**
   * The raw blob the last `load()` could not fully read (unparsable, not an
   * array, or with entries it had to skip) — backed up by the next `persist`
   * before it is overwritten. `null` when everything was read.
   */
  private unreadBlob: string | null = null;

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
    this.unreadBlob = null;
    let raw: string | null;
    try {
      raw = localStorage.getItem(this.key);
    } catch {
      return []; // storage disabled — `persist` will fail loudly too
    }
    if (!raw) return [];

    const { records, complete } = readBlob(raw);
    if (!complete) this.unreadBlob = raw;
    return records;
  }

  /**
   * Persist the full feedback array, or throw `StorePersistenceError` (with
   * the underlying exception as `cause` — quota, storage disabled, …) when the
   * write fails. Centralized here so no mutating method can accidentally
   * report a phantom success on a lost write.
   *
   * When the blob being replaced wasn't fully readable, it is first copied to
   * `<key>.corrupt`; if that copy fails, the write fails with it.
   */
  private persist(feedbacks: FeedbackRecord[]): void {
    try {
      if (this.unreadBlob !== null) localStorage.setItem(`${this.key}.corrupt`, this.unreadBlob);
      localStorage.setItem(this.key, JSON.stringify(feedbacks));
    } catch (cause) {
      throw new StorePersistenceError(undefined, { cause });
    }
    this.unreadBlob = null;
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
// shape; Dates come back as ISO strings and must be revived, and fields added
// after the adapter's first release may be missing on records written back
// then (0.4.3 predates `urlPattern`, `screenshotUrl`, `anchorKey`,
// `screenshotRegion` and `diagnostics`).
// ---------------------------------------------------------------------------

/** Nullable record fields that a blob written by an older release may lack. */
type LegacyFeedbackKey = "urlPattern" | "screenshotUrl" | "screenshotRegion" | "diagnostics";
type LegacyAnnotationKey = "anchorKey";

type StoredAnnotation = Omit<Serialized<AnnotationRecord>, LegacyAnnotationKey> &
  Partial<Pick<Serialized<AnnotationRecord>, LegacyAnnotationKey>>;

/**
 * What `localStorage` may actually hold — the wire shape of any published
 * version. `annotations` may be missing on a hand-edited or foreign record.
 */
type StoredFeedback = Omit<Serialized<FeedbackRecord>, LegacyFeedbackKey | "annotations"> &
  Partial<Pick<Serialized<FeedbackRecord>, LegacyFeedbackKey>> & { annotations?: StoredAnnotation[] | null };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Whether an entry can be revived without losing data: an object with a
 * string `id` whose `annotations`, if present, is a list of objects.
 */
function isRevivable(entry: unknown): entry is StoredFeedback {
  if (!isObject(entry) || typeof entry.id !== "string") return false;
  const { annotations } = entry;
  return annotations == null || (Array.isArray(annotations) && annotations.every(isObject));
}

/**
 * Parse a stored blob into the records it can revive. `complete` is false
 * when anything was left behind — the blob is unparsable, not an array, or
 * had entries `isRevivable` rejected.
 */
function readBlob(raw: string): { records: FeedbackRecord[]; complete: boolean } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { records: [], complete: false };
  }
  if (!Array.isArray(data)) return { records: [], complete: false };
  const records = data.filter(isRevivable).map(reviveFeedback);
  return { records, complete: records.length === data.length };
}

function reviveAnnotation(raw: StoredAnnotation): AnnotationRecord {
  return {
    ...raw,
    anchorKey: raw.anchorKey ?? null,
    createdAt: new Date(raw.createdAt),
  };
}

function reviveFeedback(raw: StoredFeedback): FeedbackRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    resolvedAt: raw.resolvedAt ? new Date(raw.resolvedAt) : null,
    annotations: (raw.annotations ?? []).map(reviveAnnotation),
    // Legacy back-fill: every nullable field is present on the in-memory
    // shape, as `null`, exactly like a freshly built record. Plain JSON
    // values (region, diagnostics) survive the round-trip verbatim.
    urlPattern: raw.urlPattern ?? null,
    screenshotUrl: raw.screenshotUrl ?? null,
    screenshotRegion: raw.screenshotRegion ?? null,
    diagnostics: raw.diagnostics ?? null,
  };
}
