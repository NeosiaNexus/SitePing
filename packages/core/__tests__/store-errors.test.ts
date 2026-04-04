import { describe, expect, it } from "vitest";
import type { AnnotationPayload } from "../src/types.js";
import {
  flattenAnnotation,
  isStoreDuplicate,
  isStoreNotFound,
  StoreDuplicateError,
  StoreNotFoundError,
} from "../src/types.js";

// ---------------------------------------------------------------------------
// StoreNotFoundError
// ---------------------------------------------------------------------------

describe("StoreNotFoundError", () => {
  it("has default message", () => {
    const err = new StoreNotFoundError();
    expect(err.message).toBe("Record not found");
  });

  it("accepts a custom message", () => {
    const err = new StoreNotFoundError("Feedback xyz not found");
    expect(err.message).toBe("Feedback xyz not found");
  });

  it("has code STORE_NOT_FOUND", () => {
    const err = new StoreNotFoundError();
    expect(err.code).toBe("STORE_NOT_FOUND");
  });

  it("has name StoreNotFoundError", () => {
    const err = new StoreNotFoundError();
    expect(err.name).toBe("StoreNotFoundError");
  });

  it("is an instance of Error", () => {
    const err = new StoreNotFoundError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(StoreNotFoundError);
  });

  it("has a stack trace", () => {
    const err = new StoreNotFoundError();
    expect(err.stack).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// StoreDuplicateError
// ---------------------------------------------------------------------------

describe("StoreDuplicateError", () => {
  it("has default message", () => {
    const err = new StoreDuplicateError();
    expect(err.message).toBe("Duplicate record");
  });

  it("accepts a custom message", () => {
    const err = new StoreDuplicateError("clientId already exists");
    expect(err.message).toBe("clientId already exists");
  });

  it("has code STORE_DUPLICATE", () => {
    const err = new StoreDuplicateError();
    expect(err.code).toBe("STORE_DUPLICATE");
  });

  it("has name StoreDuplicateError", () => {
    const err = new StoreDuplicateError();
    expect(err.name).toBe("StoreDuplicateError");
  });

  it("is an instance of Error", () => {
    const err = new StoreDuplicateError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(StoreDuplicateError);
  });
});

// ---------------------------------------------------------------------------
// isStoreNotFound
// ---------------------------------------------------------------------------

describe("isStoreNotFound", () => {
  it("returns true for StoreNotFoundError", () => {
    expect(isStoreNotFound(new StoreNotFoundError())).toBe(true);
  });

  it("returns true for Prisma P2025 (backwards compat)", () => {
    expect(isStoreNotFound({ code: "P2025" })).toBe(true);
  });

  it("returns true for Error with P2025 code", () => {
    expect(isStoreNotFound(Object.assign(new Error("Not found"), { code: "P2025" }))).toBe(true);
  });

  it("returns false for other Prisma codes", () => {
    expect(isStoreNotFound({ code: "P2002" })).toBe(false);
    expect(isStoreNotFound({ code: "P2021" })).toBe(false);
  });

  it("returns false for StoreDuplicateError", () => {
    expect(isStoreNotFound(new StoreDuplicateError())).toBe(false);
  });

  it("returns false for plain Error", () => {
    expect(isStoreNotFound(new Error("oops"))).toBe(false);
  });

  it("returns false for null/undefined/string/number", () => {
    expect(isStoreNotFound(null)).toBe(false);
    expect(isStoreNotFound(undefined)).toBe(false);
    expect(isStoreNotFound("P2025")).toBe(false);
    expect(isStoreNotFound(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isStoreDuplicate
// ---------------------------------------------------------------------------

describe("isStoreDuplicate", () => {
  it("returns true for StoreDuplicateError", () => {
    expect(isStoreDuplicate(new StoreDuplicateError())).toBe(true);
  });

  it("returns true for Prisma P2002 (backwards compat)", () => {
    expect(isStoreDuplicate({ code: "P2002" })).toBe(true);
  });

  it("returns true for Error with P2002 code", () => {
    expect(isStoreDuplicate(Object.assign(new Error("Dup"), { code: "P2002" }))).toBe(true);
  });

  it("returns false for other Prisma codes", () => {
    expect(isStoreDuplicate({ code: "P2025" })).toBe(false);
  });

  it("returns false for StoreNotFoundError", () => {
    expect(isStoreDuplicate(new StoreNotFoundError())).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isStoreDuplicate(null)).toBe(false);
    expect(isStoreDuplicate(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// flattenAnnotation
// ---------------------------------------------------------------------------

const sampleAnnotation: AnnotationPayload = {
  anchor: {
    cssSelector: "div.main > section",
    xpath: "/html/body/div[1]/section",
    textSnippet: "Hello world",
    elementTag: "SECTION",
    elementId: "hero",
    textPrefix: "Before text",
    textSuffix: "After text",
    fingerprint: "3:1:abc",
    neighborText: "Sibling text",
  },
  rect: { xPct: 0.1, yPct: 0.2, wPct: 0.5, hPct: 0.3 },
  scrollX: 0,
  scrollY: 100,
  viewportW: 1920,
  viewportH: 1080,
  devicePixelRatio: 2,
};

describe("flattenAnnotation", () => {
  it("flattens anchor fields into the output", () => {
    const result = flattenAnnotation(sampleAnnotation);
    expect(result.cssSelector).toBe("div.main > section");
    expect(result.xpath).toBe("/html/body/div[1]/section");
    expect(result.textSnippet).toBe("Hello world");
    expect(result.elementTag).toBe("SECTION");
    expect(result.elementId).toBe("hero");
    expect(result.textPrefix).toBe("Before text");
    expect(result.textSuffix).toBe("After text");
    expect(result.fingerprint).toBe("3:1:abc");
    expect(result.neighborText).toBe("Sibling text");
  });

  it("flattens rect fields into the output", () => {
    const result = flattenAnnotation(sampleAnnotation);
    expect(result.xPct).toBe(0.1);
    expect(result.yPct).toBe(0.2);
    expect(result.wPct).toBe(0.5);
    expect(result.hPct).toBe(0.3);
  });

  it("copies viewport and scroll fields", () => {
    const result = flattenAnnotation(sampleAnnotation);
    expect(result.scrollX).toBe(0);
    expect(result.scrollY).toBe(100);
    expect(result.viewportW).toBe(1920);
    expect(result.viewportH).toBe(1080);
    expect(result.devicePixelRatio).toBe(2);
  });

  it("preserves undefined elementId", () => {
    const ann: AnnotationPayload = {
      ...sampleAnnotation,
      anchor: { ...sampleAnnotation.anchor, elementId: undefined },
    };
    const result = flattenAnnotation(ann);
    expect(result.elementId).toBeUndefined();
  });

  it("returns an object with exactly the expected keys", () => {
    const result = flattenAnnotation(sampleAnnotation);
    const keys = Object.keys(result).sort();
    expect(keys).toEqual([
      "cssSelector",
      "devicePixelRatio",
      "elementId",
      "elementTag",
      "fingerprint",
      "hPct",
      "neighborText",
      "scrollX",
      "scrollY",
      "textPrefix",
      "textSnippet",
      "textSuffix",
      "viewportH",
      "viewportW",
      "wPct",
      "xPct",
      "xpath",
      "yPct",
    ]);
  });
});
