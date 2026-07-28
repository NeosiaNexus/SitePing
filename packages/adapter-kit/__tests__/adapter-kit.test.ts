/**
 * Dogfood test: build a complete adapter using ONLY the kit's public
 * exports, then run the published conformance suite against it — proving
 * the kit is sufficient for a third-party adapter with zero access to
 * `@siteping/core`.
 */

import { createCollectionStore, type FeedbackRecord, type SitepingStore } from "../src/index.js";
import { testSitepingStore } from "../src/testing.js";

/** The simplest possible third-party adapter: a snapshot store over a plain array. */
function createArrayStore(): SitepingStore {
  let feedbacks: FeedbackRecord[] = [];
  let counter = 1;
  return createCollectionStore({
    load: () => feedbacks,
    persist: (next) => {
      feedbacks = next;
    },
    generateId: () => `kit-${counter++}`,
  });
}

testSitepingStore(() => createArrayStore());
