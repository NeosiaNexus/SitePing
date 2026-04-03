import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../src/api-client.js";

describe("ApiClient", () => {
  let client: ApiClient;
  const endpoint = "http://localhost/api/siteping";

  beforeEach(() => {
    client = new ApiClient(endpoint);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try {
      localStorage.clear();
    } catch {
      /* noop */
    }
  });

  it("sends a POST with correct headers", async () => {
    const mockResponse = { id: "1", status: "open" };
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 201 }));

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
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("Bad Request", { status: 400 }));

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
    globalThis.fetch = vi
      .fn()
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
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ feedbacks: [], total: 0 })));

    await client.getFeedbacks("test-project", { type: "bug", limit: 10 });

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("projectName=test-project");
    expect(calledUrl).toContain("type=bug");
    expect(calledUrl).toContain("limit=10");
  });

  it("sends PATCH for resolve", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "1", status: "resolved" })));

    const result = await client.resolveFeedback("fb-1", true);
    expect(result.status).toBe("resolved");

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toEqual({ id: "fb-1", status: "resolved" });
  });
});
