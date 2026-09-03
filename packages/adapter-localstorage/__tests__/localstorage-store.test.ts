// @vitest-environment jsdom

import { testSitepingStore } from "@siteping/core/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalStorageStore, StorePersistenceError } from "../src/index.js";

// Run the full SitepingStore conformance suite
testSitepingStore(() => {
  localStorage.clear();
  return new LocalStorageStore({ key: "test_conformance" });
});

// ---------------------------------------------------------------------------
// LocalStorageStore-specific tests
// ---------------------------------------------------------------------------

describe("LocalStorageStore specific", () => {
  let store: LocalStorageStore;

  beforeEach(() => {
    localStorage.clear();
    store = new LocalStorageStore({ key: "test_feedbacks" });
  });

  afterEach(() => {
    localStorage.clear();
  });

  const input = {
    projectName: "test-project",
    type: "bug" as const,
    message: "test",
    status: "open" as const,
    url: "https://example.com",
    viewport: "1920x1080",
    userAgent: "test",
    authorName: "Alice",
    authorEmail: "a@t.com",
    clientId: "c1",
    annotations: [],
  };

  /**
   * Run `fn` with `Storage.prototype.setItem` stubbed to throw a spec-shaped
   * QuotaExceededError (the name goes in the SECOND constructor slot), and
   * restore the original even when an assertion inside `fn` fails.
   */
  async function withQuotaExceeded<T>(fn: () => Promise<T>): Promise<T> {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    };
    try {
      return await fn();
    } finally {
      Storage.prototype.setItem = original;
    }
  }

  // -----------------------------------------------------------------------
  // Persistence
  // -----------------------------------------------------------------------

  describe("localStorage persistence", () => {
    it("persists data to localStorage", async () => {
      await store.createFeedback(input);
      const raw = localStorage.getItem("test_feedbacks");
      expect(raw).toBeTruthy();
      const data = JSON.parse(raw!);
      expect(data).toHaveLength(1);
    });

    it("persists updates to localStorage", async () => {
      const fb = await store.createFeedback(input);
      await store.updateFeedback(fb.id, { status: "resolved", resolvedAt: new Date() });

      const store2 = new LocalStorageStore({ key: "test_feedbacks" });
      const { feedbacks } = await store2.getFeedbacks({ projectName: "test-project" });
      expect(feedbacks[0]!.status).toBe("resolved");
    });

    it("persists deletions to localStorage", async () => {
      const fb = await store.createFeedback(input);
      await store.deleteFeedback(fb.id);

      const store2 = new LocalStorageStore({ key: "test_feedbacks" });
      const { total } = await store2.getFeedbacks({ projectName: "test-project" });
      expect(total).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Date round-trip
  // -----------------------------------------------------------------------

  describe("date serialization", () => {
    it("revives Date objects from localStorage JSON", async () => {
      const fb = await store.createFeedback(input);
      await store.updateFeedback(fb.id, {
        status: "resolved",
        resolvedAt: new Date("2025-06-15T12:00:00.000Z"),
      });

      const store2 = new LocalStorageStore({ key: "test_feedbacks" });
      const { feedbacks } = await store2.getFeedbacks({ projectName: "test-project" });

      expect(feedbacks[0]!.createdAt).toBeInstanceOf(Date);
      expect(feedbacks[0]!.updatedAt).toBeInstanceOf(Date);
      expect(feedbacks[0]!.resolvedAt).toBeInstanceOf(Date);
      expect(feedbacks[0]!.resolvedAt!.toISOString()).toBe("2025-06-15T12:00:00.000Z");
    });

    it("handles null resolvedAt through round-trip", async () => {
      await store.createFeedback(input);

      const store2 = new LocalStorageStore({ key: "test_feedbacks" });
      const { feedbacks } = await store2.getFeedbacks({ projectName: "test-project" });
      expect(feedbacks[0]!.resolvedAt).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Status model
  // -----------------------------------------------------------------------

  describe("4-status model", () => {
    it("persists in_progress with null resolvedAt through round-trip", async () => {
      const fb = await store.createFeedback(input);
      await store.updateFeedback(fb.id, { status: "in_progress", resolvedAt: null });

      const store2 = new LocalStorageStore({ key: "test_feedbacks" });
      const { feedbacks } = await store2.getFeedbacks({ projectName: "test-project" });
      expect(feedbacks[0]!.status).toBe("in_progress");
      expect(feedbacks[0]!.resolvedAt).toBeNull();
    });

    it("persists wont_fix with the given closure timestamp through round-trip", async () => {
      const fb = await store.createFeedback(input);
      await store.updateFeedback(fb.id, {
        status: "wont_fix",
        resolvedAt: new Date("2026-01-15T10:00:00.000Z"),
      });

      const store2 = new LocalStorageStore({ key: "test_feedbacks" });
      const { feedbacks } = await store2.getFeedbacks({ projectName: "test-project" });
      expect(feedbacks[0]!.status).toBe("wont_fix");
      expect(feedbacks[0]!.resolvedAt).toBeInstanceOf(Date);
      expect(feedbacks[0]!.resolvedAt!.toISOString()).toBe("2026-01-15T10:00:00.000Z");
    });
  });

  // -----------------------------------------------------------------------
  // Screenshot region round-trip
  // -----------------------------------------------------------------------

  describe("screenshotRegion persistence", () => {
    const region = { xPct: 0.12, yPct: 0.34, wPct: 0.5, hPct: 0.25 };

    it("persists screenshotRegion verbatim through the JSON round-trip", async () => {
      await store.createFeedback({
        ...input,
        screenshotDataUrl: "data:image/jpeg;base64,xxxx",
        screenshotRegion: region,
      });

      const store2 = new LocalStorageStore({ key: "test_feedbacks" });
      const { feedbacks } = await store2.getFeedbacks({ projectName: "test-project" });
      expect(feedbacks[0]!.screenshotRegion).toEqual(region);
    });

    it("defaults screenshotRegion to null when omitted", async () => {
      const record = await store.createFeedback(input);
      expect(record.screenshotRegion).toBeNull();

      const store2 = new LocalStorageStore({ key: "test_feedbacks" });
      const { feedbacks } = await store2.getFeedbacks({ projectName: "test-project" });
      expect(feedbacks[0]!.screenshotRegion).toBeNull();
    });

    it("back-fills every nullable field a 0.4.3 blob lacks (urlPattern, screenshotUrl, anchorKey, …)", async () => {
      const fb = await store.createFeedback({
        ...input,
        annotations: [
          {
            cssSelector: "div",
            xpath: "/div",
            textSnippet: "",
            elementTag: "DIV",
            textPrefix: "",
            textSuffix: "",
            fingerprint: "1:0:x",
            neighborText: "",
            xPct: 0,
            yPct: 0,
            wPct: 1,
            hPct: 1,
            scrollX: 0,
            scrollY: 0,
            viewportW: 1920,
            viewportH: 1080,
            devicePixelRatio: 1,
          },
        ],
      });
      const raw = JSON.parse(localStorage.getItem("test_feedbacks")!) as Array<Record<string, unknown>>;
      for (const key of ["urlPattern", "screenshotUrl", "screenshotRegion", "diagnostics"]) delete raw[0]![key];
      const annotations = raw[0]!.annotations as Array<Record<string, unknown>>;
      delete annotations[0]!.anchorKey;
      localStorage.setItem("test_feedbacks", JSON.stringify(raw));

      const store2 = new LocalStorageStore({ key: "test_feedbacks" });
      const { feedbacks } = await store2.getFeedbacks({ projectName: "test-project" });
      const revived = feedbacks[0]!;
      expect(revived.id).toBe(fb.id);
      expect(revived.urlPattern).toBeNull();
      expect(revived.screenshotUrl).toBeNull();
      expect(revived.screenshotRegion).toBeNull();
      expect(revived.diagnostics).toBeNull();
      expect(revived.annotations[0]!.anchorKey).toBeNull();
    });

    it("revives legacy records without the screenshotRegion key to null", async () => {
      // Simulate a record persisted by a pre-region version of the adapter.
      const fb = await store.createFeedback(input);
      const raw = JSON.parse(localStorage.getItem("test_feedbacks")!) as Array<Record<string, unknown>>;
      delete raw[0]!.screenshotRegion;
      localStorage.setItem("test_feedbacks", JSON.stringify(raw));

      const store2 = new LocalStorageStore({ key: "test_feedbacks" });
      const { feedbacks } = await store2.getFeedbacks({ projectName: "test-project" });
      expect(feedbacks[0]!.id).toBe(fb.id);
      expect(feedbacks[0]!.screenshotRegion).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe("edge cases", () => {
    it("uses default key when no options provided", async () => {
      const defaultStore = new LocalStorageStore();
      await defaultStore.createFeedback({ ...input, clientId: "default-key" });
      expect(localStorage.getItem("siteping_feedbacks")).toBeTruthy();
      localStorage.removeItem("siteping_feedbacks");
    });

    it("handles corrupted localStorage gracefully", async () => {
      localStorage.setItem("test_feedbacks", "not-valid-json");
      const { feedbacks } = await store.getFeedbacks({ projectName: "test-project" });
      expect(feedbacks).toHaveLength(0);
    });

    it("createFeedback throws StorePersistenceError when the write fails and there is no screenshot to drop", async () => {
      await withQuotaExceeded(async () => {
        await expect(store.createFeedback(input)).rejects.toBeInstanceOf(StorePersistenceError);
      });
    });

    it("createFeedback drops the screenshot and retries when the first write fails (quota)", async () => {
      const original = Storage.prototype.setItem;
      let calls = 0;
      Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
        calls += 1;
        if (calls === 1) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        original.call(this, key, value);
      };
      try {
        const record = await store.createFeedback({ ...input, screenshotDataUrl: "data:image/jpeg;base64,xxxx" });
        expect(record.screenshotUrl).toBeNull();
        const { feedbacks } = await store.getFeedbacks({ projectName: "test-project" });
        expect(feedbacks).toHaveLength(1);
      } finally {
        Storage.prototype.setItem = original;
      }
    });

    it("createFeedback throws StorePersistenceError when even the screenshot-less retry fails", async () => {
      await withQuotaExceeded(async () => {
        await expect(
          store.createFeedback({ ...input, screenshotDataUrl: "data:image/jpeg;base64,xxxx" }),
        ).rejects.toBeInstanceOf(StorePersistenceError);
      });
    });

    it("updateFeedback throws StorePersistenceError when the write fails (quota)", async () => {
      const fb = await store.createFeedback(input);
      await withQuotaExceeded(async () => {
        await expect(
          store.updateFeedback(fb.id, { status: "resolved", resolvedAt: new Date() }),
        ).rejects.toBeInstanceOf(StorePersistenceError);
      });
    });

    it("deleteFeedback throws StorePersistenceError when the write fails (quota)", async () => {
      const fb = await store.createFeedback(input);
      await withQuotaExceeded(async () => {
        await expect(store.deleteFeedback(fb.id)).rejects.toBeInstanceOf(StorePersistenceError);
      });
    });

    it("deleteAllFeedbacks throws StorePersistenceError when the write fails (quota)", async () => {
      await store.createFeedback(input);
      await withQuotaExceeded(async () => {
        await expect(store.deleteAllFeedbacks("test-project")).rejects.toBeInstanceOf(StorePersistenceError);
      });
    });

    it("preserves the underlying exception as the StorePersistenceError cause", async () => {
      const fb = await store.createFeedback(input);
      const error = await withQuotaExceeded(() =>
        store.deleteFeedback(fb.id).then(
          () => null,
          (e: unknown) => e,
        ),
      );
      expect(error).toBeInstanceOf(StorePersistenceError);
      expect((error as StorePersistenceError).cause).toBeInstanceOf(DOMException);
    });

    it("clear() removes all data for this store key", async () => {
      await store.createFeedback(input);
      store.clear();
      expect(localStorage.getItem("test_feedbacks")).toBeNull();
    });

    it("multiple stores with different keys are isolated", async () => {
      const store2 = new LocalStorageStore({ key: "other_feedbacks" });
      await store.createFeedback({ ...input, message: "store 1" });
      await store2.createFeedback({ ...input, clientId: "c2", message: "store 2" });

      const r1 = await store.getFeedbacks({ projectName: "test-project" });
      const r2 = await store2.getFeedbacks({ projectName: "test-project" });
      expect(r1.feedbacks[0]!.message).toBe("store 1");
      expect(r2.feedbacks[0]!.message).toBe("store 2");
      localStorage.removeItem("other_feedbacks");
    });
  });
});
