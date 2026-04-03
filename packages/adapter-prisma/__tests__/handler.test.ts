import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSitepingHandler } from "../src/index.js";
import { validAnnotation, validPayloadNoAnnotations } from "./fixtures.js";

function mockPrisma() {
  return {
    sitepingFeedback: {
      create: vi.fn().mockResolvedValue({
        id: "fb-1",
        ...validPayloadNoAnnotations,
        status: "open",
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        annotations: [],
      }),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi
        .fn()
        .mockResolvedValue({ id: "fb-1", status: "resolved", resolvedAt: new Date().toISOString(), annotations: [] }),
      delete: vi.fn().mockResolvedValue({ id: "fb-1" }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
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
        body: JSON.stringify(validPayloadNoAnnotations),
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
        body: JSON.stringify({ ...validPayloadNoAnnotations, authorEmail: "not-email" }),
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(400);
    });

    it("handles duplicate clientId gracefully", async () => {
      prisma.sitepingFeedback.create.mockRejectedValue({ code: "P2002" });
      prisma.sitepingFeedback.findUnique.mockResolvedValue({ id: "fb-1", ...validPayloadNoAnnotations });
      const req = new Request("http://localhost/api/siteping", {
        method: "POST",
        body: JSON.stringify(validPayloadNoAnnotations),
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(201);
    });

    it("returns 500 on unexpected DB error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      prisma.sitepingFeedback.create.mockRejectedValue(new Error("DB down"));
      const req = new Request("http://localhost/api/siteping", {
        method: "POST",
        body: JSON.stringify(validPayloadNoAnnotations),
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(500);
      consoleSpy.mockRestore();
    });

    it("maps annotation anchor fields to Prisma create", async () => {
      const payloadWithAnnotation = {
        ...validPayloadNoAnnotations,
        annotations: [validAnnotation],
      };

      const req = new Request("http://localhost/api/siteping", {
        method: "POST",
        body: JSON.stringify(payloadWithAnnotation),
      });

      await handler.POST(req);

      expect(prisma.sitepingFeedback.create).toHaveBeenCalledOnce();
      const createArg = prisma.sitepingFeedback.create.mock.calls[0][0] as {
        data: { annotations: { create: Array<Record<string, unknown>> } };
      };
      const flatAnnotation = createArg.data.annotations.create[0];

      expect(flatAnnotation.cssSelector).toBe("div.main > section:nth-child(2)");
      expect(flatAnnotation.xpath).toBe("/html/body/div[1]/section[2]");
      expect(flatAnnotation.textSnippet).toBe("Welcome to our platform");
      expect(flatAnnotation.elementTag).toBe("SECTION");
      expect(flatAnnotation.elementId).toBe("hero");
      expect(flatAnnotation.textPrefix).toBe("Navigation links here");
      expect(flatAnnotation.textSuffix).toBe("Learn more about us");
      expect(flatAnnotation.fingerprint).toBe("3:1:a1b2c3");
      expect(flatAnnotation.neighborText).toBe("Previous section | Next section");
      expect(flatAnnotation.xPct).toBe(0.1);
      expect(flatAnnotation.yPct).toBe(0.2);
      expect(flatAnnotation.wPct).toBe(0.5);
      expect(flatAnnotation.hPct).toBe(0.3);
      expect(flatAnnotation.scrollX).toBe(0);
      expect(flatAnnotation.scrollY).toBe(150);
      expect(flatAnnotation.viewportW).toBe(1920);
      expect(flatAnnotation.viewportH).toBe(1080);
      expect(flatAnnotation.devicePixelRatio).toBe(2);
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

  describe("DELETE", () => {
    it("deletes a single feedback by id", async () => {
      const req = new Request("http://localhost/api/siteping", {
        method: "DELETE",
        body: JSON.stringify({ id: "fb-1" }),
      });
      const res = await handler.DELETE(req);
      expect(res.status).toBe(200);
      expect(prisma.sitepingFeedback.delete).toHaveBeenCalledWith({ where: { id: "fb-1" } });
    });

    it("deletes all feedbacks for a project", async () => {
      const req = new Request("http://localhost/api/siteping", {
        method: "DELETE",
        body: JSON.stringify({ projectName: "test", deleteAll: true }),
      });
      const res = await handler.DELETE(req);
      expect(res.status).toBe(200);
      expect(prisma.sitepingFeedback.deleteMany).toHaveBeenCalledWith({ where: { projectName: "test" } });
    });

    it("returns 400 for invalid JSON", async () => {
      const req = new Request("http://localhost/api/siteping", {
        method: "DELETE",
        body: "not json",
      });
      const res = await handler.DELETE(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for empty body", async () => {
      const req = new Request("http://localhost/api/siteping", {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      const res = await handler.DELETE(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 when feedback not found (P2025)", async () => {
      prisma.sitepingFeedback.delete.mockRejectedValue({ code: "P2025" });
      const req = new Request("http://localhost/api/siteping", {
        method: "DELETE",
        body: JSON.stringify({ id: "nonexistent" }),
      });
      const res = await handler.DELETE(req);
      expect(res.status).toBe(404);
    });

    it("returns 500 on unexpected DB error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      prisma.sitepingFeedback.delete.mockRejectedValue(new Error("DB down"));
      const req = new Request("http://localhost/api/siteping", {
        method: "DELETE",
        body: JSON.stringify({ id: "fb-1" }),
      });
      const res = await handler.DELETE(req);
      expect(res.status).toBe(500);
      consoleSpy.mockRestore();
    });
  });
});
