import { COMPACT_MAX_WIDTH } from "../constants.js";

/**
 * Phone and touch layer — appended last in the Shadow DOM stylesheet so it
 * wins over the desktop rules it adapts. Three independent axes:
 *
 * - `hover: none` — touch screens. Tapping leaves `:hover` stuck, so hover
 *   lifts are neutralised, and hover-revealed affordances (speed-dial labels,
 *   bulk checkboxes) become permanent: invisible elements must never be
 *   tappable.
 * - `pointer: coarse` — finger-sized targets, and 16px form fields: iOS
 *   Safari zooms the whole page into any input under 16px on focus.
 * - `max-width: 640px` — the panel and its menus become bottom sheets. Glass
 *   turns solid there: translucent sheets are hard to read on a busy page, and
 *   backdrop blur is the most expensive paint on low-end phones.
 *
 * Sheet mechanics worth knowing before editing:
 * - The headers (panel and detail) are the swipe-to-close handles, hence
 *   `touch-action: none`; the stats bar and filters take `pan-x`, so only the
 *   list scrolls vertically and a drag elsewhere never scrolls the page behind.
 * - Lists use `overscroll-behavior: contain` for the same reason.
 * - The filter row scrolls horizontally, which would clip the type menu — so
 *   menus become `position: fixed` action sheets. Fixed positioning resolves
 *   against the transformed panel (not the viewport), which lifts them out of
 *   the row; that only holds while no ancestor in between has a transform or
 *   backdrop-filter (why the filters' glass is dropped here).
 * - Icon-only header buttons keep their text label, visually hidden, as the
 *   accessible name.
 *
 * Surfaces that live on `document.body` (popup, annotator toolbar, markers)
 * cannot see this sheet — they adapt in JS through `viewport.ts`. The CSS
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

  @media (hover: none) {
    .sp-fab:hover:not(:active),
    .sp-card:hover:not(:active),
    .sp-btn-primary:hover:not(:active),
    .sp-btn-danger:hover:not(:active) {
      transform: none;
    }

    .sp-card:hover:not(:active) {
      box-shadow: var(--sp-shadow-xs);
    }

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
      left: 2px;
      bottom: 2px;
    }

    .sp-radial-item svg {
      width: 20px;
      height: 20px;
    }

    .sp-radial-label {
      font-size: 13px;
      font-weight: 600;
      padding: 8px 12px;
    }

    .sp-search,
    .sp-input {
      font-size: 16px;
    }

    .sp-filter-dropdown-btn {
      height: 36px;
    }

    .sp-segmented__btn {
      height: 32px;
    }

    .sp-sort-btn,
    .sp-group-toggle,
    .sp-mine-toggle {
      min-height: 36px;
    }

    .sp-btn-resolve,
    .sp-btn-delete {
      min-height: 40px;
    }

    .sp-detail-back {
      width: 44px;
      height: 44px;
    }

    .sp-detail-actions button,
    .sp-detail-actions a {
      height: 44px;
    }
  }

  @media (max-width: ${COMPACT_MAX_WIDTH}px) {
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
      transition: opacity 0.3s ease;
    }

    .sp-scrim--open {
      opacity: 1;
      pointer-events: auto;
    }

    .sp-panel {
      top: auto;
      left: 0;
      right: 0;
      bottom: 0;
      width: auto;
      max-width: none;
      height: calc(100vh - 48px);
      height: calc(100dvh - 40px - env(safe-area-inset-top, 0px));
      border-left: none;
      border-top: 1px solid var(--sp-glass-border);
      border-radius: var(--sp-radius-xl) var(--sp-radius-xl) 0 0;
      background: var(--sp-bg);
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
      transform: translateY(105%);
    }

    .sp-panel.sp-panel--open {
      transform: translateY(0);
    }

    .sp-panel-header,
    .sp-detail-header {
      position: relative;
      padding-top: 22px;
      background: var(--sp-bg);
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
      touch-action: none;
    }

    .sp-panel-header {
      padding: 22px 12px 12px 20px;
    }

    .sp-panel-header::before,
    .sp-detail-header::before {
      content: "";
      position: absolute;
      top: 8px;
      left: 50%;
      width: 36px;
      height: 5px;
      margin-left: -18px;
      border-radius: 3px;
      background: var(--sp-border);
    }

    .sp-export-btn,
    .sp-btn-delete-all {
      width: 40px;
      height: 40px;
      padding: 0;
      justify-content: center;
      border-radius: var(--sp-radius);
    }

    .sp-export-btn svg,
    .sp-btn-delete-all svg {
      width: 17px;
      height: 17px;
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
      padding: 10px 20px;
    }

    .sp-filters {
      padding: 12px 16px 10px;
      background: var(--sp-bg);
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }

    .sp-stats-bar,
    .sp-filters {
      touch-action: pan-x;
    }

    .sp-search {
      height: 44px;
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

    .sp-filter-dropdown-menu,
    .sp-sort-menu {
      position: fixed;
      top: auto;
      left: 12px;
      right: 12px;
      bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      min-width: 0;
      padding: 6px;
      border-radius: var(--sp-radius-lg);
      background: var(--sp-bg);
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
      box-shadow: var(--sp-shadow-xl);
      z-index: 30;
    }

    .sp-filter-dropdown-option,
    .sp-sort-option {
      min-height: 44px;
      font-size: 14px;
    }

    .sp-list {
      padding: 10px 12px calc(12px + env(safe-area-inset-bottom, 0px));
    }

    .sp-bulk-bar {
      bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    }

    .sp-detail {
      background: var(--sp-bg);
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }

    .sp-detail-section {
      padding: 18px 20px;
    }

    .sp-detail-content {
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }

    .sp-identity-backdrop {
      align-items: flex-end;
    }

    .sp-identity-modal {
      width: 100%;
      max-width: none;
      margin-bottom: var(--sp-kb, 0px);
      padding: 24px 20px calc(20px + env(safe-area-inset-bottom, 0px));
      border-radius: var(--sp-radius-xl) var(--sp-radius-xl) 0 0;
      background: var(--sp-bg);
      transform: translateY(100%);
    }

    .sp-identity-actions button {
      flex: 1;
      height: 48px;
    }

    .sp-identity-actions .sp-btn-primary {
      flex: 2;
    }
  }
`;
