/**
 * Element visibility classification for anchor resolution.
 *
 * Responsive sites render the same component twice (`hidden md:block` mobile +
 * desktop twins); resolution must prefer the rendered copy. Visibility is a
 * scoring TIER, never a hard filter — when every duplicate is hidden (e.g.
 * mobile viewport), the best hidden candidate still resolves rather than
 * orphaning the annotation.
 */

export type VisibilityClass = "visible" | "soft-hidden" | "hidden" | "unknown";

/**
 * Both option-name generations must be passed together: the CSSOM spec ORs
 * the old (checkOpacity/checkVisibilityCSS) and renamed
 * (opacityProperty/visibilityProperty) flags, and Chrome 105–120 /
 * Firefox 106–121 silently ignore the new names.
 * `contentVisibilityAuto` stays OFF — `content-visibility: auto` content is
 * merely offscreen, a perfectly legitimate anchor target.
 */
const STRICT_VISIBILITY_OPTIONS: Record<string, boolean> = {
  checkOpacity: true,
  opacityProperty: true,
  checkVisibilityCSS: true,
  visibilityProperty: true,
};

/**
 * Classify how visible an element currently is.
 *
 * - `"visible"`     — rendered and painted.
 * - `"soft-hidden"` — geometry intact but not painted (visibility:hidden,
 *                     opacity:0). Anchor rects computed from it stay valid;
 *                     opacity:0 is common mid fade-in, so this is only a mild
 *                     penalty, never an exclusion.
 * - `"hidden"`      — no rendered geometry: display:none chain,
 *                     content-visibility:hidden (closed <details>), detached.
 * - `"unknown"`     — the environment performs no layout (jsdom: no
 *                     checkVisibility, every rect zero/empty). Treated as
 *                     visible by scorers so layout-less test environments and
 *                     exotic embedders keep pre-visibility behavior.
 *
 * Fallback chain notes (browsers without checkVisibility — Safari ≤ 17.3):
 * - `getClientRects().length` is the no-box test; `getBoundingClientRect()`
 *   zeros are ambiguous (real zero-sized visible elements exist).
 * - NEVER `offsetParent === null` — visible position:fixed elements (sticky
 *   headers, FABs: prime feedback targets) report null.
 * - `visibility` is an inherited computed value, so one read on the candidate
 *   is sufficient and correctly handles `visibility: visible` re-shows inside
 *   hidden ancestors; display:none needs no ancestor walk because the box
 *   tree already has no fragments for the whole subtree.
 * - content-visibility:hidden content keeps real geometry, so the fallback
 *   misclassifies it as visible — acceptable: every engine old enough to lack
 *   checkVisibility also predates content-visibility support.
 * - aria-hidden is deliberately ignored (visually rendered content).
 */
export function classifyVisibility(element: Element): VisibilityClass {
  if (!element.isConnected) return "hidden";

  // Runtime guard stays although lib.dom types it as always-present:
  // jsdom (the test environment) and Safari ≤ 17.3 don't implement it.
  if (typeof element.checkVisibility === "function") {
    if (element.checkVisibility(STRICT_VISIBILITY_OPTIONS)) return "visible";
    // Base call only rejects display:none chains and content-visibility:hidden;
    // passing it while failing the strict call means visibility/opacity hiding.
    return element.checkVisibility() ? "soft-hidden" : "hidden";
  }

  if (element.getClientRects().length > 0) {
    try {
      const visibility = getComputedStyle(element).visibility;
      return visibility === "visible" ? "visible" : "soft-hidden";
    } catch {
      return "visible";
    }
  }

  // display:contents generates no box of its own but renders its children.
  const child = element.firstElementChild;
  if (child && child.getClientRects().length > 0) return "visible";

  // No boxes anywhere — hidden, unless the environment does no layout at all
  // (then every element has zero rects and the signal is meaningless).
  if (element.ownerDocument.documentElement.getClientRects().length === 0) return "unknown";

  return "hidden";
}

/** Score multiplier for a visibility class — tiering, not filtering. */
export function visibilityFactor(cls: VisibilityClass): number {
  switch (cls) {
    case "hidden":
      return 0.3;
    case "soft-hidden":
      return 0.6;
    default:
      return 1;
  }
}
