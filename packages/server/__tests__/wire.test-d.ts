/**
 * Type-level lock (vitest typecheck mode — never executed): what the handler
 * serializes is exactly the wire contract core publishes to clients.
 */

import type { CommentResponse, FeedbackPermissions, FeedbackResponse, Prettify, Serialized } from "@siteping/core";
import { expectTypeOf, test } from "vitest";
import type { GenericWebhookPayload } from "../src/index.js";
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

test("the generic webhook body is typed as the JSON a receiver parses", () => {
  // Dates as ISO strings, no clientId on the record or its comments; no permissions, which answer a requester.
  expectTypeOf<GenericWebhookPayload>().toEqualTypeOf<Prettify<Omit<FeedbackResponse, "permissions">>>();
});
