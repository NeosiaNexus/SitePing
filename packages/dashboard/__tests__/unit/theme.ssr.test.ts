import { describe, expect, it, vi } from "vitest";
import { resolveInitialTheme, watchSystemTheme } from "../../src/theme.js";

// This file runs in the default node environment (no `@vitest-environment
// jsdom`), so `window` is undefined — it exercises the SSR guards that the
// jsdom-based theme.test.ts cannot reach.

describe("theme — SSR (no window)", () => {
  it("window is undefined in this environment", () => {
    expect(typeof window).toBe("undefined");
  });

  it("resolveInitialTheme('auto') resolves to light without a window", () => {
    expect(resolveInitialTheme("auto")).toBe("light");
  });

  it("resolveInitialTheme still honours explicit themes", () => {
    expect(resolveInitialTheme("dark")).toBe("dark");
    expect(resolveInitialTheme("light")).toBe("light");
  });

  it("watchSystemTheme returns a no-op disposer and never fires", () => {
    const cb = vi.fn();
    const unsubscribe = watchSystemTheme(cb);
    expect(typeof unsubscribe).toBe("function");
    expect(() => unsubscribe()).not.toThrow();
    expect(cb).not.toHaveBeenCalled();
  });
});
