import { testSitepingStore } from "@siteping/core/testing";
import { describe, expect, it } from "vitest";
import { MemoryStore } from "../src/index.js";

// Run the full SitepingStore conformance suite
testSitepingStore(() => new MemoryStore());

// ---------------------------------------------------------------------------
// MemoryStore-specific tests
// ---------------------------------------------------------------------------

describe("MemoryStore specific", () => {
  it("clear() removes all data and resets id counter", async () => {
    const store = new MemoryStore();
    await store.createFeedback({
      projectName: "a",
      type: "bug",
      message: "test",
      status: "open",
      url: "https://example.com",
      viewport: "1920x1080",
      userAgent: "test",
      authorName: "Alice",
      authorEmail: "a@t.com",
      clientId: "c1",
      annotations: [],
    });
    await store.createFeedback({
      projectName: "b",
      type: "bug",
      message: "test",
      status: "open",
      url: "https://example.com",
      viewport: "1920x1080",
      userAgent: "test",
      authorName: "Alice",
      authorEmail: "a@t.com",
      clientId: "c2",
      annotations: [],
    });

    store.clear();

    expect((await store.getFeedbacks({ projectName: "a" })).total).toBe(0);
    expect((await store.getFeedbacks({ projectName: "b" })).total).toBe(0);

    // ID counter resets — next id starts at 1
    const fb = await store.createFeedback({
      projectName: "c",
      type: "bug",
      message: "test",
      status: "open",
      url: "https://example.com",
      viewport: "1920x1080",
      userAgent: "test",
      authorName: "Alice",
      authorEmail: "a@t.com",
      clientId: "c3",
      annotations: [],
    });
    expect(fb.id).toMatch(/^mem-1-/);
  });

  it("persists screenshotRegion verbatim and defaults to null when omitted", async () => {
    const store = new MemoryStore();
    const region = { xPct: 0.12, yPct: 0.34, wPct: 0.5, hPct: 0.25 };

    const withRegion = await store.createFeedback({
      projectName: "a",
      type: "bug",
      message: "with region",
      status: "open",
      url: "https://example.com",
      viewport: "1920x1080",
      userAgent: "test",
      authorName: "Alice",
      authorEmail: "a@t.com",
      clientId: "r1",
      annotations: [],
      screenshotDataUrl: "data:image/jpeg;base64,xxxx",
      screenshotRegion: region,
    });
    expect(withRegion.screenshotRegion).toEqual(region);

    const withoutRegion = await store.createFeedback({
      projectName: "a",
      type: "bug",
      message: "no region",
      status: "open",
      url: "https://example.com",
      viewport: "1920x1080",
      userAgent: "test",
      authorName: "Alice",
      authorEmail: "a@t.com",
      clientId: "r2",
      annotations: [],
    });
    expect(withoutRegion.screenshotRegion).toBeNull();
  });

  it("updateFeedback persists every status of the 4-status model", async () => {
    const store = new MemoryStore();
    const fb = await store.createFeedback({
      projectName: "a",
      type: "bug",
      message: "test",
      status: "open",
      url: "https://example.com",
      viewport: "1920x1080",
      userAgent: "test",
      authorName: "Alice",
      authorEmail: "a@t.com",
      clientId: "s1",
      annotations: [],
    });

    // Open statuses — resolvedAt stays null.
    const inProgress = await store.updateFeedback(fb.id, { status: "in_progress", resolvedAt: null });
    expect(inProgress.status).toBe("in_progress");
    expect(inProgress.resolvedAt).toBeNull();

    // Closed statuses — the store persists the closure timestamp it is given.
    const closedAt = new Date("2026-01-15T10:00:00.000Z");
    const wontFix = await store.updateFeedback(fb.id, { status: "wont_fix", resolvedAt: closedAt });
    expect(wontFix.status).toBe("wont_fix");
    expect(wontFix.resolvedAt).toEqual(closedAt);

    const reopened = await store.updateFeedback(fb.id, { status: "open", resolvedAt: null });
    expect(reopened.status).toBe("open");
    expect(reopened.resolvedAt).toBeNull();

    const resolved = await store.updateFeedback(fb.id, { status: "resolved", resolvedAt: closedAt });
    expect(resolved.status).toBe("resolved");
    expect(resolved.resolvedAt).toEqual(closedAt);
  });
});

// ---------------------------------------------------------------------------
// Concurrency — the widget's bulk actions fire every mutation at once
// ---------------------------------------------------------------------------

describe("MemoryStore concurrency", () => {
  function input(clientId: string) {
    return {
      projectName: "a",
      type: "bug" as const,
      message: "test",
      status: "open" as const,
      url: "https://example.com",
      viewport: "1920x1080",
      userAgent: "test",
      authorName: "Alice",
      authorEmail: "a@t.com",
      clientId,
      annotations: [],
    };
  }

  async function seed(store: MemoryStore) {
    const created = [];
    for (const clientId of ["a", "b", "c"]) created.push(await store.createFeedback(input(clientId)));
    return created;
  }

  it("a concurrent bulk delete removes every record", async () => {
    const store = new MemoryStore();
    const created = await seed(store);

    await Promise.all(created.map((f) => store.deleteFeedback(f.id)));

    expect((await store.getFeedbacks({ projectName: "a" })).total).toBe(0);
  });

  it("a concurrent bulk resolve resolves every record", async () => {
    const store = new MemoryStore();
    const created = await seed(store);

    await Promise.all(created.map((f) => store.updateFeedback(f.id, { status: "resolved", resolvedAt: new Date() })));

    const { feedbacks } = await store.getFeedbacks({ projectName: "a", status: "resolved" });
    expect(feedbacks).toHaveLength(3);
  });

  it("clear() while a write is pending never brings the cleared records back", async () => {
    // Call clear() at every point of the pending write's lifetime.
    for (let ticks = 0; ticks < 6; ticks++) {
      const store = new MemoryStore();
      await seed(store);

      const pending = store.createFeedback(input("late"));
      for (let i = 0; i < ticks; i++) await Promise.resolve();
      store.clear();
      await pending;

      const { feedbacks } = await store.getFeedbacks({ projectName: "a" });
      expect(
        feedbacks.filter((f) => f.clientId !== "late"),
        `clear() after ${ticks} tick(s)`,
      ).toEqual([]);
    }
  });
});

// The package bundles its own copy of core, so `instanceof` only matches the
// classes exported by this entry: every error a store method throws must be one.
it("re-exports every store error its methods throw", async () => {
  const { isStorePersistence, StoreDuplicateError, StoreLimitError, StoreNotFoundError, StorePersistenceError } =
    await import("@siteping/core");

  expect(await import("../src/index.js")).toMatchObject({
    isStorePersistence,
    StoreDuplicateError,
    StoreLimitError,
    StoreNotFoundError,
    StorePersistenceError,
  });
});
