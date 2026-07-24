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
