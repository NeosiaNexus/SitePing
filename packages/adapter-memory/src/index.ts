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

/**
 * In-memory `SitepingStore` implementation.
 *
 * Zero dependencies, works in any JS environment (Node, Bun, Deno, browser,
 * Cloudflare Workers). Data lives in a plain array — lost on process restart.
 *
 * Use cases:
 * - **Testing** — fast, isolated store for unit/integration tests
 * - **Demos** — lightweight store that needs no database or localStorage
 * - **Reference** — simplest possible adapter for contributors to study
 *
 * @example
 * ```ts
 * import { MemoryStore } from '@siteping/adapter-memory'
 *
 * const store = new MemoryStore()
 * // Pass to createSitepingHandler({ store }) or initSiteping({ store })
 * ```
 */
export class MemoryStore implements SitepingStore {
  private feedbacks: FeedbackRecord[] = [];
  private idCounter = 1;

  private generateId(): string {
    return `mem-${this.idCounter++}-${Date.now().toString(36)}`;
  }

  async createFeedback(data: FeedbackCreateInput): Promise<FeedbackRecord> {
    // ClientId dedup — idempotent
    const existing = this.feedbacks.find((f) => f.clientId === data.clientId);
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
    };

    this.feedbacks.unshift(record);
    return record;
  }

  async getFeedbacks(query: FeedbackQuery): Promise<{ feedbacks: FeedbackRecord[]; total: number }> {
    let results = this.feedbacks.filter((f) => f.projectName === query.projectName);

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
    return this.feedbacks.find((f) => f.clientId === clientId) ?? null;
  }

  async updateFeedback(id: string, data: FeedbackUpdateInput): Promise<FeedbackRecord> {
    const fb = this.feedbacks.find((f) => f.id === id);
    if (!fb) throw new StoreNotFoundError();

    fb.status = data.status;
    fb.resolvedAt = data.resolvedAt;
    fb.updatedAt = new Date();
    return fb;
  }

  async deleteFeedback(id: string): Promise<void> {
    const idx = this.feedbacks.findIndex((f) => f.id === id);
    if (idx === -1) throw new StoreNotFoundError();
    this.feedbacks.splice(idx, 1);
  }

  async deleteAllFeedbacks(projectName: string): Promise<void> {
    this.feedbacks = this.feedbacks.filter((f) => f.projectName !== projectName);
  }

  /** Remove all data from this store instance. */
  clear(): void {
    this.feedbacks = [];
    this.idCounter = 1;
  }
}
