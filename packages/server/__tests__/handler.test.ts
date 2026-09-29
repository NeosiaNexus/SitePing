import { MemoryStore } from "@siteping/adapter-memory";
import type { FeedbackRecord } from "@siteping/core";
import { describe, expect, it, vi } from "vitest";
import { MAX_VALIDATION_ISSUES } from "../src/constants.js";
import { createSitepingHandler, type SitepingLogger, type SitepingStore } from "../src/index.js";
import { validPayloadNoAnnotations } from "./fixtures.js";

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
