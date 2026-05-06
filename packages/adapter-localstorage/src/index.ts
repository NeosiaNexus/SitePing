import {
  type AnnotationCreateInput,
  type AnnotationRecord,
  type FeedbackCreateInput,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackUpdateInput,
  type SitepingStore,
  StoreNotFoundError,
} from "@siteping/core";

export type { SitepingStore } from "@siteping/core";
export { StoreDuplicateError, StoreNotFoundError } from "@siteping/core";

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

  private save(feedbacks: FeedbackRecord[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(feedbacks));
    } catch {
      // localStorage full — silently drop (best-effort persistence)
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
    };

    feedbacks.unshift(record);
    this.save(feedbacks);
    return record;
  }

  async getFeedbacks(query: FeedbackQuery): Promise<{ feedbacks: FeedbackRecord[]; total: number }> {
    let results = this.load().filter((f) => f.projectName === query.projectName);

    if (query.type) results = results.filter((f) => f.type === query.type);
    if (query.status) results = results.filter((f) => f.status === query.status);
    if (query.url) results = results.filter((f) => f.url === query.url);
    if (query.urlPattern) results = results.filter((f) => f.urlPattern === query.urlPattern);
    if (query.search) {
      const s = query.search.toLowerCase();
      results = results.filter((f) => f.message.toLowerCase().includes(s));
    }

    const total = results.length;
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 100);
    const start = (page - 1) * limit;

    return { feedbacks: results.slice(start, start + limit), total };
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
    this.save(feedbacks);
    return fb;
  }

  async deleteFeedback(id: string): Promise<void> {
    const feedbacks = this.load();
    const idx = feedbacks.findIndex((f) => f.id === id);
    if (idx === -1) throw new StoreNotFoundError();

    feedbacks.splice(idx, 1);
    this.save(feedbacks);
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
  };
}
