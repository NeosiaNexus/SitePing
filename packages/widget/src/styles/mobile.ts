import { COMPACT_MEDIA } from "../constants.js";

/**
 * Phone, touch and accessibility-preference layer: appended last in the
 * Shadow DOM stylesheet so it wins over the desktop rules it adapts. Four
 * independent axes:
 *
 * - no fine hover (touch screens, styluses): the exact complement of the
 *   `(hover: hover) and (pointer: fine)` query every `:hover` rule sits behind,
 *   so a tap never leaves a hover look stuck, and hover-revealed affordances
 *   (speed-dial labels, bulk checkboxes) become permanent: invisible elements
 *   must never be tappable.
 * - `pointer: coarse`: 40px targets at least, and 16px form fields: iOS
 *   Safari zooms the whole page into any input under 16px on focus.
 * - `COMPACT_MEDIA` (up to 640px wide, or a touch screen up to 500px tall: a
 *   phone held sideways): the panel becomes a bottom sheet with a grabber and
 *   its menus become action sheets. Materials turn solid there: translucent
 *   sheets are hard to read on a busy page, and backdrop blur is the most
 *   expensive paint on low-end phones.
 * - reduced transparency and increased contrast: solid materials, and under
 *   increased contrast stronger separators and outlined rows. Media queries,
 *   so they follow the OS setting live.
 *
 * Sheet mechanics worth knowing before editing:
 * - The headers (panel and detail) are the swipe-to-close handles, hence
 *   `touch-action: none`; the stats bar and filters take `pan-x`, so only the
 *   list scrolls vertically and a drag elsewhere never scrolls the page behind.
 * - Lists use `overscroll-behavior: contain` for the same reason.
 * - The filter row scrolls horizontally, which would clip the type menu, so
 *   menus become `position: fixed` action sheets. Fixed positioning resolves
 *   against the transformed panel (not the viewport), which lifts them out of
 *   the row; that only holds while no ancestor in between has a transform or
 *   backdrop-filter (why the filters carry no material of their own).
 * - Icon-only header buttons keep their text label, visually hidden, as the
 *   accessible name.
 *
 * Surfaces that live on `document.body` (popup, annotator toolbar, markers)
 * cannot see this sheet: they adapt in JS through `viewport.ts`. The CSS
 * string below is minified at build time, like the rest of the stylesheet.
 */
