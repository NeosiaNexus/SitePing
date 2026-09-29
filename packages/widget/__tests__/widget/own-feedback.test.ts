import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ownFeedback } from "../../src/own-feedback.js";

describe("ownFeedback", () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("remembers ids across instances, as a new page load would", () => {
    ownFeedback("site", "/api/siteping").add("fb-1");
    ownFeedback("site", "/api/siteping").add("fb-2");

    expect([...ownFeedback("site", "/api/siteping").ids()]).toEqual(["fb-1", "fb-2"]);
  });

  it("keeps one list per project and endpoint, store mode included", () => {
    ownFeedback("site", "/api/siteping").add("http-site");
    ownFeedback("other", "/api/siteping").add("http-other");
    ownFeedback("site", "/api/v2").add("v2-site");
    ownFeedback("site").add("store-site");

    expect([...ownFeedback("site", "/api/siteping").ids()]).toEqual(["http-site"]);
    expect([...ownFeedback("other", "/api/siteping").ids()]).toEqual(["http-other"]);
    expect([...ownFeedback("site", "/api/v2").ids()]).toEqual(["v2-site"]);
    expect([...ownFeedback("site").ids()]).toEqual(["store-site"]);
  });

  it("keeps the newest 500 ids, a re-sent one counting as new", () => {
    const own = ownFeedback("site");
    for (let i = 0; i < 500; i++) own.add(`fb-${i}`);
    own.add("fb-0"); // Re-sent: now the newest
    own.add("fb-500");

    const ids = [...own.ids()];
    expect(ids).toHaveLength(500);
    expect(ids).not.toContain("fb-1");
    expect(ids.slice(-2)).toEqual(["fb-0", "fb-500"]);
  });

  it("forgets one id, and the whole list when cleared", () => {
    const own = ownFeedback("site");
    own.add("fb-1");
    own.add("fb-2");

    own.remove("fb-1");
    expect([...own.ids()]).toEqual(["fb-2"]);

    own.clear();
    expect(own.ids().size).toBe(0);
    expect(store).toEqual({});
  });

  it("reads anything but an array of strings as an empty list, keeping the strings of an array", () => {
    const own = ownFeedback("site");
    own.add("probe");
    const key = Object.keys(store)[0] as string;
    for (const value of ["not json", '{"id":"fb-1"}', "null"]) {
      store[key] = value;
      expect(own.ids().size).toBe(0);
    }

    store[key] = JSON.stringify(["fb-1", 42, null, "fb-2"]);
    expect([...own.ids()]).toEqual(["fb-1", "fb-2"]);
  });

  it("degrades to an empty list, without throwing, when localStorage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
      removeItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
    });
    const own = ownFeedback("site");

    expect(() => {
      own.add("fb-1");
      own.remove("fb-1");
      own.clear();
    }).not.toThrow();
    expect(own.ids().size).toBe(0);
  });
});
