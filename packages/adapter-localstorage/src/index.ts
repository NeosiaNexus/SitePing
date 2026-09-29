import {
  type AnnotationRecord,
  type CommentCreateInput,
  type CommentRecord,
  createCollectionStore,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  type FeedbackCreateInput,
  type FeedbackCreateOutcome,
  type FeedbackPage,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackUpdateInput,
  type Serialized,
  type SitepingStore,
  StorePersistenceError,
} from "@siteping/core";

export type { SitepingStore } from "@siteping/core";
export {
  isStorePersistence,
  StoreDuplicateError,
  StoreLimitError,
  StoreNotFoundError,
  StorePersistenceError,
} from "@siteping/core";

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
 * All store semantics (clientId dedup, filtering, pagination, discussion
 * threads, error contract, screenshot-drop retry on quota) come from core's
 * `createCollectionStore` engine — this class only supplies the storage
 * primitives: JSON persistence with Date revival, quota-safe writes, an id
 * generator.
 *
 * Note: localStorage has its own ~5 MB hard cap; inline screenshots are OK
 * for prototyping but will hit the cap quickly. Production users should use
 * adapter-prisma with a configured `ScreenshotStorage`.
 *
 * Unreadable data is never silently destroyed. Records are revived leniently
 * (a missing `annotations` or `comments` list becomes `[]`), and an entry that can't be
 * revived (see `isRevivable`) is skipped without hiding the others. Before
 * the next write replaces `<key>`, whatever was skipped — those entries, or
 * the whole raw blob when it isn't a JSON array — is appended to the JSON
 * array under `<key>.corrupt` (e.g. `siteping_feedbacks.corrupt`), next to
 * any earlier backup; if that copy can't be written, the write throws
 * `StorePersistenceError` and `<key>` is left as is.
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
   * What the last `load()` could not read — skipped entries, or the whole raw
   * blob when it isn't a JSON array — backed up by the next `persist` before
   * `<key>` is overwritten. Empty when everything was read.
   */
  private unread: unknown[] = [];

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
    this.unread = [];
    let raw: string | null;
    try {
      raw = localStorage.getItem(this.key);
    } catch {
      return []; // storage disabled — `persist` will fail loudly too
    }
    if (!raw) return [];

    const { records, unread } = readBlob(raw);
    this.unread = unread;
    return records;
  }

  /**
   * Persist the full feedback array, or throw `StorePersistenceError` (with
   * the underlying exception as `cause` — quota, storage disabled, …) when the
   * write fails. Centralized here so no mutating method can accidentally
   * report a phantom success on a lost write.
   *
   * What `load()` couldn't read is first backed up to `<key>.corrupt`; if
   * that copy fails, the write fails with it.
   */
  private persist(feedbacks: FeedbackRecord[]): void {
    try {
      if (this.unread.length > 0) this.backUp(this.unread);
      localStorage.setItem(this.key, JSON.stringify(feedbacks));
    } catch (cause) {
      throw new StorePersistenceError(undefined, { cause });
    }
    this.unread = [];
  }

  /**
   * Append `entries` to the JSON array under `<key>.corrupt`. Entries already
   * there are skipped: a write that fails after its backup landed leaves them
   * in `<key>`, so the next write backs up the same ones again.
   */
  private backUp(entries: unknown[]): void {
    const backupKey = `${this.key}.corrupt`;
    const saved = readBackup(localStorage.getItem(backupKey));
    const known = new Set(saved.map((entry) => JSON.stringify(entry)));
    const added = entries.filter((entry) => !known.has(JSON.stringify(entry)));
    if (added.length > 0) localStorage.setItem(backupKey, JSON.stringify([...saved, ...added]));
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

  createFeedbackIfAbsent(data: FeedbackCreateInput): Promise<FeedbackCreateOutcome> {
    return this.engine.createFeedbackIfAbsent(data);
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

  addComment(feedbackId: string, data: CommentCreateInput): Promise<CommentRecord> {
    return this.engine.addComment(feedbackId, data);
  }

  deleteComment(feedbackId: string, commentId: string): Promise<void> {
    return this.engine.deleteComment(feedbackId, commentId);
  }

  /**
   * Remove all data from localStorage for this store key (a `<key>.corrupt`
   * backup is kept). Throws `StorePersistenceError` when storage is
   * unavailable — server-side, or access revoked.
   */
  clear(): void {
    try {
      localStorage.removeItem(this.key);
    } catch (cause) {
      throw new StorePersistenceError(undefined, { cause });
    }
  }
}

// ---------------------------------------------------------------------------
// JSON revival — localStorage stores the Serialized<FeedbackRecord> wire
// shape; Dates come back as ISO strings and must be revived, and fields added
// after the adapter's first release may be missing on records written back
// then (0.4.3 predates `urlPattern`, `screenshotUrl`, `anchorKey`,
// `screenshotRegion` and `diagnostics`; every release before threads lacks
// `comments`).
// ---------------------------------------------------------------------------

/** Nullable record fields that a blob written by an older release may lack. */
type LegacyFeedbackKey = "urlPattern" | "screenshotUrl" | "screenshotRegion" | "diagnostics";
type LegacyAnnotationKey = "anchorKey";

type StoredAnnotation = Omit<Serialized<AnnotationRecord>, LegacyAnnotationKey> &
  Partial<Pick<Serialized<AnnotationRecord>, LegacyAnnotationKey>>;

/** A stored comment — `createdAt` as its ISO string. */
type StoredComment = Serialized<CommentRecord>;

/**
 * What `localStorage` may actually hold — the wire shape of any published
 * version. `annotations` may be missing on a hand-edited or foreign record,
 * `comments` on any record written before threads.
 */
type StoredFeedback = Omit<Serialized<FeedbackRecord>, LegacyFeedbackKey | "annotations" | "comments"> &
  Partial<Pick<Serialized<FeedbackRecord>, LegacyFeedbackKey>> & {
    annotations?: StoredAnnotation[] | null;
    comments?: StoredComment[] | null;
  };

/** String fields every published release has written on every record. */
const REQUIRED_STRING_KEYS = [
  "id",
  "projectName",
  "message",
  "url",
  "viewport",
  "userAgent",
  "authorName",
  "authorEmail",
  "clientId",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** An ISO string that revives to a valid `Date` — serializing an Invalid Date throws. */
function isDateString(value: unknown): boolean {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/** Whether `list` is absent, or an array of objects whose `createdAt` parses. */
function isDatedList(list: unknown): boolean {
  return list == null || (Array.isArray(list) && list.every((item) => isObject(item) && isDateString(item.createdAt)));
}

/**
 * Whether an entry revives into a record every reader can use: the fields
 * the filter pipeline, the widget and the dashboard dereference are present
 * and well-typed, and every date parses. Missing `annotations` / `comments`
 * and the legacy nullable fields are back-filled by `reviveFeedback`.
 */
function isRevivable(entry: unknown): entry is StoredFeedback {
  if (!isObject(entry)) return false;
  const { type, status, createdAt, updatedAt, resolvedAt, annotations, comments } = entry;
  return (
    REQUIRED_STRING_KEYS.every((key) => typeof entry[key] === "string") &&
    FEEDBACK_TYPES.some((known) => known === type) &&
    FEEDBACK_STATUSES.some((known) => known === status) &&
    isDateString(createdAt) &&
    isDateString(updatedAt) &&
    (resolvedAt == null || isDateString(resolvedAt)) &&
    isDatedList(annotations) &&
    isDatedList(comments)
  );
}

/**
 * Parse a stored blob into the records it can revive and what it can't: the
 * rejected entries, or the whole raw blob when it isn't a JSON array.
 */
function readBlob(raw: string): { records: FeedbackRecord[]; unread: unknown[] } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { records: [], unread: [raw] };
  }
  if (!Array.isArray(data)) return { records: [], unread: [raw] };

  const records: FeedbackRecord[] = [];
  const unread: unknown[] = [];
  for (const entry of data) {
    if (isRevivable(entry)) records.push(reviveFeedback(entry));
    else unread.push(entry);
  }
  return { records, unread };
}

/** The entries of an existing backup — anything that isn't a JSON array is kept as one entry. */
function readBackup(raw: string | null): unknown[] {
  if (raw === null) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data : [raw];
  } catch {
    return [raw];
  }
}

function reviveAnnotation(raw: StoredAnnotation): AnnotationRecord {
  return {
    ...raw,
    anchorKey: raw.anchorKey ?? null,
    createdAt: new Date(raw.createdAt),
  };
}

function reviveComment(raw: StoredComment): CommentRecord {
  return { ...raw, createdAt: new Date(raw.createdAt) };
}

function reviveFeedback(raw: StoredFeedback): FeedbackRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    resolvedAt: raw.resolvedAt ? new Date(raw.resolvedAt) : null,
    annotations: (raw.annotations ?? []).map(reviveAnnotation),
    comments: (raw.comments ?? []).map(reviveComment),
    // Legacy back-fill: every nullable field is present on the in-memory
    // shape, as `null`, exactly like a freshly built record. Plain JSON
    // values (region, diagnostics) survive the round-trip verbatim.
    urlPattern: raw.urlPattern ?? null,
    screenshotUrl: raw.screenshotUrl ?? null,
    screenshotRegion: raw.screenshotRegion ?? null,
    diagnostics: raw.diagnostics ?? null,
  };
}
