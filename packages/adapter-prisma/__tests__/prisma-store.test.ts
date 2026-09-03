import { StoreDuplicateError, StoreNotFoundError } from "@siteping/core";
import { testSitepingStore } from "@siteping/core/testing";
import { describe, expect, it, vi } from "vitest";
import { PrismaStore } from "../src/index.js";
import { fakePrisma } from "./fake-prisma.js";

// ---------------------------------------------------------------------------
// Contract conformance — the suite third-party adapters run, against our own
// production adapter, through an in-memory Prisma double.
// ---------------------------------------------------------------------------

describe("PrismaStore", () => {
  testSitepingStore(() => new PrismaStore(fakePrisma()), {
    duplicateBehavior: "throw",
    // No `_activeProvider` on the double → `contains` without `mode`, i.e.
    // case-sensitive like Postgres `LIKE`.
    caseInsensitiveSearch: false,
  });
});

// ---------------------------------------------------------------------------
// Contract details asserted directly on the delegate calls
// ---------------------------------------------------------------------------

function spyDelegate() {
  return {
    sitepingFeedback: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
  };
}

function prismaError(code: string): Error & { code: string } {
  return Object.assign(new Error(`Prisma ${code}`), { code });
}

describe("PrismaStore — pagination clamp", () => {
  it("caps limit at 100 before calling findMany", async () => {
    const prisma = spyDelegate();
    await new PrismaStore(prisma).getFeedbacks({ projectName: "p", limit: 500 });
    const args = prisma.sitepingFeedback.findMany.mock.calls[0]?.[0] as { take: number };
    expect(args.take).toBe(100);
  });

  it("clamps a page below 1 to the first page (never a negative skip)", async () => {
    const prisma = spyDelegate();
    await new PrismaStore(prisma).getFeedbacks({ projectName: "p", page: 0 });
    const args = prisma.sitepingFeedback.findMany.mock.calls[0]?.[0] as { skip: number; take: number };
    expect(args.skip).toBe(0);
    expect(args.take).toBe(50);
  });

  it("derives skip from the clamped window", async () => {
    const prisma = spyDelegate();
    await new PrismaStore(prisma).getFeedbacks({ projectName: "p", page: 3, limit: 20 });
    const args = prisma.sitepingFeedback.findMany.mock.calls[0]?.[0] as { skip: number; take: number };
    expect(args).toMatchObject({ skip: 40, take: 20 });
  });
});

describe("PrismaStore — store error translation", () => {
  it("updateFeedback throws StoreNotFoundError (with the Prisma error as cause) on P2025", async () => {
    const prisma = spyDelegate();
    const original = prismaError("P2025");
    prisma.sitepingFeedback.update.mockRejectedValue(original);

    const error = await new PrismaStore(prisma)
      .updateFeedback("missing", { status: "resolved", resolvedAt: new Date() })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(StoreNotFoundError);
    expect((error as Error).cause).toBe(original);
  });

  it("deleteFeedback throws StoreNotFoundError on P2025", async () => {
    const prisma = spyDelegate();
    prisma.sitepingFeedback.delete.mockRejectedValue(prismaError("P2025"));
    await expect(new PrismaStore(prisma).deleteFeedback("missing")).rejects.toThrow(StoreNotFoundError);
  });

  it("createFeedback throws StoreDuplicateError on P2002", async () => {
    const prisma = spyDelegate();
    prisma.sitepingFeedback.create.mockRejectedValue(prismaError("P2002"));
    await expect(
      new PrismaStore(prisma).createFeedback({
        projectName: "p",
        type: "bug",
        message: "m",
        status: "open",
        url: "/",
        viewport: "1x1",
        userAgent: "ua",
        authorName: "a",
        authorEmail: "a@example.com",
        clientId: "c1",
        annotations: [],
      }),
    ).rejects.toThrow(StoreDuplicateError);
  });

  it("lets unrelated errors through untouched", async () => {
    const prisma = spyDelegate();
    const outage = new Error("connection refused");
    prisma.sitepingFeedback.update.mockRejectedValue(outage);
    await expect(new PrismaStore(prisma).updateFeedback("fb-1", { status: "open", resolvedAt: null })).rejects.toBe(
      outage,
    );
  });
});
