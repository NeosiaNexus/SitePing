import { SCREENSHOT_DELETE_CONCURRENCY, type ScreenshotStorage, StoreDuplicateError } from "@siteping/core";
import { createScreenshotStorage } from "@siteping/screenshot-storage";
import { createMemoryObjectStore } from "@siteping/screenshot-storage/memory";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSitepingHandler, PrismaStore } from "../src/index.js";
import { fakePrisma } from "./fake-prisma.js";
import { validPayloadNoAnnotations } from "./fixtures.js";

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
      update: vi.fn().mockImplementation((args: { where: { id: string }; data: Record<string, unknown> }) => ({
        id: args.where.id,
        ...args.data,
        annotations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        resolvedAt: null,
      })),
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
        /no `screenshotStorage` configured/.test(String(c[0])),
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

      const result = await store.createFeedback(createInput({ screenshotDataUrl: SAMPLE_DATA_URL, clientId: "c1" }));

      // Inserted first, then uploaded under the stored row's id, then attached.
      const created = prisma.sitepingFeedback.create.mock.calls[0]?.[0] as { data: { screenshotUrl: unknown } };
      expect(created.data.screenshotUrl).toBeNull();
      expect(storage.upload).toHaveBeenCalledWith(SAMPLE_DATA_URL, { feedbackId: "fb-1", mimeType: "image/jpeg" });
      expect(prisma.sitepingFeedback.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "fb-1" },
          data: { screenshotUrl: "https://cdn.example.com/fb-c1.jpg" },
        }),
      );
      expect(result.screenshotUrl).toBe("https://cdn.example.com/fb-c1.jpg");
    });

    it.each([
      ["data:image/png;base64,iVBORw0KGgo", "image/png"],
      ["data:image/webp;base64,UklGRg", "image/webp"],
    ])("passes the data URL's own mimeType to upload (%s)", async (dataUrl, mimeType) => {
      const storage: ScreenshotStorage = { upload: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/x" }) };
      const store = new PrismaStore(prisma, { screenshotStorage: storage });

      await store.createFeedback(createInput({ screenshotDataUrl: dataUrl, clientId: "c1" }));

      expect(storage.upload).toHaveBeenCalledWith(dataUrl, { feedbackId: expect.any(String), mimeType });
    });

    it("never forwards a type outside JPEG, PNG and WebP (an SVG label is script-capable)", async () => {
      // `PrismaStore.createFeedback` is public: its callers skip the HTTP schema.
      const storage: ScreenshotStorage = { upload: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/x" }) };
      const store = new PrismaStore(prisma, { screenshotStorage: storage });
      const dataUrl = "data:image/svg+xml;base64,PHN2Zz4";

      await store.createFeedback(createInput({ screenshotDataUrl: dataUrl, clientId: "c1" }));

      expect(storage.upload).toHaveBeenCalledWith(dataUrl, { feedbackId: expect.any(String), mimeType: "image/jpeg" });
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

  it("deleteAllFeedbacks keeps at most the concurrency limit of screenshot deletes in flight", async () => {
    const storage = storageWithDelete();
    const urls = Array.from({ length: 50 }, (_, index) => `https://cdn.example.com/${index}.jpg`);
    prisma.sitepingFeedback.findMany.mockResolvedValue(urls.map((screenshotUrl) => ({ screenshotUrl })));
    let inFlight = 0;
    let peakInFlight = 0;
    const deleted: string[] = [];
    storage.delete.mockImplementation(async (url: string) => {
      inFlight += 1;
      peakInFlight = Math.max(peakInFlight, inFlight);
      // Keep each delete pending across a macrotask so concurrent calls overlap.
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      deleted.push(url);
    });

    await new PrismaStore(prisma, { screenshotStorage: storage }).deleteAllFeedbacks("p");

    expect(peakInFlight).toBe(SCREENSHOT_DELETE_CONCURRENCY);
    expect(deleted.sort()).toEqual([...urls].sort());
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

  it("uploads nothing for a replayed clientId (the stored row keeps its own screenshot)", async () => {
    const storage = storageWithDelete();
    prisma.sitepingFeedback.create.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));

    await expect(
      new PrismaStore(prisma, { screenshotStorage: storage }).createFeedback(
        createInput({ screenshotDataUrl: SAMPLE_DATA_URL, clientId: "c1" }),
      ),
    ).rejects.toThrow();

    expect(storage.upload).not.toHaveBeenCalled();
    expect(storage.delete).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Insert first: the upload gets the stored row's id, a refused insert uploads nothing
// ---------------------------------------------------------------------------

describe("PrismaStore — upload after the insert", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  /** A storage that mints a fresh object per upload (random / timestamped keys). */
  function uniqueKeyStorage(): ScreenshotStorage & {
    upload: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  } {
    let seq = 0;
    return {
      upload: vi.fn(async () => ({ url: `https://cdn.example.com/obj-${++seq}.jpg` })),
      delete: vi.fn().mockResolvedValue(undefined),
    };
  }

  const input = () => createInput({ screenshotDataUrl: SAMPLE_DATA_URL, clientId: "c1" });

  it("uploads under the id the row is stored under, never the client-supplied clientId", async () => {
    const storage = uniqueKeyStorage();
    const store = new PrismaStore(fakePrisma(), { screenshotStorage: storage });

    const record = await store.createFeedback(input());

    expect(storage.upload).toHaveBeenCalledExactlyOnceWith(SAMPLE_DATA_URL, {
      feedbackId: record.id,
      mimeType: "image/jpeg",
    });
    expect(record.id).not.toBe("c1");
    expect(record.screenshotUrl).toBe("https://cdn.example.com/obj-1.jpg");
    expect((await store.findByClientId("c1"))?.screenshotUrl).toBe(record.screenshotUrl);
  });

  it("uploads nothing for a replay of a stored clientId, which the insert refuses", async () => {
    const storage = uniqueKeyStorage();
    const store = new PrismaStore(fakePrisma(), { screenshotStorage: storage });

    await store.createFeedback(input());
    await expect(store.createFeedback(input())).rejects.toThrow(StoreDuplicateError);

    expect(storage.upload).toHaveBeenCalledOnce();
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("uploads nothing when the insert fails for another reason", async () => {
    const prisma = fakePrisma();
    const storage = uniqueKeyStorage();
    const outage = Object.assign(new Error("Can't reach database server"), { code: "P1001" });
    vi.spyOn(prisma.sitepingFeedback, "create").mockRejectedValueOnce(outage);

    await expect(new PrismaStore(prisma, { screenshotStorage: storage }).createFeedback(input())).rejects.toBe(outage);

    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("keeps the feedback and discards the object when attaching it fails", async () => {
    const prisma = fakePrisma();
    const storage = uniqueKeyStorage();
    const logger = { warn: vi.fn() };
    const failure = new Error("connection reset");
    vi.spyOn(prisma.sitepingFeedback, "update").mockRejectedValueOnce(failure);
    const store = new PrismaStore(prisma, { screenshotStorage: storage, logger });

    const record = await store.createFeedback(input());

    expect(record.screenshotUrl).toBeNull();
    expect((await store.findByClientId("c1"))?.screenshotUrl).toBeNull();
    expect(storage.delete).toHaveBeenCalledExactlyOnceWith("https://cdn.example.com/obj-1.jpg");
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/could not attach the uploaded screenshot/), {
      clientId: "c1",
      feedbackId: record.id,
      error: failure,
    });
  });
});

// ---------------------------------------------------------------------------
// End to end with @siteping/screenshot-storage, whose keys are random per upload
// ---------------------------------------------------------------------------

describe("PrismaStore — with @siteping/screenshot-storage", () => {
  /** An 8-byte PNG signature: a valid base64 image data URL. */
  const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgo=";

  function open() {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: "https://app.example.com/api/siteping/screenshots" });
    const screenshotStorage = createScreenshotStorage(objectStore, { logger: { warn: vi.fn() } });
    return { objectStore, store: new PrismaStore(fakePrisma(), { screenshotStorage }) };
  }

  it("stores the object under a key the clientId never enters, and removes it with the feedback", async () => {
    const { objectStore, store } = open();

    const record = await store.createFeedback(createInput({ screenshotDataUrl: PNG_DATA_URL, clientId: "client-1" }));
    const key = objectStore.keyFromUrl(record.screenshotUrl ?? "");

    expect(key).toMatch(/^siteping-[a-f0-9]{32}\.png$/);
    expect(objectStore.keys()).toEqual([key]);

    await store.deleteFeedback(record.id);
    expect(objectStore.keys()).toEqual([]);
  });

  it("keeps the stored submission's object and removes only the other's when two submissions of one clientId race", async () => {
    const { objectStore, store } = open();
    const input = () => createInput({ screenshotDataUrl: PNG_DATA_URL, clientId: "client-1" });

    const [first, second] = await Promise.allSettled([store.createFeedback(input()), store.createFeedback(input())]);
    const results = [first, second];
    const stored = results.find((result) => result.status === "fulfilled");
    const refused = results.find((result) => result.status === "rejected");

    expect(refused?.reason).toBeInstanceOf(StoreDuplicateError);
    const storedUrl = stored?.status === "fulfilled" ? stored.value.screenshotUrl : null;
    expect((await store.findByClientId("client-1"))?.screenshotUrl).toBe(storedUrl);
    expect(objectStore.keys()).toEqual([objectStore.keyFromUrl(storedUrl ?? "")]);
  });

  it("removes every object of a project with deleteAllFeedbacks", async () => {
    const { objectStore, store } = open();
    await store.createFeedback(createInput({ screenshotDataUrl: PNG_DATA_URL, clientId: "client-1" }));
    await store.createFeedback(createInput({ screenshotDataUrl: PNG_DATA_URL, clientId: "client-2" }));
    expect(objectStore.keys()).toHaveLength(2);

    await store.deleteAllFeedbacks("test");

    expect(objectStore.keys()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Logger — degraded paths go to the injected logger, never failing the store
// ---------------------------------------------------------------------------

describe("PrismaStore — logger", () => {
  const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgo=";

  it("reports an upload failure and inline screenshots through logger.warn, not the console", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = { warn: vi.fn() };
    const failure = new Error("S3 down");
    const failing = new PrismaStore(fakePrisma(), {
      screenshotStorage: { upload: vi.fn().mockRejectedValue(failure) },
      logger,
    });
    const inline = new PrismaStore(fakePrisma(), { logger });

    const record = await failing.createFeedback(createInput({ screenshotDataUrl: PNG_DATA_URL, clientId: "c1" }));
    await inline.createFeedback(createInput({ screenshotDataUrl: PNG_DATA_URL, clientId: "c2" }));

    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/screenshotStorage\.upload failed/), {
      clientId: "c1",
      feedbackId: record.id,
      error: failure,
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/no `screenshotStorage` configured/), {});
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it.each([
    [
      "throws",
      () => {
        throw new Error("logger down");
      },
    ],
    ["rejects", () => Promise.reject(new Error("log shipper down"))],
  ])("still stores the feedback when the logger %s", async (_label, warn) => {
    const store = new PrismaStore(fakePrisma(), { logger: { warn: vi.fn(warn) } });

    const record = await store.createFeedback(createInput({ screenshotDataUrl: PNG_DATA_URL, clientId: "c1" }));

    expect(record.screenshotUrl).toBe(PNG_DATA_URL);
  });

  it("gets the handler's logger when it takes warnings", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = { error: vi.fn(), warn: vi.fn() };
    const handler = createSitepingHandler({ prisma: fakePrisma(), logger });

    const response = await handler.POST(
      new Request("http://localhost/api/siteping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validPayloadNoAnnotations, screenshotDataUrl: PNG_DATA_URL }),
      }),
    );

    expect(response.status).toBe(201);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/no `screenshotStorage` configured/), {});
  });
});
