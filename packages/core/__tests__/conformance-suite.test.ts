/**
 * The conformance suite must pass a store built the way a third-party SQL
 * adapter usually is, not only the engine: a find-then-insert over a unique
 * index, without `createFeedbackIfAbsent`. A repeated `clientId` throws
 * `StoreDuplicateError` whether the lookup finds it or the insert loses a
 * concurrent race — the case the HTTP handler recovers through
 * `findByClientId`.
 */

import { createCollectionStore, type FeedbackRecord, type SitepingStore, StoreDuplicateError } from "../src/index.js";
import { testSitepingStore } from "../src/testing.js";

function createUniqueIndexStore(): SitepingStore {
  let feedbacks: FeedbackRecord[] = [];
  let counter = 1;
  // The engine's own idempotent path stays out: this store is the plain kind.
  const { createFeedbackIfAbsent: _engineOnly, ...engine } = createCollectionStore({
    load: () => feedbacks,
    persist: (next) => {
      feedbacks = next;
    },
    generateId: () => `unique-${counter++}`,
    comments: true,
  });
  const inserting = new Set<string>();

  return {
    ...engine,
    async createFeedback(data) {
      if (inserting.has(data.clientId) || (await engine.findByClientId(data.clientId))) {
        throw new StoreDuplicateError();
      }
      inserting.add(data.clientId);
      try {
        return await engine.createFeedback(data);
      } finally {
        inserting.delete(data.clientId);
      }
    },
  };
}

testSitepingStore(createUniqueIndexStore);
