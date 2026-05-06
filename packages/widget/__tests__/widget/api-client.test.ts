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

  it("throws on getFeedbacks non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Server error", { status: 500 }));

    // Use 4xx path to skip retry delays
    vi.mocked(fetch).mockResolvedValue(new Response("Bad", { status: 422 }));

    await expect(client.getFeedbacks("test-project")).rejects.toThrow("Failed to fetch feedbacks: 422");
  });

  it("throws on resolveFeedback non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Bad", { status: 404 }));

    await expect(client.resolveFeedback("fb-x", true)).rejects.toThrow("Failed to update feedback: 404");
  });

  it("returns the last 5xx response after exhausting all retries (sendFeedback throws)", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(new Response("Server error", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const retryClient = new ApiClient(endpoint);
    const promise = retryClient
      .sendFeedback({
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
      })
      .catch((err: Error) => err);

    // 3 backoffs: 1s + 2s + 4s (+/- 500ms)
    await vi.advanceTimersByTimeAsync(1500);
    await vi.advanceTimersByTimeAsync(2500);
    await vi.advanceTimersByTimeAsync(4500);

    const error = (await promise) as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain("Failed to send feedback: 500");
    expect(fetchMock).toHaveBeenCalledTimes(4);

    vi.useRealTimers();
  });

  it("aborts the request when the underlying fetch exceeds TIMEOUT_MS", async () => {
    vi.useFakeTimers();

    let abortFromController: unknown = null;
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            abortFromController = (init.signal as AbortSignal).reason ?? new Error("aborted");
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const retryClient = new ApiClient(endpoint);
    const promise = retryClient
      .sendFeedback({
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
      })
      .catch((err: Error) => err);

    // Advance past TIMEOUT_MS (10s) for each retry, plus backoff (1s/2s/4s)
    await vi.advanceTimersByTimeAsync(11_000);
    await vi.advanceTimersByTimeAsync(1_500);
    await vi.advanceTimersByTimeAsync(11_000);
    await vi.advanceTimersByTimeAsync(2_500);
    await vi.advanceTimersByTimeAsync(11_000);
    await vi.advanceTimersByTimeAsync(4_500);
    await vi.advanceTimersByTimeAsync(11_000);

    const error = (await promise) as Error;
    expect(error).toBeInstanceOf(Error);
    expect(abortFromController).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(4);

    vi.useRealTimers();
  });

  it("falls back to 'Unknown error' when the response.text() reader throws", async () => {
    const failingResponse = new Response("", { status: 500 });
    Object.defineProperty(failingResponse, "ok", { value: false, configurable: true });
    Object.defineProperty(failingResponse, "status", { value: 422, configurable: true });
    failingResponse.text = vi.fn().mockRejectedValue(new Error("body unreadable"));

    vi.mocked(fetch).mockResolvedValue(failingResponse);

    const localClient = new ApiClient(endpoint);
    await expect(
      localClient.sendFeedback({
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
    ).rejects.toThrow(/Unknown error/);
  });

  it("rethrows network errors after exhausting retries", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const retryClient = new ApiClient(endpoint);
    const promise = retryClient
      .sendFeedback({
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
      })
      .catch((err: Error) => err);

    await vi.advanceTimersByTimeAsync(1500);
    await vi.advanceTimersByTimeAsync(2500);
    await vi.advanceTimersByTimeAsync(4500);

    const error = (await promise) as Error;
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toContain("network down");
    expect(fetchMock).toHaveBeenCalledTimes(4);

    vi.useRealTimers();
  });

  it("retries on 5xx errors with backoff", async () => {
    vi.useFakeTimers();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "1" }), { status: 201 }));

    vi.stubGlobal("fetch", fetchMock);

    const retryClient = new ApiClient(endpoint);
    const promise = retryClient.sendFeedback({
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

    // Advance past first retry delay (attempt 0: 1000ms base + up to 500ms jitter)
    await vi.advanceTimersByTimeAsync(1500);
    // Advance past second retry delay (attempt 1: 2000ms base + up to 500ms jitter)
    await vi.advanceTimersByTimeAsync(2500);

    const result = await promise;
    expect(result).toEqual({ id: "1" });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it("sends GET with query params", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ feedbacks: [], total: 0 })));

    await client.getFeedbacks("test-project", { type: "bug", limit: 10 });

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain("projectName=test-project");
    expect(calledUrl).toContain("type=bug");
    expect(calledUrl).toContain("limit=10");
  });

  it("sends GET with the full set of optional query params (page/status/search)", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ feedbacks: [], total: 0 })));

    await client.getFeedbacks("test-project", {
      page: 2,
      limit: 25,
      type: "bug",
      status: "resolved",
      search: "broken",
    });

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("limit=25");
    expect(calledUrl).toContain("type=bug");
    expect(calledUrl).toContain("status=resolved");
    expect(calledUrl).toContain("search=broken");
  });

  it("resolveFeedback sends status='open' when resolved=false", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ id: "fb-2", status: "open" })));

    await client.resolveFeedback("fb-2", false);

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.status).toBe("open");
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

  it("treats non-array stored value as empty queue (flushRetryQueue)", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ not: "an array" }));

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

  it("treats non-array stored value as empty queue (queueForRetry via sendFeedback)", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ not: "an array" }));
    vi.mocked(fetch).mockResolvedValue(new Response("Bad", { status: 400 }));

    const client = new ApiClient(endpoint);
    await expect(
      client.sendFeedback({
        projectName: "test",
        type: "bug",
        message: "from-corrupt-store",
        url: "https://example.com",
        viewport: "1x1",
        userAgent: "t",
        authorName: "A",
        authorEmail: "a@b.com",
        annotations: [],
        clientId: "c1",
      }),
    ).rejects.toThrow();

    const savedValue = vi.mocked(localStorage.setItem).mock.calls[0][1];
    const parsed = JSON.parse(savedValue);
    // Despite the corrupt non-array starting state, queue is rebuilt as a new array.
    expect(parsed).toHaveLength(1);
    expect(parsed[0].payload.message).toBe("from-corrupt-store");
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

  it("drops the oldest entry when the queue exceeds MAX_QUEUE_SIZE (20)", async () => {
    // Pre-fill queue with MAX_QUEUE_SIZE entries
    const existing = Array.from({ length: 20 }, (_, i) => ({
      endpoint,
      payload: {
        projectName: "test",
        type: "bug",
        message: `old-${i}`,
        url: "https://example.com",
        viewport: "1x1",
        userAgent: "t",
        authorName: "A",
        authorEmail: "a@b.com",
        annotations: [],
        clientId: `q-${i}`,
      },
    }));
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(existing));
    vi.mocked(fetch).mockResolvedValue(new Response("Bad Request", { status: 400 }));

    const client = new ApiClient(endpoint);
    await expect(
      client.sendFeedback({
        projectName: "test",
        type: "bug",
        message: "newest",
        url: "https://example.com",
        viewport: "1x1",
        userAgent: "t",
        authorName: "A",
        authorEmail: "a@b.com",
        annotations: [],
        clientId: "newest",
      }),
    ).rejects.toThrow();

    const savedValue = vi.mocked(localStorage.setItem).mock.calls[0][1];
    const parsed = JSON.parse(savedValue);
    // Oldest dropped, newest appended -> still 20 entries
    expect(parsed).toHaveLength(20);
    expect(parsed[0].payload.message).toBe("old-1");
    expect(parsed[19].payload.message).toBe("newest");
  });
});

