import { describe, expect, it, vi } from "vitest";
import { createJsonHttpClient, IssueTrackerRequestError, UnlabelledIssueError } from "../src/core/http-client.js";
import { isIssueTrackerRequestError, isUnlabelledIssueError } from "../src/index.js";
import { hangingFetch } from "./fake-trackers.js";

const client = (fetch: typeof globalThis.fetch) =>
  createJsonHttpClient({
    tracker: "Tracker",
    baseUrl: "https://api.test/",
    headers: { Authorization: "secret" },
    fetch,
  });

describe("createJsonHttpClient", () => {
  it("reports an unreachable tracker without a status, and without the token", async () => {
    const request = client(async () => {
      throw new TypeError("fetch failed");
    });

    const failure = await request({ method: "GET", path: "/issues" }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(IssueTrackerRequestError);
    expect(failure).toMatchObject({ status: null, message: "[siteping] Tracker API GET /issues failed" });
    expect((failure as Error).cause).toBeInstanceOf(TypeError);
  });

  it("rejects a client error answer with its status and body", async () => {
    const request = client(async () => Response.json({ message: "Not Found" }, { status: 404 }));

    const failure = await request({ method: "PATCH", path: "/issues/7", body: {} }).catch((error: unknown) => error);

    expect(isIssueTrackerRequestError(failure)).toBe(true);
    expect(failure).toMatchObject({
      method: "PATCH",
      path: "/issues/7",
      status: 404,
      cause: '{"message":"Not Found"}',
    });
  });

  it("reports a success answer whose body is not JSON, with its status", async () => {
    const request = client(async () => new Response("<html>Sign in</html>", { status: 200 }));

    const failure = await request({ method: "GET", path: "/issues" }).catch((error: unknown) => error);

    expect(isIssueTrackerRequestError(failure)).toBe(true);
    expect(failure).toMatchObject({
      status: 200,
      message: "[siteping] Tracker API GET /issues failed with status 200",
    });
  });

  it("reports a body the timeout cuts short", async () => {
    const request = createJsonHttpClient({
      tracker: "Tracker",
      baseUrl: "https://api.test",
      headers: {},
      timeoutMs: 20,
      // Headers arrive, then the body stalls until the request's signal aborts it.
      fetch: async (_input, init) =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{"number":'));
              init?.signal?.addEventListener("abort", () => controller.error(init.signal?.reason));
            },
          }),
          { status: 201 },
        ),
    });

    const failure = await request({ method: "POST", path: "/issues", body: {} }).catch((error: unknown) => error);

    expect(isIssueTrackerRequestError(failure)).toBe(true);
    expect(failure).toMatchObject({ method: "POST", path: "/issues", status: 201 });
    expect((failure as Error).cause).toMatchObject({ name: "TimeoutError" });
  });

  it("gives up on a tracker that never answers after timeoutMs", async () => {
    const request = createJsonHttpClient({
      tracker: "Tracker",
      baseUrl: "https://api.test",
      headers: {},
      fetch: hangingFetch,
      timeoutMs: 20,
    });

    const failure = await request({ method: "GET", path: "/issues" }).catch((error: unknown) => error);

    expect(failure).toMatchObject({ code: "ISSUE_TRACKER_REQUEST_FAILED", status: null });
    expect((failure as Error).cause).toMatchObject({ name: "TimeoutError" });
  }, 1_000);

  it("sends a body as JSON, and a request without one with no content type", async () => {
    const contentTypes: Array<string | null> = [];
    const request = client(async (input, init) => {
      contentTypes.push(new Request(input, init).headers.get("content-type"));
      return Response.json({});
    });

    await request({ method: "POST", path: "/issues", body: { title: "t" } });
    await request({ method: "GET", path: "/issues" });

    expect(contentTypes).toEqual(["application/json", null]);
  });

  it("resolves an empty 204 answer to undefined", async () => {
    const request = client(async () => new Response(null, { status: 204 }));

    await expect(request({ method: "PUT", path: "/issues/1", body: {} })).resolves.toBeUndefined();
  });

  it("recognises the errors of another bundled copy of the classes, which instanceof misses", async () => {
    // In CommonJS, ./github and ./gitlab each bundle their own copy of the error classes.
    vi.resetModules();
    const copy = await import("../src/core/http-client.js");
    const failed = new copy.IssueTrackerRequestError("GitHub", "GET", "/issues", 503);
    const unlabelled = new copy.UnlabelledIssueError("GitHub", "#1", "Grant write access.");

    expect(failed).not.toBeInstanceOf(IssueTrackerRequestError);
    expect(unlabelled).not.toBeInstanceOf(UnlabelledIssueError);
    expect(isIssueTrackerRequestError(failed)).toBe(true);
    expect(isUnlabelledIssueError(unlabelled)).toBe(true);
    expect(isIssueTrackerRequestError(unlabelled)).toBe(false);
    expect(isUnlabelledIssueError(failed)).toBe(false);
    expect(isUnlabelledIssueError(new Error("fetch failed"))).toBe(false);
  });
});
