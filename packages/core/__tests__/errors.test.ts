import { describe, expect, it } from "vitest";
import {
  isSitepingConfigError,
  isSitepingError,
  SitepingAuthError,
  SitepingConfigError,
  SitepingError,
  SitepingNetworkError,
  SitepingValidationError,
} from "../src/errors.js";
import { StoreLimitError, StoreNotFoundError, StorePersistenceError } from "../src/types.js";
import { errorFromResponse, isCommentGone, isThreadFull } from "../src/wire.js";

describe("SitepingError (base)", () => {
  it("constructs with explicit code and retryable flag", () => {
    const err = new SitepingError("boom", "TIMEOUT", true);
    expect(err.message).toBe("boom");
    expect(err.code).toBe("TIMEOUT");
    expect(err.retryable).toBe(true);
    expect(err.name).toBe("SitepingError");
  });

  it("is an Error subclass — instanceof Error", () => {
    const err = new SitepingError("x", "SERVER", false);
    expect(err).toBeInstanceOf(Error);
  });

  it("retryable can be explicitly false", () => {
    const err = new SitepingError("nope", "SERVER", false);
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

describe("errorFromResponse", () => {
  it.each([500, 502, 503])("maps a %i, a server failure, to a retryable SERVER error", async (status) => {
    const err = await errorFromResponse(new Response("Down", { status }), "Failed");
    expect(err).toMatchObject({ code: "SERVER", retryable: true, message: `Failed: ${status} Down` });
  });

  it("maps a status that is neither a success nor an HTTP error to a SERVER error that is not retryable", async () => {
    const err = await errorFromResponse(new Response(null, { status: 302 }), "Failed");
    expect(err).toMatchObject({ code: "SERVER", retryable: false });
  });

  it.each([408, 429])(
    "maps a %i, a timeout or a rate limit rather than a verdict, to a retryable SERVER error",
    async (status) => {
      const err = await errorFromResponse(new Response("Slow down", { status }), "Failed");
      expect(err).not.toBeInstanceOf(SitepingValidationError);
      expect(err).toMatchObject({ code: "SERVER", retryable: true, message: `Failed: ${status} Slow down` });
    },
  );
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

  it("reads a store error's code, as another bundle's copy of core throws it", () => {
    expect(isThreadFull(Object.assign(new Error("full"), { code: "STORE_LIMIT" }))).toBe(true);
    expect(isCommentGone(Object.assign(new Error("gone"), { code: "STORE_NOT_FOUND" }))).toBe(true);
    expect(isCommentGone(Object.assign(new Error("full"), { code: "STORE_LIMIT" }))).toBe(false);
    expect(isThreadFull(Object.assign(new Error("gone"), { code: "STORE_NOT_FOUND" }))).toBe(false);
  });

  it("reads anything thrown, a primitive, null or undefined included", () => {
    for (const thrown of [null, undefined, 404, "409", Symbol("x")]) {
      expect(isThreadFull(thrown)).toBe(false);
      expect(isCommentGone(thrown)).toBe(false);
    }
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

describe("isSitepingError", () => {
  it("matches every SitepingError, whatever the subclass", async () => {
    for (const error of [
      new SitepingNetworkError("offline"),
      new SitepingValidationError("bad", 400),
      new SitepingAuthError("refused", 403),
      new SitepingError("slow", "TIMEOUT", true),
      await errorFromResponse(new Response("", { status: 503 }), "Failed"),
    ]) {
      expect(isSitepingError(error)).toBe(true);
    }
  });

  it("matches one another bundle's copy of the class threw, by its fields", () => {
    class SitepingAuthErrorFromAnotherBundle extends Error {
      readonly code = "AUTH";
      readonly retryable = false;
      readonly status = 401;
    }
    expect(isSitepingError(new SitepingAuthErrorFromAnotherBundle("dead token"))).toBe(true);
  });

  it("refuses what else reaches an onError: a store's error, a host's, an unknown code", () => {
    for (const error of [
      new StorePersistenceError(),
      new Error("panel action failed"),
      Object.assign(new Error("teapot"), { code: "TEAPOT", retryable: false }),
      Object.assign(new Error("half"), { code: "AUTH" }),
      Object.assign(new Error("half"), { code: "AUTH", retryable: "no" }),
      { code: 401, retryable: false },
      null,
      undefined,
      "AUTH",
    ]) {
      expect(isSitepingError(error)).toBe(false);
    }
  });
});

describe("SitepingConfigError", () => {
  it("carries its code and the message that explains the fix", () => {
    const err = new SitepingConfigError("CONFIG_STORE_MISSING", "[siteping] createSitepingHandler requires a `store`.");
    expect(err).toBeInstanceOf(Error);
    expect(err).toMatchObject({ code: "CONFIG_STORE_MISSING", name: "SitepingConfigError" });
    expect(err.message).toBe("[siteping] createSitepingHandler requires a `store`.");
  });

  it("is matched by its name and a CONFIG_ code, also from another bundle's copy", () => {
    expect(isSitepingConfigError(new SitepingConfigError("CONFIG_API_KEY_REQUIRED", "x"))).toBe(true);
    const fromAnotherBundle = Object.assign(new Error("x"), {
      name: "SitepingConfigError",
      code: "CONFIG_MAX_BODY_BYTES_INVALID",
    });
    expect(isSitepingConfigError(fromAnotherBundle)).toBe(true);
  });

  it("refuses an error of another name or code", () => {
    for (const error of [
      new Error("[siteping] createSitepingHandler requires a `store`."),
      Object.assign(new Error("x"), { name: "SitepingConfigError", code: "STORE_NOT_FOUND" }),
      Object.assign(new Error("x"), { name: "OtherError", code: "CONFIG_STORE_MISSING" }),
      new SitepingNetworkError("offline"),
      null,
    ]) {
      expect(isSitepingConfigError(error)).toBe(false);
    }
  });
});
