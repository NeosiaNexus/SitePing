// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { classifyVisibility, visibilityFactor } from "../../src/dom/visibility";

// jsdom implements neither checkVisibility nor layout (every rect is zero,
// getClientRects is always empty) — see the research trap: naive visibility
// tests pass VACUOUSLY there. These tests therefore stub the platform APIs
// per element and assert each branch explicitly, including the layout-less
// "unknown" outcome jsdom itself must produce.

type Stubbable = Element & {
  checkVisibility?: (options?: object) => boolean;
  getClientRects: () => DOMRectList;
};

function makeDiv(): Stubbable {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return div as Stubbable;
}

function rectList(count: number): DOMRectList {
  const rects = Array.from({ length: count }, () => new DOMRect(0, 0, 10, 10));
  return rects as unknown as DOMRectList;
}

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

describe("classifyVisibility — checkVisibility path", () => {
  it("returns 'visible' when the strict call passes", () => {
    const el = makeDiv();
    el.checkVisibility = () => true;
    expect(classifyVisibility(el)).toBe("visible");
  });

  it("passes BOTH option-name generations to the strict call", () => {
    // Chrome 105-120 / Firefox 106-121 silently ignore the renamed options —
    // dropping the old names would lose opacity/visibility checking there.
    const el = makeDiv();
    let seen: object | undefined;
    el.checkVisibility = (options?: object) => {
      if (options) seen = options;
      return true;
    };
    classifyVisibility(el);
    expect(seen).toMatchObject({
      checkOpacity: true,
      opacityProperty: true,
      checkVisibilityCSS: true,
      visibilityProperty: true,
    });
  });

  it("returns 'soft-hidden' when only the strict call fails (visibility/opacity hiding)", () => {
    const el = makeDiv();
    // strict (with options) fails, base (no options) passes
    el.checkVisibility = (options?: object) => !options;
    expect(classifyVisibility(el)).toBe("soft-hidden");
  });

  it("returns 'hidden' when the base call fails too (display:none chain)", () => {
    const el = makeDiv();
    el.checkVisibility = () => false;
    expect(classifyVisibility(el)).toBe("hidden");
  });
});

describe("classifyVisibility — fallback path (no checkVisibility)", () => {
  it("returns 'visible' when the element has boxes and computed visibility is visible", () => {
    const el = makeDiv();
    el.getClientRects = () => rectList(1);
    expect(classifyVisibility(el)).toBe("visible");
  });

  it("returns 'soft-hidden' when boxes exist but computed visibility is hidden", () => {
    const el = makeDiv();
    el.style.visibility = "hidden";
    el.getClientRects = () => rectList(1);
    expect(classifyVisibility(el)).toBe("soft-hidden");
  });

  it("probes the first element child for display:contents wrappers", () => {
    const el = makeDiv();
    const child = document.createElement("span");
    el.appendChild(child);
    // wrapper has no boxes of its own, child renders
    el.getClientRects = () => rectList(0);
    (child as Stubbable).getClientRects = () => rectList(1);
    expect(classifyVisibility(el)).toBe("visible");
  });

  it("returns 'hidden' for a boxless element when the environment does layout", () => {
    const el = makeDiv();
    el.getClientRects = () => rectList(0);
    const doc = document.documentElement as Stubbable;
    const original = doc.getClientRects;
    doc.getClientRects = () => rectList(1); // simulate a layout-capable env
    try {
      expect(classifyVisibility(el)).toBe("hidden");
    } finally {
      doc.getClientRects = original;
    }
  });

  it("returns 'hidden' for a disconnected element", () => {
    const el = document.createElement("div");
    expect(classifyVisibility(el)).toBe("hidden");
  });

  it("returns 'unknown' in a layout-less environment (jsdom native)", () => {
    // No stubs at all: jsdom has no checkVisibility and zero rects everywhere.
    // Asserting "unknown" (NOT "visible"/"hidden") is what keeps visibility
    // neutral in unit-test environments and exotic embedders.
    const el = makeDiv();
    expect(classifyVisibility(el)).toBe("unknown");
  });
});

describe("visibilityFactor", () => {
  it("tiers instead of filtering — hidden is penalized, never zeroed", () => {
    expect(visibilityFactor("visible")).toBe(1);
    expect(visibilityFactor("unknown")).toBe(1);
    expect(visibilityFactor("soft-hidden")).toBeLessThan(1);
    expect(visibilityFactor("soft-hidden")).toBeGreaterThan(visibilityFactor("hidden"));
    expect(visibilityFactor("hidden")).toBeGreaterThan(0);
  });
});
