import type { AnchorData, RectData } from "../types.js";

export interface ResolvedAnnotation {
  element: Element;
  rect: DOMRect;
  orphaned: boolean;
}

/**
 * Re-anchor an annotation to the DOM using a 4-level fallback strategy.
 *
 * Resolution order:
 * 1. getElementById (most stable if element has an id)
 * 2. querySelector with CSS selector (fast, usually works)
 * 3. XPath evaluation (survives class name changes)
 * 4. Fuzzy text search (last resort, survives structural changes)
 *
 * If all fail, returns null — the annotation is orphaned.
 */
export function resolveAnchor(anchor: AnchorData): Element | null {
  // Level 1: Element ID
  if (anchor.elementId) {
    const el = document.getElementById(anchor.elementId);
    if (el && el.tagName === anchor.elementTag) return el;
  }

  // Level 2: CSS Selector
  try {
    const el = document.querySelector(anchor.cssSelector);
    if (el && el.tagName === anchor.elementTag) return el;
  } catch {
    // Invalid selector — skip
  }

  // Level 3: XPath
  try {
    const result = document.evaluate(
      anchor.xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    );
    const el = result.singleNodeValue;
    if (el instanceof Element && el.tagName === anchor.elementTag) return el;
  } catch {
    // Invalid XPath — skip
  }

  // Level 4: Fuzzy text search
  if (anchor.textSnippet) {
    const candidates = document.querySelectorAll(
      anchor.elementTag.toLowerCase(),
    );
    for (const el of candidates) {
      const text = el.textContent?.trim() ?? "";
      if (text.includes(anchor.textSnippet)) return el;
    }
  }

  return null;
}

/**
 * Resolve an annotation's position on the page.
 * Converts stored percentage-based rect back to absolute coordinates
 * using the current bounding box of the resolved anchor element.
 */
export function resolveAnnotation(
  anchor: AnchorData,
  rect: RectData,
): ResolvedAnnotation | null {
  const element = resolveAnchor(anchor);

  if (!element) return null;

  const bounds = element.getBoundingClientRect();
  const absoluteRect = new DOMRect(
    bounds.x + rect.xPct * bounds.width,
    bounds.y + rect.yPct * bounds.height,
    rect.wPct * bounds.width,
    rect.hPct * bounds.height,
  );

  return { element, rect: absoluteRect, orphaned: false };
}
