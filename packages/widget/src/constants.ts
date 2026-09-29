/** Maximum z-index value — ensures the widget renders above all page content. */
export const Z_INDEX_MAX = 2147483647;

/**
 * Default `minViewportWidth` — 0 renders the widget at every width. Phones
 * get the compact layout (bottom sheets, touch targets) instead of being
 * skipped; hosts that still want to hide it on small screens set a threshold.
 */
export const DEFAULT_MIN_VIEWPORT_WIDTH = 0;

/**
 * Viewports that get the compact phone layout: the panel, the feedback form
 * and the identity prompt become bottom sheets. A phone up to 640px wide, or
 * one held sideways — a short touch screen, where the on-screen keyboard
 * covers half the height. Read by `viewport.ts` and `styles/mobile.ts`.
 */
export const COMPACT_MEDIA = "(max-width: 640px), (max-height: 500px) and (pointer: coarse)";

/** Default number of feedbacks to fetch per page. */
export const PAGE_SIZE = 20;

/**
 * Size in CSS pixels of the point-rect created by the instant (right-click)
 * annotation flow. Large enough for `findAnchorElement` to resolve the target
 * but small enough to feel like a point click rather than an area selection.
 */
export const INSTANT_ANNOTATION_SIZE = 20;

/**
 * Duration in milliseconds of the annotation popup's open/close transition.
 * The popup is set to `display: none` only once the fade-out has finished.
 */
export const POPUP_HIDE_TRANSITION_MS = 250;
