import type { ScreenshotStorage } from "@siteping/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaStore } from "../src/index.js";

const SAMPLE_DATA_URL = "data:image/jpeg;base64,/9j/4AAQ";

function mockPrisma() {
  return {
    sitepingFeedback: {
      // create echoes back the data so we can assert what was written.
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => ({
        id: "fb-1",
        ...args.data,
        annotations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        resolvedAt: null,
      })),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
  };
}

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    projectName: "test",
    type: "bug" as const,
    message: "msg",
    status: "open" as const,
    url: "https://example.com",
    viewport: "1920x1080",
    userAgent: "test",
    authorName: "Alice",
    authorEmail: "alice@test.com",
    clientId: "client-123",
    annotations: [],
    ...overrides,
  };
}

describe("PrismaStore — screenshot storage", () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    prisma = mockPrisma();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  describe("without screenshotStorage", () => {
    it("persists null when no data URL is sent", async () => {
      const store = new PrismaStore(prisma);
      await store.createFeedback(createInput());
      const created = prisma.sitepingFeedback.create.mock.calls[0]?.[0] as { data: { screenshotUrl: unknown } };
      expect(created.data.screenshotUrl).toBeNull();
    });

    it("persists the data URL inline and warns once", async () => {
      const store = new PrismaStore(prisma);
      await store.createFeedback(createInput({ screenshotDataUrl: SAMPLE_DATA_URL, clientId: "c1" }));
      await store.createFeedback(createInput({ screenshotDataUrl: SAMPLE_DATA_URL, clientId: "c2" }));

      const calls = prisma.sitepingFeedback.create.mock.calls as Array<[{ data: { screenshotUrl: string } }]>;
      expect(calls[0]?.[0].data.screenshotUrl).toBe(SAMPLE_DATA_URL);
      expect(calls[1]?.[0].data.screenshotUrl).toBe(SAMPLE_DATA_URL);

      // Warns once across multiple inline persists — not on every create
      const inlineWarnings = warnSpy.mock.calls.filter((c: unknown[]) =>
        /no `screenshotStorage` is configured/.test(String(c[0])),
      );
      expect(inlineWarnings.length).toBe(1);
    });
  });

  describe("with screenshotStorage", () => {
    it("uploads via storage and persists the returned URL", async () => {
      const storage: ScreenshotStorage = {
        upload: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/fb-c1.jpg" }),
      };
      const store = new PrismaStore(prisma, { screenshotStorage: storage });

      await store.createFeedback(createInput({ screenshotDataUrl: SAMPLE_DATA_URL, clientId: "c1" }));

      expect(storage.upload).toHaveBeenCalledWith(SAMPLE_DATA_URL, {
        feedbackId: "c1",
        mimeType: "image/jpeg",
      });
      const created = prisma.sitepingFeedback.create.mock.calls[0]?.[0] as { data: { screenshotUrl: string } };
      expect(created.data.screenshotUrl).toBe("https://cdn.example.com/fb-c1.jpg");
    });

    it("does not call storage when no data URL is sent", async () => {
      const storage: ScreenshotStorage = { upload: vi.fn() };
      const store = new PrismaStore(prisma, { screenshotStorage: storage });

      await store.createFeedback(createInput());

      expect(storage.upload).not.toHaveBeenCalled();
      const created = prisma.sitepingFeedback.create.mock.calls[0]?.[0] as { data: { screenshotUrl: unknown } };
      expect(created.data.screenshotUrl).toBeNull();
    });

    it("persists null when upload throws — does NOT silently bloat the DB with inline base64", async () => {
      const storage: ScreenshotStorage = {
        upload: vi.fn().mockRejectedValue(new Error("S3 down")),
      };
      const store = new PrismaStore(prisma, { screenshotStorage: storage });

      const result = await store.createFeedback(createInput({ screenshotDataUrl: SAMPLE_DATA_URL, clientId: "c1" }));

      const created = prisma.sitepingFeedback.create.mock.calls[0]?.[0] as { data: { screenshotUrl: string | null } };
      // The feedback message is preserved; only the screenshot is dropped.
      // An inline fallback would silently grow Postgres during a storage
      // outage — operators discover it only when DB-size alarms fire.
      expect(created.data.screenshotUrl).toBeNull();
      // The created feedback record should reflect the dropped screenshot.
      expect(result.screenshotUrl).toBeNull();
      const failureWarnings = warnSpy.mock.calls.filter((c: unknown[]) =>
        /screenshotStorage\.upload failed/.test(String(c[0])),
      );
      expect(failureWarnings.length).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
// Cleanup — the `delete` hook the ScreenshotStorage interface documents
// ---------------------------------------------------------------------------

describe("PrismaStore — screenshot cleanup", () => {
  const REMOTE_URL = "https://cdn.example.com/feedback/c1.jpg";

  function storageWithDelete(): ScreenshotStorage & { delete: ReturnType<typeof vi.fn> } {
    return {
      upload: vi.fn().mockResolvedValue({ url: REMOTE_URL }),
      delete: vi.fn().mockResolvedValue(undefined),
    };
  }

  let prisma: ReturnType<typeof mockPrisma>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    prisma = mockPrisma();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("deleteFeedback deletes the stored screenshot of the deleted row", async () => {
    const storage = storageWithDelete();
    prisma.sitepingFeedback.delete.mockResolvedValue({ id: "fb-1", screenshotUrl: REMOTE_URL });

    await new PrismaStore(prisma, { screenshotStorage: storage }).deleteFeedback("fb-1");

    expect(storage.delete).toHaveBeenCalledWith(REMOTE_URL);
  });

  it("deleteFeedback skips inline data URLs and rows without a screenshot", async () => {
    const storage = storageWithDelete();
    const store = new PrismaStore(prisma, { screenshotStorage: storage });

    prisma.sitepingFeedback.delete.mockResolvedValueOnce({ id: "fb-1", screenshotUrl: SAMPLE_DATA_URL });
    await store.deleteFeedback("fb-1");
    prisma.sitepingFeedback.delete.mockResolvedValueOnce({ id: "fb-2", screenshotUrl: null });
    await store.deleteFeedback("fb-2");

    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("deleteAllFeedbacks deletes every stored screenshot of the project, rows first", async () => {
    const storage = storageWithDelete();
    const calls: string[] = [];
    prisma.sitepingFeedback.findMany.mockResolvedValue([
      { screenshotUrl: "https://cdn.example.com/a.jpg" },
      { screenshotUrl: "https://cdn.example.com/b.jpg" },
      { screenshotUrl: SAMPLE_DATA_URL },
    ]);
    prisma.sitepingFeedback.deleteMany.mockImplementation(async () => {
      calls.push("deleteMany");
      return { count: 3 };
    });
    storage.delete.mockImplementation(async (url: string) => {
      calls.push(url);
    });

    await new PrismaStore(prisma, { screenshotStorage: storage }).deleteAllFeedbacks("p");

    expect(prisma.sitepingFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectName: "p", screenshotUrl: { not: null } } }),
    );
    expect(calls[0]).toBe("deleteMany");
    expect(calls.slice(1).sort()).toEqual(["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"]);
  });

  it("deleteAllFeedbacks does not query screenshots when the storage has no delete hook", async () => {
    const storage: ScreenshotStorage = { upload: vi.fn() };
    await new PrismaStore(prisma, { screenshotStorage: storage }).deleteAllFeedbacks("p");
    expect(prisma.sitepingFeedback.findMany).not.toHaveBeenCalled();
    expect(prisma.sitepingFeedback.deleteMany).toHaveBeenCalledOnce();
  });

  it("a failing delete hook is logged and never fails the deletion", async () => {
    const storage = storageWithDelete();
    storage.delete.mockRejectedValue(new Error("bucket gone"));
    prisma.sitepingFeedback.delete.mockResolvedValue({ id: "fb-1", screenshotUrl: REMOTE_URL });

    await expect(
      new PrismaStore(prisma, { screenshotStorage: storage }).deleteFeedback("fb-1"),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("screenshotStorage.delete failed"), expect.anything());
  });

  it("discards the upload of a replayed clientId (the stored row keeps its own screenshot)", async () => {
    const storage = storageWithDelete();
    prisma.sitepingFeedback.create.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));

    await expect(
      new PrismaStore(prisma, { screenshotStorage: storage }).createFeedback(
        createInput({ screenshotDataUrl: SAMPLE_DATA_URL, clientId: "c1" }),
      ),
    ).rejects.toThrow();

    expect(storage.upload).toHaveBeenCalledOnce();
    expect(storage.delete).toHaveBeenCalledWith(REMOTE_URL);
  });
});
