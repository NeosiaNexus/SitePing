import { finder } from "@medv/finder";
import type { AnchorData, RectData } from "@siteping/core";
import { generateFingerprint } from "./fingerprint.js";
import { adjacentText, neighborText } from "./text-context.js";
import { generateXPath } from "./xpath.js";

/**
 * Generate a multi-selector anchor for a DOM element.
 *
 * Uses three complementary strategies (Hypothesis-inspired):
 * 1. CSS selector via @medv/finder (primary — fast, compact)
 * 2. XPath (fallback — survives class changes)
 * 3. Text snippet (fallback — survives structural changes)
 */
export function generateAnchor(element: Element): AnchorData {
  const cssSelector = finder(element, {
    // Filter out CSS-in-JS hashed class names
    className: (name: string) => !/^(css|sc|emotion|styled)-/.test(name) && !/^[a-z]{1,3}[A-Za-z0-9]{4,8}$/.test(name),
    // Prefer stable attributes
    attr: (name: string) => ["data-testid", "data-id", "role", "aria-label"].includes(name),
    // Exclude framework-generated dynamic IDs
    idName: (name: string) => !name.startsWith("radix-") && !/^:r[0-9]+:$/.test(name),
    seedMinLength: 3,
    optimizedMinLength: 2,
  });

  const xpath = generateXPath(element);

  const rawText = element.textContent?.trim() ?? "";
  const textSnippet = rawText.slice(0, 120);

  const textPrefix = adjacentText(element, "before");
  const textSuffix = adjacentText(element, "after");
  const fingerprint = generateFingerprint(element);
  const neighbor = neighborText(element);

  return {
    cssSelector,
    xpath,
    textSnippet,
    textPrefix,
    textSuffix,
    fingerprint,
    neighborText: neighbor,
    elementTag: element.tagName,
    elementId: element.id || undefined,
  };
}

/**
 * Find the smallest DOM element whose bounding box fully contains the drawn rectangle.
 *
 * Walks up from the element at the rect's center until an ancestor contains the
 * full rectangle. Falls back to `document.body` when no ancestor matches — without
 * this fallback, callers compute percentages against a too-small anchor and produce
 * out-of-range values (negative / > 1).
 */
export function findAnchorElement(rect: DOMRect, root: Element = document.documentElement): Element {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  const elementAtCenter = document.elementFromPoint(centerX, centerY);
  if (!elementAtCenter || elementAtCenter === root) return document.body;

  let current: Element | null = elementAtCenter;
  while (current && current !== document.body) {
    const bounds = current.getBoundingClientRect();
    if (
      bounds.left <= rect.x &&
      bounds.top <= rect.y &&
      bounds.right >= rect.x + rect.width &&
      bounds.bottom >= rect.y + rect.height
    ) {
      return current;
    }
    current = current.parentElement;
  }

  return document.body;
}

/**
 * Convert absolute rectangle coordinates to percentages
 * relative to an anchor element's bounding box.
 */
export function rectToPercentages(rect: DOMRect, anchorBounds: DOMRect): RectData {
  // Guard against zero-dimension anchors (collapsed/hidden elements)
  if (anchorBounds.width <= 0 || anchorBounds.height <= 0) {
    return { xPct: 0, yPct: 0, wPct: 1, hPct: 1 };
  }
  return {
    xPct: (rect.x - anchorBounds.x) / anchorBounds.width,
    yPct: (rect.y - anchorBounds.y) / anchorBounds.height,
    wPct: rect.width / anchorBounds.width,
    hPct: rect.height / anchorBounds.height,
  };
}
