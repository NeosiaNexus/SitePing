/**
 * Type-level lock (vitest typecheck mode — never executed): what the handler
 * serializes is exactly the wire contract core publishes to clients.
 */

import type {
  CommentResponse,
  FeedbackPermissions,
  FeedbackResponse,
  FeedbackResponseList,
  Prettify,
  Serialized,
} from "@siteping/core";
import { expectTypeOf, test } from "vitest";
import type * as Server from "../src/index.js";
import type {
  GenericWebhookCommentPayload,
  GenericWebhookDeletionPayload,
  GenericWebhookEventMap,
  GenericWebhookPayload,
  SitepingDeletionTarget,
  SitepingLifecycleHooks,
  WEBHOOK_EVENTS,
  WebhookConfig,
  WebhookEvent,
} from "../src/index.js";
import type { WireFeedbackList } from "../src/operations/list-feedbacks.js";
import type { WireComment, WireFeedback } from "../src/pipeline.js";

test("the wire shapes serialize to the API types clients read", () => {
  expectTypeOf<Prettify<Serialized<WireComment>>>().toEqualTypeOf<CommentResponse>();
  expectTypeOf<Prettify<Serialized<Omit<WireFeedback, "comments" | "permissions">>>>().toEqualTypeOf<
    Prettify<Omit<FeedbackResponse, "comments" | "permissions">>
  >();
  // Always sent: clients only meet a missing thread, or missing permissions,
  // on servers that predate them.
  expectTypeOf<Serialized<WireFeedback>["comments"]>().toEqualTypeOf<CommentResponse[]>();
  expectTypeOf<Serialized<WireFeedback>["permissions"]>().toEqualTypeOf<FeedbackPermissions>();
});

test("the list wire shape is what clients read, protocol version always sent", () => {
  expectTypeOf<Omit<WireFeedbackList, "feedbacks">>().toExtend<Omit<FeedbackResponseList, "feedbacks">>();
  expectTypeOf<WireFeedbackList["protocol"]>().toEqualTypeOf<number>();
});

test("the generic webhook body is typed as the JSON a receiver parses", () => {
  // Dates as ISO strings, no clientId on the record or its comments; no permissions, which answer a requester.
  expectTypeOf<GenericWebhookPayload>().toEqualTypeOf<Prettify<Omit<FeedbackResponse, "permissions">>>();
});

test("the server exports the wire types it answers with", () => {
  expectTypeOf<Server.FeedbackResponse>().toEqualTypeOf<FeedbackResponse>();
  expectTypeOf<Server.CommentResponse>().toEqualTypeOf<CommentResponse>();
  expectTypeOf<Server.FeedbackPermissions>().toEqualTypeOf<FeedbackPermissions>();
  expectTypeOf<Server.FeedbackResponseList["feedbacks"]>().toEqualTypeOf<FeedbackResponse[]>();
  expectTypeOf<NonNullable<Server.FeedbackResponseList["capabilities"]>>().toEqualTypeOf<Server.SitepingCapabilities>();
  expectTypeOf<
    NonNullable<Server.FeedbackResponseList["permissions"]>
  >().toEqualTypeOf<Server.FeedbackListPermissions>();
});

test("each webhook event names its generic body, and the event list covers them all", () => {
  expectTypeOf<WebhookEvent>().toEqualTypeOf<
    "feedback.created" | "feedback.status_changed" | "feedback.deleted" | "comment.created"
  >();
  expectTypeOf<(typeof WEBHOOK_EVENTS)[number]>().toEqualTypeOf<WebhookEvent>();
  expectTypeOf<GenericWebhookEventMap["feedback.status_changed"]>().toEqualTypeOf<GenericWebhookPayload>();
  expectTypeOf<GenericWebhookDeletionPayload>().toEqualTypeOf<SitepingDeletionTarget>();
  // The reply as clients read it, plus its project.
  expectTypeOf<GenericWebhookCommentPayload>().toEqualTypeOf<Prettify<CommentResponse & { projectName: string }>>();
});

test("a webhook subscribes to known events only, and onCommentCreated gets the reply with its project", () => {
  expectTypeOf<{ url: string; events: ["comment.created"] }>().toMatchTypeOf<WebhookConfig>();
  // @ts-expect-error — not an event
  const typo: WebhookConfig = { url: "https://x.example", events: ["feedback.updated"] };
  void typo;
  type Hook = NonNullable<SitepingLifecycleHooks<null>["onCommentCreated"]>;
  expectTypeOf<Parameters<Hook>[0]["projectName"]>().toEqualTypeOf<string>();
  expectTypeOf<Parameters<Hook>[0]["clientId"]>().toEqualTypeOf<string>();
});
