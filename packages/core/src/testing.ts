/**
 * Shared conformance test suite for `SitepingStore` implementations.
 *
 * Adapters import this and run it with their store factory to verify they
 * satisfy the full store contract — no need to write the same 40+ tests
 * from scratch.
 *
 * @example
 * ```ts
 * import { testSitepingStore } from '@siteping/core/testing'
 * import { DrizzleStore } from '../src/index.js'
 *
 * testSitepingStore(() => new DrizzleStore(db))
 * ```
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { DiagnosticsSnapshot, FeedbackCreateInput, SitepingStore } from "./types.js";
import { isStoreDuplicate, StoreNotFoundError } from "./types.js";

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

const MINIMAL_ANNOTATION = {
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
};

// ---------------------------------------------------------------------------
// Conformance suite
// ---------------------------------------------------------------------------

/** Tuning knobs for backends whose documented contract legitimately varies. */
export interface StoreConformanceOptions {
  /**
   * How `createFeedback` reacts to a duplicate `clientId` — both are valid
   * per the `SitepingStore` contract:
   * - `"return"` (default): idempotently return the existing record.
   * - `"throw"`: throw `StoreDuplicateError` (matched via `isStoreDuplicate`).
   */
  duplicateBehavior?: "return" | "throw" | undefined;
  /**
   * Whether `search` matches case-insensitively. Defaults to `true` (the
   * in-memory pipeline's behavior). Set to `false` for SQL backends whose
   * collation is case-sensitive — the suite then only asserts same-case
   * substring matching.
   */
  caseInsensitiveSearch?: boolean | undefined;
}

/**
 * Run the full `SitepingStore` conformance test suite.
 *
 * @param factory — called before each test to create a fresh, empty store instance. May be async.
 * @param options — contract variations, see {@link StoreConformanceOptions}.
 */
