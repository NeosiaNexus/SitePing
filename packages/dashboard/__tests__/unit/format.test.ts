import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDeepLink,
  formatAbsolute,
  formatRelativeTime,
  pathFromUrl,
  resolveRecordUrl,
  shortId,
} from "../../src/format.js";
import { createT } from "../../src/i18n/index.js";

const t = createT("en");
const NOW = new Date("2026-07-20T12:00:00.000Z").getTime();

function ago(seconds: number): Date {
  return new Date(NOW - seconds * 1000);
}

describe("formatRelativeTime", () => {
  afterEach(() => vi.useRealTimers());

  it.each<[number, string]>([
    [0, "now"],
    [30, "now"],
    [59, "now"],
    [60, "1 min"],
    [125, "2 min"],
    [3599, "59 min"],
    [3600, "1 h"],
    [7200, "2 h"],
    [86_400, "1 d"],
    [3 * 86_400, "3 d"],
    [7 * 86_400, "1 w"],
    [30 * 86_400, "1 mo"],
    [200 * 86_400, "6 mo"],
    [365 * 86_400, "1 y"],
    [800 * 86_400, "2 y"],
  ])("renders %i seconds ago as %s", (seconds, expected) => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(formatRelativeTime(ago(seconds), t)).toBe(expected);
  });

  it("clamps future dates to now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(formatRelativeTime(new Date(NOW + 5000), t)).toBe("now");
  });
});

describe("formatAbsolute", () => {
  const date = new Date("2026-07-20T12:00:00.000Z");

  it("formats with a valid locale", () => {
    expect(formatAbsolute(date, "en")).toMatch(/2026/);
  });

  it("falls back to English on an invalid BCP-47 tag", () => {
    // A structurally invalid tag makes Intl.DateTimeFormat throw — the catch
    // path formats with "en" instead of crashing.
    const result = formatAbsolute(date, "e!");
    expect(result).toMatch(/2026/);
  });
});

describe("pathFromUrl", () => {
  it("returns pathname + hash of an absolute URL", () => {
    expect(pathFromUrl("https://demo.siteping.dev/a/b#section")).toBe("/a/b#section");
  });

  it("drops the query string but keeps the hash", () => {
    expect(pathFromUrl("https://demo.siteping.dev/a?ref=x#h")).toBe("/a#h");
  });

  it("resolves a relative path against the dummy base", () => {
    expect(pathFromUrl("/pricing#plans")).toBe("/pricing#plans");
  });

  it("passes an unparseable string through raw", () => {
    expect(pathFromUrl("http://[")).toBe("http://[");
  });
});

describe("resolveRecordUrl", () => {
  it("returns an absolute URL unchanged (normalized)", () => {
    expect(resolveRecordUrl("https://demo.siteping.dev/pricing")).toBe("https://demo.siteping.dev/pricing");
  });

  it("resolves a relative URL against the current base", () => {
    // No window in the node test env → base is http://localhost.
    expect(resolveRecordUrl("/pricing")).toBe("http://localhost/pricing");
  });

  it("returns null for an unparseable string", () => {
    expect(resolveRecordUrl("http://[")).toBeNull();
  });

  it("returns null for non-http(s) schemes (stored-XSS guard)", () => {
    expect(resolveRecordUrl("javascript:alert(1)")).toBeNull();
    expect(resolveRecordUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });
});

describe("buildDeepLink", () => {
  it("appends the deep-link param to an absolute URL", () => {
    const url = buildDeepLink({ id: "fb-123", url: "https://demo.siteping.dev/pricing" }, "siteping");
    expect(url).toBe("https://demo.siteping.dev/pricing?siteping=fb-123");
  });

  it("resolves a relative record URL against the current base", () => {
    const url = buildDeepLink({ id: "fb-1", url: "/pricing" }, "siteping");
    expect(url).toBe("http://localhost/pricing?siteping=fb-1");
  });

  it("honours a custom param name", () => {
    const url = buildDeepLink({ id: "fb-1", url: "https://x.dev/p" }, "fb");
    expect(url).toBe("https://x.dev/p?fb=fb-1");
  });

  it("returns null on parse failure", () => {
    expect(buildDeepLink({ id: "fb-1", url: "http://[" }, "siteping")).toBeNull();
  });

  it("returns null for non-http(s) schemes (stored-XSS guard)", () => {
    expect(buildDeepLink({ id: "fb-1", url: "javascript:alert(1)" }, "siteping")).toBeNull();
  });
});

describe("shortId", () => {
  it("returns the first 8 characters", () => {
    expect(shortId("abcdefghijklmnop")).toBe("abcdefgh");
  });

  it("returns short ids unchanged", () => {
    expect(shortId("abc")).toBe("abc");
  });
});
