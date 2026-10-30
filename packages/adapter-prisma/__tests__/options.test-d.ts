/**
 * Type-level locks for the handler options (vitest typecheck mode — never
 * executed): every @siteping/server option, the `apiKey` policy XOR `access`.
 */

import type { FeedbackPayload as CoreFeedbackPayload, SitepingStore } from "@siteping/core";
import { describe, expectTypeOf, it } from "vitest";
import {
  type CommentPayload,
  createSitepingHandler,
  type FeedbackCreateInput,
  type FeedbackPayload,
  type FeedbackRecord,
  type HandlerOptions,
  type PrismaAccessHandlerOptions,
  type PrismaHandlerStoreSource,
  type SitepingAccessControl,
  type SitepingAuthorizationContext,
  type SitepingDeletionTarget,
  type SitepingHandlerBaseOptions,
  type SitepingLifecycleHooks,
  type SitepingLogger,
  type SitepingPrismaClient,
  type SitepingRequestContext,
} from "../src/index.js";

declare const prisma: SitepingPrismaClient;
declare const store: SitepingStore;
declare function sessionUser(request: Request): Promise<{ id: string } | null>;

describe("createSitepingHandler options", () => {
  it("keeps the historical options", () => {
    expectTypeOf({
      prisma,
      apiKey: "k",
      publicEndpoints: ["POST", "OPTIONS"],
      allowedOrigins: ["https://example.com"],
      requireAuthForDestructive: true,
      redactUnauthenticatedEmails: true,
      caseInsensitiveSearch: true,
      screenshotStorage: { upload: async () => ({ url: "https://cdn.example.com/s.jpg" }) },
      webhooks: { url: "https://hooks.example.com" },
    } as const).toExtend<HandlerOptions>();
    expectTypeOf({ store }).toExtend<HandlerOptions>();
  });

  it("takes a Prisma client XOR a store, never neither", () => {
    createSitepingHandler({ prisma, apiKey: "k" });
    createSitepingHandler({ store, apiKey: "k" });

    // @ts-expect-error — no data source: compiled, then threw at startup
    createSitepingHandler({ apiKey: "k" });
    // @ts-expect-error — no data source under a custom policy either
    createSitepingHandler({ access: { authenticate: sessionUser } });
    // @ts-expect-error — `prisma` and `store` are mutually exclusive
    createSitepingHandler({ prisma, store });
  });

  it("refuses the built-in PrismaStore's options next to a custom store", () => {
    const screenshotStorage = { upload: async () => ({ url: "https://cdn.example.com/s.jpg" }) };
    // @ts-expect-error — a custom store handles its own screenshots
    createSitepingHandler({ store, screenshotStorage });
    // @ts-expect-error — a custom store owns its search semantics
    createSitepingHandler({ store, caseInsensitiveSearch: true });
    // @ts-expect-error — same under a custom access policy
    createSitepingHandler({ store, caseInsensitiveSearch: true, access: { authenticate: sessionUser } });
    expectTypeOf<PrismaHandlerStoreSource["screenshotStorage"]>().toEqualTypeOf<undefined>();
  });

  it("re-exports the create wire shape that replaced FeedbackCreateSchemaInput", () => {
    expectTypeOf<FeedbackPayload>().toEqualTypeOf<CoreFeedbackPayload>();
  });

  it("takes a custom access policy, never alongside apiKey", () => {
    createSitepingHandler({
      prisma,
      access: {
        authenticate: sessionUser,
        authorize: ({ principal }) => {
          expectTypeOf(principal).toEqualTypeOf<{ id: string }>();
          return true;
        },
      },
    });

    // @ts-expect-error — apiKey and access are mutually exclusive
    createSitepingHandler({ prisma, apiKey: "k", access: { authenticate: sessionUser } });

    // @ts-expect-error — a boolean check is no principal: its false would read as a signed-in caller
    createSitepingHandler({ prisma, access: { authenticate: (request) => request.headers.has("x-token") } });
  });

  it("takes options assembled at runtime, either policy, like @siteping/server does", () => {
    const options: HandlerOptions | PrismaAccessHandlerOptions<{ id: string }> = process.env.SSO
      ? { prisma, access: { authenticate: sessionUser } }
      : { prisma, apiKey: "k" };

    createSitepingHandler(options);
  });
});

describe("server option types", () => {
  interface Reviewer {
    id: string;
  }

  it("are re-exported, so standalone policies and hooks need no direct @siteping/server dependency", () => {
    const access: SitepingAccessControl<Reviewer> = {
      authenticate: sessionUser,
      authorize: ({ action }: SitepingAuthorizationContext<Reviewer>) => action !== "deleteAll",
    };
    const hooks: SitepingLifecycleHooks<Reviewer> = {
      onDeleted: (target: SitepingDeletionTarget, { principal }: SitepingRequestContext<Reviewer>) => {
        expectTypeOf(target.projectName).toEqualTypeOf<string>();
        expectTypeOf(principal).toEqualTypeOf<Reviewer>();
      },
    };
    const logger: SitepingLogger = { error: () => {} };
    const beforeCreate = (input: FeedbackCreateInput): FeedbackCreateInput => input;
    const beforeComment: SitepingHandlerBaseOptions<Reviewer>["beforeComment"] = (input: CommentPayload) => input;
    const presentFeedback = (feedback: FeedbackRecord): FeedbackRecord => feedback;

    createSitepingHandler({ prisma, access, hooks, logger, beforeCreate, beforeComment, presentFeedback });
  });
});
