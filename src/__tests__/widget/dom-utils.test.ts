import { afterEach, describe, expect, it, vi } from "vitest";
import { formatRelativeDate } from "../../widget/dom-utils.js";

describe("formatRelativeDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'maintenant' for just now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    expect(formatRelativeDate("2025-06-15T12:00:00Z")).toBe("maintenant");
  });

  it("returns minutes for < 60min", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const d = new Date(Date.now() - 15 * 60_000).toISOString();
    expect(formatRelativeDate(d)).toBe("il y a 15min");
  });

  it("returns hours for < 24h", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const d = new Date(Date.now() - 3 * 3600_000).toISOString();
    expect(formatRelativeDate(d)).toBe("il y a 3h");
  });

  it("returns days for < 7d", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const d = new Date(Date.now() - 2 * 86400_000).toISOString();
    expect(formatRelativeDate(d)).toBe("il y a 2j");
  });

  it("returns formatted date for > 7d", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    // 30 days before 2025-06-15 = 2025-05-16
    const d = new Date(Date.now() - 30 * 86400_000).toISOString();
    expect(formatRelativeDate(d)).toBe("16/05/2025");
  });
});
