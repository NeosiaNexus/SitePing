import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient, flushRetryQueue } from "../../src/api-client.js";

describe("ApiClient", () => {
  let client: ApiClient;
  const endpoint = "http://localhost/api/siteping";

  beforeEach(() => {
    client = new ApiClient(endpoint);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 200 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try {
      localStorage.clear();
    } catch {
      /* noop */
    }
  });

  // -----------------------------------------------------------------------
  // sendFeedback
  // -----------------------------------------------------------------------

  it("sends a POST with correct headers", async () => {
    const mockResponse = { id: "1", status: "open" };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 201 }));

    const payload = {
      projectName: "test",
      type: "bug" as const,
      message: "broken",
      url: "https://example.com",
      viewport: "1920x1080",
      userAgent: "test",
      authorName: "Alice",
      authorEmail: "alice@test.com",
      annotations: [],
      clientId: "uuid-1",
    };

    const result = await client.sendFeedback(payload);
    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("throws on 4xx errors without retrying", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Bad Request", { status: 400 }));

    await expect(
      client.sendFeedback({
        projectName: "test",
        type: "bug",
        message: "x",
        url: "https://x.com",
        viewport: "1x1",
        userAgent: "t",
        authorName: "A",
        authorEmail: "a@b.com",
        annotations: [],
        clientId: "u",
      }),
    ).rejects.toThrow("Failed to send feedback: 400");

    // Should NOT retry on 4xx
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 5xx errors with backoff", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "1" }), { status: 201 }));

    const result = await client.sendFeedback({
      projectName: "test",
      type: "bug",
      message: "x",
      url: "https://x.com",
      viewport: "1x1",
      userAgent: "t",
      authorName: "A",
      authorEmail: "a@b.com",
      annotations: [],
      clientId: "u",
    });

    expect(result).toEqual({ id: "1" });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("sends GET with query params", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ feedbacks: [], total: 0 })));

    await client.getFeedbacks("test-project", { type: "bug", limit: 10 });

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain("projectName=test-project");
    expect(calledUrl).toContain("type=bug");
    expect(calledUrl).toContain("limit=10");
  });

  it("sends PATCH for resolve", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ id: "1", status: "resolved" })));

    const result = await client.resolveFeedback("fb-1", true);
    expect(result.status).toBe("resolved");

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body).toEqual({ id: "fb-1", status: "resolved" });
  });

  // -----------------------------------------------------------------------
  // deleteFeedback
  // -----------------------------------------------------------------------

  describe("deleteFeedback", () => {
    it("sends DELETE with id and resolves on success", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ deleted: true })));

      await expect(client.deleteFeedback("fb-1")).resolves.toBeUndefined();

      expect(fetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({ id: "fb-1" }),
        }),
      );
    });

    it("throws on non-ok response", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("Not Found", { status: 404 }));

      await expect(client.deleteFeedback("fb-nonexistent")).rejects.toThrow("Failed to delete feedback: 404");
    });
  });

  // -----------------------------------------------------------------------
  // deleteAllFeedbacks
  // -----------------------------------------------------------------------

  describe("deleteAllFeedbacks", () => {
    it("sends DELETE with projectName and deleteAll flag", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ deleted: { count: 5 } })));

      await expect(client.deleteAllFeedbacks("my-project")).resolves.toBeUndefined();

      const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
      expect(body).toEqual({ projectName: "my-project", deleteAll: true });
    });

    it("throws on non-ok response", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("Bad Request", { status: 400 }));

      await expect(client.deleteAllFeedbacks("my-project")).rejects.toThrow("Failed to delete all feedbacks: 400");
    });
  });
});

// ---------------------------------------------------------------------------
// flushRetryQueue
// ---------------------------------------------------------------------------

