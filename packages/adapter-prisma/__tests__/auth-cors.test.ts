import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSitepingHandler } from "../src/index.js";
import { validPayloadNoAnnotations } from "./fixtures.js";

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

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
      findUnique: vi.fn().mockResolvedValue({
        id: "fb-1",
        projectName: "test",
      }),
      update: vi.fn().mockResolvedValue({
        id: "fb-1",
        projectName: "test",
        status: "resolved",
        resolvedAt: new Date().toISOString(),
        annotations: [],
      }),
      delete: vi.fn().mockResolvedValue({ id: "fb-1" }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_KEY = "test-secret-key-123";
const ALLOWED_ORIGIN = "http://localhost:3000";

function postRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/siteping", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function getRequest(query: string, headers?: Record<string, string>): Request {
  return new Request(`http://localhost/api/siteping?${query}`, { headers });
}

function patchRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/siteping", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function deleteRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/siteping", {
    method: "DELETE",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function optionsRequest(headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/siteping", {
    method: "OPTIONS",
    headers,
  });
}

// ---------------------------------------------------------------------------
// Authentication tests
// ---------------------------------------------------------------------------

describe("Authentication", () => {
  let prisma: ReturnType<typeof mockPrisma>;

  beforeEach(() => {
    prisma = mockPrisma();
  });

  describe("POST is public by default when apiKey is set", () => {
    it("POST succeeds without Authorization header (public endpoint)", async () => {
      const handler = createSitepingHandler({ prisma, apiKey: API_KEY });
      const res = await handler.POST(postRequest(validPayloadNoAnnotations));
      // POST defaults to public in publicEndpoints
      expect(res.status).toBe(201);
    });

    it("POST with valid Bearer token also succeeds", async () => {
      const handler = createSitepingHandler({ prisma, apiKey: API_KEY });
      const res = await handler.POST(postRequest(validPayloadNoAnnotations, { Authorization: `Bearer ${API_KEY}` }));
      expect(res.status).toBe(201);
    });

    it("POST requires auth when publicEndpoints excludes POST", async () => {
      const handler = createSitepingHandler({
        prisma,
        apiKey: API_KEY,
        publicEndpoints: ["OPTIONS"],
      });
      const res = await handler.POST(postRequest(validPayloadNoAnnotations));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("POST with valid Bearer succeeds when publicEndpoints excludes POST", async () => {
      const handler = createSitepingHandler({
        prisma,
        apiKey: API_KEY,
        publicEndpoints: ["OPTIONS"],
      });
      const res = await handler.POST(postRequest(validPayloadNoAnnotations, { Authorization: `Bearer ${API_KEY}` }));
      expect(res.status).toBe(201);
    });
  });

  describe("GET with apiKey", () => {
    it("returns 401 without Authorization header", async () => {
      const handler = createSitepingHandler({ prisma, apiKey: API_KEY });
      const res = await handler.GET(getRequest("projectName=test"));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("succeeds with valid Bearer token", async () => {
      const handler = createSitepingHandler({ prisma, apiKey: API_KEY });
      const res = await handler.GET(getRequest("projectName=test", { Authorization: `Bearer ${API_KEY}` }));
      expect(res.status).toBe(200);
    });

    it("returns 401 with wrong API key", async () => {
      const handler = createSitepingHandler({ prisma, apiKey: API_KEY });
      const res = await handler.GET(getRequest("projectName=test", { Authorization: "Bearer wrong-key" }));
      expect(res.status).toBe(401);
    });

    it("returns 401 with malformed Authorization header", async () => {
      const handler = createSitepingHandler({ prisma, apiKey: API_KEY });
      const res = await handler.GET(getRequest("projectName=test", { Authorization: API_KEY }));
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH with apiKey", () => {
    it("returns 401 without Authorization header", async () => {
      const handler = createSitepingHandler({ prisma, apiKey: API_KEY });
      const res = await handler.PATCH(patchRequest({ id: "fb-1", projectName: "test", status: "resolved" }));
      expect(res.status).toBe(401);
    });

    it("succeeds with valid Bearer token", async () => {
      const handler = createSitepingHandler({ prisma, apiKey: API_KEY });
      const res = await handler.PATCH(
        patchRequest({ id: "fb-1", projectName: "test", status: "resolved" }, { Authorization: `Bearer ${API_KEY}` }),
      );
      expect(res.status).toBe(200);
    });
  });

  describe("DELETE with apiKey", () => {
    it("returns 401 without Authorization header", async () => {
      const handler = createSitepingHandler({ prisma, apiKey: API_KEY });
      const res = await handler.DELETE(deleteRequest({ id: "fb-1", projectName: "test" }));
      expect(res.status).toBe(401);
    });

    it("succeeds with valid Bearer token", async () => {
      const handler = createSitepingHandler({ prisma, apiKey: API_KEY });
      const res = await handler.DELETE(
        deleteRequest({ id: "fb-1", projectName: "test" }, { Authorization: `Bearer ${API_KEY}` }),
      );
      expect(res.status).toBe(200);
    });
  });

  describe("without apiKey configured (dev mode)", () => {
    it("POST succeeds without any Authorization header (public by default)", async () => {
      const handler = createSitepingHandler({ prisma });
      const res = await handler.POST(postRequest(validPayloadNoAnnotations));
      expect(res.status).toBe(201);
    });

    it("GET succeeds without any Authorization header (public by default)", async () => {
      const handler = createSitepingHandler({ prisma });
      const res = await handler.GET(getRequest("projectName=test"));
      expect(res.status).toBe(200);
    });

    it("PATCH without apiKey returns 401 (destructive ops require auth by default)", async () => {
      const handler = createSitepingHandler({ prisma });
      const res = await handler.PATCH(patchRequest({ id: "fb-1", projectName: "test", status: "resolved" }));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("apiKey required");
    });

    it("DELETE without apiKey returns 401 (destructive ops require auth by default)", async () => {
      const handler = createSitepingHandler({ prisma });
      const res = await handler.DELETE(deleteRequest({ id: "fb-1", projectName: "test" }));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("apiKey required");
    });

    it("DELETE { deleteAll: true } without apiKey returns 401 (closes the wipe-everything hole)", async () => {
      const handler = createSitepingHandler({ prisma });
      const res = await handler.DELETE(deleteRequest({ projectName: "test", deleteAll: true }));
      expect(res.status).toBe(401);
    });

    it("PATCH succeeds when requireAuthForDestructive=false (explicit escape hatch)", async () => {
      const handler = createSitepingHandler({ prisma, requireAuthForDestructive: false });
      const res = await handler.PATCH(patchRequest({ id: "fb-1", projectName: "test", status: "resolved" }));
      expect(res.status).toBe(200);
    });

    it("DELETE succeeds when requireAuthForDestructive=false (explicit escape hatch)", async () => {
      const handler = createSitepingHandler({ prisma, requireAuthForDestructive: false });
      const res = await handler.DELETE(deleteRequest({ id: "fb-1", projectName: "test" }));
      expect(res.status).toBe(200);
    });
  });

  describe("startup guard in production", () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("throws when NODE_ENV=production and apiKey is missing", () => {
      process.env.NODE_ENV = "production";
      expect(() => createSitepingHandler({ prisma })).toThrow(/apiKey is required in production/);
    });

    it("does not throw when apiKey is provided in production", () => {
      process.env.NODE_ENV = "production";
      expect(() => createSitepingHandler({ prisma, apiKey: API_KEY })).not.toThrow();
    });

    it("does not throw in production when requireAuthForDestructive=false (delegated auth)", () => {
      process.env.NODE_ENV = "production";
      expect(() => createSitepingHandler({ prisma, requireAuthForDestructive: false })).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// CORS tests
// ---------------------------------------------------------------------------

describe("CORS", () => {
  let prisma: ReturnType<typeof mockPrisma>;

  beforeEach(() => {
    prisma = mockPrisma();
  });

  describe("OPTIONS preflight", () => {
    it("returns 204 with CORS headers when origin matches allowedOrigins", () => {
      const handler = createSitepingHandler({
        prisma,
        allowedOrigins: [ALLOWED_ORIGIN],
      });
      const res = handler.OPTIONS(optionsRequest({ Origin: ALLOWED_ORIGIN }));

      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("PATCH");
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("DELETE");
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
      expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Content-Type");
      expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
      expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
    });

    it("returns 204 without CORS headers when allowedOrigins is not set", () => {
      const handler = createSitepingHandler({ prisma });
      const res = handler.OPTIONS(optionsRequest({ Origin: ALLOWED_ORIGIN }));

      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(res.headers.get("Access-Control-Allow-Methods")).toBeNull();
    });

    it("returns 204 without CORS headers when origin does not match", () => {
      const handler = createSitepingHandler({
        prisma,
        allowedOrigins: [ALLOWED_ORIGIN],
      });
      const res = handler.OPTIONS(optionsRequest({ Origin: "http://evil.com" }));

      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("returns 204 without CORS headers when no Origin header is sent", () => {
      const handler = createSitepingHandler({
        prisma,
        allowedOrigins: [ALLOWED_ORIGIN],
      });
      const res = handler.OPTIONS(optionsRequest());

      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("sets Vary: Origin header when origin matches", () => {
      const handler = createSitepingHandler({
        prisma,
        allowedOrigins: [ALLOWED_ORIGIN],
      });
      const res = handler.OPTIONS(optionsRequest({ Origin: ALLOWED_ORIGIN }));

      expect(res.headers.get("Vary")).toBe("Origin");
    });
  });

  describe("CORS on data endpoints", () => {
    it("POST includes CORS headers when origin matches", async () => {
      const handler = createSitepingHandler({
        prisma,
        allowedOrigins: [ALLOWED_ORIGIN],
      });
      const res = await handler.POST(postRequest(validPayloadNoAnnotations, { Origin: ALLOWED_ORIGIN }));

      expect(res.status).toBe(201);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
    });

    it("POST omits CORS headers when origin does not match", async () => {
      const handler = createSitepingHandler({
        prisma,
        allowedOrigins: [ALLOWED_ORIGIN],
      });
      const res = await handler.POST(postRequest(validPayloadNoAnnotations, { Origin: "http://evil.com" }));

      expect(res.status).toBe(201);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("GET includes CORS headers when origin matches", async () => {
      const handler = createSitepingHandler({
        prisma,
        allowedOrigins: [ALLOWED_ORIGIN],
      });
      const res = await handler.GET(getRequest("projectName=test", { Origin: ALLOWED_ORIGIN }));

      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
    });

    it("PATCH includes CORS headers when origin matches", async () => {
      const handler = createSitepingHandler({
        prisma,
        allowedOrigins: [ALLOWED_ORIGIN],
        requireAuthForDestructive: false,
      });
      const res = await handler.PATCH(
        patchRequest({ id: "fb-1", projectName: "test", status: "resolved" }, { Origin: ALLOWED_ORIGIN }),
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
    });

    it("DELETE includes CORS headers when origin matches", async () => {
      const handler = createSitepingHandler({
        prisma,
        allowedOrigins: [ALLOWED_ORIGIN],
        requireAuthForDestructive: false,
      });
      const res = await handler.DELETE(deleteRequest({ id: "fb-1", projectName: "test" }, { Origin: ALLOWED_ORIGIN }));

      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
    });

    it("omits CORS headers entirely when allowedOrigins is not configured", async () => {
      const handler = createSitepingHandler({ prisma });
      const res = await handler.POST(postRequest(validPayloadNoAnnotations, { Origin: ALLOWED_ORIGIN }));

      expect(res.status).toBe(201);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(res.headers.get("Access-Control-Allow-Methods")).toBeNull();
    });
  });

  describe("multiple allowed origins", () => {
    const SECOND_ORIGIN = "https://app.example.com";

    it("reflects the matching origin from the list", async () => {
      const handler = createSitepingHandler({
        prisma,
        allowedOrigins: [ALLOWED_ORIGIN, SECOND_ORIGIN],
      });

      const res1 = await handler.POST(postRequest(validPayloadNoAnnotations, { Origin: ALLOWED_ORIGIN }));
      expect(res1.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);

      const res2 = await handler.POST(postRequest(validPayloadNoAnnotations, { Origin: SECOND_ORIGIN }));
      expect(res2.headers.get("Access-Control-Allow-Origin")).toBe(SECOND_ORIGIN);
    });

    it("rejects origins not in the list", async () => {
      const handler = createSitepingHandler({
        prisma,
        allowedOrigins: [ALLOWED_ORIGIN, SECOND_ORIGIN],
      });
      const res = await handler.POST(postRequest(validPayloadNoAnnotations, { Origin: "http://unknown.com" }));
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });

  describe("CORS on auth error responses", () => {
    it("includes CORS headers on 401 responses so the browser can read the error", async () => {
      const handler = createSitepingHandler({
        prisma,
        apiKey: API_KEY,
        allowedOrigins: [ALLOWED_ORIGIN],
      });
      // GET is not public by default, so it requires auth
      const res = await handler.GET(getRequest("projectName=test", { Origin: ALLOWED_ORIGIN }));

      expect(res.status).toBe(401);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
    });

    it("omits CORS headers on 401 when origin does not match", async () => {
      const handler = createSitepingHandler({
        prisma,
        apiKey: API_KEY,
        allowedOrigins: [ALLOWED_ORIGIN],
      });
      const res = await handler.GET(getRequest("projectName=test", { Origin: "http://evil.com" }));

      expect(res.status).toBe(401);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });
});
