/**
 * Shared conformance test suite for `SitepingStore` implementations.
 *
 * Adapters import this and run it with their store factory to verify they
 * satisfy the full store contract — no need to write the same 50+ tests
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
import { toStorableText } from "./text.js";
import type { CommentCreateInput, DiagnosticsSnapshot, FeedbackCreateInput, SitepingStore } from "./types.js";
import {
  isStoreDuplicate,
  isStoreLimit,
  isStoreNotFound,
  isStorePersistence,
  MAX_COMMENTS_PER_FEEDBACK,
} from "./types.js";

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

let commentSequence = 0;

function commentInput(overrides?: Partial<CommentCreateInput>): CommentCreateInput {
  commentSequence += 1;
  return {
    body: `Reply ${commentSequence}`,
    authorName: "Bob",
    authorEmail: "bob@test.com",
    authorRole: "team",
    clientId: `comment-${commentSequence}-${Math.random()}`,
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
   * Whether `search` matches case-insensitively. Defaults to `true` (the
   * in-memory pipeline's behavior). Set to `false` for SQL backends whose
   * collation is case-sensitive — the suite then only asserts same-case
   * substring matching.
   */
  caseInsensitiveSearch?: boolean | undefined;
  /**
   * Make the backend of `store` refuse every write until the returned
   * function is called — a spy throwing from `localStorage.setItem`, a flag
   * your `persist` reads. It enables the persistence-failure cases: each
   * mutation must then reject with `StorePersistenceError` (matched via
   * `isStorePersistence`) and leave what reads return as it was. Without it
   * those cases are reported as skipped, never as passed. Meant for backends
   * that can accept a write and lose it (quota, revoked storage); a store
   * whose writes cannot fail, like an in-memory one, leaves it out.
   */
  failWrites?: ((store: SitepingStore) => () => void) | undefined;
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
  const caseInsensitiveSearch = options?.caseInsensitiveSearch ?? true;
  const failWrites = options?.failWrites;

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

      it("throws StoreDuplicateError on a duplicate clientId, and keeps the first record", async () => {
        const input = createInput({ clientId: "same-id" });
        const first = await store.createFeedback(input);
        await expect(store.createFeedback(input)).rejects.toSatisfy(isStoreDuplicate);

        const { feedbacks, total } = await store.getFeedbacks({ projectName: "test-project" });
        expect(total).toBe(1);
        expect(feedbacks[0]?.id).toBe(first.id);
        // The idempotent path, when the store has it, reports that same record.
        if (store.createFeedbackIfAbsent) {
          await expect(store.createFeedbackIfAbsent(input)).resolves.toEqual({
            feedback: expect.objectContaining({ id: first.id }),
            created: false,
          });
        }
      });

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

      it("returns an empty page with the total when the page lies far past the end", async () => {
        for (let i = 0; i < 3; i++) {
          await store.createFeedback(createInput());
        }

        // Direct callers reach the store without the HTTP schema's bounds:
        // offsets past a 32-bit and a 64-bit signed integer, past
        // `Number.MAX_SAFE_INTEGER`, and an infinite one must all read as an
        // empty page, never as a backend error.
        const farPages = [
          { page: 2 ** 31, limit: 2 },
          { page: 1e18, limit: 100 },
          { page: Number.MAX_SAFE_INTEGER, limit: 50 },
          { page: 1e308, limit: 100 },
        ];
        for (const { page, limit } of farPages) {
          const result = await store.getFeedbacks({ projectName: "test-project", page, limit });
          expect(result.feedbacks).toEqual([]);
          expect(result.total).toBe(3);
        }
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

      it("defaults to a page of 50 when limit is omitted", async () => {
        for (let i = 0; i < 51; i++) {
          await store.createFeedback(createInput({ annotations: [] }));
        }
        const result = await store.getFeedbacks({ projectName: "test-project" });
        expect(result.total).toBe(51);
        expect(result.feedbacks).toHaveLength(50);
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
    // Round-trip — what a later read returns, not just the write's result
    // ------------------------------------------------------------------

    describe("persisted round-trip", () => {
      /** The record as `findByClientId` and `getFeedbacks` return it. */
      async function reread(clientId: string) {
        const { feedbacks } = await store.getFeedbacks({ projectName: "test-project" });
        return [await store.findByClientId(clientId), feedbacks.find((f) => f.clientId === clientId)];
      }

      it("annotations, screenshotRegion and diagnostics survive a re-read", async () => {
        const screenshotRegion = { xPct: 0.1234, yPct: 0.5678, wPct: 0.25, hPct: 0.125 };
        const diagnostics: DiagnosticsSnapshot = {
          console: [{ level: "warn", timestamp: "2026-01-01T00:00:00.000Z", message: "slow" }],
          network: [],
        };
        const created = await store.createFeedback(
          createInput({ clientId: "round-trip", screenshotRegion, diagnostics }),
        );

        for (const record of await reread("round-trip")) {
          expect(record?.id).toBe(created.id);
          expect(record?.annotations).toEqual(created.annotations);
          expect(record?.screenshotRegion).toEqual(screenshotRegion);
          expect(record?.diagnostics).toEqual(diagnostics);
        }
      });

      it("an update's status and resolvedAt are visible on re-read", async () => {
        const created = await store.createFeedback(createInput({ clientId: "update-me" }));
        const resolvedAt = new Date("2026-01-15T10:00:00.000Z");

        await store.updateFeedback(created.id, { status: "resolved", resolvedAt });
        for (const record of await reread("update-me")) {
          expect(record?.status).toBe("resolved");
          expect(record?.resolvedAt).toEqual(resolvedAt);
          expect(record?.annotations).toEqual(created.annotations);
        }

        await store.updateFeedback(created.id, { status: "open", resolvedAt: null });
        for (const record of await reread("update-me")) {
          expect(record?.status).toBe("open");
          expect(record?.resolvedAt).toBeNull();
        }
      });
    });

    // ------------------------------------------------------------------
    // Text a database may refuse — PostgreSQL rejects NUL in `text` and
    // `jsonb`, and an unpaired surrogate in `jsonb`; a string cut inside an
    // emoji ends with one. A store keeps such text as sent, or puts U+FFFD
    // in place of each such code unit (`toStorableText`): either way a
    // record reads back as the write returned it, and a lookup holding the
    // same characters finds it.
    // ------------------------------------------------------------------

    describe("text holding NUL or an unpaired surrogate", () => {
      /** `actual` is `sent`, or `sent` with U+FFFD for each code unit a database may refuse. */
      function expectSentOrReplaced(actual: string | null | undefined, sent: string): void {
        expect([sent, toStorableText(sent)]).toContain(actual);
      }

      it("is stored in a feedback, its annotation and diagnostics, and found by clientId and search", async () => {
        const clientId = "odd-\u0000-\uDC00";
        const message = "Total shows a\u0000b \uD83D";
        const diagnostics: DiagnosticsSnapshot = {
          console: [{ level: "error", timestamp: "2026-01-01T00:00:00.000Z", message: "cut \uD83D" }],
          network: [
            {
              url: "https://api.example.com/\u0000",
              method: "GET",
              status: 0,
              durationMs: 1,
              timestamp: "2026-01-01T00:00:00.000Z",
            },
          ],
        };
        const created = await store.createFeedback(
          createInput({
            clientId,
            message,
            annotations: [{ ...MINIMAL_ANNOTATION, textSnippet: "Pay\u0000", neighborText: "\uDE00 next" }],
            diagnostics,
          }),
        );

        expectSentOrReplaced(created.clientId, clientId);
        expectSentOrReplaced(created.message, message);
        expectSentOrReplaced(created.annotations[0]?.textSnippet, "Pay\u0000");
        expectSentOrReplaced(created.annotations[0]?.neighborText, "\uDE00 next");
        expectSentOrReplaced(created.diagnostics?.console[0]?.message, "cut \uD83D");
        expectSentOrReplaced(created.diagnostics?.network[0]?.url, "https://api.example.com/\u0000");

        const found = await store.findByClientId(clientId);
        expect(found?.id).toBe(created.id);
        expect(found?.clientId).toBe(created.clientId);
        expect(found?.message).toBe(created.message);
        expect(found?.annotations).toEqual(created.annotations);
        expect(found?.diagnostics).toEqual(created.diagnostics);
        for (const search of ["a\u0000b", "\uD83D"]) {
          const { feedbacks } = await store.getFeedbacks({ projectName: "test-project", search });
          expect(feedbacks.map((f) => f.id)).toEqual([created.id]);
        }
      });

      it("is found in a project name by every project-scoped call", async () => {
        const projectName = "site-\u0000\uD83D";
        const created = await store.createFeedback(createInput({ projectName }));
        expectSentOrReplaced(created.projectName, projectName);

        const { feedbacks, total } = await store.getFeedbacks({ projectName });
        expect(total).toBe(1);
        expect(feedbacks[0]?.id).toBe(created.id);
        if (store.verifyProjectOwnership) {
          await expect(store.verifyProjectOwnership(created.id, projectName)).resolves.toBe(true);
        }
        await store.deleteAllFeedbacks(projectName);
        expect((await store.getFeedbacks({ projectName })).total).toBe(0);
      });

      it("is stored in a comment and read back with the thread (when implemented)", async () => {
        if (!store.addComment) return;

        const fb = await store.createFeedback(createInput({ clientId: "odd-thread" }));
        const body = "Seen \uD83D\u0000";
        const comment = await store.addComment(fb.id, commentInput({ body, clientId: "odd-comment-\u0000" }));

        expectSentOrReplaced(comment.body, body);
        expect((await store.findByClientId("odd-thread"))?.comments).toEqual([comment]);
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
        await expect(store.updateFeedback("unknown", { status: "resolved", resolvedAt: new Date() })).rejects.toSatisfy(
          isStoreNotFound,
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
        await expect(store.deleteFeedback("unknown")).rejects.toSatisfy(isStoreNotFound);
      });

      it("removes only the target from a multi-record set", async () => {
        const a = await store.createFeedback(createInput());
        const b = await store.createFeedback(createInput());
        const c = await store.createFeedback(createInput());

        await store.deleteFeedback(b.id);

        const { feedbacks, total } = await store.getFeedbacks({ projectName: "test-project" });
        expect(total).toBe(2);
        expect(feedbacks.map((f) => f.id).sort()).toEqual([a.id, c.id].sort());
      });
    });

    // ------------------------------------------------------------------
    // Concurrent mutations — the widget's bulk actions use Promise.all
    // ------------------------------------------------------------------

    describe("concurrent mutations", () => {
      async function createMany(count: number) {
        const created = [];
        for (let i = 0; i < count; i++) created.push(await store.createFeedback(createInput({ annotations: [] })));
        return created;
      }

      it("concurrent updates all apply", async () => {
        const created = await createMany(4);

        await Promise.all(
          created.map((f) => store.updateFeedback(f.id, { status: "resolved", resolvedAt: new Date() })),
        );

        const { total } = await store.getFeedbacks({ projectName: "test-project", status: "resolved" });
        expect(total).toBe(4);
      });

      it("concurrent deletes all apply", async () => {
        const [kept, ...doomed] = await createMany(4);

        await Promise.all(doomed.map((f) => store.deleteFeedback(f.id)));

        const { feedbacks } = await store.getFeedbacks({ projectName: "test-project" });
        expect(feedbacks.map((f) => f.id)).toEqual([kept?.id]);
      });

      it("concurrent updates and deletes on different records all apply", async () => {
        const [a, b, c, d] = await createMany(4);
        if (!a || !b || !c || !d) throw new Error("fixture");

        await Promise.all([
          store.updateFeedback(a.id, { status: "in_progress", resolvedAt: null }),
          store.deleteFeedback(b.id),
          store.updateFeedback(c.id, { status: "wont_fix", resolvedAt: new Date() }),
          store.deleteFeedback(d.id),
        ]);

        const { feedbacks } = await store.getFeedbacks({ projectName: "test-project" });
        const statusById = Object.fromEntries(feedbacks.map((f) => [f.id, f.status]));
        expect(statusById).toEqual({ [a.id]: "in_progress", [c.id]: "wont_fix" });
      });

      it("concurrent creates with distinct clientIds all persist", async () => {
        const created = await Promise.all(
          Array.from({ length: 4 }, () => store.createFeedback(createInput({ annotations: [] }))),
        );

        const { feedbacks } = await store.getFeedbacks({ projectName: "test-project" });
        expect(feedbacks.map((f) => f.id).sort()).toEqual(created.map((f) => f.id).sort());
      });

      it("concurrent creates with the same clientId store one record and hand out only its id", async () => {
        const input = createInput({ clientId: "same-id" });

        const results = await Promise.allSettled([store.createFeedback(input), store.createFeedback(input)]);

        const { feedbacks } = await store.getFeedbacks({ projectName: "test-project" });
        expect(feedbacks).toHaveLength(1);
        const returned = results.flatMap((r) => (r.status === "fulfilled" ? [r.value.id] : []));
        // The caller that loses the insert race throws — the handler recovers
        // it through findByClientId.
        expect(returned).toHaveLength(1);
        for (const id of returned) expect(id).toBe(feedbacks[0]?.id);
        for (const r of results) if (r.status === "rejected") expect(r.reason).toSatisfy(isStoreDuplicate);
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
    // Persistence failures — a write the backend refuses must reject with
    // `StorePersistenceError` and change nothing a read returns. Skipped,
    // not passed, for a store run without the `failWrites` option.
    // ------------------------------------------------------------------

    describe("persistence failures", () => {
      /** Run `act` while the backend refuses writes, restoring it whatever happens. */
      async function whileWritesFail(act: () => Promise<unknown>): Promise<void> {
        const restore = (failWrites as NonNullable<typeof failWrites>)(store);
        try {
          await expect(act()).rejects.toSatisfy(isStorePersistence);
        } finally {
          restore();
        }
      }

      it.skipIf(!failWrites)("a create the backend refuses rejects and stores nothing", async () => {
        await whileWritesFail(() => store.createFeedback(createInput({ clientId: "lost-create" })));

        expect(await store.findByClientId("lost-create")).toBeNull();
        expect((await store.getFeedbacks({ projectName: "test-project" })).total).toBe(0);
      });

      it.skipIf(!failWrites)("an update the backend refuses rejects and keeps the previous status", async () => {
        const fb = await store.createFeedback(createInput({ clientId: "lost-update" }));

        await whileWritesFail(() => store.updateFeedback(fb.id, { status: "resolved", resolvedAt: new Date() }));

        const kept = await store.findByClientId("lost-update");
        expect(kept?.status).toBe("open");
        expect(kept?.resolvedAt).toBeNull();
      });

      it.skipIf(!failWrites)("a delete the backend refuses rejects and keeps the record", async () => {
        const fb = await store.createFeedback(createInput({ clientId: "lost-delete" }));

        await whileWritesFail(() => store.deleteFeedback(fb.id));

        expect((await store.findByClientId("lost-delete"))?.id).toBe(fb.id);
      });

      it.skipIf(!failWrites)("a project delete the backend refuses rejects and keeps every record", async () => {
        await store.createFeedback(createInput({ projectName: "lost-wipe" }));
        await store.createFeedback(createInput({ projectName: "lost-wipe" }));

        await whileWritesFail(() => store.deleteAllFeedbacks("lost-wipe"));

        expect((await store.getFeedbacks({ projectName: "lost-wipe" })).total).toBe(2);
      });

      it.skipIf(!failWrites)(
        "a comment post or delete the backend refuses rejects and keeps the thread (when implemented)",
        async () => {
          if (!store.addComment || !store.deleteComment) return;
          const addComment = store.addComment.bind(store);
          const deleteComment = store.deleteComment.bind(store);
          const fb = await store.createFeedback(createInput({ clientId: "lost-thread" }));
          const kept = await addComment(fb.id, commentInput());

          await whileWritesFail(() => addComment(fb.id, commentInput()));
          await whileWritesFail(() => deleteComment(fb.id, kept.id));

          expect((await store.findByClientId("lost-thread"))?.comments).toEqual([kept]);
        },
      );
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

    // ------------------------------------------------------------------
    // createFeedbackIfAbsent (optional contract member)
    // ------------------------------------------------------------------

    describe("createFeedbackIfAbsent", () => {
      it("reports an insert, then the existing record for the same clientId (when implemented)", async () => {
        // Optional member — same skip-but-run pattern as verifyProjectOwnership.
        if (!store.createFeedbackIfAbsent) return;

        const input = createInput({ clientId: "once-id" });
        const first = await store.createFeedbackIfAbsent(input);
        const second = await store.createFeedbackIfAbsent(input);

        expect(first.created).toBe(true);
        expect(second).toEqual({ feedback: expect.objectContaining({ id: first.feedback.id }), created: false });
        expect((await store.getFeedbacks({ projectName: "test-project" })).total).toBe(1);
      });

      it("reports exactly one insert when concurrent calls race on the same clientId (when implemented)", async () => {
        if (!store.createFeedbackIfAbsent) return;
        const createFeedbackIfAbsent = store.createFeedbackIfAbsent.bind(store);

        const concurrentCallerCount = 5;
        const input = createInput({ clientId: "race-id" });
        const outcomes = await Promise.all(
          Array.from({ length: concurrentCallerCount }, () => createFeedbackIfAbsent(input)),
        );

        const insertedOutcomes = outcomes.filter((outcome) => outcome.created);
        expect(insertedOutcomes).toHaveLength(1);
        const insertedId = insertedOutcomes[0]?.feedback.id;
        for (const outcome of outcomes) expect(outcome.feedback.id).toBe(insertedId);
        const { feedbacks, total } = await store.getFeedbacks({ projectName: "test-project" });
        expect(total).toBe(1);
        expect(feedbacks[0]?.id).toBe(insertedId);
      });
    });

    // ------------------------------------------------------------------
    // Comments (optional contract members) — every case is skipped for a
    // store without `addComment` / `deleteComment`, and runs once it has them
    // ------------------------------------------------------------------

    describe("comments", () => {
      /** Every read path of the store, for one feedback: list, clientId lookup. */
      async function threadsOf(clientId: string, projectName = "test-project") {
        const { feedbacks } = await store.getFeedbacks({ projectName });
        const listed = feedbacks.find((f) => f.clientId === clientId);
        const found = await store.findByClientId(clientId);
        return [listed?.comments, found?.comments];
      }

      it("starts every feedback with an empty thread (when implemented)", async () => {
        if (!store.addComment) return;

        const fb = await store.createFeedback(createInput({ clientId: "empty-thread" }));

        expect(fb.comments).toEqual([]);
        for (const thread of await threadsOf("empty-thread")) expect(thread).toEqual([]);
      });

      it("appends comments oldest first and returns the thread on every read (when implemented)", async () => {
        if (!store.addComment) return;

        const fb = await store.createFeedback(createInput({ clientId: "threaded" }));
        const first = await store.addComment(
          fb.id,
          commentInput({ body: "Still broken on staging", authorRole: "client", clientId: "c-first" }),
        );
        const second = await store.addComment(
          fb.id,
          commentInput({ body: "Fixed in the next deploy", authorEmail: "" }),
        );

        expect(first).toEqual({
          id: expect.any(String),
          feedbackId: fb.id,
          body: "Still broken on staging",
          authorName: "Bob",
          authorEmail: "bob@test.com",
          authorRole: "client",
          clientId: "c-first",
          createdAt: expect.any(Date),
        });
        expect(second.id).not.toBe(first.id);
        expect(second.authorEmail).toBe("");
        expect(second.createdAt.getTime()).toBeGreaterThanOrEqual(first.createdAt.getTime());

        for (const thread of await threadsOf("threaded")) expect(thread).toEqual([first, second]);
        const updated = await store.updateFeedback(fb.id, { status: "in_progress", resolvedAt: null });
        expect(updated.comments).toEqual([first, second]);
      });

      it("leaves other threads and the feedback's updatedAt untouched (when implemented)", async () => {
        if (!store.addComment) return;

        const fb = await store.createFeedback(createInput({ clientId: "commented" }));
        await store.createFeedback(createInput({ clientId: "bystander" }));

        await store.addComment(fb.id, commentInput());

        for (const thread of await threadsOf("bystander")) expect(thread).toEqual([]);
        expect((await store.findByClientId("commented"))?.updatedAt).toEqual(fb.updatedAt);
      });

      it("is idempotent on clientId, whichever thread the replay names (when implemented)", async () => {
        if (!store.addComment) return;

        const fb = await store.createFeedback(createInput({ clientId: "replayed" }));
        const other = await store.createFeedback(createInput({ clientId: "replay-target" }));
        const input = commentInput({ clientId: "retried-post" });

        const first = await store.addComment(fb.id, input);
        await expect(store.addComment(fb.id, input)).resolves.toEqual(first);
        await expect(store.addComment(other.id, input)).resolves.toEqual(first);

        for (const thread of await threadsOf("replayed")) expect(thread).toEqual([first]);
        for (const thread of await threadsOf("replay-target")) expect(thread).toEqual([]);
      });

      it("stores one comment when concurrent posts share a clientId (when implemented)", async () => {
        if (!store.addComment) return;
        const addComment = store.addComment.bind(store);

        const fb = await store.createFeedback(createInput({ clientId: "raced-post" }));
        const input = commentInput({ clientId: "same-comment" });
        const results = await Promise.all(Array.from({ length: 4 }, () => addComment(fb.id, input)));

        for (const result of results) expect(result.id).toBe(results[0]?.id);
        for (const thread of await threadsOf("raced-post")) expect(thread?.map((c) => c.id)).toEqual([results[0]?.id]);
      });

      it("reports an insert, then the existing comment for the same clientId (when implemented)", async () => {
        if (!store.addCommentIfAbsent) return;

        const fb = await store.createFeedback(createInput({ clientId: "reported-post" }));
        const input = commentInput({ clientId: "reported-comment" });
        const first = await store.addCommentIfAbsent(fb.id, input);
        const second = await store.addCommentIfAbsent(fb.id, input);
        const viaAddComment = await store.addComment?.(fb.id, input);

        expect(first).toEqual({
          comment: expect.objectContaining({ feedbackId: fb.id, clientId: input.clientId }),
          created: true,
        });
        expect(second).toEqual({ comment: first.comment, created: false });
        expect(viaAddComment).toEqual(first.comment);
        for (const thread of await threadsOf("reported-post")) expect(thread).toEqual([first.comment]);
      });

      it("reports exactly one insert when concurrent posts race on the same clientId (when implemented)", async () => {
        if (!store.addCommentIfAbsent) return;
        const addCommentIfAbsent = store.addCommentIfAbsent.bind(store);

        const fb = await store.createFeedback(createInput({ clientId: "reported-race" }));
        const input = commentInput({ clientId: "raced-comment" });
        const outcomes = await Promise.all(Array.from({ length: 4 }, () => addCommentIfAbsent(fb.id, input)));

        const inserted = outcomes.filter((outcome) => outcome.created);
        expect(inserted).toHaveLength(1);
        for (const outcome of outcomes) expect(outcome.comment.id).toBe(inserted[0]?.comment.id);
        for (const thread of await threadsOf("reported-race"))
          expect(thread?.map((c) => c.id)).toEqual([inserted[0]?.comment.id]);
      });

      it("throws addComment's errors from addCommentIfAbsent too (when implemented)", async () => {
        if (!store.addCommentIfAbsent) return;

        await expect(store.addCommentIfAbsent("unknown-id", commentInput())).rejects.toSatisfy(isStoreNotFound);
      });

      it("throws StoreNotFoundError when commenting on an unknown feedback (when implemented)", async () => {
        if (!store.addComment) return;

        await expect(store.addComment("unknown-id", commentInput())).rejects.toSatisfy(isStoreNotFound);
      });

      it(`refuses a client comment past ${MAX_COMMENTS_PER_FEEDBACK} per thread with StoreLimitError, never a team one (when implemented)`, async () => {
        if (!store.addComment) return;
        const client = () => commentInput({ authorRole: "client" });

        const fb = await store.createFeedback(createInput({ clientId: "full-thread" }));
        const other = await store.createFeedback(createInput({ clientId: "roomy-thread" }));
        // The team's replies do not count toward the cap…
        await store.addComment(fb.id, commentInput({ authorRole: "team" }));
        let last = await store.addComment(fb.id, client());
        for (let i = 1; i < MAX_COMMENTS_PER_FEEDBACK; i++) last = await store.addComment(fb.id, client());

        await expect(store.addComment(fb.id, client())).rejects.toSatisfy(isStoreLimit);
        // …nor meet it: a thread spammed full still takes the team's answer.
        await expect(store.addComment(fb.id, commentInput({ authorRole: "team" }))).resolves.toMatchObject({
          authorRole: "team",
        });
        // A replay is not a new comment, and the cap is per thread.
        await expect(store.addComment(fb.id, { ...client(), clientId: last.clientId })).resolves.toEqual(last);
        await expect(store.addComment(other.id, client())).resolves.toMatchObject({ feedbackId: other.id });
        for (const thread of await threadsOf("full-thread")) expect(thread).toHaveLength(MAX_COMMENTS_PER_FEEDBACK + 2);
      });

      it("deletes one comment and keeps the rest of the thread (when implemented)", async () => {
        if (!store.addComment || !store.deleteComment) return;

        const fb = await store.createFeedback(createInput({ clientId: "pruned" }));
        const doomed = await store.addComment(fb.id, commentInput({ body: "Typo, ignore me" }));
        const kept = await store.addComment(fb.id, commentInput({ body: "The real reply" }));

        await store.deleteComment(fb.id, doomed.id);

        for (const thread of await threadsOf("pruned")) expect(thread).toEqual([kept]);
      });

      it("refuses to delete a comment through another feedback's thread (when implemented)", async () => {
        if (!store.addComment || !store.deleteComment) return;

        const fb = await store.createFeedback(createInput({ clientId: "authorized-thread" }));
        const other = await store.createFeedback(createInput({ clientId: "foreign-thread" }));
        const foreign = await store.addComment(other.id, commentInput());

        await expect(store.deleteComment(fb.id, foreign.id)).rejects.toSatisfy(isStoreNotFound);
        await expect(store.deleteComment(fb.id, "unknown-comment")).rejects.toSatisfy(isStoreNotFound);
        await expect(store.deleteComment("unknown-id", foreign.id)).rejects.toSatisfy(isStoreNotFound);
        for (const thread of await threadsOf("foreign-thread")) expect(thread).toEqual([foreign]);
      });

      it("deletes the thread with its feedback (when implemented)", async () => {
        if (!store.addComment || !store.deleteComment) return;

        const single = await store.createFeedback(createInput({ clientId: "deleted-alone" }));
        const bulk = await store.createFeedback(createInput({ projectName: "wiped", clientId: "deleted-in-bulk" }));
        const singleComment = await store.addComment(single.id, commentInput({ clientId: "orphan-1" }));
        const bulkComment = await store.addComment(bulk.id, commentInput({ clientId: "orphan-2" }));

        await store.deleteFeedback(single.id);
        await store.deleteAllFeedbacks("wiped");

        await expect(store.deleteComment(single.id, singleComment.id)).rejects.toSatisfy(isStoreNotFound);
        await expect(store.deleteComment(bulk.id, bulkComment.id)).rejects.toSatisfy(isStoreNotFound);
        // Gone for real: their clientIds are free again, not replays of a leftover row.
        const fresh = await store.createFeedback(createInput({ clientId: "after-delete" }));
        for (const clientId of ["orphan-1", "orphan-2"]) {
          const comment = await store.addComment(fresh.id, commentInput({ clientId }));
          expect(comment.feedbackId).toBe(fresh.id);
        }
      });

      it("keeps every comment and status change when they race on one store (when implemented)", async () => {
        if (!store.addComment || !store.deleteComment) return;
        const addComment = store.addComment.bind(store);

        const fb = await store.createFeedback(createInput({ clientId: "busy" }));
        const other = await store.createFeedback(createInput({ clientId: "busy-too" }));
        const doomed = await addComment(fb.id, commentInput());

        const [, first, , second, , third] = await Promise.all([
          store.updateFeedback(fb.id, { status: "in_progress", resolvedAt: null }),
          addComment(fb.id, commentInput()),
          store.updateFeedback(other.id, { status: "resolved", resolvedAt: new Date() }),
          addComment(fb.id, commentInput()),
          store.deleteComment(fb.id, doomed.id),
          addComment(other.id, commentInput()),
        ]);

        const busy = await store.findByClientId("busy");
        expect(busy?.status).toBe("in_progress");
        expect(busy?.comments?.map((c) => c.id).sort()).toEqual([first.id, second.id].sort());
        const busyToo = await store.findByClientId("busy-too");
        expect(busyToo?.status).toBe("resolved");
        expect(busyToo?.comments?.map((c) => c.id)).toEqual([third.id]);
      });
    });
  });
}
