import type { FeedbackQuery, FeedbackStatus, FeedbackUpdateInput, SitepingStore } from "@siteping/core";
import { SitepingAuthError, SitepingNetworkError, SitepingValidationError } from "@siteping/core";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { createEndpointSource, createStoreSource } from "../../src/source.js";
import { errorFetch, jsonFetch, makeAnnotationResponse, makeRecord, makeResponse } from "../helpers.js";

const ENDPOINT = "https://app.example/api/siteping";

function lastCall(fetchFn: Mock<typeof fetch>): { url: string; init: RequestInit } {
  const [url, init] = fetchFn.mock.calls.at(-1) as [string, RequestInit];
  return { url, init };
}

describe("createEndpointSource — list()", () => {
  it("builds a GET with projectName only and cache:no-store", async () => {
    const fetchFn = jsonFetch({ feedbacks: [], total: 0 });
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn });
    await source.list({ projectName: "demo" });

    const { url, init } = lastCall(fetchFn);
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(ENDPOINT);
    expect(parsed.searchParams.get("projectName")).toBe("demo");
    expect([...parsed.searchParams.keys()]).toEqual(["projectName"]);
    expect(init.method).toBe("GET");
    expect(init.cache).toBe("no-store");
  });

  it("serializes every supported filter into the query string", async () => {
    const fetchFn = jsonFetch({ feedbacks: [], total: 0 });
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn });
    const query: FeedbackQuery = {
      projectName: "demo",
      page: 3,
      limit: 25,
      status: "in_progress",
      type: "bug",
      search: "overlap",
      url: "/pricing",
      urlPattern: "/orders/:id",
    };
    await source.list(query);

    const params = new URL(lastCall(fetchFn).url).searchParams;
    expect(params.get("projectName")).toBe("demo");
    expect(params.get("page")).toBe("3");
    expect(params.get("limit")).toBe("25");
    expect(params.get("status")).toBe("in_progress");
    expect(params.get("type")).toBe("bug");
    expect(params.get("search")).toBe("overlap");
    expect(params.get("url")).toBe("/pricing");
    expect(params.get("urlPattern")).toBe("/orders/:id");
  });

  it("omits falsy page/limit/status/type/search", async () => {
    const fetchFn = jsonFetch({ feedbacks: [], total: 0 });
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn });
    await source.list({ projectName: "demo", page: 0, limit: 0, status: undefined, type: undefined, search: "" });

    const params = new URL(lastCall(fetchFn).url).searchParams;
    expect([...params.keys()]).toEqual(["projectName"]);
  });

  it("sends no Content-Type on GET", async () => {
    const fetchFn = jsonFetch({ feedbacks: [], total: 0 });
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn });
    await source.list({ projectName: "demo" });
    const headers = lastCall(fetchFn).init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("revives ISO dates on records, including annotations[].createdAt, and blanks clientId", async () => {
    const response = makeResponse({
      resolvedAt: "2026-07-21T09:00:00.000Z",
      createdAt: "2026-07-20T10:00:00.000Z",
      updatedAt: "2026-07-20T11:30:00.000Z",
      annotations: [makeAnnotationResponse({ createdAt: "2026-07-19T08:00:00.000Z" })],
    });
    const fetchFn = jsonFetch({ feedbacks: [response], total: 1 });
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn });

    const page = await source.list({ projectName: "demo" });
    const record = page.feedbacks[0];
    expect(page.total).toBe(1);
    expect(record?.resolvedAt).toBeInstanceOf(Date);
    expect(record?.resolvedAt?.toISOString()).toBe("2026-07-21T09:00:00.000Z");
    expect(record?.createdAt).toBeInstanceOf(Date);
    expect(record?.updatedAt).toBeInstanceOf(Date);
    expect(record?.annotations[0]?.createdAt).toBeInstanceOf(Date);
    expect(record?.clientId).toBe("");
  });

  it("keeps a null resolvedAt as null (no Date coercion)", async () => {
    const fetchFn = jsonFetch({ feedbacks: [makeResponse({ resolvedAt: null })], total: 1 });
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn });
    const page = await source.list({ projectName: "demo" });
    expect(page.feedbacks[0]?.resolvedAt).toBeNull();
  });
});

