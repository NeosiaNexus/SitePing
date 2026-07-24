// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeAccent, resolveInitialTheme, watchSystemTheme } from "../../src/theme.js";

// ---------------------------------------------------------------------------
// matchMedia stub — jsdom ships none by default
// ---------------------------------------------------------------------------

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql = {
    matches,
    media: "(prefers-color-scheme: dark)",
    addEventListener: vi.fn((_type: string, cb: (e: { matches: boolean }) => void) => listeners.add(cb)),
    removeEventListener: vi.fn((_type: string, cb: (e: { matches: boolean }) => void) => listeners.delete(cb)),
  };
  const matchMedia = vi.fn(() => mql);
  Object.defineProperty(window, "matchMedia", { value: matchMedia, writable: true, configurable: true });
  return {
    mql,
    listeners,
    fire(next: boolean) {
      mql.matches = next;
      for (const cb of listeners) cb({ matches: next });
    },
  };
}

afterEach(() => {
  // jsdom has no matchMedia by default — remove any stub between tests.
  Reflect.deleteProperty(window, "matchMedia");
  vi.restoreAllMocks();
});

describe("normalizeAccent", () => {
  it("passes a 6-digit hex through", () => {
    expect(normalizeAccent("#173cff")).toBe("#173cff");
  });

  it("expands a 3-digit shorthand", () => {
    expect(normalizeAccent("#0af")).toBe("#00aaff");
  });

  it("strips the alpha from an 8-digit hex", () => {
    expect(normalizeAccent("#0066ffcc")).toBe("#0066ff");
  });

  it.each(["red", "rgb(0,0,0)", "hsl(200 100% 50%)", "oklch(0.7 0.1 200)", "", "#12", "#12345", "0066ff"])(
    "warns and falls back to #0066ff for %s",
    (input) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(normalizeAccent(input)).toBe("#0066ff");
      expect(warn).toHaveBeenCalledOnce();
    },
  );
});

describe("resolveInitialTheme", () => {
  it("returns dark for an explicit dark request without touching matchMedia", () => {
    expect(resolveInitialTheme("dark")).toBe("dark");
  });

  it("returns light for an explicit light request", () => {
    expect(resolveInitialTheme("light")).toBe("light");
  });

  it("auto resolves to dark when the system prefers dark", () => {
    stubMatchMedia(true);
    expect(resolveInitialTheme("auto")).toBe("dark");
  });

  it("auto resolves to light when the system prefers light", () => {
    stubMatchMedia(false);
    expect(resolveInitialTheme("auto")).toBe("light");
  });

  it("auto resolves to light when matchMedia is unavailable", () => {
    expect(window.matchMedia).toBeUndefined();
    expect(resolveInitialTheme("auto")).toBe("light");
  });
});

describe("watchSystemTheme", () => {
  it("invokes the callback with the new theme on a change event", () => {
    const media = stubMatchMedia(false);
    const cb = vi.fn();
    watchSystemTheme(cb);
    media.fire(true);
    expect(cb).toHaveBeenCalledWith("dark");
    media.fire(false);
    expect(cb).toHaveBeenCalledWith("light");
  });

  it("stops firing after unsubscribe", () => {
    const media = stubMatchMedia(false);
    const cb = vi.fn();
    const unsubscribe = watchSystemTheme(cb);
    unsubscribe();
    expect(media.mql.removeEventListener).toHaveBeenCalledOnce();
    media.fire(true);
    expect(cb).not.toHaveBeenCalled();
  });

  it("is a no-op (returns a disposer) when matchMedia is unavailable", () => {
    const cb = vi.fn();
    const unsubscribe = watchSystemTheme(cb);
    expect(typeof unsubscribe).toBe("function");
    expect(() => unsubscribe()).not.toThrow();
    expect(cb).not.toHaveBeenCalled();
  });
});
