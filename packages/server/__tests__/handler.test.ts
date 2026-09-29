import { MemoryStore } from "@siteping/adapter-memory";
import {
  ANCHOR_ELEMENT_ID_MAX,
  ANCHOR_ELEMENT_TAG_MAX,
  type FeedbackRecord,
  IDENTITY_FIELD_MAX_LENGTH,
} from "@siteping/core";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_MAX_BODY_BYTES, MAX_VALIDATION_ISSUES } from "../src/constants.js";
import { createSitepingHandler, type SitepingLogger, type SitepingStore } from "../src/index.js";
import { validAnnotation, validPayloadNoAnnotations } from "./fixtures.js";

const ENDPOINT = "http://localhost/api/siteping";
const API_KEY = "a-secret-key";

function request(method: string, body?: unknown, headers: Record<string, string> = {}): Request {
  return new Request(ENDPOINT, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

function listRequest(headers: Record<string, string> = {}): Request {
  return new Request(`${ENDPOINT}?projectName=${validPayloadNoAnnotations.projectName}`, { headers });
}

const silentLogger = () => ({ error: vi.fn<SitepingLogger["error"]>() });

describe("createSitepingHandler — any store", () => {
  it("serves the whole feedback lifecycle over a MemoryStore", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore(), apiKey: API_KEY });
    const auth = { Authorization: `Bearer ${API_KEY}` };

    const created = await handler.POST(request("POST", validPayloadNoAnnotations));
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as FeedbackRecord;

    const updated = await handler.PATCH(
      request("PATCH", { id, projectName: validPayloadNoAnnotations.projectName, status: "resolved" }, auth),
    );
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ id, status: "resolved" });

    const listed = (await (await handler.GET(listRequest(auth))).json()) as { feedbacks: FeedbackRecord[] };
    expect(listed.feedbacks).toHaveLength(1);
    expect(listed.feedbacks[0]).not.toHaveProperty("clientId");

    const deleted = await handler.DELETE(
      request("DELETE", { id, projectName: validPayloadNoAnnotations.projectName }, auth),
    );
    expect(await deleted.json()).toEqual({ deleted: true });
  });

  it("refuses to start without a store", () => {
    expect(() => createSitepingHandler({} as { store: SitepingStore })).toThrow(/requires a `store`/);
  });
});

