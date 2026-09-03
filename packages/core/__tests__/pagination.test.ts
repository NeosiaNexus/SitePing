import { describe, expect, it } from "vitest";
import { clampPagination, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "../src/index.js";

describe("clampPagination", () => {
  it("defaults to the first page of 50", () => {
    expect(clampPagination({})).toEqual({ page: 1, limit: DEFAULT_PAGE_LIMIT, skip: 0 });
  });

  it("derives skip from page and limit", () => {
    expect(clampPagination({ page: 3, limit: 20 })).toEqual({ page: 3, limit: 20, skip: 40 });
  });

  it("caps limit at the documented maximum", () => {
    expect(clampPagination({ limit: 500 }).limit).toBe(MAX_PAGE_LIMIT);
  });

  it("clamps a page or limit below 1 up to 1", () => {
    expect(clampPagination({ page: 0, limit: 0 })).toEqual({ page: 1, limit: 1, skip: 0 });
    expect(clampPagination({ page: -3, limit: -10 })).toEqual({ page: 1, limit: 1, skip: 0 });
  });

  it("floors fractional values", () => {
    expect(clampPagination({ page: 2.9, limit: 10.5 })).toEqual({ page: 2, limit: 10, skip: 10 });
  });

  it("falls back to the defaults for non-finite values", () => {
    expect(clampPagination({ page: Number.NaN, limit: Number.POSITIVE_INFINITY })).toEqual({
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      skip: 0,
    });
  });
});
