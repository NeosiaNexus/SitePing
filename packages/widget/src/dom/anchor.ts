import { finder } from "@medv/finder";
import { ANCHOR_ELEMENT_ID_MAX, ANCHOR_ELEMENT_TAG_MAX, type AnchorData, type RectData } from "@siteping/core";
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
    elementTag: element.tagName.slice(0, ANCHOR_ELEMENT_TAG_MAX),
    // Over-long ids are dropped, not truncated: a truncated id matches nothing
    // (or the wrong element) — the resolver falls back to other strategies.
    elementId: element.id && element.id.length <= ANCHOR_ELEMENT_ID_MAX ? element.id : undefined,
    anchorKey,
  };
}

/** Whether `el`'s bounding box fully contains `rect`. */
function containsRect(el: Element, rect: DOMRect): boolean {
  const b = el.getBoundingClientRect();
  return b.left <= rect.x && b.top <= rect.y && b.right >= rect.x + rect.width && b.bottom >= rect.y + rect.height;
}

/**
 * Find the best DOM element to use as the rect's anchor.
 *
 * Priority:
 * 1. Closest ancestor with `data-feedback-anchor` whose bounds contain the rect —
 *    semantic anchors are typically narrow section roots, so anchoring against
 *    them keeps the percentage-based rect stable across viewport changes
 *    instead of stretching to the width of `<main>` or `<body>`.
 * 2. Smallest ancestor that contains the rect (legacy behavior).
 * 3. `document.body` fallback — it may not contain the rect (a short body, its
 *    default margin), which `rectToPercentages` clips to.
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

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/**
 * Convert absolute rectangle coordinates to percentages
 * relative to an anchor element's bounding box.
 *
 * The rect is intersected with the anchor bounds first: the server schema
 * rejects any field outside [0, 1], and the `document.body` fallback may not
 * contain a rect drawn in blank page space. A rect fully outside collapses
 * onto the nearest edge (zero width/height) rather than losing the feedback.
 */
export function rectToPercentages(rect: DOMRect, anchorBounds: DOMRect): RectData {
  // Guard against zero-dimension anchors (collapsed/hidden elements)
  if (anchorBounds.width <= 0 || anchorBounds.height <= 0) {
    return { xPct: 0, yPct: 0, wPct: 1, hPct: 1 };
  }
  const x0 = clamp01((rect.x - anchorBounds.x) / anchorBounds.width);
  const y0 = clamp01((rect.y - anchorBounds.y) / anchorBounds.height);
  const x1 = clamp01((rect.x + rect.width - anchorBounds.x) / anchorBounds.width);
  const y1 = clamp01((rect.y + rect.height - anchorBounds.y) / anchorBounds.height);
  return { xPct: x0, yPct: y0, wPct: x1 - x0, hPct: y1 - y0 };
}
