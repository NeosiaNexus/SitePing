import { finder } from "@medv/finder";
import type { AnchorData, RectData } from "@siteping/core";
import { generateFingerprint } from "./fingerprint.js";
import { adjacentText, neighborText } from "./text-context.js";
import { generateXPath } from "./xpath.js";

/** HTML attribute hosts use to mark stable semantic anchors. */
export const ANCHOR_KEY_ATTR = "data-feedback-anchor";

/**
 * Generate a multi-selector anchor for a DOM element.
 *
 * Resolution priority (used by `resolveAnchor`):
 * 1. Semantic anchor (`data-feedback-anchor` on closest ancestor) — hosts opt
 *    into stable, narrow anchors that survive viewport changes and refactors
 * 2. Element id
 * 3. CSS selector via @medv/finder
 * 4. XPath
 * 5. Smart scan (fingerprint + text + prefix/suffix + neighbor)
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

  // Semantic anchor: nearest ancestor with `data-feedback-anchor`, including
  // the element itself. Returns null when no semantic ancestor exists, in
  // which case re-anchoring falls back to the existing chain.
  const semanticAncestor = element.closest(`[${ANCHOR_KEY_ATTR}]`);
  const anchorKey = semanticAncestor?.getAttribute(ANCHOR_KEY_ATTR) ?? null;

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
    anchorKey,
  };
}

/** Whether `el`'s bounding box fully contains `rect`. */
function containsRect(el: Element, rect: DOMRect): boolean {
  const b = el.getBoundingClientRect();
  return (
    b.left <= rect.x && b.top <= rect.y && b.right >= rect.x + rect.width && b.bottom >= rect.y + rect.height
  );
}

/**
 * Find the best DOM element to use as the rect's anchor.
 *
 * Priority:
 * 1. Closest ancestor with `data-feedback-anchor` whose bounds contain the rect
 *    (semantic anchors are typically narrow section roots — anchoring against
 *    them keeps the percentage-based rect stable across viewport changes,
 *    instead of stretching to the width of `<main>`).
 * 2. Smallest ancestor that contains the rect (legacy behavior).
 * 3. `document.body` fallback — ensures percentages stay in [0, 1].
 */
export function findAnchorElement(rect: DOMRect, root: Element = document.documentElement): Element {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  const elementAtCenter = document.elementFromPoint(centerX, centerY);
  if (!elementAtCenter || elementAtCenter === root) return document.body;

  // Pass 1 — semantic anchor (host-controlled, most stable)
  let current: Element | null = elementAtCenter;
  while (current && current !== document.body) {
    if (current.hasAttribute(ANCHOR_KEY_ATTR) && containsRect(current, rect)) {
      return current;
    }
    current = current.parentElement;
  }

  // Pass 2 — original behavior: smallest ancestor that contains the rect
  current = elementAtCenter;
  while (current && current !== document.body) {
    if (containsRect(current, rect)) return current;
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
