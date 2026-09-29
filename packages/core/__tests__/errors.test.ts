import { describe, expect, it } from "vitest";
import { SitepingAuthError, SitepingError, SitepingNetworkError, SitepingValidationError } from "../src/errors.js";
import { StoreLimitError, StoreNotFoundError } from "../src/types.js";
import { errorFromResponse, isCommentGone, isThreadFull } from "../src/wire.js";

describe("SitepingError (base)", () => {
  it("constructs with explicit code and retryable flag", () => {
    const err = new SitepingError("boom", "CUSTOM", true);
    expect(err.message).toBe("boom");
    expect(err.code).toBe("CUSTOM");
    expect(err.retryable).toBe(true);
    expect(err.name).toBe("SitepingError");
  });

  it("is an Error subclass — instanceof Error", () => {
    const err = new SitepingError("x", "X", false);
    expect(err).toBeInstanceOf(Error);
  });

  it("retryable can be explicitly false", () => {
    const err = new SitepingError("nope", "NOPE", false);
    expect(err.retryable).toBe(false);
  });
});

describe("SitepingNetworkError", () => {
  it("has code NETWORK and is retryable", () => {
    const err = new SitepingNetworkError("connection refused");
    expect(err.code).toBe("NETWORK");
    expect(err.retryable).toBe(true);
    expect(err.name).toBe("SitepingNetworkError");
  });

  it("is instanceof SitepingError", () => {
    const err = new SitepingNetworkError("x");
    expect(err).toBeInstanceOf(SitepingError);
  });

  it("preserves the message", () => {
    const err = new SitepingNetworkError("timed out after 10s");
    expect(err.message).toBe("timed out after 10s");
  });
});

describe("SitepingValidationError", () => {
  it("has code VALIDATION and is not retryable", () => {
    const err = new SitepingValidationError("bad shape");
    expect(err.code).toBe("VALIDATION");
    expect(err.retryable).toBe(false);
    expect(err.name).toBe("SitepingValidationError");
  });

  it("is instanceof SitepingError", () => {
    const err = new SitepingValidationError("x");
    expect(err).toBeInstanceOf(SitepingError);
  });

  it("carries the HTTP status a response gave it", async () => {
    const err = await errorFromResponse(new Response("{}", { status: 409 }), "Failed");
    expect(err).toBeInstanceOf(SitepingValidationError);
    expect((err as SitepingValidationError).status).toBe(409);
    expect(new SitepingValidationError("x").status).toBeUndefined();
  });
});

describe("thread failures", () => {
  it("tells a full thread from another failure, whether a store or an endpoint refused", async () => {
    expect(isThreadFull(new StoreLimitError())).toBe(true);
    expect(isThreadFull(await errorFromResponse(new Response("", { status: 409 }), "Failed"))).toBe(true);
    expect(isThreadFull(await errorFromResponse(new Response("", { status: 400 }), "Failed"))).toBe(false);
    expect(isThreadFull(new Error("offline"))).toBe(false);
  });

  it("tells a reply already gone from another failure, whether a store or an endpoint answered", async () => {
    expect(isCommentGone(new StoreNotFoundError())).toBe(true);
    expect(isCommentGone(await errorFromResponse(new Response("", { status: 404 }), "Failed"))).toBe(true);
    expect(isCommentGone(await errorFromResponse(new Response("", { status: 403 }), "Failed"))).toBe(false);
    expect(isCommentGone(new Error("offline"))).toBe(false);
  });

  it("reads the status of a custom source's own errors", () => {
    expect(isCommentGone(Object.assign(new Error("gone"), { status: 404 }))).toBe(true);
    expect(isThreadFull(Object.assign(new Error("full"), { status: 409 }))).toBe(true);
    expect(isThreadFull(Object.assign(new Error("teapot"), { status: 418 }))).toBe(false);
  });
});

describe("SitepingAuthError", () => {
  it("has code AUTH and is not retryable", () => {
    const err = new SitepingAuthError("401", 401);
    expect(err.code).toBe("AUTH");
    expect(err.retryable).toBe(false);
    expect(err.name).toBe("SitepingAuthError");
  });

  it("is instanceof SitepingError", () => {
    const err = new SitepingAuthError("x", 403);
    expect(err).toBeInstanceOf(SitepingError);
  });

  it("is distinguishable from SitepingValidationError despite both not retryable", () => {
    const auth = new SitepingAuthError("401", 401);
    const validation = new SitepingValidationError("400");
    expect(auth).toBeInstanceOf(SitepingAuthError);
    expect(auth).not.toBeInstanceOf(SitepingValidationError);
    expect(validation).toBeInstanceOf(SitepingValidationError);
    expect(validation).not.toBeInstanceOf(SitepingAuthError);
  });
});
