import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Shared test utilities — extracted from duplicated helpers across test files
// ---------------------------------------------------------------------------

/**
 * Create a DOMRect-like object (jsdom's DOMRect is not constructible).
 * Duplicated in: anchor.test.ts, popup.test.ts
 */
export function makeDOMRect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON() {
      return { x, y, width, height };
    },
  };
}

/**
 * Create an open Shadow DOM root attached to a host in document.body.
 * Duplicated in: fab.test.ts, panel.test.ts
 */
export function createShadowRoot(): ShadowRoot {
  const host = document.createElement("div");
  document.body.appendChild(host);
  return host.attachShadow({ mode: "open" });
}

/**
 * Run `fn` with `window.innerWidth` stubbed to `width`, restoring the original
 * value afterwards — even when an assertion inside `fn` throws.
 */
export function withViewportWidth<T>(width: number, fn: () => T): T {
  const original = window.innerWidth;
  Object.defineProperty(window, "innerWidth", { value: width, writable: true, configurable: true });
  try {
    return fn();
  } finally {
    Object.defineProperty(window, "innerWidth", { value: original, writable: true, configurable: true });
  }
}

/**
 * Stub window.matchMedia — jsdom does not implement it.
 * Duplicated in: launcher.test.ts, popup.test.ts
 */
export function mockMatchMedia(matches = false): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
