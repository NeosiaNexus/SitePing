/**
 * Type-level lock (vitest typecheck mode — never executed): what the handler
 * serializes is exactly the wire contract core publishes to clients.
 */

import type { CommentResponse, FeedbackResponse, Prettify, Serialized } from "@siteping/core";
import { expectTypeOf, test } from "vitest";
import type { WireComment, WireFeedback } from "../src/pipeline.js";

test("the wire shapes serialize to the API types clients read", () => {
  expectTypeOf<Prettify<Serialized<WireComment>>>().toEqualTypeOf<CommentResponse>();
  expectTypeOf<Prettify<Serialized<Omit<WireFeedback, "comments">>>>().toEqualTypeOf<
    Prettify<Omit<FeedbackResponse, "comments">>
  >();
  // Always sent: clients only meet a missing thread on servers that predate comments.
  expectTypeOf<Serialized<WireFeedback>["comments"]>().toEqualTypeOf<CommentResponse[]>();
});
