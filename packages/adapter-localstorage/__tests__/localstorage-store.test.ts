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

    it("handles localStorage full on save (silent fail)", async () => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = () => {
        throw new DOMException("QuotaExceededError");
      };
      await expect(store.createFeedback(input)).resolves.toBeDefined();
      Storage.prototype.setItem = original;
    });

    it("updateFeedback throws StorePersistenceError when the write fails (quota)", async () => {
      const fb = await store.createFeedback(input);
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = () => {
        throw new DOMException("QuotaExceededError");
      };
      try {
        await expect(
          store.updateFeedback(fb.id, { status: "resolved", resolvedAt: new Date() }),
        ).rejects.toBeInstanceOf(StorePersistenceError);
      } finally {
        Storage.prototype.setItem = original;
      }
    });

    it("deleteFeedback throws StorePersistenceError when the write fails (quota)", async () => {
      const fb = await store.createFeedback(input);
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = () => {
        throw new DOMException("QuotaExceededError");
      };
      try {
        await expect(store.deleteFeedback(fb.id)).rejects.toBeInstanceOf(StorePersistenceError);
      } finally {
        Storage.prototype.setItem = original;
      }
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