export const MOBILE_CSS = /* css */ `
  :host {
    -webkit-tap-highlight-color: transparent;
  }

  .sp-list,
  .sp-detail-content {
    overscroll-behavior: contain;
  }

  .sp-scrim {
    display: none;
  }

  @media not all and (hover: hover) and (pointer: fine) {
    .sp-radial-item--open .sp-radial-label {
      opacity: 1;
      transform: translate(0, -50%);
    }

    .sp-bulk-checkbox {
      opacity: 1;
    }

    .sp-bulk-checkbox::after {
      content: "";
      position: absolute;
      inset: -12px;
    }

    .sp-bulk-select-all {
      display: none;
    }

    .sp-list--has-selection .sp-bulk-select-all {
      display: flex;
    }

    .sp-shortcuts-hint {
      display: none;
    }
  }

  @media (pointer: coarse) {
    .sp-radial-item {
      width: 48px;
      height: 48px;
      left: 3px;
      bottom: 3px;
    }

    .sp-radial-item svg {
      width: 20px;
      height: 20px;
    }

    .sp-radial-label {
      font-size: 14px;
      padding: 8px 14px;
    }

    .sp-search,
    .sp-input {
      font-size: 16px;
    }

    .sp-search,
    .sp-filter-dropdown-btn,
    .sp-sort-btn,
    .sp-group-toggle,
    .sp-mine-toggle,
    .sp-segmented__btn,
    .sp-btn-resolve,
    .sp-btn-delete,
    .sp-bulk-btn-resolve,
    .sp-bulk-btn-delete,
    .sp-thread-foot .sp-btn-primary {
      height: 40px;
      min-height: 40px;
    }

    .sp-bulk-btn-deselect {
      width: 40px;
      height: 40px;
    }

    .sp-detail-back {
      width: 44px;
      height: 44px;
    }

    .sp-detail-actions button,
    .sp-detail-actions a,
    .sp-btn-primary,
    .sp-btn-ghost,
    .sp-btn-danger {
      height: 44px;
    }

    .sp-export-option,
    .sp-filter-dropdown-option,
    .sp-sort-option,
    .sp-group-header {
      min-height: 44px;
    }

    .sp-export-btn,
    .sp-btn-delete-all,
    .sp-bulk-select-all {
      min-height: 40px;
    }

    /* The filled circle grows with the finger, inside the same 44px target. */
    .sp-panel-close::before {
      inset: 5px;
    }

    /* The expand link keeps its size in the card; its target grows around it. */
    .sp-card-expand {
      position: relative;
    }

    .sp-card-expand::after {
      content: "";
      position: absolute;
      inset: -8px -10px;
    }
  }

  /* Short screens (a laptop at 200% zoom, a phone held sideways): the stats
     give their height to the list, which had shrunk to a few dozen pixels. */
  @media (max-height: 600px) {
    .sp-stats-bar {
      display: none;
    }
  }

  @media ${COMPACT_MEDIA} {
    .sp-fab--bottom-right,
    .sp-radial--bottom-right {
      right: calc(16px + env(safe-area-inset-right, 0px));
      bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    }

    .sp-fab--bottom-left,
    .sp-radial--bottom-left {
      left: calc(16px + env(safe-area-inset-left, 0px));
      bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    }

    .sp-scrim {
      display: block;
      position: fixed;
      inset: 0;
      background: var(--sp-scrim);
      opacity: 0;
      pointer-events: none;
      touch-action: none;
      transition: opacity 0.2s ease;
    }

    .sp-scrim--open {
      opacity: 1;
      pointer-events: auto;
    }

    /* A bottom sheet on the solid grouped background. */
    .sp-panel {
      top: auto;
      left: 0;
      right: 0;
      bottom: 0;
      width: auto;
      max-width: none;
      height: calc(100vh - 48px);
      height: calc(100dvh - 40px - env(safe-area-inset-top, 0px));
      border-radius: 16px 16px 0 0;
      background: var(--sp-grouped);
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
      box-shadow: var(--sp-shadow-sheet-up);
      transform: translateY(105%);
    }

    .sp-panel.sp-panel--open {
      transform: translateY(0);
    }

    .sp-panel-header,
    .sp-detail-header {
      position: relative;
      touch-action: none;
    }

    .sp-panel-header {
      padding: 24px 8px 6px 20px;
    }

    .sp-detail-header {
      padding: 22px 12px 4px 6px;
    }

    /* The grabber: the swipe-to-close handle made visible. */
    .sp-panel-header::before,
    .sp-detail-header::before {
      content: "";
      position: absolute;
      top: 6px;
      left: 50%;
      width: 36px;
      height: 5px;
      margin-left: -18px;
      border-radius: 3px;
      background: var(--sp-grabber);
    }

    .sp-export-btn,
    .sp-btn-delete-all {
      width: 40px;
      height: 40px;
      padding: 0;
      justify-content: center;
      border-radius: 50%;
      background: transparent;
    }

    .sp-export-btn svg,
    .sp-btn-delete-all svg {
      width: 19px;
      height: 19px;
    }

    .sp-export-btn span,
    .sp-btn-delete-all span {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    .sp-stats-bar {
      padding: 2px 20px 10px;
    }

    .sp-filters {
      padding: 2px 16px 8px;
    }

    .sp-stats-bar,
    .sp-filters {
      touch-action: pan-x;
    }

    .sp-search {
      height: 40px;
    }

    .sp-filter-bar {
      flex-wrap: nowrap;
      overflow-x: auto;
      margin: 0 -16px 8px;
      padding: 0 16px 2px;
      scrollbar-width: none;
    }

    .sp-filter-bar::-webkit-scrollbar {
      display: none;
    }

    .sp-filter-dropdown {
      flex: 0 0 auto;
    }

    .sp-filter-dropdown-btn {
      width: auto;
    }

    /* Action sheets: a solid row-coloured card above the bottom edge. */
    .sp-filter-dropdown-menu,
    .sp-sort-menu {
      position: fixed;
      top: auto;
      left: 8px;
      right: 8px;
      bottom: calc(8px + env(safe-area-inset-bottom, 0px));
      min-width: 0;
      padding: 6px;
      border-radius: 16px;
      background: var(--sp-row);
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
      box-shadow: var(--sp-shadow-popover);
      z-index: 30;
      /* An action sheet at the bottom edge grows from there, not from its trigger. */
      transform-origin: bottom center;
    }

    .sp-filter-dropdown-option,
    .sp-sort-option {
      min-height: 44px;
      font-size: 16px;
    }

    .sp-list {
      padding: 8px 16px calc(16px + env(safe-area-inset-bottom, 0px));
    }

    .sp-bulk-bar {
      bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    }

    .sp-detail-section {
      padding: 0 16px;
    }

    .sp-detail-content {
      padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    }

    .sp-identity-backdrop {
      align-items: flex-end;
    }

    .sp-identity-modal {
      width: 100%;
      max-width: none;
      margin-bottom: var(--sp-kb, 0px);
      padding: 22px 20px calc(20px + env(safe-area-inset-bottom, 0px));
      border-radius: 16px 16px 0 0;
      background: var(--sp-grouped);
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
      transform: translateY(100%);
    }

    /* Fields on the grouped sheet take the row colour, as in a system form. */
    .sp-identity-modal .sp-input {
      background: var(--sp-row);
    }

    .sp-identity-actions button {
      height: 50px;
    }

    .sp-identity-actions .sp-btn-primary {
      flex: 2;
    }
  }

  /* ---- Accessibility preferences ----
     The tokens (solid materials; under increased contrast denser fills and
     secondary-text separators and hairlines) are swapped in theme.ts. */

  /* Solid surfaces asked for: the blur would only cost paint. */
  @media (prefers-reduced-transparency: reduce) {
    * {
      -webkit-backdrop-filter: none !important;
      backdrop-filter: none !important;
    }
  }

  /* Increased contrast: rows are drawn with an outline. */
  @media (prefers-contrast: more) {
    .sp-card,
    .sp-detail-message,
    .sp-detail-meta,
    .sp-detail-annotation-info,
    .sp-detail-diag-toggle {
      box-shadow: inset 0 0 0 1px var(--sp-separator);
    }
  }
`;
