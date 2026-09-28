import {
  type AnnotationPayload,
  type FeedbackCreateInput,
  type FeedbackPayload,
  type FeedbackRecord,
  SitepingError,
  type SitepingStore,
  StoreDuplicateError,
} from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoreClient } from "../../src/store-client.js";

// ---------------------------------------------------------------------------
// Mock SitepingStore
// ---------------------------------------------------------------------------

function mockStore(): SitepingStore {
  return {
    createFeedback: vi.fn(),
    getFeedbacks: vi.fn(),
    findByClientId: vi.fn(),
    updateFeedback: vi.fn(),
    deleteFeedback: vi.fn(),
    deleteAllFeedbacks: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date("2025-06-01T12:00:00.000Z");

const sampleAnnotation: AnnotationPayload = {
  anchor: {
    cssSelector: "div.hero",
    xpath: "/html/body/div[1]",
    textSnippet: "Welcome",
    elementTag: "DIV",
    elementId: "hero",
    textPrefix: "nav",
    textSuffix: "footer",
    fingerprint: "2:0:x1",
    neighborText: "aside",
  },
  rect: { xPct: 0.1, yPct: 0.2, wPct: 0.5, hPct: 0.3 },
  scrollX: 0,
  scrollY: 150,
  viewportW: 1920,
  viewportH: 1080,
  devicePixelRatio: 2,
};

const samplePayload: FeedbackPayload = {
  projectName: "test-project",
  type: "bug",
  message: "Broken layout",
  url: "https://example.com",
  viewport: "1920x1080",
  userAgent: "Mozilla/5.0",
  authorName: "Alice",
  authorEmail: "alice@test.com",
  annotations: [sampleAnnotation],
  clientId: "uuid-123",
};

function makeFeedbackRecord(overrides?: Partial<FeedbackRecord>): FeedbackRecord {
  return {
    id: "fb-1",
    projectName: "test-project",
    type: "bug",
    message: "Broken layout",
    status: "open",
    url: "https://example.com",
    viewport: "1920x1080",
    userAgent: "Mozilla/5.0",
    authorName: "Alice",
    authorEmail: "alice@test.com",
    clientId: "uuid-123",
    urlPattern: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
    screenshotUrl: null,
    screenshotRegion: null,
    diagnostics: null,
    annotations: [
      {
        id: "ann-1",
        feedbackId: "fb-1",
        cssSelector: "div.hero",
        xpath: "/html/body/div[1]",
        textSnippet: "Welcome",
        elementTag: "DIV",
        elementId: "hero",
        textPrefix: "nav",
        textSuffix: "footer",
        fingerprint: "2:0:x1",
        neighborText: "aside",
        anchorKey: null,
        xPct: 0.1,
        yPct: 0.2,
        wPct: 0.5,
        hPct: 0.3,
        scrollX: 0,
        scrollY: 150,
        viewportW: 1920,
        viewportH: 1080,
        devicePixelRatio: 2,
        createdAt: now,
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StoreClient", () => {
  let store: ReturnType<typeof mockStore>;
  let client: StoreClient;

  beforeEach(() => {
    store = mockStore();
    client = new StoreClient(store, "test-project");
  });

  // -----------------------------------------------------------------------
  // sendFeedback
  // -----------------------------------------------------------------------

  // -----------------------------------------------------------------------
  // sendFeedback — a write that never settles (#342): SitepingStore takes no
  // AbortSignal, and the popup holds the user until the send settles.
  // -----------------------------------------------------------------------

  describe("sendFeedback — bounded wait", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("rejects with a retryable TIMEOUT SitepingError at 30 s, not before, and leaves no timer pending", async () => {
      vi.useFakeTimers();
      vi.mocked(store.createFeedback).mockReturnValue(new Promise(() => {}));
      const settled = vi.fn();
      const outcome = client.sendFeedback(samplePayload).then(settled, (error: unknown) => {
        settled();
        return error;
      });

      await vi.advanceTimersByTimeAsync(29_999);
      expect(settled).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);

      const error = await outcome;
      expect(error).toBeInstanceOf(SitepingError);
      expect(error).toMatchObject({ code: "TIMEOUT", retryable: true });
      expect(vi.getTimerCount()).toBe(0);
    });

    it("does not serialize writes: the resend reaches the store while the first write still hangs, with the same clientId", async () => {
      // The late-write policy: the abandoned write may still land; the resend
      // from the same popup carries its clientId, so the store keeps one
      // record (see "duplicate clientId"). A write chain would instead never
      // unblock after a write that never settles.
      vi.useFakeTimers();
      vi.mocked(store.createFeedback)
        .mockReturnValueOnce(new Promise(() => {}))
        .mockResolvedValueOnce(makeFeedbackRecord());

      const first = client.sendFeedback(samplePayload).catch((error: unknown) => error);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(await first).toMatchObject({ code: "TIMEOUT" });

      await expect(client.sendFeedback({ ...samplePayload, message: "Edited" })).resolves.toMatchObject({ id: "fb-1" });
      const calls = vi.mocked(store.createFeedback).mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[1]![0].clientId).toBe(calls[0]![0].clientId);
    });
  });

  // -----------------------------------------------------------------------
  // sendFeedback — duplicate clientId: the contract lets createFeedback throw
  // StoreDuplicateError instead of returning the existing record.
  // -----------------------------------------------------------------------

  describe("sendFeedback — duplicate clientId", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("resolves a resend with the stored record when the timed-out first write landed and the store throws on duplicates", async () => {
      vi.useFakeTimers();
      const rows = new Map<string, FeedbackRecord>();
      vi.mocked(store.createFeedback).mockImplementation(async (input) => {
        if (rows.has(input.clientId)) throw new StoreDuplicateError();
        rows.set(input.clientId, makeFeedbackRecord({ clientId: input.clientId, message: input.message }));
        // The row is written at once, but the store only answers after 50 s.
        await new Promise((resolve) => setTimeout(resolve, 50_000));
        return rows.get(input.clientId)!;
      });
      vi.mocked(store.findByClientId).mockImplementation(async (clientId) => rows.get(clientId) ?? null);

      const first = client.sendFeedback(samplePayload).catch((error: unknown) => error);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(await first).toMatchObject({ code: "TIMEOUT" });

      const resent = await client.sendFeedback({ ...samplePayload, message: "Edited" });

      expect(resent).toMatchObject({ id: "fb-1", message: "Broken layout" });
      expect(rows.size).toBe(1);
    });

    it.each([
      ["no record carries the clientId", null],
      ["the clientId belongs to another project", makeFeedbackRecord({ projectName: "other-project" })],
    ])("rethrows the duplicate error when %s", async (_case, found) => {
      const duplicate = new StoreDuplicateError();
      vi.mocked(store.createFeedback).mockRejectedValue(duplicate);
      vi.mocked(store.findByClientId).mockResolvedValue(found);

      await expect(client.sendFeedback(samplePayload)).rejects.toBe(duplicate);
    });

    it("leaves other store errors alone", async () => {
      const failure = new Error("disk full");
      vi.mocked(store.createFeedback).mockRejectedValue(failure);

      await expect(client.sendFeedback(samplePayload)).rejects.toBe(failure);
      expect(store.findByClientId).not.toHaveBeenCalled();
    });

    it("bounds the duplicate lookup by the same 30 s", async () => {
      vi.useFakeTimers();
      vi.mocked(store.createFeedback).mockRejectedValue(new StoreDuplicateError());
      vi.mocked(store.findByClientId).mockReturnValue(new Promise(() => {}));

      const outcome = client.sendFeedback(samplePayload).catch((error: unknown) => error);
      await vi.advanceTimersByTimeAsync(30_000);

      expect(await outcome).toMatchObject({ code: "TIMEOUT" });
    });
  });

  describe("sendFeedback", () => {
    it("calls store.createFeedback with flattened annotations", async () => {
      const record = makeFeedbackRecord();
      vi.mocked(store.createFeedback).mockResolvedValue(record);

      await client.sendFeedback(samplePayload);

      expect(store.createFeedback).toHaveBeenCalledOnce();
      const input = vi.mocked(store.createFeedback).mock.calls[0]![0] as FeedbackCreateInput;

      // Status should be "open" for new feedbacks
      expect(input.status).toBe("open");
      // Annotations should be flattened (no anchor/rect nesting)
      expect(input.annotations[0]!.cssSelector).toBe("div.hero");
      expect(input.annotations[0]!.xPct).toBe(0.1);
      expect(input.annotations[0]!.scrollY).toBe(150);
      // No nested anchor/rect
      expect("anchor" in input.annotations[0]!).toBe(false);
      expect("rect" in input.annotations[0]!).toBe(false);
    });

    it("passes all payload fields through", async () => {
      vi.mocked(store.createFeedback).mockResolvedValue(makeFeedbackRecord());

      await client.sendFeedback(samplePayload);
      const input = vi.mocked(store.createFeedback).mock.calls[0]![0] as FeedbackCreateInput;

      expect(input.projectName).toBe("test-project");
      expect(input.type).toBe("bug");
      expect(input.message).toBe("Broken layout");
      expect(input.url).toBe("https://example.com");
      expect(input.authorName).toBe("Alice");
      expect(input.clientId).toBe("uuid-123");
    });

    it("serializes dates to ISO strings in the response", async () => {
      const record = makeFeedbackRecord();
      vi.mocked(store.createFeedback).mockResolvedValue(record);

      const response = await client.sendFeedback(samplePayload);

      expect(response.createdAt).toBe("2025-06-01T12:00:00.000Z");
      expect(response.updatedAt).toBe("2025-06-01T12:00:00.000Z");
      expect(response.resolvedAt).toBeNull();
      expect(response.annotations[0]!.createdAt).toBe("2025-06-01T12:00:00.000Z");
    });

    it("serializes resolvedAt when present", async () => {
      const resolvedAt = new Date("2025-06-02T08:00:00.000Z");
      const record = makeFeedbackRecord({ status: "resolved", resolvedAt });
      vi.mocked(store.createFeedback).mockResolvedValue(record);

      const response = await client.sendFeedback(samplePayload);
      expect(response.resolvedAt).toBe("2025-06-02T08:00:00.000Z");
    });

    it("does not include clientId in the response", async () => {
      vi.mocked(store.createFeedback).mockResolvedValue(makeFeedbackRecord());
      const response = await client.sendFeedback(samplePayload);
      expect("clientId" in response).toBe(false);
    });

    it("forwards screenshotRegion to store.createFeedback", async () => {
      vi.mocked(store.createFeedback).mockResolvedValue(makeFeedbackRecord());
      const region = { xPct: 0.25, yPct: 0.1, wPct: 0.5, hPct: 0.4 };

      await client.sendFeedback({ ...samplePayload, screenshotRegion: region });
      const input = vi.mocked(store.createFeedback).mock.calls[0]![0] as FeedbackCreateInput;

      expect(input.screenshotRegion).toEqual(region);
    });

    it("defaults screenshotRegion to null when the payload omits it", async () => {
      vi.mocked(store.createFeedback).mockResolvedValue(makeFeedbackRecord());

      await client.sendFeedback(samplePayload);
      const input = vi.mocked(store.createFeedback).mock.calls[0]![0] as FeedbackCreateInput;

      expect(input.screenshotRegion).toBeNull();
    });

    it("forwards diagnostics to store.createFeedback (regression: previously dropped)", async () => {
      vi.mocked(store.createFeedback).mockResolvedValue(makeFeedbackRecord());
      const diagnostics = {
        console: [{ level: "error" as const, timestamp: "2025-06-01T11:59:00.000Z", message: "boom" }],
        network: [
          {
            url: "https://api.test/fail",
            method: "GET",
            status: 500,
            durationMs: 120,
            timestamp: "2025-06-01T11:59:30.000Z",
          },
        ],
      };

      await client.sendFeedback({ ...samplePayload, diagnostics });
      const input = vi.mocked(store.createFeedback).mock.calls[0]![0] as FeedbackCreateInput;

      expect(input.diagnostics).toEqual(diagnostics);
    });

    it("defaults diagnostics to null when the payload omits it", async () => {
      vi.mocked(store.createFeedback).mockResolvedValue(makeFeedbackRecord());

      await client.sendFeedback(samplePayload);
      const input = vi.mocked(store.createFeedback).mock.calls[0]![0] as FeedbackCreateInput;

      expect(input.diagnostics).toBeNull();
    });

    it("includes screenshotRegion in the response", async () => {
      const region = { xPct: 0.2, yPct: 0.3, wPct: 0.4, hPct: 0.1 };
      vi.mocked(store.createFeedback).mockResolvedValue(makeFeedbackRecord({ screenshotRegion: region }));

      const response = await client.sendFeedback(samplePayload);
      expect(response.screenshotRegion).toEqual(region);
    });

    it("serializes screenshotRegion as null for records without one", async () => {
      vi.mocked(store.createFeedback).mockResolvedValue(makeFeedbackRecord());

      const response = await client.sendFeedback(samplePayload);
      expect(response.screenshotRegion).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // getFeedbacks
  // -----------------------------------------------------------------------

  describe("getFeedbacks", () => {
    it("delegates to store.getFeedbacks with correct query", async () => {
      vi.mocked(store.getFeedbacks).mockResolvedValue({ feedbacks: [], total: 0 });

      await client.getFeedbacks("my-project", { page: 2, limit: 10, type: "bug", status: "open", search: "hello" });

      expect(store.getFeedbacks).toHaveBeenCalledWith({
        projectName: "my-project",
        page: 2,
        limit: 10,
        type: "bug",
        status: "open",
        search: "hello",
      });
    });

    it("passes the statuses bucket through to the store", async () => {
      vi.mocked(store.getFeedbacks).mockResolvedValue({ feedbacks: [], total: 0 });

      await client.getFeedbacks("my-project", { statuses: ["open", "in_progress"] });

      expect(store.getFeedbacks).toHaveBeenCalledWith(expect.objectContaining({ statuses: ["open", "in_progress"] }));
    });

    it("handles missing options", async () => {
      vi.mocked(store.getFeedbacks).mockResolvedValue({ feedbacks: [], total: 0 });

      await client.getFeedbacks("my-project");

      expect(store.getFeedbacks).toHaveBeenCalledWith({
        projectName: "my-project",
        page: undefined,
        limit: undefined,
        type: undefined,
        status: undefined,
        search: undefined,
      });
    });

    it("serializes dates in returned feedbacks", async () => {
      vi.mocked(store.getFeedbacks).mockResolvedValue({
        feedbacks: [makeFeedbackRecord()],
        total: 1,
      });

      const result = await client.getFeedbacks("test-project");
      expect(result.total).toBe(1);
      expect(result.feedbacks[0]!.createdAt).toBe("2025-06-01T12:00:00.000Z");
      expect(typeof result.feedbacks[0]!.createdAt).toBe("string");
    });
  });

  // -----------------------------------------------------------------------
  // resolveFeedback
  // -----------------------------------------------------------------------

  describe("resolveFeedback", () => {
    it("calls store.updateFeedback with resolved status", async () => {
      const resolved = makeFeedbackRecord({ status: "resolved", resolvedAt: now });
      vi.mocked(store.updateFeedback).mockResolvedValue(resolved);

      await client.resolveFeedback("fb-1", true);

      expect(store.updateFeedback).toHaveBeenCalledWith("fb-1", {
        status: "resolved",
        resolvedAt: expect.any(Date),
      });
    });

    it("calls store.updateFeedback with open status when unresolving", async () => {
      const reopened = makeFeedbackRecord({ status: "open", resolvedAt: null });
      vi.mocked(store.updateFeedback).mockResolvedValue(reopened);

      await client.resolveFeedback("fb-1", false);

      expect(store.updateFeedback).toHaveBeenCalledWith("fb-1", {
        status: "open",
        resolvedAt: null,
      });
    });

    it("returns serialized FeedbackResponse", async () => {
      vi.mocked(store.updateFeedback).mockResolvedValue(makeFeedbackRecord({ status: "resolved", resolvedAt: now }));

      const response = await client.resolveFeedback("fb-1", true);
      expect(response.status).toBe("resolved");
      expect(response.resolvedAt).toBe("2025-06-01T12:00:00.000Z");
    });
  });

  // -----------------------------------------------------------------------
  // deleteFeedback
  // -----------------------------------------------------------------------

  describe("deleteFeedback", () => {
    it("delegates to store.deleteFeedback", async () => {
      vi.mocked(store.deleteFeedback).mockResolvedValue(undefined);

      await client.deleteFeedback("fb-1");
      expect(store.deleteFeedback).toHaveBeenCalledWith("fb-1");
    });
  });

  // -----------------------------------------------------------------------
  // deleteAllFeedbacks
  // -----------------------------------------------------------------------

  describe("deleteAllFeedbacks", () => {
    it("delegates to store.deleteAllFeedbacks", async () => {
      vi.mocked(store.deleteAllFeedbacks).mockResolvedValue(undefined);

      await client.deleteAllFeedbacks("test-project");
      expect(store.deleteAllFeedbacks).toHaveBeenCalledWith("test-project");
    });
  });
});
