import { describe, expect, it } from "vitest";
import { createJsonHttpClient, IssueTrackerRequestError } from "../src/core/http-client.js";

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
});
