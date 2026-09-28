import type { FeedbackRecord } from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSitepingHandler, type WebhookConfig } from "../src/index.js";
import { validPayloadNoAnnotations } from "./fixtures.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const FEEDBACK: FeedbackRecord = {
  id: "fb-test-1",
  projectName: "test-project",
  type: "bug",
  message: "The button overlaps the modal close icon",
  status: "open",
  url: "https://example.com/orders/42",
  urlPattern: "/orders/:orderId",
  viewport: "1920x1080",
  userAgent: "Mozilla/5.0",
  authorName: "Alice",
  authorEmail: "alice@example.com",
  clientId: "client-uuid-1",
  resolvedAt: null,
  createdAt: new Date("2026-05-14T10:00:00Z"),
  updatedAt: new Date("2026-05-14T10:00:00Z"),
  annotations: [],
  screenshotUrl: null,
  screenshotRegion: null,
  diagnostics: null,
};

let fetchSpy: ReturnType<typeof vi.fn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Handler integration — webhook fires after successful POST
// ---------------------------------------------------------------------------

function mockPrisma() {
  const fbRecord = { ...FEEDBACK, createdAt: new Date(), updatedAt: new Date() };
  return {
    sitepingFeedback: {
      create: vi.fn().mockResolvedValue(fbRecord),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(fbRecord),
      delete: vi.fn().mockResolvedValue({ id: fbRecord.id }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },
  };
}

describe("createSitepingHandler — webhooks option", () => {
  it("dispatches a single webhook after a successful POST", async () => {
    const prisma = mockPrisma();
    const webhook: WebhookConfig = { url: "https://hooks.example.com" };
    const handler = createSitepingHandler({ prisma, webhooks: webhook });

    const req = new Request("http://localhost/api/siteping", {
      method: "POST",
      body: JSON.stringify(validPayloadNoAnnotations),
    });
    const res = await handler.POST(req);
    expect(res.status).toBe(201);

    // Wait one microtask tick for the fire-and-forget dispatch to fire.
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledOnce());
  });

  it("dispatches every webhook in an array config", async () => {
    const prisma = mockPrisma();
    const handler = createSitepingHandler({
      prisma,
      webhooks: [
        { url: "https://slack.example.com", type: "slack" },
        { url: "https://discord.example.com", type: "discord" },
      ],
    });

    const req = new Request("http://localhost/api/siteping", {
      method: "POST",
      body: JSON.stringify(validPayloadNoAnnotations),
    });
    await handler.POST(req);

    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    const urls = fetchSpy.mock.calls.map((c) => c[0]);
    expect(urls).toContain("https://slack.example.com");
    expect(urls).toContain("https://discord.example.com");
  });

  it("does not fire webhooks when POST fails validation", async () => {
    const prisma = mockPrisma();
    const handler = createSitepingHandler({
      prisma,
      webhooks: { url: "https://hooks.example.com" },
    });

    const req = new Request("http://localhost/api/siteping", {
      method: "POST",
      body: JSON.stringify({ type: "bug" }), // missing required fields
    });
    const res = await handler.POST(req);
    expect(res.status).toBe(400);
    // Give any erroneous fire-and-forget a chance to run before asserting.
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
