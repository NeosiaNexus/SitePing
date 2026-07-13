/** Maximum z-index value — ensures the widget renders above all page content. */
export const Z_INDEX_MAX = 2147483647;

/** Minimum viewport width (px) below which the widget is hidden (mobile). */
export const MOBILE_BREAKPOINT = 768;

/** Default number of feedbacks to fetch per page. */
export const PAGE_SIZE = 20;

/**
 * Size in CSS pixels of the point-rect created by the instant (right-click)
 * annotation flow. Large enough for `findAnchorElement` to resolve the target
 * but small enough to feel like a point click rather than an area selection.
 */
export const INSTANT_ANNOTATION_SIZE = 20;
