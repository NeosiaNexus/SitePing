import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { applyFeedbackFilters } from "../src/filters.js";
import type { FeedbackQuery, FeedbackRecord, FeedbackStatus, FeedbackType } from "../src/types.js";
import { FEEDBACK_STATUSES, FEEDBACK_TYPES } from "../src/types.js";

/**
 * `applyFeedbackFilters` is the single filtering path behind both
 * `MemoryStore.getFeedbacks` and `LocalStorageStore.getFeedbacks`, and unlike
 * the Prisma adapter it has no Zod schema in front of it — these two call it
 * with whatever the caller passed. Its contract is therefore algebraic rather
 * than exemplary: filters must be sound, `total` must describe the whole match
 * set rather than the page, and the pages must tile that set exactly once.
 *
 * Generated records vary only the fields the filter reads; everything else is
 * scaffolding held constant so a shrunk counter-example stays readable.
 */

const EPOCH = new Date(0);

const PROJECTS = ["alpha", "beta"] as const;
const URLS = ["/", "/pricing", "/orders/42"] as const;
const PATTERNS = ["/orders/:id", null] as const;
const MESSAGES = ["Broken button", "broken BUTTON again", "Layout shift", ""] as const;

interface RecordSeed {
  id: string;
  projectName: string;
  type: FeedbackType;
  status: FeedbackStatus;
  url: string;
  urlPattern: string | null;
  message: string;
}

function makeRecord(seed: RecordSeed): FeedbackRecord {
  return {
    ...seed,
    authorName: "",
    authorEmail: "",
    viewport: "1280x720",
    userAgent: "test",
    clientId: "client",
    resolvedAt: null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    annotations: [],
    screenshotUrl: null,
    screenshotRegion: null,
    diagnostics: null,
  };
}

const recordArb: fc.Arbitrary<FeedbackRecord> = fc
  .record({
    id: fc.string({ minLength: 1, maxLength: 6 }),
    projectName: fc.constantFrom(...PROJECTS),
    type: fc.constantFrom(...FEEDBACK_TYPES),
    status: fc.constantFrom(...FEEDBACK_STATUSES),
    url: fc.constantFrom(...URLS),
    urlPattern: fc.constantFrom(...PATTERNS),
    message: fc.constantFrom(...MESSAGES),
  })
  .map(makeRecord);

const itemsArb = fc.array(recordArb, { maxLength: 40 });

/** Filter half of a query — pagination is drawn separately per property. */
const filtersArb = fc.record(
  {
    projectName: fc.constantFrom(...PROJECTS),
    type: fc.option(fc.constantFrom(...FEEDBACK_TYPES), { nil: undefined }),
    status: fc.option(fc.constantFrom(...FEEDBACK_STATUSES), { nil: undefined }),
    statuses: fc.option(fc.uniqueArray(fc.constantFrom(...FEEDBACK_STATUSES), { maxLength: 4 }), { nil: undefined }),
    url: fc.option(fc.constantFrom(...URLS), { nil: undefined }),
    urlPattern: fc.option(fc.constantFrom("/orders/:id"), { nil: undefined }),
    search: fc.option(fc.constantFrom("broken", "BROKEN", "layout", "zzz"), { nil: undefined }),
  },
  { requiredKeys: ["projectName"] },
);