export function testSitepingStore(
  factory: () => SitepingStore | Promise<SitepingStore>,
  options?: StoreConformanceOptions,
): void {
  const duplicateBehavior = options?.duplicateBehavior ?? "return";
  const caseInsensitiveSearch = options?.caseInsensitiveSearch ?? true;

  describe("SitepingStore conformance", () => {
    let store: SitepingStore;

    beforeEach(async () => {
      store = await factory();
    });

    // ------------------------------------------------------------------
    // createFeedback
    // ------------------------------------------------------------------

    describe("createFeedback", () => {
      it("creates a feedback and returns a FeedbackRecord", async () => {
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
        const record = await store.createFeedback(createInput({ annotations: [{ ...MINIMAL_ANNOTATION }] }));
        expect(record.annotations[0]?.elementId).toBeNull();
      });

      it("persists anchorKey when provided", async () => {
        const record = await store.createFeedback(
          createInput({
            annotations: [
              {
                ...MINIMAL_ANNOTATION,
                cssSelector: "section",
                xpath: "/section",
                textSnippet: "Services",
                elementTag: "SECTION",
                anchorKey: "order-card.services",
              },
            ],
          }),
        );
        expect(record.annotations[0]?.anchorKey).toBe("order-card.services");
      });

      it("persists anchorKey as null when omitted", async () => {
        const record = await store.createFeedback(createInput());
        expect(record.annotations[0]?.anchorKey).toBeNull();
      });

      it("persists screenshotUrl as null when no data URL is provided", async () => {
        const record = await store.createFeedback(createInput());
        expect(record.screenshotUrl).toBeNull();
      });

      it("persists the screenshot data URL inline when no external storage is configured", async () => {
        // Stores without external storage (memory, localStorage) keep the
        // data URL as-is. Adapter-prisma with a `screenshotStorage` replaces
        // it with the remote URL — that path is covered by adapter-prisma tests.
        const dataUrl = "data:image/jpeg;base64,/9j/4AAQ"; // truncated but valid prefix
        const record = await store.createFeedback(createInput({ screenshotDataUrl: dataUrl }));
        expect(record.screenshotUrl).toBe(dataUrl);
      });

      it("persists screenshotRegion verbatim when provided", async () => {
        const region = { xPct: 0.1234, yPct: 0.5678, wPct: 0.25, hPct: 0.125 };
        const record = await store.createFeedback(createInput({ screenshotRegion: region }));
        expect(record.screenshotRegion).toEqual(region);
      });

      it("persists screenshotRegion as null when omitted", async () => {
        const record = await store.createFeedback(createInput());
        expect(record.screenshotRegion).toBeNull();
      });

      it("persists diagnostics verbatim when provided", async () => {
        const diagnostics: DiagnosticsSnapshot = {
          console: [{ level: "error", timestamp: "2026-01-01T00:00:00.000Z", message: "boom" }],
          network: [
            {
              url: "https://api.test/things",
              method: "GET",
              status: 500,
              durationMs: 123,
              timestamp: "2026-01-01T00:00:01.000Z",
            },
          ],
        };
        const record = await store.createFeedback(createInput({ diagnostics }));
        expect(record.diagnostics).toEqual(diagnostics);
      });

      it("persists diagnostics as null when omitted", async () => {
        const record = await store.createFeedback(createInput());
        expect(record.diagnostics).toBeNull();
      });

      if (duplicateBehavior === "return") {
        it("deduplicates by clientId (idempotent)", async () => {
          const input = createInput({ clientId: "same-id" });
          const first = await store.createFeedback(input);
          const second = await store.createFeedback(input);

          expect(second.id).toBe(first.id);
          const { total } = await store.getFeedbacks({ projectName: "test-project" });
          expect(total).toBe(1);
        });
      } else {
        it("throws StoreDuplicateError on duplicate clientId", async () => {
          const input = createInput({ clientId: "same-id" });
          await store.createFeedback(input);
          await expect(store.createFeedback(input)).rejects.toSatisfy(isStoreDuplicate);

          const { total } = await store.getFeedbacks({ projectName: "test-project" });
          expect(total).toBe(1);
        });
      }

      it("stores newest feedbacks first", async () => {
        const a = await store.createFeedback(createInput({ message: "first" }));
        const b = await store.createFeedback(createInput({ message: "second" }));
        const { feedbacks } = await store.getFeedbacks({ projectName: "test-project" });
        expect(feedbacks[0]?.id).toBe(b.id);
        expect(feedbacks[1]?.id).toBe(a.id);
      });

      it("generates unique IDs across calls", async () => {
        const a = await store.createFeedback(createInput());
        const b = await store.createFeedback(createInput());
        expect(a.id).not.toBe(b.id);
      });

      it("creates feedbacks with no annotations", async () => {
        const record = await store.createFeedback(createInput({ annotations: [] }));
        expect(record.annotations).toHaveLength(0);
      });
    });

    // ------------------------------------------------------------------
    // getFeedbacks
    // ------------------------------------------------------------------

    describe("getFeedbacks", () => {
      it("returns empty array when no feedbacks", async () => {
        const result = await store.getFeedbacks({ projectName: "test-project" });
        expect(result.feedbacks).toHaveLength(0);
        expect(result.total).toBe(0);
      });

      it("filters by projectName", async () => {
        await store.createFeedback(createInput({ projectName: "a" }));
        await store.createFeedback(createInput({ projectName: "b" }));

        const result = await store.getFeedbacks({ projectName: "a" });
        expect(result.total).toBe(1);
        expect(result.feedbacks[0]?.projectName).toBe("a");
      });

      it("filters by type", async () => {
        await store.createFeedback(createInput({ type: "bug" }));
        await store.createFeedback(createInput({ type: "question" }));

        const result = await store.getFeedbacks({ projectName: "test-project", type: "bug" });
        expect(result.feedbacks).toHaveLength(1);
        expect(result.feedbacks[0]?.type).toBe("bug");
      });

      it("filters by status", async () => {
        const fb = await store.createFeedback(createInput());
        await store.updateFeedback(fb.id, { status: "resolved", resolvedAt: new Date() });
        await store.createFeedback(createInput());

        const result = await store.getFeedbacks({ projectName: "test-project", status: "open" });
        expect(result.feedbacks).toHaveLength(1);
      });

      it("filters by status in_progress", async () => {
        const fb = await store.createFeedback(createInput());
        await store.updateFeedback(fb.id, { status: "in_progress", resolvedAt: null });
        await store.createFeedback(createInput());

        const result = await store.getFeedbacks({ projectName: "test-project", status: "in_progress" });
        expect(result.feedbacks).toHaveLength(1);
        expect(result.feedbacks[0]?.status).toBe("in_progress");
      });

      it("filters by status wont_fix", async () => {
        const fb = await store.createFeedback(createInput());
        await store.updateFeedback(fb.id, { status: "wont_fix", resolvedAt: new Date() });
        await store.createFeedback(createInput());

        const result = await store.getFeedbacks({ projectName: "test-project", status: "wont_fix" });
        expect(result.feedbacks).toHaveLength(1);
        expect(result.feedbacks[0]?.status).toBe("wont_fix");
      });

      it("filters by a statuses bucket (any of the listed values)", async () => {
        const open = await store.createFeedback(createInput());
        const prog = await store.createFeedback(createInput());
        await store.updateFeedback(prog.id, { status: "in_progress", resolvedAt: null });
        const resolved = await store.createFeedback(createInput());
        await store.updateFeedback(resolved.id, { status: "resolved", resolvedAt: new Date() });

        const result = await store.getFeedbacks({
          projectName: "test-project",
          statuses: ["open", "in_progress"],
        });
        expect(result.total).toBe(2);
        expect(result.feedbacks.map((f) => f.id).sort()).toEqual([open.id, prog.id].sort());
      });

      it("paginates a statuses bucket with the correct total", async () => {
        for (let i = 0; i < 3; i++) {
          const fb = await store.createFeedback(createInput());
          await store.updateFeedback(fb.id, { status: "in_progress", resolvedAt: null });
        }
        // A closed record that must never appear in the open bucket.
        const closed = await store.createFeedback(createInput());
        await store.updateFeedback(closed.id, { status: "resolved", resolvedAt: new Date() });

        const page1 = await store.getFeedbacks({
          projectName: "test-project",
          statuses: ["open", "in_progress"],
          page: 1,
          limit: 2,
        });
        expect(page1.total).toBe(3);
        expect(page1.feedbacks).toHaveLength(2);

        const page2 = await store.getFeedbacks({
          projectName: "test-project",
          statuses: ["open", "in_progress"],
          page: 2,
          limit: 2,
        });
        expect(page2.total).toBe(3);
        expect(page2.feedbacks).toHaveLength(1);
      });

      it("prefers statuses over status when both are set", async () => {
        await store.createFeedback(createInput());
        const prog = await store.createFeedback(createInput());
        await store.updateFeedback(prog.id, { status: "in_progress", resolvedAt: null });

        // `status: "open"` alone would exclude the in_progress record, but the
        // `statuses` bucket wins — both records match.
        const result = await store.getFeedbacks({
          projectName: "test-project",
          status: "open",
          statuses: ["open", "in_progress"],
        });
        expect(result.total).toBe(2);
      });

      it("ignores an empty statuses array (no status filter)", async () => {
        await store.createFeedback(createInput());
        const prog = await store.createFeedback(createInput());
        await store.updateFeedback(prog.id, { status: "in_progress", resolvedAt: null });

        const result = await store.getFeedbacks({ projectName: "test-project", statuses: [] });
        expect(result.total).toBe(2);
      });

      it("filters by search (same-case substring)", async () => {
        await store.createFeedback(createInput({ message: "Button is broken" }));
        await store.createFeedback(createInput({ message: "Layout looks great" }));

        const result = await store.getFeedbacks({ projectName: "test-project", search: "broken" });
        expect(result.feedbacks).toHaveLength(1);
        expect(result.feedbacks[0]?.message).toBe("Button is broken");
      });

      if (caseInsensitiveSearch) {
        it("filters by search (case-insensitive)", async () => {
          await store.createFeedback(createInput({ message: "Button is broken" }));
          await store.createFeedback(createInput({ message: "Layout looks great" }));

          const result = await store.getFeedbacks({ projectName: "test-project", search: "BROKEN" });
          expect(result.feedbacks).toHaveLength(1);
          expect(result.feedbacks[0]?.message).toBe("Button is broken");
        });
      }

      it("filters by exact url", async () => {
        await store.createFeedback(createInput({ url: "https://app.test/orders/42" }));
        await store.createFeedback(createInput({ url: "https://app.test/dashboard" }));

        const result = await store.getFeedbacks({ projectName: "test-project", url: "https://app.test/dashboard" });
        expect(result.feedbacks).toHaveLength(1);
        expect(result.feedbacks[0]?.url).toBe("https://app.test/dashboard");
      });

      it("filters by urlPattern", async () => {
        await store.createFeedback(createInput({ url: "https://app.test/orders/42", urlPattern: "/orders/:id" }));
        await store.createFeedback(createInput({ url: "https://app.test/orders/99", urlPattern: "/orders/:id" }));
        await store.createFeedback(createInput({ url: "https://app.test/dashboard", urlPattern: "/dashboard" }));

        const result = await store.getFeedbacks({ projectName: "test-project", urlPattern: "/orders/:id" });
        expect(result.feedbacks).toHaveLength(2);
      });

      it("persists urlPattern as null when omitted from input", async () => {
        const record = await store.createFeedback(createInput());
        expect(record.urlPattern).toBeNull();
      });

      it("paginates correctly", async () => {
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
        // 105 records so a limit above the cap actually exercises it.
        for (let i = 0; i < 105; i++) {
          await store.createFeedback(createInput({ annotations: [] }));
        }
        const result = await store.getFeedbacks({ projectName: "test-project", limit: 200 });
        expect(result.total).toBe(105);
        expect(result.feedbacks).toHaveLength(100);
      });
    });

    // ------------------------------------------------------------------
    // findByClientId
    // ------------------------------------------------------------------

    describe("findByClientId", () => {
      it("returns the record when found", async () => {
        const created = await store.createFeedback(createInput({ clientId: "find-me" }));
        const found = await store.findByClientId("find-me");
        expect(found).not.toBeNull();
        expect(found?.id).toBe(created.id);
      });

      it("returns null when not found", async () => {
        expect(await store.findByClientId("nope")).toBeNull();
      });
    });

    // ------------------------------------------------------------------
    // updateFeedback
    // ------------------------------------------------------------------

    describe("updateFeedback", () => {
      it("updates status to resolved with resolvedAt", async () => {
        const fb = await store.createFeedback(createInput());
        const resolvedAt = new Date();
        const updated = await store.updateFeedback(fb.id, { status: "resolved", resolvedAt });

        expect(updated.status).toBe("resolved");
        expect(updated.resolvedAt).toEqual(resolvedAt);
        expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(fb.updatedAt.getTime());
      });

      it("updates status to in_progress with resolvedAt null", async () => {
        const fb = await store.createFeedback(createInput());
        const updated = await store.updateFeedback(fb.id, { status: "in_progress", resolvedAt: null });

        expect(updated.status).toBe("in_progress");
        expect(updated.resolvedAt).toBeNull();
      });

      it("updates status to wont_fix with the given resolvedAt", async () => {
        const fb = await store.createFeedback(createInput());
        const resolvedAt = new Date();
        const updated = await store.updateFeedback(fb.id, { status: "wont_fix", resolvedAt });

        expect(updated.status).toBe("wont_fix");
        expect(updated.resolvedAt).toEqual(resolvedAt);
      });

      it("throws StoreNotFoundError for unknown id", async () => {
        await expect(store.updateFeedback("unknown", { status: "resolved", resolvedAt: new Date() })).rejects.toThrow(
          StoreNotFoundError,
        );
      });

      it("can reopen a closed feedback", async () => {
        const fb = await store.createFeedback(createInput());
        await store.updateFeedback(fb.id, { status: "resolved", resolvedAt: new Date() });
        const reopened = await store.updateFeedback(fb.id, { status: "open", resolvedAt: null });
        expect(reopened.status).toBe("open");
        expect(reopened.resolvedAt).toBeNull();

        await store.updateFeedback(fb.id, { status: "wont_fix", resolvedAt: new Date() });
        const reopenedAgain = await store.updateFeedback(fb.id, { status: "open", resolvedAt: null });
        expect(reopenedAgain.status).toBe("open");
        expect(reopenedAgain.resolvedAt).toBeNull();
      });
    });

    // ------------------------------------------------------------------
    // deleteFeedback
    // ------------------------------------------------------------------

    describe("deleteFeedback", () => {
      it("removes the feedback", async () => {
        const fb = await store.createFeedback(createInput());
        await store.deleteFeedback(fb.id);
        const { total } = await store.getFeedbacks({ projectName: "test-project" });
        expect(total).toBe(0);
      });

      it("throws StoreNotFoundError for unknown id", async () => {
        await expect(store.deleteFeedback("unknown")).rejects.toThrow(StoreNotFoundError);
      });
    });

    // ------------------------------------------------------------------
    // deleteAllFeedbacks
    // ------------------------------------------------------------------

    describe("deleteAllFeedbacks", () => {
      it("removes all feedbacks for a project but keeps others", async () => {
        await store.createFeedback(createInput({ projectName: "delete-me" }));
        await store.createFeedback(createInput({ projectName: "delete-me" }));
        await store.createFeedback(createInput({ projectName: "keep-me" }));

        await store.deleteAllFeedbacks("delete-me");

        expect((await store.getFeedbacks({ projectName: "delete-me" })).total).toBe(0);
        expect((await store.getFeedbacks({ projectName: "keep-me" })).total).toBe(1);
      });

      it("is a no-op when project has no feedbacks", async () => {
        await expect(store.deleteAllFeedbacks("nonexistent")).resolves.toBeUndefined();
      });
    });

    // ------------------------------------------------------------------
    // verifyProjectOwnership (optional contract member)
    // ------------------------------------------------------------------

    describe("verifyProjectOwnership", () => {
      it("returns true for the owning project, false otherwise (when implemented)", async () => {
        // Optional member — stores without it skip the assertion but the
        // test still runs, so implementing it later is covered automatically.
        if (!store.verifyProjectOwnership) return;

        const fb = await store.createFeedback(createInput({ projectName: "owner" }));
        await expect(store.verifyProjectOwnership(fb.id, "owner")).resolves.toBe(true);
        await expect(store.verifyProjectOwnership(fb.id, "intruder")).resolves.toBe(false);
        await expect(store.verifyProjectOwnership("unknown-id", "owner")).resolves.toBe(false);
      });
    });
  });
}
