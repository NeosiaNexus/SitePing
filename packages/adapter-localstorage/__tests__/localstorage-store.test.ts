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
  // Concurrency — the widget's bulk actions fire every mutation at once
  // -----------------------------------------------------------------------

  describe("concurrent mutations", () => {
    async function seed() {
      const created = [];
      for (const clientId of ["a", "b", "c"]) created.push(await store.createFeedback({ ...input, clientId }));
      return created;
    }

    it("a concurrent bulk delete removes every record from localStorage", async () => {
      const created = await seed();

      await Promise.all(created.map((f) => store.deleteFeedback(f.id)));

      expect(JSON.parse(localStorage.getItem("test_feedbacks")!)).toEqual([]);
    });

    it("a concurrent bulk resolve persists every status change", async () => {
      const created = await seed();

      await Promise.all(created.map((f) => store.updateFeedback(f.id, { status: "resolved", resolvedAt: new Date() })));

      const store2 = new LocalStorageStore({ key: "test_feedbacks" });
      const { feedbacks } = await store2.getFeedbacks({ projectName: "test-project" });
      expect(feedbacks.map((f) => f.status)).toEqual(["resolved", "resolved", "resolved"]);
    });

    it("concurrent creates are all persisted", async () => {
      await Promise.all([store.createFeedback(input), store.createFeedback({ ...input, clientId: "c2" })]);

      expect(JSON.parse(localStorage.getItem("test_feedbacks")!)).toHaveLength(2);
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

    it("revives a record written before threads with an empty one, and persists its first comment", async () => {
      const fb = await store.createFeedback(input);
      const raw = JSON.parse(localStorage.getItem("test_feedbacks")!) as Array<Record<string, unknown>>;
      delete raw[0]!.comments;
      localStorage.setItem("test_feedbacks", JSON.stringify(raw));

      const store2 = new LocalStorageStore({ key: "test_feedbacks" });
      expect((await store2.findByClientId("c1"))?.comments).toEqual([]);
      const comment = await store2.addComment(fb.id, {
        body: "Still there?",
        authorName: "Alice",
        authorEmail: "a@t.com",
        authorRole: "client",
        clientId: "k1",
      });

      const store3 = new LocalStorageStore({ key: "test_feedbacks" });
      const revived = (await store3.findByClientId("c1"))?.comments;
      expect(revived).toEqual([comment]);
      expect(revived?.[0]?.createdAt).toBeInstanceOf(Date);
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
  // Unreadable data — never hidden wholesale, never silently overwritten
  // -----------------------------------------------------------------------

  describe("unreadable stored data", () => {
    /** Two valid records written by the store, plus `makeExtra(copy of one of them)` appended raw. */
    async function seedWith(makeExtra: (stored: Record<string, unknown>) => unknown): Promise<void> {
      await store.createFeedback({ ...input, clientId: "v1" });
      await store.createFeedback({ ...input, clientId: "v2" });
      const raw = JSON.parse(localStorage.getItem("test_feedbacks")!) as Array<Record<string, unknown>>;
      localStorage.setItem("test_feedbacks", JSON.stringify([...raw, makeExtra({ ...raw[0]! })]));
    }

    const backup = () => JSON.parse(localStorage.getItem("test_feedbacks.corrupt")!) as unknown[];

    it("a record without annotations is revived with an empty list instead of hiding every record", async () => {
      await seedWith(({ annotations: _, ...stored }) => ({ ...stored, id: "no-annotations", clientId: "legacy" }));

      const { feedbacks, total } = await store.getFeedbacks({ projectName: "test-project" });

      expect(total).toBe(3);
      expect(feedbacks.find((f) => f.id === "no-annotations")?.annotations).toEqual([]);
    });

    it.each<[string, (stored: Record<string, unknown>) => unknown]>([
      ["not an object", () => 42],
      ["no id", ({ id: _, ...stored }) => stored],
      ["no message", ({ message: _, ...stored }) => ({ ...stored, id: "x" })],
      ["an unknown type", (stored) => ({ ...stored, id: "x", type: "praise" })],
      ["an unknown status", (stored) => ({ ...stored, id: "x", status: "done" })],
      ["an unparsable createdAt", (stored) => ({ ...stored, id: "x", createdAt: "yesterday" })],
      ["an unparsable resolvedAt", (stored) => ({ ...stored, id: "x", resolvedAt: "soon" })],
      ["an annotation without a date", (stored) => ({ ...stored, id: "x", annotations: [{}] })],
      ["comments that are not a list", (stored) => ({ ...stored, id: "x", comments: "hello" })],
      ["a comment without a date", (stored) => ({ ...stored, id: "x", comments: [{ body: "hi" }] })],
    ])("skips an entry with %s without hiding the valid ones", async (_label, makeExtra) => {
      await seedWith(makeExtra);

      // A search dereferences every record's `message` — a revived entry
      // without one used to throw here.
      const { total } = await store.getFeedbacks({ projectName: "test-project", search: "test" });

      expect(total).toBe(2);
    });

    it("a write after a skipped entry keeps every valid record and backs up only that entry", async () => {
      await seedWith(() => 42);

      await store.createFeedback({ ...input, clientId: "new" });

      const stored = JSON.parse(localStorage.getItem("test_feedbacks")!) as Array<{ clientId: string }>;
      expect(stored.map((f) => f.clientId).sort()).toEqual(["new", "v1", "v2"]);
      expect(backup()).toEqual([42]);
    });

    it("an unparsable blob is backed up whole before the next write replaces it", async () => {
      localStorage.setItem("test_feedbacks", "not-valid-json");

      await store.createFeedback(input);

      expect(backup()).toEqual(["not-valid-json"]);
      expect(JSON.parse(localStorage.getItem("test_feedbacks")!)).toHaveLength(1);
    });

    it("a non-array blob is backed up whole before the next write replaces it", async () => {
      localStorage.setItem("test_feedbacks", '{"not":"an array"}');

      await store.deleteAllFeedbacks("test-project");

      expect(backup()).toEqual(['{"not":"an array"}']);
    });

    it("a later backup is appended to the earlier one instead of replacing it", async () => {
      localStorage.setItem("test_feedbacks", "first-broken");
      await store.createFeedback(input);

      localStorage.setItem("test_feedbacks", "second-broken");
      await store.createFeedback({ ...input, clientId: "c2" });

      expect(backup()).toEqual(["first-broken", "second-broken"]);
    });

    it("an existing backup that isn't a JSON array is kept as its first entry", async () => {
      localStorage.setItem("test_feedbacks.corrupt", "hand-written");
      localStorage.setItem("test_feedbacks", "not-valid-json");

      await store.createFeedback(input);

      expect(backup()).toEqual(["hand-written", "not-valid-json"]);
    });

    it("a write retried after its backup landed backs each entry up once", async () => {
      localStorage.setItem("test_feedbacks", "not-valid-json");
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
        if (key === "test_feedbacks") throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        original.call(this, key, value);
      };
      try {
        await expect(store.createFeedback(input)).rejects.toBeInstanceOf(StorePersistenceError);
      } finally {
        Storage.prototype.setItem = original;
      }

      await store.createFeedback(input);

      expect(backup()).toEqual(["not-valid-json"]);
    });

    it("refuses the write (StorePersistenceError) when the backup can't be saved", async () => {
      localStorage.setItem("test_feedbacks", "not-valid-json");
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
        if (key.endsWith(".corrupt")) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        original.call(this, key, value);
      };
      try {
        await expect(store.createFeedback(input)).rejects.toBeInstanceOf(StorePersistenceError);
      } finally {
        Storage.prototype.setItem = original;
      }

      expect(localStorage.getItem("test_feedbacks")).toBe("not-valid-json");
    });

    it("writes no backup when everything was readable", async () => {
      await store.createFeedback(input);
      await store.createFeedback({ ...input, clientId: "c2" });

      expect(localStorage.getItem("test_feedbacks.corrupt")).toBeNull();
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

    it("clear() reports a storage failure as StorePersistenceError", () => {
      const original = Storage.prototype.removeItem;
      Storage.prototype.removeItem = () => {
        throw new DOMException("The operation is insecure.", "SecurityError");
      };
      try {
        expect(() => store.clear()).toThrow(StorePersistenceError);
      } finally {
        Storage.prototype.removeItem = original;
      }
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
