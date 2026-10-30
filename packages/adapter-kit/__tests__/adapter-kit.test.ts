/**
 * Dogfood test: build a complete adapter using ONLY the kit's public
 * exports, then run the published conformance suite against it — proving
 * the kit is sufficient for a third-party adapter with zero access to
 * `@siteping/core`.
 */

import { createCollectionStore, type FeedbackRecord, type SitepingStore, StorePersistenceError } from "../src/index.js";
import { testSitepingStore } from "../src/testing.js";

/** Set while the conformance suite simulates a backend that refuses writes. */
let writesFail = false;

/** The simplest possible third-party adapter: a snapshot store over a plain array. */
function createArrayStore(): SitepingStore {
  let feedbacks: FeedbackRecord[] = [];
  let counter = 1;
  return createCollectionStore({
    load: () => feedbacks,
    persist: (next) => {
      if (writesFail) throw new StorePersistenceError();
      feedbacks = next;
    },
    generateId: () => `kit-${counter++}`,
    comments: true,
  });
}

testSitepingStore(() => createArrayStore(), {
  failWrites: () => {
    writesFail = true;
    return () => {
      writesFail = false;
    };
  },
});