describe("createEndpointSource — auth & headers", () => {
  it("adds Authorization: Bearer from apiKey", async () => {
    const fetchFn = jsonFetch({ feedbacks: [], total: 0 });
    const source = createEndpointSource({ endpoint: ENDPOINT, apiKey: "secret-key", fetchFn });
    await source.list({ projectName: "demo" });
    const headers = lastCall(fetchFn).init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer secret-key");
  });

  it("merges a static headers object", async () => {
    const fetchFn = jsonFetch({ feedbacks: [], total: 0 });
    const source = createEndpointSource({ endpoint: ENDPOINT, headers: { "X-Team": "acme" }, fetchFn });
    await source.list({ projectName: "demo" });
    const headers = lastCall(fetchFn).init.headers as Record<string, string>;
    expect(headers["X-Team"]).toBe("acme");
  });

  it("supports an async headers function (fresh token per request)", async () => {
    const fetchFn = jsonFetch({ feedbacks: [], total: 0 });
    const headers = vi.fn(async () => ({ Authorization: "Bearer async-token" }));
    const source = createEndpointSource({ endpoint: ENDPOINT, headers, fetchFn });
    await source.list({ projectName: "demo" });
    expect(headers).toHaveBeenCalledTimes(1);
    expect((lastCall(fetchFn).init.headers as Record<string, string>).Authorization).toBe("Bearer async-token");
  });

  it("supports a sync headers function", async () => {
    const fetchFn = jsonFetch({ feedbacks: [], total: 0 });
    const source = createEndpointSource({ endpoint: ENDPOINT, headers: () => ({ "X-Sync": "1" }), fetchFn });
    await source.list({ projectName: "demo" });
    expect((lastCall(fetchFn).init.headers as Record<string, string>)["X-Sync"]).toBe("1");
  });

  it("lets an explicit Authorization header override apiKey", async () => {
    const fetchFn = jsonFetch({ feedbacks: [], total: 0 });
    const source = createEndpointSource({
      endpoint: ENDPOINT,
      apiKey: "from-api-key",
      headers: { Authorization: "Bearer from-headers" },
      fetchFn,
    });
    await source.list({ projectName: "demo" });
    expect((lastCall(fetchFn).init.headers as Record<string, string>).Authorization).toBe("Bearer from-headers");
  });
});

describe("createEndpointSource — setStatus() & remove()", () => {
  it("PATCHes {id, projectName, status} as JSON with Content-Type", async () => {
    const fetchFn = jsonFetch(makeResponse({ id: "fb-1", status: "resolved" }));
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn });
    const record = await source.setStatus("fb-1", "demo", "resolved");

    const { url, init } = lastCall(fetchFn);
    expect(url).toBe(ENDPOINT);
    expect(init.method).toBe("PATCH");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({ id: "fb-1", projectName: "demo", status: "resolved" });
    expect(record.status).toBe("resolved");
    expect(record.createdAt).toBeInstanceOf(Date);
  });

  it("DELETEs {id, projectName} as JSON", async () => {
    const fetchFn = jsonFetch({});
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn });
    await source.remove("fb-9", "demo");

    const { url, init } = lastCall(fetchFn);
    expect(url).toBe(ENDPOINT);
    expect(init.method).toBe("DELETE");
    expect(JSON.parse(init.body as string)).toEqual({ id: "fb-9", projectName: "demo" });
  });
});

