import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSitepingHandler } from "../../adapter-prisma/index.js";

const validPayload = {
  projectName: "test",
  type: "bug",
  message: "broken button",
  url: "https://example.com",
  viewport: "1920x1080",
  userAgent: "Mozilla/5.0",
  authorName: "Alice",
  authorEmail: "alice@test.com",
  annotations: [],
  clientId: "uuid-1",
};

function mockPrisma() {
  return {
    sitepingFeedback: {
      create: vi.fn().mockResolvedValue({ id: "fb-1", ...validPayload, status: "open", createdAt: new Date().toISOString(), resolvedAt: null, annotations: [] }),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: "fb-1", status: "resolved", resolvedAt: new Date().toISOString(), annotations: [] }),
      count: vi.fn().mockResolvedValue(0),
    },
  };
}

describe("createSitepingHandler", () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let handler: ReturnType<typeof createSitepingHandler>;

  beforeEach(() => {
    prisma = mockPrisma();
    handler = createSitepingHandler({ prisma });
  });

  describe("POST", () => {
    it("creates a feedback with valid payload", async () => {
      const req = new Request("http://localhost/api/siteping", {
        method: "POST",
        body: JSON.stringify(validPayload),
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(201);
      expect(prisma.sitepingFeedback.create).toHaveBeenCalledOnce();
    });

    it("returns 400 for invalid JSON", async () => {
      const req = new Request("http://localhost/api/siteping", {
        method: "POST",
        body: "not json",
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing required fields", async () => {
      const req = new Request("http://localhost/api/siteping", {
        method: "POST",
        body: JSON.stringify({ type: "bug" }),
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.errors).toBeDefined();
      expect(body.errors.length).toBeGreaterThan(0);
    });

    it("returns 400 for invalid email", async () => {
      const req = new Request("http://localhost/api/siteping", {
        method: "POST",
        body: JSON.stringify({ ...validPayload, authorEmail: "not-email" }),
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(400);
    });

    it("handles duplicate clientId gracefully", async () => {
      prisma.sitepingFeedback.create.mockRejectedValue({ code: "P2002" });
      prisma.sitepingFeedback.findUnique.mockResolvedValue({ id: "fb-1", ...validPayload });
      const req = new Request("http://localhost/api/siteping", {
        method: "POST",
        body: JSON.stringify(validPayload),
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(201);
    });

    it("returns 500 on unexpected DB error", async () => {
      prisma.sitepingFeedback.create.mockRejectedValue(new Error("DB down"));
      const req = new Request("http://localhost/api/siteping", {
        method: "POST",
        body: JSON.stringify(validPayload),
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(500);
    });
  });

  describe("GET", () => {
    it("returns feedbacks for a project", async () => {
      prisma.sitepingFeedback.findMany.mockResolvedValue([]);
      prisma.sitepingFeedback.count.mockResolvedValue(0);
      const req = new Request("http://localhost/api/siteping?projectName=test");
      const res = await handler.GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("feedbacks");
      expect(body).toHaveProperty("total");
    });

    it("returns 400 without projectName", async () => {
      const req = new Request("http://localhost/api/siteping");
      const res = await handler.GET(req);
      expect(res.status).toBe(400);
    });

    it("clamps limit to 100", async () => {
      prisma.sitepingFeedback.findMany.mockResolvedValue([]);
      prisma.sitepingFeedback.count.mockResolvedValue(0);
      const req = new Request("http://localhost/api/siteping?projectName=test&limit=999");
      await handler.GET(req);
      const callArgs = prisma.sitepingFeedback.findMany.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs.take).toBe(100);
    });

    it("applies type and status filters", async () => {
      prisma.sitepingFeedback.findMany.mockResolvedValue([]);
      prisma.sitepingFeedback.count.mockResolvedValue(0);
      const req = new Request("http://localhost/api/siteping?projectName=test&type=bug&status=open");
      await handler.GET(req);
      const callArgs = prisma.sitepingFeedback.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(callArgs.where.type).toBe("bug");
      expect(callArgs.where.status).toBe("open");
    });
  });

  describe("PATCH", () => {
    it("resolves a feedback", async () => {
      const req = new Request("http://localhost/api/siteping", {
        method: "PATCH",
        body: JSON.stringify({ id: "fb-1", status: "resolved" }),
      });
      const res = await handler.PATCH(req);
      expect(res.status).toBe(200);
      const updateArgs = prisma.sitepingFeedback.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(updateArgs.data.status).toBe("resolved");
      expect(updateArgs.data.resolvedAt).toBeInstanceOf(Date);
    });

    it("unresolves a feedback (clears resolvedAt)", async () => {
      const req = new Request("http://localhost/api/siteping", {
        method: "PATCH",
        body: JSON.stringify({ id: "fb-1", status: "open" }),
      });
      await handler.PATCH(req);
      const updateArgs = prisma.sitepingFeedback.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(updateArgs.data.resolvedAt).toBeNull();
    });

    it("returns 400 for invalid status", async () => {
      const req = new Request("http://localhost/api/siteping", {
        method: "PATCH",
        body: JSON.stringify({ id: "fb-1", status: "pending" }),
      });
      const res = await handler.PATCH(req);
      expect(res.status).toBe(400);
    });
  });
});
