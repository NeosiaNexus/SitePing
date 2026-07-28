/**
 * Type-level locks for core's public contracts. These never execute — vitest
 * typecheck mode runs tsc over them, so a contract-breaking refactor fails
 * `test:run` here instead of in a consumer's build.
 */

import { describe, expectTypeOf, it } from "vitest";
import {
  type CLOSED_FEEDBACK_STATUSES,
  type ClosedFeedbackStatus,
  createCollectionStore,
  type FeedbackStatus,
  isClosedStatus,
  type OPEN_FEEDBACK_STATUSES,
  type OpenFeedbackStatus,
  toFeedbackUpdate,
} from "../src/index.js";
import type {
  AnnotationResponse,
  FeedbackRecord,
  FeedbackResponse,
  FeedbackUpdateInput,
  SitepingConfig,
  SitepingStore,
} from "../src/types.js";

declare const store: SitepingStore;

describe("SitepingConfig discriminated union", () => {
  it("accepts each mode on its own", () => {
    expectTypeOf({ projectName: "p", endpoint: "/api/siteping" }).toExtend<SitepingConfig>();
    expectTypeOf({ projectName: "p", endpoint: "/api", apiKey: "k" }).toExtend<SitepingConfig>();
    expectTypeOf({ projectName: "p", store }).toExtend<SitepingConfig>();
  });

  it("rejects invalid mode combinations", () => {
    // @ts-expect-error — neither endpoint nor store: no union arm matches
    const neither: SitepingConfig = { projectName: "p" };
    void neither;

    // @ts-expect-error — endpoint and store are mutually exclusive
    const both: SitepingConfig = { projectName: "p", endpoint: "/api", store };
    void both;

    // @ts-expect-error — apiKey is HTTP-mode only
    const storeWithApiKey: SitepingConfig = { projectName: "p", store, apiKey: "leaked" };
    void storeWithApiKey;
  });
});

describe("FeedbackUpdateInput closure invariant", () => {
  it("accepts the two legal pairings", () => {
    expectTypeOf({ status: "open" as const, resolvedAt: null }).toExtend<FeedbackUpdateInput>();
    expectTypeOf({ status: "resolved" as const, resolvedAt: new Date() }).toExtend<FeedbackUpdateInput>();
  });

  it("rejects a closed status without a closure timestamp (and vice versa)", () => {
    // @ts-expect-error — resolved requires a Date resolvedAt
    const closedWithoutDate: FeedbackUpdateInput = { status: "resolved", resolvedAt: null };
    void closedWithoutDate;

    // @ts-expect-error — open must clear resolvedAt
    const openWithDate: FeedbackUpdateInput = { status: "open", resolvedAt: new Date() };
    void openWithDate;
  });

  it("derives from any status via toFeedbackUpdate and the narrowing predicate", () => {
    expectTypeOf(toFeedbackUpdate).returns.toEqualTypeOf<FeedbackUpdateInput>();

    const status = "in_progress" as FeedbackStatus;
    if (isClosedStatus(status)) {
      expectTypeOf(status).toEqualTypeOf<ClosedFeedbackStatus>();
    } else {
      expectTypeOf(status).toEqualTypeOf<OpenFeedbackStatus>();
    }
  });

  it("keeps the status buckets exhaustive", () => {
    expectTypeOf<OpenFeedbackStatus | ClosedFeedbackStatus>().toEqualTypeOf<FeedbackStatus>();
    expectTypeOf<
      (typeof OPEN_FEEDBACK_STATUSES)[number] | (typeof CLOSED_FEEDBACK_STATUSES)[number]
    >().toEqualTypeOf<FeedbackStatus>();
  });
});

describe("wire types derived from record types", () => {
  it("serializes dates and omits clientId on FeedbackResponse", () => {
    expectTypeOf<FeedbackResponse["createdAt"]>().toEqualTypeOf<string>();
    expectTypeOf<FeedbackResponse["resolvedAt"]>().toEqualTypeOf<string | null>();
    expectTypeOf<FeedbackResponse["annotations"]>().toEqualTypeOf<AnnotationResponse[]>();
    expectTypeOf<AnnotationResponse["createdAt"]>().toEqualTypeOf<string>();
    expectTypeOf<keyof FeedbackResponse>().toEqualTypeOf<Exclude<keyof FeedbackRecord, "clientId">>();
    // Non-date fields pass through untouched.
    expectTypeOf<FeedbackResponse["screenshotRegion"]>().toEqualTypeOf<FeedbackRecord["screenshotRegion"]>();
  });
});

describe("SitepingStore contract", () => {
  it("is satisfied by the collection-store engine, including verifyProjectOwnership", () => {
    const engine = createCollectionStore({ load: () => [], persist: () => {}, generateId: () => "id" });
    expectTypeOf(engine).toExtend<SitepingStore>();
    expectTypeOf(engine.verifyProjectOwnership).returns.resolves.toEqualTypeOf<boolean>();
  });

  it("keeps verifyProjectOwnership optional for minimal adapters", () => {
    expectTypeOf<SitepingStore["verifyProjectOwnership"]>().toEqualTypeOf<
      ((id: string, projectName: string) => Promise<boolean>) | undefined
    >();
  });
});
