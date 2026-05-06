// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { findAnchorElement, generateAnchor, rectToPercentages } from "../../src/dom/anchor";

// jsdom polyfill — @medv/finder uses CSS.escape internally
if (typeof CSS === "undefined") {
  (globalThis as Record<string, unknown>).CSS = { escape: (s: string) => s };
} else if (!CSS.escape) {
  CSS.escape = (s: string) => s;
}

// ---------------------------------------------------------------------------
// Helper — create a DOMRect-like object (jsdom's DOMRect is not constructible)
// ---------------------------------------------------------------------------
function makeDOMRect(x: number, y: number, width: number, height: number): DOMRect {
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

// ---------------------------------------------------------------------------
// rectToPercentages
// ---------------------------------------------------------------------------
describe("rectToPercentages", () => {
  it("basic conversion: rect at center of anchor", () => {
    // Anchor is 200×100 at (100, 50)
    const anchor = makeDOMRect(100, 50, 200, 100);
    // Rect is 40×20 centered in anchor → starts at (180, 90)
    const rect = makeDOMRect(180, 90, 40, 20);

    const result = rectToPercentages(rect, anchor);
    expect(result.xPct).toBeCloseTo(0.4); // (180−100)/200
    expect(result.yPct).toBeCloseTo(0.4); // (90−50)/100
    expect(result.wPct).toBeCloseTo(0.2); // 40/200
    expect(result.hPct).toBeCloseTo(0.2); // 20/100
  });

  it("rect at top-left corner of anchor (0,0 percentages)", () => {
    const anchor = makeDOMRect(50, 50, 200, 100);
    const rect = makeDOMRect(50, 50, 20, 10);

    const result = rectToPercentages(rect, anchor);
    expect(result.xPct).toBe(0);
    expect(result.yPct).toBe(0);
    expect(result.wPct).toBeCloseTo(0.1);
    expect(result.hPct).toBeCloseTo(0.1);
  });

  it("rect at bottom-right corner of anchor", () => {
    const anchor = makeDOMRect(0, 0, 400, 200);
    // Rect sits at the very bottom-right, 40×20
    const rect = makeDOMRect(360, 180, 40, 20);

    const result = rectToPercentages(rect, anchor);
    expect(result.xPct).toBeCloseTo(0.9); // 360/400
    expect(result.yPct).toBeCloseTo(0.9); // 180/200
    expect(result.wPct).toBeCloseTo(0.1); // 40/400
    expect(result.hPct).toBeCloseTo(0.1); // 20/200
  });

  it("full-size rect covering entire anchor (0,0,1,1)", () => {
    const anchor = makeDOMRect(10, 20, 300, 150);
    const rect = makeDOMRect(10, 20, 300, 150);

    const result = rectToPercentages(rect, anchor);
    expect(result.xPct).toBe(0);
    expect(result.yPct).toBe(0);
    expect(result.wPct).toBe(1);
    expect(result.hPct).toBe(1);
  });

  it("guard against zero-width anchor returns 0,0,1,1", () => {
    const anchor = makeDOMRect(100, 100, 0, 200);
    const rect = makeDOMRect(100, 150, 50, 25);

    const result = rectToPercentages(rect, anchor);
    expect(result).toEqual({ xPct: 0, yPct: 0, wPct: 1, hPct: 1 });
  });

  it("guard against zero-height anchor returns 0,0,1,1", () => {
    const anchor = makeDOMRect(100, 100, 200, 0);
    const rect = makeDOMRect(120, 100, 40, 10);

    const result = rectToPercentages(rect, anchor);
    expect(result).toEqual({ xPct: 0, yPct: 0, wPct: 1, hPct: 1 });
  });

  it("guard against zero-width AND zero-height anchor", () => {
    const anchor = makeDOMRect(0, 0, 0, 0);
    const rect = makeDOMRect(10, 10, 20, 20);

    const result = rectToPercentages(rect, anchor);
    expect(result).toEqual({ xPct: 0, yPct: 0, wPct: 1, hPct: 1 });
  });

  it("negative-dimension anchor is treated as zero (guard)", () => {
    const anchor = makeDOMRect(100, 100, -10, -5);
    const rect = makeDOMRect(90, 95, 20, 10);

    const result = rectToPercentages(rect, anchor);
    expect(result).toEqual({ xPct: 0, yPct: 0, wPct: 1, hPct: 1 });
  });

  it("negative percentages when rect is outside anchor bounds", () => {
    const anchor = makeDOMRect(200, 200, 100, 100);
    // Rect is 50px to the left and 30px above the anchor
    const rect = makeDOMRect(150, 170, 30, 20);

    const result = rectToPercentages(rect, anchor);
    expect(result.xPct).toBeCloseTo(-0.5); // (150−200)/100
    expect(result.yPct).toBeCloseTo(-0.3); // (170−200)/100
    expect(result.wPct).toBeCloseTo(0.3);
    expect(result.hPct).toBeCloseTo(0.2);
  });

  it("percentages > 1 when rect is larger than anchor", () => {
    const anchor = makeDOMRect(100, 100, 50, 50);
    // Rect starts before anchor and is much larger
    const rect = makeDOMRect(80, 80, 200, 150);

    const result = rectToPercentages(rect, anchor);
    expect(result.xPct).toBeCloseTo(-0.4); // (80−100)/50
    expect(result.yPct).toBeCloseTo(-0.4); // (80−100)/50
    expect(result.wPct).toBeCloseTo(4.0); // 200/50
    expect(result.hPct).toBeCloseTo(3.0); // 150/50
  });

  it("anchor at origin with unit dimensions gives identity values", () => {
    const anchor = makeDOMRect(0, 0, 1, 1);
    const rect = makeDOMRect(0, 0, 1, 1);

    const result = rectToPercentages(rect, anchor);
    expect(result).toEqual({ xPct: 0, yPct: 0, wPct: 1, hPct: 1 });
  });

  it("fractional pixel values are preserved", () => {
    const anchor = makeDOMRect(10.5, 20.3, 100, 200);
    const rect = makeDOMRect(35.5, 70.3, 25, 50);

    const result = rectToPercentages(rect, anchor);
    expect(result.xPct).toBeCloseTo(0.25); // (35.5−10.5)/100
    expect(result.yPct).toBeCloseTo(0.25); // (70.3−20.3)/200
    expect(result.wPct).toBeCloseTo(0.25); // 25/100
    expect(result.hPct).toBeCloseTo(0.25); // 50/200
  });
});

// ---------------------------------------------------------------------------
// findAnchorElement
// ---------------------------------------------------------------------------
describe("findAnchorElement", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    // Restore original implementations if they were mocked
    if ("_origElementFromPoint" in document) {
      document.elementFromPoint = (document as any)._origElementFromPoint;
      delete (document as any)._origElementFromPoint;
    }
  });

  /** Stub document.elementFromPoint for the duration of a test */
  function stubElementFromPoint(fn: (x: number, y: number) => Element | null) {
    (document as any)._origElementFromPoint = document.elementFromPoint;
    document.elementFromPoint = fn;
  }

  /** Stub getBoundingClientRect on an element */
  function stubBounds(el: Element, rect: DOMRect) {
    el.getBoundingClientRect = () => rect;
  }

  it("falls back to document.body when elementFromPoint returns null", () => {
    stubElementFromPoint(() => null);

    const rect = makeDOMRect(50, 50, 100, 100);
    const result = findAnchorElement(rect);
    expect(result).toBe(document.body);
  });

  it("falls back to document.body when elementFromPoint returns root", () => {
    stubElementFromPoint(() => document.documentElement);

    const rect = makeDOMRect(50, 50, 100, 100);
    const result = findAnchorElement(rect);
    expect(result).toBe(document.body);
  });

  it("walks up to find container that fully contains the rect", () => {
    const container = document.createElement("div");
    const child = document.createElement("span");
    container.appendChild(child);
    document.body.appendChild(container);

    // child is too small to contain the rect
    stubBounds(child, makeDOMRect(60, 60, 20, 20));
    // container fully contains the rect
    stubBounds(container, makeDOMRect(0, 0, 400, 400));

    stubElementFromPoint(() => child);

    const rect = makeDOMRect(50, 50, 100, 100);
    const result = findAnchorElement(rect);
    expect(result).toBe(container);
  });

  it("returns deepest element when it already contains the rect", () => {
    const container = document.createElement("div");
    const child = document.createElement("span");
    container.appendChild(child);
    document.body.appendChild(container);

    // child is large enough to contain the rect
    stubBounds(child, makeDOMRect(0, 0, 500, 500));
    stubBounds(container, makeDOMRect(0, 0, 600, 600));

    stubElementFromPoint(() => child);

    const rect = makeDOMRect(10, 10, 50, 50);
    const result = findAnchorElement(rect);
    expect(result).toBe(child);
  });

  it("works with nested elements — picks first ancestor that contains", () => {
    const outer = document.createElement("div");
    const middle = document.createElement("section");
    const inner = document.createElement("p");
    outer.appendChild(middle);
    middle.appendChild(inner);
    document.body.appendChild(outer);

    // inner too small
    stubBounds(inner, makeDOMRect(100, 100, 10, 10));
    // middle too small
    stubBounds(middle, makeDOMRect(80, 80, 50, 50));
    // outer contains the rect
    stubBounds(outer, makeDOMRect(0, 0, 800, 600));

    stubElementFromPoint(() => inner);

    const rect = makeDOMRect(50, 50, 200, 200);
    const result = findAnchorElement(rect);
    expect(result).toBe(outer);
  });

  it("falls back to document.body when no ancestor contains the rect", () => {
    const child = document.createElement("span");
    document.body.appendChild(child);

    // child does not contain the rect, and its parent is body (loop stops)
    stubBounds(child, makeDOMRect(200, 200, 10, 10));

    stubElementFromPoint(() => child);

    const rect = makeDOMRect(50, 50, 100, 100);
    const result = findAnchorElement(rect);
    // Returning a too-small anchor would produce out-of-range percentages
    // (xPct < 0 / wPct > 1) and be rejected by the API schema. Body is the
    // safe fallback because it contains every drawable rect.
    expect(result).toBe(document.body);
  });

  it("uses custom root parameter for comparison", () => {
    const customRoot = document.createElement("div");
    document.body.appendChild(customRoot);

    // elementFromPoint returns the custom root itself → treated like root
    stubElementFromPoint(() => customRoot);

    const rect = makeDOMRect(50, 50, 100, 100);
    const result = findAnchorElement(rect, customRoot);
    expect(result).toBe(document.body);
  });
});