// ---------------------------------------------------------------------------
// withRetryLock — exercise navigator.locks code path
// ---------------------------------------------------------------------------

describe("withRetryLock with navigator.locks present", () => {
  const endpoint = "http://localhost/api/siteping";
  let originalNavigator: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 201 }));

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

    // Stub a navigator with a `locks` API. Use defineProperty so we can restore.
    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    const fakeLocks = {
      request: vi.fn(<T>(_name: string, cb: () => T | Promise<T>) => Promise.resolve(cb())),
    };
    Object.defineProperty(globalThis, "navigator", {
      value: { locks: fakeLocks },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    } else {
      Reflect.deleteProperty(globalThis, "navigator");
    }
  });

  it("uses navigator.locks.request when available (flushRetryQueue)", async () => {
    const payload = {
      projectName: "test",
      type: "bug" as const,
      message: "with-locks",
      url: "https://example.com",
      viewport: "1x1",
      userAgent: "t",
      authorName: "A",
      authorEmail: "a@b.com",
      annotations: [],
      clientId: "lock-1",
    };
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([{ endpoint, payload }]));

    await flushRetryQueue(endpoint);

    expect(
      (navigator as unknown as { locks: { request: ReturnType<typeof vi.fn> } }).locks.request,
    ).toHaveBeenCalledWith("siteping_retry_queue", expect.any(Function));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("uses navigator.locks.request when available (queueForRetry via sendFeedback failure)", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Bad", { status: 400 }));

    const client = new ApiClient(endpoint);
    await expect(
      client.sendFeedback({
        projectName: "test",
        type: "bug",
        message: "lock-queued",
        url: "https://example.com",
        viewport: "1x1",
        userAgent: "t",
        authorName: "A",
        authorEmail: "a@b.com",
        annotations: [],
        clientId: "lock-2",
      }),
    ).rejects.toThrow();

    // Wait microtasks so queueForRetry's deferred callback runs
    await new Promise((r) => setTimeout(r, 0));

    expect(
      (navigator as unknown as { locks: { request: ReturnType<typeof vi.fn> } }).locks.request,
    ).toHaveBeenCalledWith("siteping_retry_queue", expect.any(Function));
  });
});
