/**
 * Type-level locks for the handler options (vitest typecheck mode — never
 * executed): every @siteping/server option, the `apiKey` policy XOR `access`.
 */

import type { SitepingStore } from "@siteping/core";
import { describe, expectTypeOf, it } from "vitest";
import { createSitepingHandler, type HandlerOptions, type SitepingPrismaClient } from "../src/index.js";

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
});