describe("flushRetryQueue", () => {
  const endpoint = "http://localhost/api/siteping";

  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 201 }));
    // Mock localStorage with a real-ish store
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        for (const key of Object.keys(store)) delete store[key];
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing when queue is empty", async () => {
    await flushRetryQueue(endpoint);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does nothing when no raw data in localStorage", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    await flushRetryQueue(endpoint);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retries queued items and removes on success", async () => {
    const payload = {
      projectName: "test",
      type: "bug" as const,
      message: "retry me",
      url: "https://example.com",
      viewport: "1x1",
      userAgent: "t",
      authorName: "A",
      authorEmail: "a@b.com",
      annotations: [],
      clientId: "retry-1",
    };

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([{ endpoint, payload }]));
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 201 }));

    await flushRetryQueue(endpoint);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(localStorage.removeItem).toHaveBeenCalledWith("siteping_retry_queue");
  });

  it("keeps failed items in queue after partial failure", async () => {
    const payload1 = {
      projectName: "test",
      type: "bug" as const,
      message: "item1",
      url: "https://example.com",
      viewport: "1x1",
      userAgent: "t",
      authorName: "A",
      authorEmail: "a@b.com",
      annotations: [],
      clientId: "r1",
    };
    const payload2 = { ...payload1, message: "item2", clientId: "r2" };

    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify([
        { endpoint, payload: payload1 },
        { endpoint, payload: payload2 },
      ]),
    );

    // First succeeds, second fails
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("", { status: 201 }))
      .mockResolvedValueOnce(new Response("", { status: 500 }));

    await flushRetryQueue(endpoint);

    expect(fetch).toHaveBeenCalledTimes(2);
    // Should have saved the failed item back
    expect(localStorage.setItem).toHaveBeenCalledWith("siteping_retry_queue", expect.stringContaining("item2"));
  });

  it("preserves entries for other endpoints", async () => {
    const otherEndpoint = "http://other.com/api";
    const payload = {
      projectName: "test",
      type: "bug" as const,
      message: "other",
      url: "https://example.com",
      viewport: "1x1",
      userAgent: "t",
      authorName: "A",
      authorEmail: "a@b.com",
      annotations: [],
      clientId: "o1",
    };

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([{ endpoint: otherEndpoint, payload }]));

    await flushRetryQueue(endpoint);

    // Should not have called fetch (no items match this endpoint)
    expect(fetch).not.toHaveBeenCalled();
  });

  it("handles corrupted localStorage gracefully", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue("not valid json{{{");

    // Should not throw
    await expect(flushRetryQueue(endpoint)).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("handles fetch throwing (network error) for queued items", async () => {
    const payload = {
      projectName: "test",
      type: "bug" as const,
      message: "fail",
      url: "https://example.com",
      viewport: "1x1",
      userAgent: "t",
      authorName: "A",
      authorEmail: "a@b.com",
      annotations: [],
      clientId: "f1",
    };

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([{ endpoint, payload }]));
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    await flushRetryQueue(endpoint);

    // Failed item should be kept in queue
    expect(localStorage.setItem).toHaveBeenCalledWith("siteping_retry_queue", expect.stringContaining("fail"));
  });
});

// ---------------------------------------------------------------------------
// queueForRetry (tested indirectly via sendFeedback failure path)
// ---------------------------------------------------------------------------

describe("queueForRetry (via sendFeedback)", () => {
  const endpoint = "http://localhost/api/siteping";

  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 200 }));
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        for (const key of Object.keys(store)) delete store[key];
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("queues payload to localStorage when sendFeedback fails", async () => {
    // Use 4xx to avoid retry backoff (resilientFetch doesn't retry 4xx)
    vi.mocked(fetch).mockResolvedValue(new Response("Bad Request", { status: 400 }));

    const client = new ApiClient(endpoint);
    const payload = {
      projectName: "test",
      type: "bug" as const,
      message: "queued",
      url: "https://example.com",
      viewport: "1x1",
      userAgent: "t",
      authorName: "A",
      authorEmail: "a@b.com",
      annotations: [],
      clientId: "q1",
    };

    await expect(client.sendFeedback(payload)).rejects.toThrow();

    expect(localStorage.setItem).toHaveBeenCalledWith("siteping_retry_queue", expect.stringContaining("queued"));
  });

  it("appends to existing queue without overwriting", async () => {
    const existing = [
      {
        endpoint,
        payload: {
          projectName: "test",
          type: "bug",
          message: "existing",
          url: "https://example.com",
          viewport: "1x1",
          userAgent: "t",
          authorName: "A",
          authorEmail: "a@b.com",
          annotations: [],
          clientId: "e1",
        },
      },
    ];
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(existing));
    // Use 4xx to avoid retry backoff
    vi.mocked(fetch).mockResolvedValue(new Response("Bad Request", { status: 400 }));

    const client = new ApiClient(endpoint);
    await expect(
      client.sendFeedback({
        projectName: "test",
        type: "bug",
        message: "new",
        url: "https://example.com",
        viewport: "1x1",
        userAgent: "t",
        authorName: "A",
        authorEmail: "a@b.com",
        annotations: [],
        clientId: "n1",
      }),
    ).rejects.toThrow();

    const savedValue = vi.mocked(localStorage.setItem).mock.calls[0][1];
    const parsed = JSON.parse(savedValue);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].payload.message).toBe("existing");
    expect(parsed[1].payload.message).toBe("new");
  });
});