describe("applyFeedbackFilters — filter soundness", () => {
  it("returns only records satisfying every active filter", () => {
    fc.assert(
      fc.property(itemsArb, filtersArb, (items, filters) => {
        const query: FeedbackQuery = { ...filters, limit: 100 };
        const { feedbacks } = applyFeedbackFilters(items, query);

        for (const f of feedbacks) {
          expect(f.projectName).toBe(query.projectName);
          if (query.type) expect(f.type).toBe(query.type);
          if (query.statuses && query.statuses.length > 0) {
            expect(query.statuses).toContain(f.status);
          } else if (query.status) {
            expect(f.status).toBe(query.status);
          }
          if (query.url) expect(f.url).toBe(query.url);
          if (query.urlPattern) expect(f.urlPattern).toBe(query.urlPattern);
          if (query.search) expect(f.message.toLowerCase()).toContain(query.search.toLowerCase());
        }
      }),
    );
  });

  it("never grows the result set when a filter is added", () => {
    fc.assert(
      fc.property(
        itemsArb,
        fc.constantFrom(...PROJECTS),
        fc.constantFrom(...FEEDBACK_TYPES),
        (items, project, type) => {
          const broad = applyFeedbackFilters(items, { projectName: project, limit: 100 });
          const narrow = applyFeedbackFilters(items, { projectName: project, type, limit: 100 });

          expect(narrow.total).toBeLessThanOrEqual(broad.total);
          const broadIds = new Set(broad.feedbacks.map((f) => f.id));
          for (const f of narrow.feedbacks) expect(broadIds).toContain(f.id);
        },
      ),
    );
  });

  it("lets a non-empty `statuses` bucket win over `status`, and ignores an empty one", () => {
    fc.assert(
      fc.property(
        itemsArb,
        fc.constantFrom(...PROJECTS),
        fc.constantFrom(...FEEDBACK_STATUSES),
        fc.uniqueArray(fc.constantFrom(...FEEDBACK_STATUSES), { minLength: 1, maxLength: 4 }),
        (items, projectName, status, statuses) => {
          const both = applyFeedbackFilters(items, { projectName, status, statuses, limit: 100 });
          const bucketOnly = applyFeedbackFilters(items, { projectName, statuses, limit: 100 });
          expect(both.feedbacks.map((f) => f.id)).toEqual(bucketOnly.feedbacks.map((f) => f.id));

          const emptyBucket = applyFeedbackFilters(items, { projectName, status, statuses: [], limit: 100 });
          const exactOnly = applyFeedbackFilters(items, { projectName, status, limit: 100 });
          expect(emptyBucket.feedbacks.map((f) => f.id)).toEqual(exactOnly.feedbacks.map((f) => f.id));
        },
      ),
    );
  });
});

describe("applyFeedbackFilters — pagination", () => {
  it("reports a `total` that describes the match set, not the page", () => {
    fc.assert(
      fc.property(itemsArb, filtersArb, fc.integer({ min: 1, max: 6 }), (items, filters, limit) => {
        const unpaged = applyFeedbackFilters(items, { ...filters, limit: 100 });
        const paged = applyFeedbackFilters(items, { ...filters, page: 1, limit });

        expect(paged.total).toBe(unpaged.total);
        expect(paged.feedbacks.length).toBeLessThanOrEqual(limit);
      }),
    );
  });

  it("tiles the match set exactly once across consecutive pages", () => {
    fc.assert(
      fc.property(itemsArb, filtersArb, fc.integer({ min: 1, max: 7 }), (items, filters, limit) => {
        const all = applyFeedbackFilters(items, { ...filters, limit: 100 });
        const pageCount = Math.ceil(all.total / limit);

        const walked: string[] = [];
        for (let page = 1; page <= pageCount; page++) {
          walked.push(...applyFeedbackFilters(items, { ...filters, page, limit }).feedbacks.map((f) => f.id));
        }

        expect(walked).toEqual(all.feedbacks.map((f) => f.id));
      }),
    );
  });

  it("returns an empty page past the end while preserving `total`", () => {
    fc.assert(
      fc.property(itemsArb, filtersArb, fc.integer({ min: 1, max: 5 }), (items, filters, limit) => {
        const all = applyFeedbackFilters(items, { ...filters, limit: 100 });
        const beyond = Math.ceil(all.total / limit) + 1;
        const page = applyFeedbackFilters(items, { ...filters, page: beyond, limit });

        expect(page.feedbacks).toEqual([]);
        expect(page.total).toBe(all.total);
      }),
    );
  });

  it("clamps `limit` to the documented maximum of 100", () => {
    fc.assert(
      fc.property(
        fc.array(recordArb, { minLength: 101, maxLength: 140 }),
        fc.integer({ min: 101, max: 100_000 }),
        (items, limit) => {
          const { feedbacks } = applyFeedbackFilters(items, { projectName: "alpha", limit });
          expect(feedbacks.length).toBeLessThanOrEqual(100);
        },
      ),
    );
  });

  /**
   * `start` is computed as `(page - 1) * limit`, so a non-positive page or
   * limit produces a NEGATIVE index — and `Array.prototype.slice` reads those
   * from the end. A caller passing `page: -1` would get a window whose
   * position depends on how many records happen to match, rather than an
   * empty page or the first one.
   */
  it("never reads from the tail when page or limit is non-positive", () => {
    fc.assert(
      fc.property(
        itemsArb,
        filtersArb,
        fc.integer({ min: -5, max: 0 }),
        fc.integer({ min: -5, max: 3 }),
        (items, filters, page, limit) => {
          const firstPage = applyFeedbackFilters(items, { ...filters, page: 1, limit: Math.max(1, limit) });
          const degenerate = applyFeedbackFilters(items, { ...filters, page, limit });

          expect(degenerate.feedbacks.map((f) => f.id)).toEqual(firstPage.feedbacks.map((f) => f.id));
        },
      ),
    );
  });
});
