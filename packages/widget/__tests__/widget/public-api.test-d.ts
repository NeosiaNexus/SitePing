/**
 * Type-level locks for the widget's public API surface (vitest typecheck
 * mode — never executed).
 */

import type {
  CommentResponse as CoreCommentResponse,
  FeedbackQuery,
  FeedbackResponse,
  SitepingInstance,
  SitepingPublicEvents,
  SitepingStore,
} from "@siteping/core";
import { describe, expectTypeOf, it } from "vitest";
import type { GetFeedbacksOptions } from "../../src/api-client.js";
import {
  type CommentResponse,
  initSiteping,
  registerLocale,
  type SitepingConfig,
  type SitepingPanelAction,
  type SitepingPanelActionContext,
  type SitepingPanelActionFeedback,
  type SitepingPanelButtonAction,
  type SitepingPanelLinkAction,
  type Translations,
} from "../../src/index.js";

declare const store: SitepingStore;
declare const instance: SitepingInstance;

describe("initSiteping config modes", () => {
  it("accepts HTTP mode and store mode", () => {
    expectTypeOf(initSiteping).toBeCallableWith({ projectName: "p", endpoint: "/api/siteping" });
    expectTypeOf(initSiteping).toBeCallableWith({ projectName: "p", store });
  });

  it("rejects mixed modes", () => {
    // @ts-expect-error — endpoint and store are mutually exclusive
    initSiteping({ projectName: "p", endpoint: "/api", store });
  });
});

describe("readOnly", () => {
  it("is a shared option, in both modes", () => {
    expectTypeOf(initSiteping).toBeCallableWith({ projectName: "p", endpoint: "/api/siteping", readOnly: true });
    expectTypeOf(initSiteping).toBeCallableWith({ projectName: "p", store, readOnly: false });
    expectTypeOf<SitepingConfig["readOnly"]>().toEqualTypeOf<boolean | undefined>();
  });
});

describe("panelActions", () => {
  it("accepts button and link actions in both modes", () => {
    expectTypeOf(initSiteping).toBeCallableWith({
      projectName: "p",
      endpoint: "/api/siteping",
      panelActions: [
        { id: "sync", label: "Sync", onAction: () => {} },
        { id: "async", label: "Async", onAction: async () => {}, icon: "<svg/>", visible: () => true },
        { id: "static", label: "Tracker", href: "https://tracker.example" },
        { id: "computed", label: "Mail", href: (fb) => `mailto:${fb.authorEmail}` },
      ],
    });
    expectTypeOf(initSiteping).toBeCallableWith({ projectName: "p", store, panelActions: [] });
  });

  it("is a button XOR a link", () => {
    expectTypeOf<SitepingPanelAction>().toEqualTypeOf<SitepingPanelButtonAction | SitepingPanelLinkAction>();
    // @ts-expect-error — onAction and href are mutually exclusive
    const both: SitepingPanelAction = { id: "x", label: "X", onAction: () => {}, href: "https://x.example" };
    // @ts-expect-error — one of onAction / href is required
    const neither: SitepingPanelAction = { id: "x", label: "X" };
    void [both, neither];
  });

  it("hands callbacks a read-only feedback and the context", () => {
    expectTypeOf<Parameters<SitepingPanelButtonAction["onAction"]>>().toEqualTypeOf<
      [SitepingPanelActionFeedback, SitepingPanelActionContext]
    >();
    expectTypeOf<FeedbackResponse>().toExtend<SitepingPanelActionFeedback>();
    expectTypeOf<ReturnType<SitepingPanelButtonAction["onAction"]>>().toEqualTypeOf<void | Promise<void>>();
    expectTypeOf<SitepingPanelActionContext>().toEqualTypeOf<{ refresh: () => Promise<void>; close: () => void }>();
    expectTypeOf<SitepingPanelLinkAction["href"]>().toEqualTypeOf<
      string | ((feedback: SitepingPanelActionFeedback) => string)
    >();
  });

  it("accepts helpers typed with SitepingPanelActionFeedback", () => {
    const createTicket = (_fb: SitepingPanelActionFeedback): Promise<void> => Promise.resolve();
    const hasPin = (fb: SitepingPanelActionFeedback) => fb.annotations.length > 0;
    expectTypeOf(initSiteping).toBeCallableWith({
      projectName: "p",
      endpoint: "/api",
      panelActions: [{ id: "t", label: "Ticket", onAction: createTicket, visible: hasPin }],
    });
  });

  it("rejects writes to the feedback", () => {
    const action: SitepingPanelButtonAction = {
      id: "x",
      label: "X",
      onAction: (fb) => {
        // @ts-expect-error — the snapshot is read-only…
        fb.status = "resolved";
        // @ts-expect-error — …its arrays included…
        fb.annotations.sort();
        // @ts-expect-error — …and the records inside them
        fb.annotations[0]!.scrollX = 0;
        // @ts-expect-error — …down to the diagnostics entries
        fb.diagnostics?.console.splice(0);
      },
    };
    void action;
  });
});

describe("public events", () => {
  it("types each listener payload", () => {
    instance.on("feedback:sent", (fb) => {
      expectTypeOf(fb).toEqualTypeOf<FeedbackResponse>();
    });
    instance.on("feedback:error", (error) => {
      expectTypeOf(error).toEqualTypeOf<Error>();
    });
    instance.on("comment:added", (comment) => {
      expectTypeOf(comment).toEqualTypeOf<CommentResponse>();
    });
    instance.on("annotation:start", (...args) => {
      expectTypeOf(args).toEqualTypeOf<[]>();
    });
  });

  it("rejects unknown event names", () => {
    // @ts-expect-error — not a public event
    instance.on("submission:cancelled", () => {});
  });

  it("keeps the public map in sync with the instance signature", () => {
    expectTypeOf<Parameters<SitepingInstance["on"]>[0]>().toEqualTypeOf<keyof SitepingPublicEvents>();
  });

  it("types onCommentAdded like the comment:added listener, in both modes", () => {
    expectTypeOf(initSiteping).toBeCallableWith({
      projectName: "p",
      endpoint: "/api/siteping",
      onCommentAdded: (comment: CommentResponse) => void comment.authorRole,
    });
    expectTypeOf(initSiteping).toBeCallableWith({ projectName: "p", store, onCommentAdded: () => {} });
    expectTypeOf<SitepingPublicEvents["comment:added"]>().toEqualTypeOf<[CommentResponse]>();
    expectTypeOf<CommentResponse>().toEqualTypeOf<CoreCommentResponse>();
    // The wire shape never carries the dedup key.
    expectTypeOf<CommentResponse>().not.toHaveProperty("clientId");
  });
});

describe("GetFeedbacksOptions derivation", () => {
  it("is FeedbackQuery minus projectName", () => {
    expectTypeOf<keyof GetFeedbacksOptions>().toEqualTypeOf<Exclude<keyof FeedbackQuery, "projectName">>();
    expectTypeOf<GetFeedbacksOptions["statuses"]>().toEqualTypeOf<FeedbackQuery["statuses"]>();
  });
});

describe("custom locales", () => {
  it("accepts partial dictionaries", () => {
    expectTypeOf(registerLocale).toBeCallableWith("nl", { "panel.title": "Feedback" });
  });

  it("rejects unknown keys", () => {
    // @ts-expect-error — not a Translations key
    registerLocale("nl", { "panel.doesNotExist": "x" });
  });

  it("keeps values as strings", () => {
    expectTypeOf<Translations["panel.title"]>().toEqualTypeOf<string>();
  });
});
