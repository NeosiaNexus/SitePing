import { vi } from "vitest";
import { COMPACT_MEDIA } from "../src/constants.js";

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
 * Spy on the targets' click listeners. The returned function lists those
 * added and not removed since — undo the spies with `vi.restoreAllMocks()`.
 */
export function trackClickListeners(...targets: EventTarget[]): () => unknown[] {
  const spies = targets.map((target) => ({
    add: vi.spyOn(target, "addEventListener"),
    remove: vi.spyOn(target, "removeEventListener"),
  }));
  return () =>
    spies.flatMap(({ add, remove }) =>
      add.mock.calls
        .filter(([type]) => type === "click")
        .map(([, listener]) => listener)
        .filter((listener) => !remove.mock.calls.some(([type, removed]) => type === "click" && removed === listener)),
    );
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

/** Media queries the phone layout reads (`viewport.ts`) — pass to `mockMediaQueries`. */
export const PHONE_MEDIA = [COMPACT_MEDIA, "(pointer: coarse)"];

/**
 * Stub window.matchMedia so exactly the listed queries match. Assigns rather
 * than redefines: suites install their own (writable, non-configurable) stub.
 */
export function mockMediaQueries(matching: readonly string[]): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matching.includes(query),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

/**
 * Install a fake `window.visualViewport` (jsdom has none). `keyboard(px)`
 * shrinks it from the bottom the way an on-screen keyboard does and fires
 * `resize`; `restore()` removes it again.
 */
export function mockVisualViewport() {
  const viewport = Object.assign(new EventTarget(), { height: window.innerHeight, offsetTop: 0 });
  Object.defineProperty(window, "visualViewport", { value: viewport, configurable: true, writable: true });
  return {
    viewport,
    keyboard(px: number, offsetTop = 0) {
      viewport.height = window.innerHeight - px - offsetTop;
      viewport.offsetTop = offsetTop;
      viewport.dispatchEvent(new Event("resize"));
    },
    restore() {
      Reflect.deleteProperty(window, "visualViewport");
    },
  };
}
