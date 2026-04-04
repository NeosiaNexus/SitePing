import type {
  AnnotationCreateInput,
  AnnotationRecord,
  FeedbackCreateInput,
  FeedbackQuery,
  FeedbackRecord,
  FeedbackUpdateInput,
  SitepingStore,
} from "@siteping/core";

const RESET_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

function createStore(): SitepingStore {
  let feedbacks: FeedbackRecord[] = [];
  let idCounter = 1;

  function generateId(): string {
    return `demo-${idCounter++}-${Date.now().toString(36)}`;
  }

  function reset(): void {
    feedbacks = [];
    idCounter = 1;
  }

  setInterval(reset, RESET_INTERVAL_MS);

  return {
    async createFeedback(data: FeedbackCreateInput): Promise<FeedbackRecord> {
      // ClientId dedup — idempotent
      const existing = feedbacks.find((f) => f.clientId === data.clientId);
      if (existing) return existing;

      const now = new Date();
      const feedbackId = generateId();

      const annotations: AnnotationRecord[] = data.annotations.map((ann: AnnotationCreateInput) => ({
        id: generateId(),
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

      feedbacks.unshift(record);
      return record;
    },

    async getFeedbacks(query: FeedbackQuery): Promise<{ feedbacks: FeedbackRecord[]; total: number }> {
      let results = feedbacks.filter((f) => f.projectName === query.projectName);
      if (query.type) results = results.filter((f) => f.type === query.type);
      if (query.status) results = results.filter((f) => f.status === query.status);
      if (query.search) {
        const s = query.search.toLowerCase();
        results = results.filter((f) => f.message.toLowerCase().includes(s));
      }
      const total = results.length;
      const page = query.page ?? 1;
      const limit = query.limit ?? 50;
      const start = (page - 1) * limit;
      return { feedbacks: results.slice(start, start + limit), total };
    },

    async updateFeedback(id: string, data: FeedbackUpdateInput): Promise<FeedbackRecord> {
      const fb = feedbacks.find((f) => f.id === id);
      if (!fb) throw Object.assign(new Error("Not found"), { code: "P2025" });
      fb.status = data.status;
      fb.resolvedAt = data.resolvedAt;
      return fb;
    },

    async deleteFeedback(id: string): Promise<void> {
      const idx = feedbacks.findIndex((f) => f.id === id);
      if (idx === -1) throw Object.assign(new Error("Not found"), { code: "P2025" });
      feedbacks.splice(idx, 1);
    },

    async findByClientId(clientId: string): Promise<FeedbackRecord | null> {
      return feedbacks.find((f) => f.clientId === clientId) ?? null;
    },

    async deleteAllFeedbacks(projectName: string): Promise<void> {
      feedbacks = feedbacks.filter((f) => f.projectName !== projectName);
    },
  };
}

// Singleton — survives Next.js hot reloads in dev
const g = globalThis as typeof globalThis & { __sitepingStore?: SitepingStore };
g.__sitepingStore ??= createStore();
export const memoryStore: SitepingStore = g.__sitepingStore;