describe("createSitepingHandler — apiKey", () => {
  it("rejects a wrong key of the same byte length as the real one", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore(), apiKey: API_KEY });
    const sameLengthKey = `${API_KEY.slice(0, -1)}X`;

    const response = await handler.GET(listRequest({ Authorization: `Bearer ${sameLengthKey}` }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("refuses to start in production without an apiKey, naming the ways out", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(() => createSitepingHandler({ store: new MemoryStore() })).toThrow(
        /createSitepingHandler: apiKey is required in production/,
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("createSitepingHandler — validation errors", () => {
  const many = (length: number) => Array.from({ length }, () => ({}));

  it.each<[string, Record<string, unknown>]>([
    ["annotations", { annotations: many(10_000) }],
    ["diagnostics.console", { diagnostics: { console: many(10_000), network: [] } }],
    ["diagnostics.network", { diagnostics: { console: [], network: many(10_000) } }],
  ])("refuses an oversized %s on its length alone, in one issue", async (field, overrides) => {
    const handler = createSitepingHandler({ store: new MemoryStore(), apiKey: API_KEY });

    const response = await handler.POST(request("POST", { ...validPayloadNoAnnotations, ...overrides }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ errors: [{ field, message: expect.stringMatching(/^Too big/) }] });
  });

  it("refuses an oversized statuses filter on its length alone", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore() });
    const statuses = Array.from({ length: 4000 }, () => "x").join(",");

    const response = await handler.GET(
      new Request(`${ENDPOINT}?projectName=${validPayloadNoAnnotations.projectName}&statuses=${statuses}`),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: [{ field: "statuses", message: expect.stringMatching(/^Too big/) }],
    });
  });

  it(`lists at most ${MAX_VALIDATION_ISSUES} issues`, async () => {
    const handler = createSitepingHandler({ store: new MemoryStore() });

    // Fifty empty annotations: a missing field each, twenty-odd per annotation.
    const response = await handler.POST(request("POST", { ...validPayloadNoAnnotations, annotations: many(50) }));

    expect(response.status).toBe(400);
    const { errors } = (await response.json()) as { errors: unknown[] };
    expect(errors).toHaveLength(MAX_VALIDATION_ISSUES);
  });
});

describe("createSitepingHandler — request body size", () => {
  const CHUNK_BYTES = 64 * 1024;
  const encode = (body: unknown) => new TextEncoder().encode(JSON.stringify(body));
  const text = (length: number) => "a".repeat(length);

  /** A request whose body streams in `CHUNK_BYTES` at a time, counting the bytes the handler pulls. */
  function streamed(method: string, bytes: Uint8Array, headers: Record<string, string> = {}) {
    let pulled = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pulled >= bytes.length) return controller.close();
        const chunk = bytes.subarray(pulled, pulled + CHUNK_BYTES);
        pulled += chunk.length;
        controller.enqueue(chunk);
      },
    });
    // `duplex` is required for a streamed body, and missing from TypeScript's RequestInit.
    const init = { method, headers, body, duplex: "half" } as RequestInit;
    return { request: new Request(ENDPOINT, init), pulled: () => pulled };
  }

  /** A submission twice the default cap, in a field the validation would only refuse once parsed. */
  const oversized = () => encode({ ...validPayloadNoAnnotations, message: text(2 * DEFAULT_MAX_BODY_BYTES) });

  /** The largest submission the validation accepts: every field at its cap. */
  function largestSubmission() {
    const annotation = {
      ...validAnnotation,
      anchor: {
        cssSelector: text(2000),
        xpath: text(2000),
        textSnippet: text(500),
        elementTag: text(ANCHOR_ELEMENT_TAG_MAX),
        elementId: text(ANCHOR_ELEMENT_ID_MAX),
        textPrefix: text(200),
        textSuffix: text(200),
        fingerprint: text(200),
        neighborText: text(500),
        anchorKey: text(200),
      },
    };
    return {
      projectName: text(200),
      type: "question",
      message: text(5000),
      url: text(2000),
      urlPattern: text(2000),
      viewport: text(50),
      userAgent: text(500),
      authorName: text(IDENTITY_FIELD_MAX_LENGTH),
      authorEmail: `${text(64)}@${text(63)}.${text(63)}.de`,
      annotations: Array.from({ length: 50 }, () => annotation),
      clientId: text(200),
      screenshotDataUrl: `data:image/jpeg;base64,${text(1_500_000 - 23)}`,
      screenshotRegion: { xPct: 0, yPct: 0, wPct: 1, hPct: 1 },
      diagnostics: {
        console: Array.from({ length: 50 }, () => ({ level: "error", timestamp: text(50), message: text(600) })),
        network: Array.from({ length: 20 }, () => ({
          url: text(2000),
          method: text(20),
          status: 599,
          durationMs: 600_000,
          timestamp: text(50),
        })),
      },
    };
  }

  it("refuses a body whose Content-Length is over the cap before reading it", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore(), apiKey: API_KEY });
    const bytes = oversized();
    const auth = { Authorization: `Bearer ${API_KEY}` };

    for (const method of ["POST", "PATCH", "DELETE"] as const) {
      const { request, pulled } = streamed(method, bytes, { ...auth, "Content-Length": String(bytes.length) });

      const response = await handler[method](request);

      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({ error: "Request body too large" });
      // A stream may queue its first chunk before anyone reads it.
      expect(pulled()).toBeLessThanOrEqual(CHUNK_BYTES);
    }
  });

  it("stops reading a body of unknown length once it passes the cap", async () => {
    const store = new MemoryStore();
    const handler = createSitepingHandler({ store, apiKey: API_KEY });
    const bytes = oversized();
    const { request, pulled } = streamed("POST", bytes);

    const response = await handler.POST(request);

    expect(response.status).toBe(413);
    // The chunk that crosses the cap, and the next one the stream queues ahead.
    expect(pulled()).toBeLessThanOrEqual(DEFAULT_MAX_BODY_BYTES + 2 * CHUNK_BYTES);
    expect((await store.getFeedbacks({ projectName: validPayloadNoAnnotations.projectName })).total).toBe(0);
  });

  it("accepts the largest submission the validation accepts, which the default cap holds twice", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore(), apiKey: API_KEY });
    const bytes = encode(largestSubmission());
    const { request } = streamed("POST", bytes, { "Content-Length": String(bytes.length) });

    const response = await handler.POST(request);

    expect(response.status).toBe(201);
    expect(bytes.length * 2).toBeLessThanOrEqual(DEFAULT_MAX_BODY_BYTES);
  });

  it("answers the 413 with the request's CORS headers, and takes another cap through maxBodyBytes", async () => {
    const origin = "https://client-site.example";
    const handler = createSitepingHandler({
      store: new MemoryStore(),
      allowedOrigins: [origin],
      maxBodyBytes: 1000,
    });

    const small = await handler.POST(request("POST", validPayloadNoAnnotations, { Origin: origin }));
    const large = await handler.POST(
      request("POST", { ...validPayloadNoAnnotations, clientId: "uuid-456", message: text(1000) }, { Origin: origin }),
    );

    expect(small.status).toBe(201);
    expect(large.status).toBe(413);
    expect(large.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("refuses to start with maxBodyBytes %s", (value) => {
    expect(() => createSitepingHandler({ store: new MemoryStore(), maxBodyBytes: value })).toThrow(
      /`maxBodyBytes` must be a positive integer/,
    );
  });
});

describe("createSitepingHandler — failure reporting", () => {
  /** A store whose reads fail with `error`, the way a missing table surfaces. */
  function failingStore(error: unknown): SitepingStore {
    const store = new MemoryStore();
    store.getFeedbacks = () => Promise.reject(error);
    return store;
  }

  it("reports a store failure to the logger with its request context, never the query", async () => {
    const failure = new Error("connection refused");
    const logger = silentLogger();
    const handler = createSitepingHandler({ store: failingStore(failure), logger });

    const response = await handler.GET(listRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
    expect(logger.error).toHaveBeenCalledWith("[siteping] Failed to fetch feedbacks", {
      error: failure,
      method: "GET",
      path: "/api/siteping",
    });
  });

  it("answers describeError's hint, and the generic message when it has none", async () => {
    const missingTable = Object.assign(new Error("relation does not exist"), { code: "42P01" });
    const describeError = (error: unknown) => (error === missingTable ? "Run the SitePing migrations" : undefined);

    const described = createSitepingHandler({
      store: failingStore(missingTable),
      logger: silentLogger(),
      describeError,
    });
    const undescribed = createSitepingHandler({
      store: failingStore(new Error("other")),
      logger: silentLogger(),
      describeError,
    });

    expect(await (await described.GET(listRequest())).json()).toEqual({ error: "Run the SitePing migrations" });
    expect(await (await undescribed.GET(listRequest())).json()).toEqual({ error: "Internal server error" });
  });

  it("keeps Prisma's setup hint out of the store-agnostic handler", async () => {
    const handler = createSitepingHandler({ store: failingStore({ code: "P2021" }), logger: silentLogger() });

    expect(await (await handler.GET(listRequest())).json()).toEqual({ error: "Internal server error" });
  });

  it("falls back to console.error when the logger throws or rejects, and still answers", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const throwing: SitepingLogger = {
        error() {
          throw new Error("logger misconfigured");
        },
      };
      const rejecting: SitepingLogger = { error: () => Promise.reject(new Error("log shipper unreachable")) };

      for (const logger of [throwing, rejecting]) {
        const response = await createSitepingHandler({ store: failingStore(new Error("down")), logger }).GET(
          listRequest(),
        );

        expect(response.status).toBe(500);
      }

      await vi.waitFor(() => expect(consoleSpy).toHaveBeenCalledTimes(2));
      expect(consoleSpy.mock.calls.map(([message]) => message)).toEqual([
        "[siteping] Failed to fetch feedbacks",
        "[siteping] Failed to fetch feedbacks",
      ]);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("logs to console.error by default", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const handler = createSitepingHandler({ store: failingStore(new Error("down")) });

      await handler.GET(listRequest());

      expect(consoleSpy).toHaveBeenCalledWith("[siteping] Failed to fetch feedbacks", expect.anything());
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
