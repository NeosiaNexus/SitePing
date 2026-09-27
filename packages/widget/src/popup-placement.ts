/**
 * Placement math for the annotation comment popup — pure so it can be unit
 * tested without layout; `Popup.show()` feeds it measured sizes.
 */

/** Gap between the drawn rectangle and the popup, in px. */
const POPUP_ANCHOR_GAP_PX = 8;
/** Minimum distance kept between the popup and the usable viewport edges, in px. */
const POPUP_VIEWPORT_MARGIN_PX = 8;
/**
 * Size used when the popup cannot be measured (not laid out yet, or a DOM
 * without layout such as jsdom). Matches the rendered default-locale popup.
 */
export const POPUP_FALLBACK_SIZE = { width: 300, height: 220 } as const;

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

/**
 * Position the popup next to `anchor`: below it when it fits, above it
 * otherwise, and as a last resort clamped inside the usable viewport (the
 * viewport minus `insets`), keeping its bottom — where the actions live —
 * visible. Horizontally it aligns with the anchor's left edge and flips to its
 * right edge when it would overflow.
 */
export function computePopupPosition(
  anchor: Rect,
  popup: Size,
  viewport: Size,
  insets: ViewportInsets = NO_VIEWPORT_INSETS,
): { top: number; left: number } {
  const minTop = insets.top + POPUP_VIEWPORT_MARGIN_PX;
  const maxBottom = viewport.height - insets.bottom - POPUP_VIEWPORT_MARGIN_PX;

  const belowTop = anchor.bottom + POPUP_ANCHOR_GAP_PX;
  const aboveTop = anchor.top - POPUP_ANCHOR_GAP_PX - popup.height;
  let top: number;
  if (belowTop + popup.height <= maxBottom) {
    top = belowTop;
  } else if (aboveTop >= minTop) {
    top = aboveTop;
  } else {
    top = Math.max(minTop, maxBottom - popup.height);
  }

  let left = anchor.left;
  if (left + popup.width > viewport.width - POPUP_VIEWPORT_MARGIN_PX) {
    left = anchor.right - popup.width;
  }
  left = Math.max(POPUP_VIEWPORT_MARGIN_PX, Math.min(left, viewport.width - POPUP_VIEWPORT_MARGIN_PX - popup.width));

  return { top, left };
}
