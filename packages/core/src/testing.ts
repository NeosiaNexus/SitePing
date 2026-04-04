/**
 * Shared conformance test suite for `SitepingStore` implementations.
 *
 * Adapters import this and run it with their store factory to verify they
 * satisfy the full store contract — no need to write the same 20+ tests
 * from scratch.
 *
 * @example
 * ```ts
 * import { testSitepingStore } from '@siteping/core/testing'
 * import { DrizzleStore } from '../src/index.js'
 *
 * testSitepingStore(() => new DrizzleStore(mockDb))
 * ```
 */

import { describe, expect, it } from "vitest";
import type { FeedbackCreateInput, SitepingStore } from "./types.js";
import { StoreNotFoundError } from "./types.js";

// ---------------------------------------------------------------------------
// Test fixture
// ---------------------------------------------------------------------------

function createInput(overrides?: Partial<FeedbackCreateInput>): FeedbackCreateInput {
  return {
    projectName: "test-project",
    type: "bug",
    message: "Something is broken",
    status: "open",
    url: "https://example.com",
    viewport: "1920x1080",
    userAgent: "Mozilla/5.0",
    authorName: "Alice",
    authorEmail: "alice@test.com",
    clientId: `client-${Date.now()}-${Math.random()}`,
    annotations: [
      {
        cssSelector: "div.main",
        xpath: "/html/body/div",
        textSnippet: "Hello",
        elementTag: "DIV",
        elementId: "main",
        textPrefix: "before",
        textSuffix: "after",
        fingerprint: "3:1:abc",
        neighborText: "sibling",
        xPct: 0.1,
        yPct: 0.2,
        wPct: 0.5,
        hPct: 0.3,
        scrollX: 0,
        scrollY: 100,
        viewportW: 1920,
        viewportH: 1080,
        devicePixelRatio: 2,
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Conformance suite
// ---------------------------------------------------------------------------

/**
 * Run the full `SitepingStore` conformance test suite.
 *
 * @param factory — called before each test to create a fresh, empty store instance.
 */
export function testSitepingStore(factory: () => SitepingStore): void {
  let store: SitepingStore;

  // Use a describe-scoped beforeEach via the factory
  const freshStore = () => {
    store = factory();
  };

  describe("SitepingStore conformance", () => {
    // ------------------------------------------------------------------
    // createFeedback
    // ------------------------------------------------------------------

    describe("createFeedback", () => {
      it("creates a feedback and returns a FeedbackRecord", async () => {
        freshStore();
        const record = await store.createFeedback(createInput());

        expect(record.id).toBeDefined();
        expect(record.projectName).toBe("test-project");
        expect(record.type).toBe("bug");
        expect(record.message).toBe("Something is broken");
        expect(record.status).toBe("open");
        expect(record.resolvedAt).toBeNull();
        expect(record.createdAt).toBeInstanceOf(Date);
        expect(record.updatedAt).toBeInstanceOf(Date);
      });

      it("creates annotations with feedbackId reference", async () => {
        freshStore();
        const record = await store.createFeedback(createInput());

        expect(record.annotations).toHaveLength(1);
        const [ann] = record.annotations;
        expect(ann).toBeDefined();
        expect(ann?.id).toBeDefined();
        expect(ann?.feedbackId).toBe(record.id);
        expect(ann?.cssSelector).toBe("div.main");
        expect(ann?.xPct).toBe(0.1);
        expect(ann?.elementId).toBe("main");
        expect(ann?.createdAt).toBeInstanceOf(Date);
      });

      it("sets elementId to null when undefined in input", async () => {
        freshStore();
        const input = createInput({
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
        const record = await store.createFeedback(input);
        expect(record.annotations[0]?.elementId).toBeNull();
      });

      it("deduplicates by clientId (idempotent)", async () => {
        freshStore();
        const input = createInput({ clientId: "same-id" });
        const first = await store.createFeedback(input);
        const second = await store.createFeedback(input);

        expect(second.id).toBe(first.id);
        const { total } = await store.getFeedbacks({ projectName: "test-project" });
        expect(total).toBe(1);
      });

      it("stores newest feedbacks first", async () => {
        freshStore();
        const a = await store.createFeedback(createInput({ message: "first" }));
        const b = await store.createFeedback(createInput({ message: "second" }));
        const { feedbacks } = await store.getFeedbacks({ projectName: "test-project" });
        expect(feedbacks[0]?.id).toBe(b.id);
        expect(feedbacks[1]?.id).toBe(a.id);
      });

      it("generates unique IDs across calls", async () => {
        freshStore();
        const a = await store.createFeedback(createInput());
        const b = await store.createFeedback(createInput());
        expect(a.id).not.toBe(b.id);
      });

      it("creates feedbacks with no annotations", async () => {
        freshStore();
        const record = await store.createFeedback(createInput({ annotations: [] }));
        expect(record.annotations).toHaveLength(0);
      });
    });

    // ------------------------------------------------------------------
    // getFeedbacks
    // ------------------------------------------------------------------

    describe("getFeedbacks", () => {
      it("returns empty array when no feedbacks", async () => {
        freshStore();
        const result = await store.getFeedbacks({ projectName: "test-project" });
        expect(result.feedbacks).toHaveLength(0);
        expect(result.total).toBe(0);
      });

      it("filters by projectName", async () => {
        freshStore();
        await store.createFeedback(createInput({ projectName: "a" }));
        await store.createFeedback(createInput({ projectName: "b" }));

        const result = await store.getFeedbacks({ projectName: "a" });
        expect(result.total).toBe(1);
        expect(result.feedbacks[0]?.projectName).toBe("a");
      });

      it("filters by type", async () => {
        freshStore();
        await store.createFeedback(createInput({ type: "bug" }));
        await store.createFeedback(createInput({ type: "question" }));

        const result = await store.getFeedbacks({ projectName: "test-project", type: "bug" });
        expect(result.feedbacks).toHaveLength(1);
        expect(result.feedbacks[0]?.type).toBe("bug");
      });

      it("filters by status", async () => {
        freshStore();
        const fb = await store.createFeedback(createInput());
        await store.updateFeedback(fb.id, { status: "resolved", resolvedAt: new Date() });
        await store.createFeedback(createInput());

        const result = await store.getFeedbacks({ projectName: "test-project", status: "open" });
        expect(result.feedbacks).toHaveLength(1);
      });

      it("filters by search (case-insensitive)", async () => {
        freshStore();
        await store.createFeedback(createInput({ message: "Button is broken" }));
        await store.createFeedback(createInput({ message: "Layout looks great" }));

        const result = await store.getFeedbacks({ projectName: "test-project", search: "BROKEN" });
        expect(result.feedbacks).toHaveLength(1);
        expect(result.feedbacks[0]?.message).toBe("Button is broken");
      });

      it("paginates correctly", async () => {
        freshStore();
        for (let i = 0; i < 5; i++) {
          await store.createFeedback(createInput());
        }

        const page1 = await store.getFeedbacks({ projectName: "test-project", page: 1, limit: 2 });
        expect(page1.feedbacks).toHaveLength(2);
        expect(page1.total).toBe(5);

        const page3 = await store.getFeedbacks({ projectName: "test-project", page: 3, limit: 2 });
        expect(page3.feedbacks).toHaveLength(1);
      });

      it("caps limit at 100", async () => {
        freshStore();
        for (let i = 0; i < 3; i++) {
          await store.createFeedback(createInput());
        }
        const result = await store.getFeedbacks({ projectName: "test-project", limit: 200 });
        expect(result.feedbacks).toHaveLength(3);
      });
    });

    // ------------------------------------------------------------------
    // findByClientId
    // ------------------------------------------------------------------

    describe("findByClientId", () => {
      it("returns the record when found", async () => {
        freshStore();
        const created = await store.createFeedback(createInput({ clientId: "find-me" }));
        const found = await store.findByClientId("find-me");
        expect(found).not.toBeNull();
        expect(found?.id).toBe(created.id);
      });

      it("returns null when not found", async () => {
        freshStore();
        expect(await store.findByClientId("nope")).toBeNull();
      });
    });

    // ------------------------------------------------------------------
    // updateFeedback
    // ------------------------------------------------------------------

    describe("updateFeedback", () => {
      it("updates status and resolvedAt", async () => {
        freshStore();
        const fb = await store.createFeedback(createInput());
        const resolvedAt = new Date();
        const updated = await store.updateFeedback(fb.id, { status: "resolved", resolvedAt });

        expect(updated.status).toBe("resolved");
        expect(updated.resolvedAt).toEqual(resolvedAt);
        expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(fb.updatedAt.getTime());
      });

      it("throws StoreNotFoundError for unknown id", async () => {
        freshStore();
        await expect(store.updateFeedback("unknown", { status: "resolved", resolvedAt: new Date() })).rejects.toThrow(
          StoreNotFoundError,
        );
      });

      it("can reopen a resolved feedback", async () => {
        freshStore();
        const fb = await store.createFeedback(createInput());
        await store.updateFeedback(fb.id, { status: "resolved", resolvedAt: new Date() });
        const reopened = await store.updateFeedback(fb.id, { status: "open", resolvedAt: null });
        expect(reopened.status).toBe("open");
        expect(reopened.resolvedAt).toBeNull();
      });
    });

    // ------------------------------------------------------------------
    // deleteFeedback
    // ------------------------------------------------------------------

    describe("deleteFeedback", () => {
      it("removes the feedback", async () => {
        freshStore();
        const fb = await store.createFeedback(createInput());
        await store.deleteFeedback(fb.id);
        const { total } = await store.getFeedbacks({ projectName: "test-project" });
        expect(total).toBe(0);
      });

      it("throws StoreNotFoundError for unknown id", async () => {
        freshStore();
        await expect(store.deleteFeedback("unknown")).rejects.toThrow(StoreNotFoundError);
      });
    });

    // ------------------------------------------------------------------
    // deleteAllFeedbacks
    // ------------------------------------------------------------------

    describe("deleteAllFeedbacks", () => {
      it("removes all feedbacks for a project but keeps others", async () => {
        freshStore();
        await store.createFeedback(createInput({ projectName: "delete-me" }));
        await store.createFeedback(createInput({ projectName: "delete-me" }));
        await store.createFeedback(createInput({ projectName: "keep-me" }));

        await store.deleteAllFeedbacks("delete-me");

        expect((await store.getFeedbacks({ projectName: "delete-me" })).total).toBe(0);
        expect((await store.getFeedbacks({ projectName: "keep-me" })).total).toBe(1);
      });

      it("is a no-op when project has no feedbacks", async () => {
        freshStore();
        await expect(store.deleteAllFeedbacks("nonexistent")).resolves.toBeUndefined();
      });
    });
  });
}
