import { describe, expect, it, vi } from "vitest";
import { createJsonHttpClient, IssueTrackerRequestError, UnlabelledIssueError } from "../src/core/http-client.js";
import { isIssueTrackerRequestError, isUnlabelledIssueError } from "../src/index.js";

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
