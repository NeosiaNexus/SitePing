/**
 * Type-level locks for the handler options (vitest typecheck mode — never
 * executed): the `apiKey` policy XOR a custom `access` policy, and the
 * principal inferred from `access.authenticate`.
 */

import type { SitepingStore } from "@siteping/core";
import { describe, expectTypeOf, it } from "vitest";
import { createSitepingHandler, type SitepingHandler, type SitepingHandlerOptions } from "../src/index.js";

declare const store: SitepingStore;

interface Reviewer {
  id: string;
  isAdmin: boolean;
}
declare function sessionUser(request: Request): Promise<Reviewer | null>;

describe("createSitepingHandler options XOR union", () => {
  it("accepts each policy on its own", () => {
    expectTypeOf(createSitepingHandler({ store })).toEqualTypeOf<SitepingHandler>();
    expectTypeOf(
      createSitepingHandler({ store, apiKey: "k", publicEndpoints: ["POST"] }),
    ).toEqualTypeOf<SitepingHandler>();
    expectTypeOf(
      createSitepingHandler({ store, access: { authenticate: sessionUser } }),
    ).toEqualTypeOf<SitepingHandler>();
  });

  it("accepts options assembled at runtime", () => {
    const options: SitepingHandlerOptions<Reviewer> =
      Math.random() > 0.5 ? { store, apiKey: "k" } : { store, access: { authenticate: sessionUser } };
    expectTypeOf(createSitepingHandler(options)).toEqualTypeOf<SitepingHandler>();
  });

  it("rejects mixed policies and a missing store", () => {
    // @ts-expect-error — apiKey and access are mutually exclusive
    createSitepingHandler({ store, apiKey: "k", access: { authenticate: sessionUser } });

    // @ts-expect-error — publicEndpoints belongs to the apiKey policy
    createSitepingHandler({ store, access: { authenticate: sessionUser }, publicEndpoints: ["GET"] });

    // @ts-expect-error — redaction is access.canReadAuthorEmail's job under access
    createSitepingHandler({ store, access: { authenticate: sessionUser }, redactUnauthenticatedEmails: false });

    // @ts-expect-error — a store is required
    createSitepingHandler({ apiKey: "k" });
  });
});

describe("the principal", () => {
  it("is null in hooks and transforms under the apiKey policy", () => {
    createSitepingHandler({
      store,
      apiKey: "k",
      beforeCreate: (input, { principal }) => {
        expectTypeOf(principal).toEqualTypeOf<null>();
        return input;
      },
      hooks: {
        onDeleted: (target, { principal }) => {
          expectTypeOf(principal).toEqualTypeOf<null>();
          expectTypeOf(target.projectName).toEqualTypeOf<string>();
        },
      },
    });
  });

  it("is inferred from access.authenticate, without null", () => {
    createSitepingHandler({
      store,
      access: {
        authenticate: sessionUser,
        authorize: ({ principal, action, feedbackId }) => {
          expectTypeOf(principal).toEqualTypeOf<Reviewer>();
          expectTypeOf(feedbackId).toEqualTypeOf<string | undefined>();
          return action === "create" || principal.isAdmin;
        },
        canReadAuthorEmail: (principal) => {
          expectTypeOf(principal).toEqualTypeOf<Reviewer>();
          return principal.isAdmin;
        },
      },
      presentFeedback: (feedback, { principal }) => {
        expectTypeOf(principal).toEqualTypeOf<Reviewer>();
        return feedback;
      },
      hooks: {
        onCreated: (_feedback, { principal }) => {
          expectTypeOf(principal).toEqualTypeOf<Reviewer>();
        },
      },
    });
  });
});