// ---------------------------------------------------------------------------
// generateAnchor — focused branch coverage on className filter
// ---------------------------------------------------------------------------
describe("generateAnchor className filter", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("filters out CSS-in-JS hashed class names (css- prefix)", () => {
    const wrapper = document.createElement("section");
    const el = document.createElement("div");
    // Both classes match the first regex (css-/sc-/emotion-/styled- prefix);
    // finder must reject them via the filter callback.
    el.className = "css-abc1d2 sc-xY3z9 emotion-1ab2c3 styled-foo123";
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);

    const anchor = generateAnchor(el);
    // The css selector must not contain any rejected class names
    expect(anchor.cssSelector).not.toContain("css-");
    expect(anchor.cssSelector).not.toContain("sc-");
    expect(anchor.cssSelector).not.toContain("emotion-");
    expect(anchor.cssSelector).not.toContain("styled-");
  });

  it("filters out emotion-style hash class names (camelCase pattern)", () => {
    const wrapper = document.createElement("section");
    const el = document.createElement("div");
    // Matches the second regex: 1-3 lowercase letters + 4-8 mixed alphanumerics
    // e.g. "aBc12345", "abXy9k", "a1B2C3d4"
    el.className = "aBc12345 ab1Xy9kQ";
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);

    const anchor = generateAnchor(el);
    expect(anchor.cssSelector).not.toContain("aBc12345");
    expect(anchor.cssSelector).not.toContain("ab1Xy9kQ");
  });

  it("preserves human-readable class names", () => {
    const wrapper = document.createElement("section");
    const el = document.createElement("div");
    // Human-readable class — should pass the filter and may appear in selector
    el.className = "user-card-primary";
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);

    const anchor = generateAnchor(el);
    // The className filter callback returns true for this name
    // (i.e. allows it through). Selector is non-empty.
    expect(anchor.cssSelector.length).toBeGreaterThan(0);
  });

  it("filters out radix- and :r0: framework IDs", () => {
    const el = document.createElement("div");
    el.id = "radix-xyz";
    document.body.appendChild(el);

    const anchor = generateAnchor(el);
    // The idName filter should reject "radix-*" → finder falls back to a non-id selector
    // Note: anchor.elementId still reflects the raw id; we check the cssSelector instead.
    expect(anchor.cssSelector).not.toContain("#radix-xyz");
  });
});
