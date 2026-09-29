/**
 * Type-level locks for core's public contracts. These never execute — vitest
 * typecheck mode runs tsc over them, so a contract-breaking refactor fails
 * `test:run` here instead of in a consumer's build.
 */

import { describe, expectTypeOf, it } from "vitest";
import {
  type CLOSED_FEEDBACK_STATUSES,
  type ClosedFeedbackStatus,
  type CollectionStore,
  createCollectionStore,
  type FeedbackStatus,
  isClosedStatus,
  type OPEN_FEEDBACK_STATUSES,
  type OpenFeedbackStatus,
  toFeedbackUpdate,
} from "../src/index.js";
import type {
  AnnotationResponse,
  COMMENT_AUTHOR_ROLES,
  CommentAuthorRole,
  CommentCreateInput,
  CommentRecord,
  CommentResponse,
  FeedbackCreateInput,
  FeedbackCreateOutcome,
  FeedbackListPermissions,
  FeedbackPermissions,
  FeedbackRecord,
  FeedbackResponse,
  FeedbackResponseList,
  FeedbackUpdateInput,
  SitepingCapabilities,
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

  it("takes readOnly in both modes — a shared option, outside the union", () => {
    expectTypeOf({ projectName: "p", endpoint: "/api", readOnly: true }).toExtend<SitepingConfig>();
    expectTypeOf({ projectName: "p", store, readOnly: true }).toExtend<SitepingConfig>();

    // @ts-expect-error — a flag, not a list of actions
    const granular: SitepingConfig = { projectName: "p", store, readOnly: ["delete"] };
    void granular;
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
    expectTypeOf<keyof FeedbackResponse>().toEqualTypeOf<Exclude<keyof FeedbackRecord, "clientId"> | "permissions">();
    // Non-date fields pass through untouched.
    expectTypeOf<FeedbackResponse["screenshotRegion"]>().toEqualTypeOf<FeedbackRecord["screenshotRegion"]>();
  });

  it("serializes the thread and strips each comment's clientId too", () => {
    expectTypeOf<FeedbackResponse["comments"]>().toEqualTypeOf<CommentResponse[] | undefined>();
    expectTypeOf<keyof CommentResponse>().toEqualTypeOf<Exclude<keyof CommentRecord, "clientId">>();
    expectTypeOf<CommentResponse["createdAt"]>().toEqualTypeOf<string>();
    expectTypeOf<CommentResponse["authorRole"]>().toEqualTypeOf<CommentAuthorRole>();
  });

  it("advertises capabilities on the list, optional for servers that predate them", () => {
    expectTypeOf<FeedbackResponseList["capabilities"]>().toEqualTypeOf<SitepingCapabilities | undefined>();
    expectTypeOf<SitepingCapabilities>().toEqualTypeOf<{ comments: boolean; deleteComments?: boolean | undefined }>();
  });

  it("keeps the requester's permissions off the record, optional for servers that predate them", () => {
    expectTypeOf<FeedbackResponse["permissions"]>().toEqualTypeOf<FeedbackPermissions | undefined>();
    expectTypeOf<FeedbackPermissions>().toEqualTypeOf<{
      canChangeStatus: boolean;
      canDelete: boolean;
      canComment: boolean;
      canDeleteComment: boolean;
    }>();
    expectTypeOf<FeedbackResponseList["permissions"]>().toEqualTypeOf<FeedbackListPermissions | undefined>();
    expectTypeOf<FeedbackListPermissions>().toEqualTypeOf<{ canDeleteAll: boolean }>();
    expectTypeOf<FeedbackRecord>().not.toHaveProperty("permissions");
  });
});

describe("discussion threads", () => {
  it("pins the author roles", () => {
    expectTypeOf<CommentAuthorRole>().toEqualTypeOf<"client" | "team">();
    expectTypeOf<(typeof COMMENT_AUTHOR_ROLES)[number]>().toEqualTypeOf<CommentAuthorRole>();
  });

  it("keeps the thread optional on records, so stores without comments stay valid", () => {
    expectTypeOf<Omit<FeedbackRecord, "comments">>().toExtend<FeedbackRecord>();
    expectTypeOf<FeedbackRecord["comments"]>().toEqualTypeOf<CommentRecord[] | undefined>();
  });

  it("keeps addComment and deleteComment optional for minimal adapters", () => {
    expectTypeOf<SitepingStore["addComment"]>().toEqualTypeOf<
      ((feedbackId: string, data: CommentCreateInput) => Promise<CommentRecord>) | undefined
    >();
    expectTypeOf<SitepingStore["deleteComment"]>().toEqualTypeOf<
      ((feedbackId: string, commentId: string) => Promise<void>) | undefined
    >();
    expectTypeOf<Omit<CollectionStore, "addComment" | "deleteComment">>().toExtend<CollectionStore>();
  });
});

describe("SitepingStore contract", () => {
  it("is satisfied by the collection-store engine, including its optional members", () => {
    const engine = createCollectionStore({ load: () => [], persist: () => {}, generateId: () => "id", comments: true });
    expectTypeOf(engine).toExtend<SitepingStore>();
    expectTypeOf(engine).toExtend<
      Required<
        Pick<SitepingStore, "verifyProjectOwnership" | "createFeedbackIfAbsent" | "addComment" | "deleteComment">
      >
    >();
    expectTypeOf(engine.verifyProjectOwnership).returns.resolves.toEqualTypeOf<boolean>();
    expectTypeOf(engine.createFeedbackIfAbsent).returns.resolves.toEqualTypeOf<FeedbackCreateOutcome>();
  });

  it("guarantees threads only to an engine that opts in", () => {
    const threadless = createCollectionStore({ load: () => [], persist: () => {}, generateId: () => "id" });
    expectTypeOf(threadless).toExtend<SitepingStore>();
    expectTypeOf(threadless.addComment).toEqualTypeOf<SitepingStore["addComment"]>();
    expectTypeOf(threadless.deleteComment).toEqualTypeOf<SitepingStore["deleteComment"]>();
  });

  it("keeps createFeedbackIfAbsent optional for minimal adapters", () => {
    expectTypeOf<SitepingStore["createFeedbackIfAbsent"]>().toEqualTypeOf<
      ((data: FeedbackCreateInput) => Promise<FeedbackCreateOutcome>) | undefined
    >();
  });

  it("keeps createFeedbackIfAbsent optional on CollectionStore, which hand-built stores may be typed as", () => {
    expectTypeOf<Omit<CollectionStore, "createFeedbackIfAbsent">>().toExtend<CollectionStore>();
  });

  it("keeps verifyProjectOwnership optional for minimal adapters", () => {
    expectTypeOf<SitepingStore["verifyProjectOwnership"]>().toEqualTypeOf<
      ((id: string, projectName: string) => Promise<boolean>) | undefined
    >();
  });
});
