import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDeepLink,
  formatAbsolute,
  formatRelativeTime,
  pathFromUrl,
  recordPageUrl,
  resolveRecordUrl,
  shortId,
  toDateTimeAttr,
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
});

describe("invalid dates (custom source, corrupt localStorage)", () => {
  const invalid = new Date("nope");

  it("formatRelativeTime renders a placeholder, not 'NaN y'", () => {
    expect(formatRelativeTime(invalid, t)).toBe("—");
  });

  it("formatAbsolute renders a placeholder instead of throwing", () => {
    expect(formatAbsolute(invalid, "en")).toBe("—");
  });

  it("toDateTimeAttr omits the attribute instead of throwing", () => {
    expect(toDateTimeAttr(invalid)).toBeUndefined();
    expect(toDateTimeAttr(new Date("2026-07-20T12:00:00.000Z"))).toBe("2026-07-20T12:00:00.000Z");
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

describe("recordPageUrl — siteUrl (#309)", () => {
  const record = (url: string, projectName = "client") => ({ id: "fb-1", url, projectName });

  it("resolves a relative URL against siteUrl, wherever the inbox runs", () => {
    const options = { siteUrl: "https://client.example.com" };
    expect(recordPageUrl(record("/pricing"), options)).toBe("https://client.example.com/pricing");
    expect(recordPageUrl(record("/pricing"), { ...options, deepLinkParam: "siteping" })).toBe(
      "https://client.example.com/pricing?siteping=fb-1",
    );
  });

  it("resolves each project against its own entry, and keeps the default for a project without one", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const siteUrl = { client: "https://client.example.com", shop: "https://shop.example.com/" };
    expect(recordPageUrl(record("/a", "client"), { siteUrl })).toBe("https://client.example.com/a");
    expect(recordPageUrl(record("/a", "shop"), { siteUrl })).toBe("https://shop.example.com/a");
    expect(recordPageUrl(record("/a", "other"), { siteUrl })).toBe("http://localhost/a");
    // An inherited key is not an entry — not an invalid one either.
    expect(recordPageUrl(record("/a", "constructor"), { siteUrl })).toBe("http://localhost/a");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("keeps an absolute record URL as stored", () => {
    const url = recordPageUrl(record("https://staging.example.com/p"), { siteUrl: "https://client.example.com" });
    expect(url).toBe("https://staging.example.com/p");
  });

  it("still refuses non-http(s) record URLs", () => {
    const options = { siteUrl: "https://client.example.com", deepLinkParam: "siteping" };
    expect(recordPageUrl(record("javascript:alert(1)"), options)).toBeNull();
    expect(recordPageUrl(record("data:text/html,x"), options)).toBeNull();
  });

  it("ignores an invalid siteUrl with one warning per value, and never links from it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const siteUrl of ["javascript:alert(1)", "javascript:alert(1)", "client.example.com"]) {
      expect(recordPageUrl(record("/p"), { siteUrl })).toBe("http://localhost/p");
    }
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0]?.[0]).toContain('Invalid siteUrl "javascript:alert(1)"');
    warn.mockRestore();
  });

  it("matches the inbox's own location without siteUrl", () => {
    expect(recordPageUrl(record("/pricing"))).toBe(resolveRecordUrl("/pricing"));
    expect(recordPageUrl(record("/pricing"), { deepLinkParam: "fb" })).toBe(
      buildDeepLink({ id: "fb-1", url: "/pricing" }, "fb"),
    );
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
