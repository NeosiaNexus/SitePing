/**
 * Placement math for the annotation comment popup — pure so it can be unit
 * tested without layout; `Popup.show()` feeds it measured sizes.
 */

/** Gap between the drawn rectangle and the popup, in px. */
const POPUP_ANCHOR_GAP_PX = 8;
/** Minimum distance kept between the popup and the usable viewport edges, in px. */
const POPUP_VIEWPORT_MARGIN_PX = 8;
/**
 * Size used when the popup cannot be measured (a DOM without layout, such as
 * jsdom). The default-locale popup renders at 334 × 276–283 px in Chromium,
 * Firefox and WebKit when the host page does not reset `box-sizing`.
 */
export const POPUP_FALLBACK_SIZE = { width: 334, height: 280 } as const;

/**
 * Viewport bands the popup must not cover, e.g. the annotation toolbar. `top`
 * is the height reserved at the top edge, `bottom` the height at the bottom.
 */
export interface ViewportInsets {
  top: number;
  bottom: number;
}

export const NO_VIEWPORT_INSETS: ViewportInsets = { top: 0, bottom: 0 };

interface Size {
  width: number;
  height: number;
}

interface Rect {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Where the popup goes, and how tall it may be when the usable band is too short. */
export interface PopupPosition {
  top: number;
  left: number;
  /**
   * Height cap in px the popup must apply — making its content scrollable —
   * when its measured height exceeds the usable viewport band; `null` when it
   * fits.
   */
  maxHeight: number | null;
}

/**
 * Position the popup next to `anchor`: below it when it fits, above it
 * otherwise, and as a last resort clamped inside the usable viewport (the
 * viewport minus `insets`), keeping its bottom — where the actions live —
 * visible. A side is accepted only when the whole popup stays inside the
 * usable band, so an anchor lying inside a toolbar band never drags the popup
 * under that toolbar. When the popup is taller than the usable band it fills
 * the band and reports a `maxHeight`, so its content scrolls instead of the
 * actions being pushed past the bottom edge. Horizontally it aligns with the
 * anchor's left edge, flips to its right edge when it would overflow, and is
 * clamped inside the viewport margins.
 */
export function computePopupPosition(
  anchor: Rect,
  popup: Size,
  viewport: Size,
  insets: ViewportInsets = NO_VIEWPORT_INSETS,
): PopupPosition {
  const minTop = insets.top + POPUP_VIEWPORT_MARGIN_PX;
  const maxBottom = viewport.height - insets.bottom - POPUP_VIEWPORT_MARGIN_PX;
  const usableHeight = Math.max(0, maxBottom - minTop);

  const belowTop = anchor.bottom + POPUP_ANCHOR_GAP_PX;
  const aboveTop = anchor.top - POPUP_ANCHOR_GAP_PX - popup.height;
  const fitsInsideUsableBand = (candidateTop: number): boolean =>
    candidateTop >= minTop && candidateTop + popup.height <= maxBottom;

  let top: number;
  let maxHeight: number | null = null;
  if (fitsInsideUsableBand(belowTop)) {
    top = belowTop;
  } else if (fitsInsideUsableBand(aboveTop)) {
    top = aboveTop;
  } else if (popup.height <= usableHeight) {
    top = maxBottom - popup.height;
  } else {
    top = minTop;
    maxHeight = usableHeight;
  }

  let left = anchor.left;
  if (left + popup.width > viewport.width - POPUP_VIEWPORT_MARGIN_PX) {
    left = anchor.right - popup.width;
  }
  left = Math.max(POPUP_VIEWPORT_MARGIN_PX, Math.min(left, viewport.width - POPUP_VIEWPORT_MARGIN_PX - popup.width));

  return { top, left, maxHeight };
}
