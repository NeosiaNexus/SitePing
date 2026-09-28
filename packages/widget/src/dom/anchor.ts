import { finder } from "@medv/finder";
import { ANCHOR_ELEMENT_ID_MAX, ANCHOR_ELEMENT_TAG_MAX, type AnchorData, type RectData } from "@siteping/core";
import { generateFingerprint } from "./fingerprint.js";
import { adjacentText, neighborText } from "./text-context.js";
import { generateXPath } from "./xpath.js";

/** HTML attribute hosts use to mark stable semantic anchors. */
export const ANCHOR_KEY_ATTR = "data-feedback-anchor";

/**
 * Joins the per-tree selectors of an element inside open shadow roots,
 * outermost host first (`my-card >>> .title`). Puppeteer's deep-descendant
 * notation; finder never emits it, since it escapes spaces and `>` inside
 * attribute values.
 */
export const SHADOW_BOUNDARY = " >>> ";

const FINDER_OPTIONS = {
  // Filter out CSS-in-JS hashed class names
  className: (name: string) => !/^(css|sc|emotion|styled)-/.test(name) && !/^[a-z]{1,3}[A-Za-z0-9]{4,8}$/.test(name),
  // Prefer stable attributes
  attr: (name: string) => ["data-testid", "data-id", "role", "aria-label"].includes(name),
  // Exclude framework-generated dynamic IDs
  idName: (name: string) => !name.startsWith("radix-") && !/^:r[0-9]+:$/.test(name),
  seedMinLength: 3,
  optimizedMinLength: 2,
};

/** Like `element.closest()`, but pierces shadow boundaries upwards. */
function closestCrossShadow(element: Element, selector: string): Element | null {
  let current: Element | null = element;
  while (current) {
    const match = current.closest(selector);
    if (match) return match;
    const root = current.getRootNode();
    current = root instanceof ShadowRoot ? root.host : null;
  }
  return null;
}

/** Like `element.parentElement`, but pierces shadow boundaries upwards. */
function parentElementCrossShadow(element: Element): Element | null {
  if (element.parentElement) return element.parentElement;
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

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
 *
 * Selectors cannot see across a shadow boundary, so an element inside open
 * shadow roots gets one finder selector per tree, joined by SHADOW_BOUNDARY.
 */
export function generateAnchor(element: Element): AnchorData {
  const selectors: string[] = [];
  let current: Element | null = element;
  while (current) {
    const root = current.getRootNode();
    if (root instanceof ShadowRoot) {
      // finder types `root` as an Element but only queries it: a ShadowRoot
      // scopes the uniqueness checks to that tree.
      selectors.unshift(finder(current, { ...FINDER_OPTIONS, root: root as unknown as Element }));
      current = root.host;
    } else {
      selectors.unshift(finder(current, FINDER_OPTIONS));
      current = null;
    }
  }
  const cssSelector = selectors.join(SHADOW_BOUNDARY);

  const xpath = generateXPath(element);

  const rawText = element.textContent?.trim() ?? "";
  const textSnippet = rawText.slice(0, 120);

  const textPrefix = adjacentText(element, "before");
  const textSuffix = adjacentText(element, "after");
  const fingerprint = generateFingerprint(element);
  const neighbor = neighborText(element);

  const semanticAncestor = closestCrossShadow(element, `[${ANCHOR_KEY_ATTR}]`);
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
 *    default margin); the HTTP client clips the rect for the server schema.
 *
 * Both ancestor walks climb out of open shadow roots through their hosts.
 */
export function findAnchorElement(rect: DOMRect, root: Element = document.documentElement): Element {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  // Document hit-testing retargets to the outermost shadow host, so drill
  // through open roots to the element actually under the point. Only an
  // element of that root is accepted (slotted content hit-tests to the host
  // itself), so every step goes strictly deeper; closed roots stay opaque.
  // The typeof guard stays although lib.dom types it as always-present:
  // jsdom doesn't implement ShadowRoot.elementFromPoint.
  let elementAtCenter = document.elementFromPoint(centerX, centerY);
  let shadowRoot = elementAtCenter?.shadowRoot;
  while (shadowRoot && typeof shadowRoot.elementFromPoint === "function") {
    const inner = shadowRoot.elementFromPoint(centerX, centerY);
    if (!inner || inner.getRootNode() !== shadowRoot) break;
    elementAtCenter = inner;
    shadowRoot = inner.shadowRoot;
  }

  if (!elementAtCenter || elementAtCenter === root) return document.body;

  // Pass 1 — semantic anchor (host-controlled, most stable)
  let current: Element | null = elementAtCenter;
  while (current && current !== document.body) {
    if (current.hasAttribute(ANCHOR_KEY_ATTR) && containsRect(current, rect)) {
      return current;
    }
    current = parentElementCrossShadow(current);
  }

  // Pass 2 — original behavior: smallest ancestor that contains the rect
  current = elementAtCenter;
  while (current && current !== document.body) {
    if (containsRect(current, rect)) return current;
    current = parentElementCrossShadow(current);
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
