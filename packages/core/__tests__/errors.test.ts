import { describe, expect, it } from "vitest";
import { SitepingAuthError, SitepingError, SitepingNetworkError, SitepingValidationError } from "../src/errors.js";

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
});

describe("SitepingAuthError", () => {
  it("has code AUTH and is not retryable", () => {
    const err = new SitepingAuthError("401");
    expect(err.code).toBe("AUTH");
    expect(err.retryable).toBe(false);
    expect(err.name).toBe("SitepingAuthError");
  });

  it("is instanceof SitepingError", () => {
    const err = new SitepingAuthError("x");
    expect(err).toBeInstanceOf(SitepingError);
  });

  it("is distinguishable from SitepingValidationError despite both not retryable", () => {
    const auth = new SitepingAuthError("401");
    const validation = new SitepingValidationError("400");
    expect(auth).toBeInstanceOf(SitepingAuthError);
    expect(auth).not.toBeInstanceOf(SitepingValidationError);
    expect(validation).toBeInstanceOf(SitepingValidationError);
    expect(validation).not.toBeInstanceOf(SitepingAuthError);
  });
});
