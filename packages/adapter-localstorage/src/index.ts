import {
  type AnnotationCreateInput,
  type AnnotationRecord,
  applyFeedbackFilters,
  type FeedbackCreateInput,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackUpdateInput,
  type SitepingStore,
  StoreNotFoundError,
  StorePersistenceError,
} from "@siteping/core";

export type { SitepingStore } from "@siteping/core";
export { StoreDuplicateError, StoreNotFoundError, StorePersistenceError } from "@siteping/core";

const DEFAULT_KEY = "siteping_feedbacks";

export interface LocalStorageStoreOptions {
  /** localStorage key prefix — defaults to `'siteping_feedbacks'` */
  key?: string;
}

/**
 * Client-side `SitepingStore` implementation backed by `localStorage`.
 *
 * Designed for demos, prototyping, and static sites that don't need a server.
 * Data persists across page reloads but is scoped to the current origin.
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

  constructor(options?: LocalStorageStoreOptions) {
    this.key = options?.key ?? DEFAULT_KEY;
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private load(): FeedbackRecord[] {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return [];
      const data = JSON.parse(raw) as SerializedFeedback[];
      return data.map(reviveFeedback);
    } catch {
      return [];
    }
  }

  private save(feedbacks: FeedbackRecord[]): boolean {
    try {
      localStorage.setItem(this.key, JSON.stringify(feedbacks));
      return true;
    } catch {
      // localStorage full — caller decides how to recover (e.g. drop the
      // newest screenshot and retry).
      return false;
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
  // SitepingStore implementation
  // ---------------------------------------------------------------------------

  async createFeedback(data: FeedbackCreateInput): Promise<FeedbackRecord> {
    const feedbacks = this.load();

    // ClientId dedup — idempotent
    const existing = feedbacks.find((f) => f.clientId === data.clientId);
    if (existing) return existing;

    const now = new Date();
    const feedbackId = this.generateId();

    const annotations: AnnotationRecord[] = data.annotations.map((ann: AnnotationCreateInput) => ({
      id: this.generateId(),
      feedbackId,
      cssSelector: ann.cssSelector,
      xpath: ann.xpath,
      textSnippet: ann.textSnippet,
      elementTag: ann.elementTag,
      elementId: ann.elementId ?? null,
      textPrefix: ann.textPrefix,
      textSuffix: ann.textSuffix,
      fingerprint: ann.fingerprint,
      neighborText: ann.neighborText,
      anchorKey: ann.anchorKey ?? null,
      xPct: ann.xPct,
      yPct: ann.yPct,
      wPct: ann.wPct,
      hPct: ann.hPct,
      scrollX: ann.scrollX,
      scrollY: ann.scrollY,
      viewportW: ann.viewportW,
      viewportH: ann.viewportH,
      devicePixelRatio: ann.devicePixelRatio,
      createdAt: now,
    }));

    const record: FeedbackRecord = {
      id: feedbackId,
      type: data.type,
      message: data.message,
      status: data.status,
      projectName: data.projectName,
      url: data.url,
      urlPattern: data.urlPattern ?? null,
      authorName: data.authorName,
      authorEmail: data.authorEmail,
      viewport: data.viewport,
      userAgent: data.userAgent,
      clientId: data.clientId,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
      annotations,
      // localStorage has its own ~5 MB hard cap; storing data URLs inline is
      // OK for prototyping and demos but will hit the cap quickly with many
      // screenshots. Production users should use adapter-prisma with a
      // configured ScreenshotStorage.
      screenshotUrl: data.screenshotDataUrl ?? null,
      diagnostics: data.diagnostics ?? null,
    };

    feedbacks.unshift(record);
    if (!this.save(feedbacks) && record.screenshotUrl) {
      // Quota exceeded — usually the inline screenshot pushed us past the
      // ~5 MB cap. Retry without the screenshot so the user's text feedback
      // is preserved (the screenshot is by far the heaviest field). If even
      // that fails, fall through to legacy silent-fail behaviour: the
      // record stays in memory for this call but isn't persisted.
      record.screenshotUrl = null;
      this.save(feedbacks);
    }
    return record;
  }

  async getFeedbacks(query: FeedbackQuery): Promise<{ feedbacks: FeedbackRecord[]; total: number }> {
    return applyFeedbackFilters(this.load(), query);
  }

  async findByClientId(clientId: string): Promise<FeedbackRecord | null> {
    return this.load().find((f) => f.clientId === clientId) ?? null;
  }

  async updateFeedback(id: string, data: FeedbackUpdateInput): Promise<FeedbackRecord> {
    const feedbacks = this.load();
    const fb = feedbacks.find((f) => f.id === id);
    if (!fb) throw new StoreNotFoundError();

    fb.status = data.status;
    fb.resolvedAt = data.resolvedAt;
    fb.updatedAt = new Date();
    // save() returns false when localStorage is full. Surface it instead of
    // returning a record that claims success — otherwise the mutation is
    // silently lost (the in-memory `fb` is returned but never persisted).
    if (!this.save(feedbacks)) throw new StorePersistenceError();
    return fb;
  }

  async deleteFeedback(id: string): Promise<void> {
    const feedbacks = this.load();
    const idx = feedbacks.findIndex((f) => f.id === id);
    if (idx === -1) throw new StoreNotFoundError();

    feedbacks.splice(idx, 1);
    // Surface persistence failure rather than reporting a phantom delete.
    if (!this.save(feedbacks)) throw new StorePersistenceError();
  }

  async deleteAllFeedbacks(projectName: string): Promise<void> {
    const feedbacks = this.load().filter((f) => f.projectName !== projectName);
    this.save(feedbacks);
  }

  /** Remove all data from localStorage for this store key. */
  clear(): void {
    localStorage.removeItem(this.key);
  }
}

// ---------------------------------------------------------------------------
// JSON serialization helpers — revive date strings from localStorage
// ---------------------------------------------------------------------------

interface SerializedFeedback extends Omit<FeedbackRecord, "createdAt" | "updatedAt" | "resolvedAt" | "annotations"> {
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  annotations: SerializedAnnotation[];
}

interface SerializedAnnotation extends Omit<AnnotationRecord, "createdAt"> {
  createdAt: string;
}

function reviveFeedback(raw: SerializedFeedback): FeedbackRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    resolvedAt: raw.resolvedAt ? new Date(raw.resolvedAt) : null,
    annotations: raw.annotations.map((ann) => ({
      ...ann,
      createdAt: new Date(ann.createdAt),
    })),
    // Legacy records (pre-diagnostics) won't have this key. Default to null
    // so the field is always present on the in-memory shape.
    diagnostics: raw.diagnostics ?? null,
  };
}
