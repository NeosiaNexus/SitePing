import {
  createCollectionStore,
  type FeedbackCreateInput,
  type FeedbackPage,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackUpdateInput,
  type SitepingStore,
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
 * All store semantics (clientId dedup, filtering, pagination, error
 * contract) come from core's `createCollectionStore` engine — this class
 * only supplies the storage primitives: an array, an id generator.
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

  private readonly engine = createCollectionStore({
    load: () => this.feedbacks,
    persist: (next) => {
      this.feedbacks = next;
    },
    generateId: () => `mem-${this.idCounter++}-${Date.now().toString(36)}`,
  });

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

  /** Remove all data from this store instance. */
  clear(): void {
    this.feedbacks = [];
    this.idCounter = 1;
  }
}