describe("createEndpointSource — error mapping", () => {
  it.each([
    [401, SitepingAuthError],
    [403, SitepingAuthError],
    [400, SitepingValidationError],
    [422, SitepingValidationError],
  ])("maps %i to the right typed error", async (status, ctor) => {
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn: errorFetch(status) });
    await expect(source.list({ projectName: "demo" })).rejects.toBeInstanceOf(ctor);
  });

  it("maps 5xx to SitepingError with code SERVER (not retryable)", async () => {
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn: errorFetch(500, "kaboom") });
    await expect(source.list({ projectName: "demo" })).rejects.toMatchObject({
      code: "SERVER",
      retryable: false,
    });
  });

  it("includes the status and body text in the error message", async () => {
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn: errorFetch(422, "invalid status value") });
    await expect(source.list({ projectName: "demo" })).rejects.toThrow(/422 invalid status value/);
  });

  it("falls back to a generic message when the error body cannot be read", async () => {
    const badResponse = {
      ok: false,
      status: 500,
      text: () => Promise.reject(new Error("stream already consumed")),
    } as unknown as Response;
    const fetchFn = vi.fn(async () => badResponse);
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn });
    await expect(source.list({ projectName: "demo" })).rejects.toThrow(/Unknown error/);
  });

  it("omits the body from the message when the error response is empty", async () => {
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn: errorFetch(500, "") });
    await expect(source.list({ projectName: "demo" })).rejects.toThrow(/: 500$/);
  });

  it("wraps a fetch rejection in SitepingNetworkError", async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn });
    await expect(source.list({ projectName: "demo" })).rejects.toBeInstanceOf(SitepingNetworkError);
  });

  it("passes an existing SitepingNetworkError through unchanged", async () => {
    const original = new SitepingNetworkError("already network");
    const fetchFn = vi.fn(async () => {
      throw original;
    });
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn });
    await expect(source.list({ projectName: "demo" })).rejects.toBe(original);
  });

  it("stringifies a non-Error rejection", async () => {
    const fetchFn = vi.fn(async () => {
      throw "plain string failure";
    });
    const source = createEndpointSource({ endpoint: ENDPOINT, fetchFn });
    await expect(source.list({ projectName: "demo" })).rejects.toThrow(/plain string failure/);
  });

  it("defaults to globalThis.fetch when no fetchFn is provided", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ feedbacks: [], total: 0 }), { status: 200 }));
    try {
      const source = createEndpointSource({ endpoint: ENDPOINT });
      await source.list({ projectName: "demo" });
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("createStoreSource", () => {
  function fakeStore() {
    return {
      getFeedbacks: vi.fn(async (_q: FeedbackQuery) => ({ feedbacks: [makeRecord()], total: 1 })),
      updateFeedback: vi.fn(async (id: string, data: FeedbackUpdateInput) => makeRecord({ id, ...data })),
      deleteFeedback: vi.fn(async (_id: string) => undefined),
      createFeedback: vi.fn(),
      findByClientId: vi.fn(),
      deleteAllFeedbacks: vi.fn(),
    } as unknown as SitepingStore & {
      getFeedbacks: ReturnType<typeof vi.fn>;
      updateFeedback: ReturnType<typeof vi.fn>;
      deleteFeedback: ReturnType<typeof vi.fn>;
    };
  }

  let store: ReturnType<typeof fakeStore>;
  beforeEach(() => {
    store = fakeStore();
  });

  it("list() delegates to store.getFeedbacks", async () => {
    const source = createStoreSource(store);
    const query: FeedbackQuery = { projectName: "demo", status: "open" };
    const page = await source.list(query);
    expect(store.getFeedbacks).toHaveBeenCalledWith(query);
    expect(page.total).toBe(1);
  });

  it.each<[FeedbackStatus, boolean]>([
    ["open", false],
    ["in_progress", false],
    ["resolved", true],
    ["wont_fix", true],
  ])("setStatus(%s) derives resolvedAt (closed=%s) at the edge", async (status, closed) => {
    const source = createStoreSource(store);
    await source.setStatus("fb-1", "demo", status);
    const [, data] = store.updateFeedback.mock.calls[0] as [string, FeedbackUpdateInput];
    expect(data.status).toBe(status);
    if (closed) {
      expect(data.resolvedAt).toBeInstanceOf(Date);
    } else {
      expect(data.resolvedAt).toBeNull();
    }
  });

  it("remove() delegates to store.deleteFeedback", async () => {
    const source = createStoreSource(store);
    await source.remove("fb-1", "demo");
    expect(store.deleteFeedback).toHaveBeenCalledWith("fb-1");
  });
});
