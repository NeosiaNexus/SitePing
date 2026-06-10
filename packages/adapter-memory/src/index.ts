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
} from "@siteping/core";

export type { SitepingStore } from "@siteping/core";
export { isStorePersistence, StoreDuplicateError, StoreNotFoundError, StorePersistenceError } from "@siteping/core";

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
      // No external storage in memory adapter — keep the data URL inline.
      // Fine for tests and dev; production users should configure a real
      // ScreenshotStorage on adapter-prisma.
      screenshotUrl: data.screenshotDataUrl ?? null,
      diagnostics: data.diagnostics ?? null,
    };

    this.feedbacks.unshift(record);
    return record;
  }

  async getFeedbacks(query: FeedbackQuery): Promise<{ feedbacks: FeedbackRecord[]; total: number }> {
    return applyFeedbackFilters(this.feedbacks, query);
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
