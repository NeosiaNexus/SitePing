/**
 * Type-level locks for the error contract (vitest typecheck mode — never
 * executed): the closed code unions, and what each guard narrows to.
 */

import { describe, expectTypeOf, it } from "vitest";
import {
  isSitepingConfigError,
  isSitepingError,
  type SitepingClientError,
  type SitepingConfigErrorCode,
  SitepingError,
  type SitepingErrorCode,
} from "../src/errors.js";

declare const thrown: unknown;

describe("SitepingErrorCode", () => {
  it("is the closed set of codes the widget and the dashboard report", () => {
    expectTypeOf<SitepingErrorCode>().toEqualTypeOf<"NETWORK" | "VALIDATION" | "AUTH" | "SERVER" | "TIMEOUT">();
  });

  it("refuses a code outside it", () => {
    // @ts-expect-error — no free-form codes: a switch over `code` stays exhaustive
    new SitepingError("x", "CUSTOM", false);
  });
});

describe("isSitepingError", () => {
  it("narrows to the union discriminated by code", () => {
    if (isSitepingError(thrown)) {
      expectTypeOf(thrown).toEqualTypeOf<SitepingClientError>();
      expectTypeOf(thrown.code).toEqualTypeOf<SitepingErrorCode>();
      expectTypeOf(thrown.retryable).toEqualTypeOf<boolean>();
      if (thrown.code === "AUTH") expectTypeOf(thrown.status).toEqualTypeOf<401 | 403>();
      if (thrown.code === "VALIDATION") expectTypeOf(thrown.status).toEqualTypeOf<number | undefined>();
      // @ts-expect-error — only AUTH and VALIDATION errors carry a status
      if (thrown.code === "NETWORK") void thrown.status;
    }
  });
});

describe("isSitepingConfigError", () => {
  it("narrows to an error whose code is one of the configuration codes", () => {
    expectTypeOf<SitepingConfigErrorCode>().toEqualTypeOf<
      | "CONFIG_STORE_MISSING"
      | "CONFIG_MAX_BODY_BYTES_INVALID"
      | "CONFIG_OWNERSHIP_CHECK_MISSING"
      | "CONFIG_WEBHOOK_TIMEOUT_INVALID"
      | "CONFIG_API_KEY_REQUIRED"
    >();
    if (isSitepingConfigError(thrown)) {
      expectTypeOf(thrown.code).toEqualTypeOf<SitepingConfigErrorCode>();
      expectTypeOf(thrown).toExtend<Error>();
    }
  });
});
