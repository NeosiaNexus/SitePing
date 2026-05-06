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
      const inlineWarnings = warnSpy.mock.calls.filter((c) =>
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

    it("falls back to inline data URL when upload throws", async () => {
      const storage: ScreenshotStorage = {
        upload: vi.fn().mockRejectedValue(new Error("S3 down")),
      };
      const store = new PrismaStore(prisma, { screenshotStorage: storage });

      await store.createFeedback(createInput({ screenshotDataUrl: SAMPLE_DATA_URL, clientId: "c1" }));

      const created = prisma.sitepingFeedback.create.mock.calls[0]?.[0] as { data: { screenshotUrl: string } };
      // Failed uploads should not drop the screenshot — fall back to inline so
      // the user still sees something (the warn surfaces the underlying issue).
      expect(created.data.screenshotUrl).toBe(SAMPLE_DATA_URL);
      const failureWarnings = warnSpy.mock.calls.filter((c) => /screenshotStorage\.upload failed/.test(String(c[0])));
      expect(failureWarnings.length).toBe(1);
    });
  });
});
