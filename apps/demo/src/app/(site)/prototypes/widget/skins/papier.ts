import type { Skin } from "./types";

/**
 * PROTOTYPE ONLY. Direction "Papier": warmth and legibility for the client
 * who leaves the notes (usually not a developer).
 *
 * Warm paper surfaces, rounded type a size up, generous spacing, big soft
 * radii, warm shadows instead of borders. The theme flips through
 * `light-dark()`: the widget sets `color-scheme` on its host, so one token
 * set serves both themes. Surfaces on the host page branch on
 * `html[data-proto-theme]`.
 */

const FONT = `ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", sans-serif`;
/** The widget's own phone query (constants.ts COMPACT_MEDIA): its sheets live there. */
const COMPACT = "(max-width: 640px), (max-height: 500px) and (pointer: coarse)";
const WIDE = "not ((max-width: 640px) or ((max-height: 500px) and (pointer: coarse)))";
const HOVER = "(hover: hover) and (pointer: fine)";

const shadowCss = /* css */ `
  /* ============ Tokens ============ */

  :host {
    --pp-paper: light-dark(#fffdf8, #1c1a17);
    --pp-sheet: light-dark(#ffffff, #24211d);
    --pp-raised: light-dark(#ffffff, #3a352e);
    --pp-wash: light-dark(#f8f4ee, #2b2722);
    --pp-wash-2: light-dark(#f1ebe2, #34302a);
    --pp-hair: light-dark(#efe7da, #3a352e);
    --pp-ink: light-dark(#2b2621, #f3eee6);
    --pp-ink-2: light-dark(#6b6158, #b5aa9c);
    --pp-ink-3: light-dark(#6f655b, #a99e90);
    --pp-on-fill: light-dark(#ffffff, #1c1a17);
    --pp-sh: light-dark(rgba(84, 60, 32, 0.11), rgba(0, 0, 0, 0.42));
    --pp-sh-soft: light-dark(rgba(84, 60, 32, 0.06), rgba(0, 0, 0, 0.24));
    /* In the dark, depth reads from a faint lit edge, not from shadow. */
    --pp-edge: light-dark(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.045));

    --sp-bg: var(--pp-paper);
    --sp-bg-hover: var(--pp-wash);
    --sp-text: var(--pp-ink);
    --sp-text-secondary: var(--pp-ink-2);
    --sp-text-tertiary: var(--pp-ink-3);
    --sp-border: var(--pp-hair);
    --sp-shadow: var(--pp-sh);
    --sp-glass-bg: var(--pp-paper);
    --sp-glass-bg-heavy: var(--pp-paper);
    --sp-glass-border: transparent;
    --sp-glass-border-subtle: var(--pp-hair);
    --sp-radius: 14px;
    --sp-radius-lg: 20px;
    --sp-radius-xl: 28px;
    --sp-shadow-xs: 0 1px 2px var(--pp-sh-soft);
    --sp-shadow-sm: 0 1px 2px var(--pp-sh-soft), 0 6px 16px -4px var(--pp-sh-soft);
    --sp-shadow-md: 0 2px 4px var(--pp-sh-soft), 0 12px 28px -8px var(--pp-sh);
    --sp-shadow-lg: 0 4px 10px var(--pp-sh-soft), 0 20px 44px -12px var(--pp-sh);
    --sp-shadow-xl: 0 6px 16px var(--pp-sh-soft), 0 30px 70px -16px var(--pp-sh);
    --sp-font: ${FONT};
    --sp-identity-bg: var(--pp-paper);
    --sp-identity-overlay: light-dark(rgba(43, 38, 33, 0.26), rgba(0, 0, 0, 0.55));
    --sp-backdrop: var(--sp-identity-overlay);
    --sp-scrim: light-dark(rgba(43, 38, 33, 0.3), rgba(0, 0, 0, 0.55));

    font-size: 15px;
    line-height: 1.55;
  }

  /* Stronger edges asked for: hairlines take the tertiary ink. */
  @media (prefers-contrast: more) {
    :host {
      --pp-hair: var(--pp-ink-3);
      --sp-glass-border: var(--pp-ink-3);
    }
  }

  /* ============ FAB and speed dial ============ */

  .sp-fab {
    width: 60px;
    height: 60px;
    background: var(--sp-accent);
    box-shadow:
      0 2px 6px var(--pp-sh-soft),
      0 14px 30px -10px color-mix(in srgb, var(--sp-accent) 75%, transparent);
  }

  @media ${HOVER} {
    .sp-fab:hover {
      box-shadow:
        0 3px 8px var(--pp-sh-soft),
        0 18px 38px -10px color-mix(in srgb, var(--sp-accent) 85%, transparent);
    }
  }

  .sp-fab:focus-visible {
    outline: 2.5px solid var(--sp-accent);
    outline-offset: 4px;
  }

  .sp-fab svg {
    width: 26px;
    height: 26px;
  }

  .sp-fab-badge {
    top: -3px;
    right: -3px;
    min-width: 24px;
    height: 24px;
    padding: 0 7px;
    font-size: 12px;
    border: 2.5px solid var(--pp-paper);
    box-shadow: 0 2px 6px var(--pp-sh);
  }

  .sp-radial {
    width: 60px;
    height: 60px;
  }

  .sp-radial-item {
    left: 6px;
    bottom: 6px;
    width: 48px;
    height: 48px;
    border: none;
    background: var(--pp-sheet);
    color: var(--pp-ink);
    box-shadow: var(--sp-shadow-md), inset 0 0 0 1px var(--pp-edge);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  .sp-radial-item svg {
    width: 20px;
    height: 20px;
  }

  .sp-radial-item:focus-visible {
    background: var(--pp-sheet);
    color: var(--sp-accent-text);
    box-shadow: var(--sp-shadow-md), 0 0 0 4px var(--sp-accent-light);
    outline: 2px solid var(--sp-accent);
    outline-offset: 2px;
  }

  @media ${HOVER} {
    .sp-radial-item:hover {
      background: var(--pp-sheet);
      border-color: transparent;
      color: var(--sp-accent-text);
      box-shadow: var(--sp-shadow-lg), inset 0 0 0 1px var(--pp-edge);
    }

    .sp-radial-item:hover .sp-radial-label {
      color: var(--sp-accent-text);
    }
  }

  /* Labels are part of the menu, on every device: the whole pill is the target. */
  .sp-radial-label {
    padding: 9px 16px;
    border: none;
    border-radius: 999px;
    background: var(--pp-sheet);
    color: var(--pp-ink);
    font-size: 14px;
    font-weight: 600;
    line-height: 1.3;
    box-shadow: var(--sp-shadow-md), inset 0 0 0 1px var(--pp-edge);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    transition: opacity 0.2s ease, transform 0.2s var(--sp-ease-out), color 0.15s ease;
  }

  .sp-radial--bottom-right .sp-radial-label {
    right: calc(100% + 10px);
  }

  .sp-radial--bottom-left .sp-radial-label {
    left: calc(100% + 10px);
  }

  .sp-radial-item--open .sp-radial-label {
    opacity: 1;
    transform: translate(0, -50%);
    pointer-events: auto;
  }

  /* ============ Toast ============ */

  .sp-toast {
    bottom: 100px;
    max-width: min(380px, calc(100vw - 32px));
    padding: 12px 20px;
    border-radius: 18px;
    font: 500 14.5px/1.45 var(--sp-font);
    box-shadow: var(--sp-shadow-lg);
  }

  /* ============ Panel ============ */

  .sp-panel {
    background: var(--pp-paper);
    border-left: none;
    box-shadow: var(--sp-shadow-xl), inset 0 0 0 1px var(--pp-edge);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  /* A sheet of paper floating 16px off the edges. */
  @media ${WIDE} {
    .sp-panel {
      top: 16px;
      right: 16px;
      bottom: 16px;
      width: 440px;
      max-width: calc(100vw - 32px);
      height: auto;
      border-radius: 28px;
      transform: translateX(calc(100% + 80px));
    }
  }

  /* Scroll edge, not a divider: a soft shadow under the fixed chrome that
     only shows once the content beneath has scrolled. */
  .sp-panel {
    timeline-scope: --pp-list, --pp-detail;
  }

  .sp-list {
    scroll-timeline: --pp-list y;
  }

  .sp-detail-content {
    scroll-timeline: --pp-detail y;
  }

  .sp-detail-header {
    position: relative;
    z-index: 1;
  }

  .sp-filters::after,
  .sp-detail-header::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    height: 14px;
    background: linear-gradient(var(--pp-sh), transparent);
    opacity: 0;
    pointer-events: none;
    animation-name: pp-scroll-edge;
    animation-timing-function: linear;
    animation-fill-mode: both;
    animation-range: 0 40px;
  }

  .sp-filters::after {
    animation-timeline: --pp-list;
  }

  .sp-detail-header::after {
    animation-timeline: --pp-detail;
  }

  @keyframes pp-scroll-edge {
    to { opacity: 1; }
  }

  .sp-panel-header {
    padding: 22px 18px 8px 26px;
    border-bottom: none;
    background: var(--pp-paper);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  .sp-panel-title {
    font-size: 22px;
    font-weight: 650;
    letter-spacing: -0.015em;
  }

  .sp-panel-header-right {
    gap: 4px;
  }

  .sp-panel-close {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: var(--pp-wash);
    color: var(--pp-ink-2);
  }

  .sp-panel-close svg {
    width: 18px;
    height: 18px;
  }

  @media ${HOVER} {
    .sp-panel-close:hover {
      background: var(--pp-wash-2);
      color: var(--pp-ink);
    }
  }

  .sp-export-btn,
  .sp-btn-delete-all {
    height: 36px;
    padding: 0 12px;
    gap: 6px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--pp-ink-2);
    font-size: 13.5px;
    font-weight: 500;
  }

  .sp-export-btn svg,
  .sp-btn-delete-all svg {
    width: 16px;
    height: 16px;
  }

  @media ${HOVER} {
    .sp-export-btn:hover {
      border-color: transparent;
      background: var(--pp-wash);
      color: var(--pp-ink);
    }

    .sp-btn-delete-all:hover {
      border-color: transparent;
      background: var(--sp-type-bug-bg);
      color: var(--sp-type-bug);
    }
  }

  /* ---- Stats: big friendly numbers, a thick soft bar ---- */

  .sp-stats-bar {
    gap: 12px;
    padding: 6px 26px 18px;
    border-bottom: none;
  }

  .sp-stats-row {
    gap: 22px;
  }

  .sp-stats-item {
    gap: 7px;
    align-items: baseline;
  }

  .sp-stats-dot {
    width: 8px;
    height: 8px;
    align-self: center;
  }

  .sp-stats-value {
    font-size: 24px;
    font-weight: 650;
    letter-spacing: -0.02em;
  }

  .sp-stats-label {
    font-size: 13.5px;
    color: var(--pp-ink-2);
    text-transform: none;
    letter-spacing: 0;
  }

  .sp-stats-progress {
    gap: 12px;
  }

  .sp-stats-progress-track {
    height: 6px;
    border-radius: 999px;
    background: var(--pp-wash-2);
  }

  .sp-stats-progress-fill {
    border-radius: 999px;
  }

  .sp-stats-progress-label {
    min-width: 72px;
    font-size: 13px;
    color: var(--pp-ink-2);
  }

  /* ---- Search and filters ---- */

  .sp-filters {
    padding: 2px 22px 12px;
    border-bottom: none;
    background: var(--pp-paper);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  .sp-search-wrap {
    margin-bottom: 12px;
  }

  .sp-search {
    height: 48px;
    padding: 0 16px 0 46px;
    border: none;
    border-radius: 16px;
    background: var(--pp-wash);
    font-size: 15px;
  }

  .sp-search::placeholder {
    color: var(--pp-ink-3);
  }

  .sp-search:focus {
    background: var(--pp-sheet);
    box-shadow: 0 0 0 2px var(--sp-accent), 0 0 0 6px var(--sp-accent-light);
  }

  .sp-search-icon {
    left: 16px;
    width: 18px;
    height: 18px;
    color: var(--pp-ink-3);
  }

  .sp-filter-bar {
    gap: 8px;
    margin-bottom: 6px;
  }

  .sp-filter-dropdown-btn {
    height: 36px;
    padding: 0 10px 0 12px;
    gap: 8px;
    border: none;
    background: var(--pp-wash);
    font-size: 14px;
  }

  @media ${HOVER} {
    .sp-filter-dropdown-btn:not(.sp-filter-dropdown-btn--filtered):hover {
      background: var(--pp-wash-2);
    }
  }

  .sp-filter-dropdown-btn[aria-expanded="true"] {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--sp-chip-color) 35%, transparent);
  }

  .sp-filter-dropdown-btn__icon,
  .sp-filter-dropdown-btn__icon svg {
    width: 16px;
    height: 16px;
  }

  .sp-filter-dropdown-btn__prefix {
    font-size: 13.5px;
    font-weight: 500;
    color: var(--pp-ink-2);
    text-transform: none;
    letter-spacing: 0;
  }

  .sp-filter-dropdown-btn__value {
    font-weight: 600;
  }

  .sp-segmented {
    padding: 3px;
    border: none;
    background: var(--pp-wash);
  }

  .sp-segmented__btn {
    height: 30px;
    padding: 0 12px;
    gap: 6px;
    color: var(--pp-ink-2);
    font-size: 13.5px;
  }

  .sp-segmented__icon,
  .sp-segmented__icon svg {
    width: 14px;
    height: 14px;
  }

  .sp-segmented__btn--active {
    background: var(--pp-raised);
    color: var(--sp-chip-color);
    font-weight: 600;
    box-shadow: 0 1px 2px var(--pp-sh-soft), 0 3px 10px -3px var(--pp-sh);
  }

  /* Scope, "Mine", sort and grouping: still there, one voice quieter. */
  .sp-segmented--scope {
    gap: 2px;
    padding: 0;
    background: transparent;
  }

  .sp-segmented--scope .sp-segmented__btn--active {
    background: var(--pp-wash);
    color: var(--pp-ink);
    box-shadow: none;
  }

  .sp-sort-controls {
    gap: 4px;
    margin-top: 0;
    padding-top: 2px;
    border-top: none;
  }

  .sp-sort-btn,
  .sp-group-toggle,
  .sp-mine-toggle {
    height: 32px;
    padding: 0 12px;
    gap: 6px;
    border: none;
    background: transparent;
    color: var(--pp-ink-2);
    font-size: 13.5px;
  }

  .sp-sort-btn svg,
  .sp-group-toggle svg,
  .sp-mine-toggle svg {
    width: 15px;
    height: 15px;
  }

  .sp-sort-btn[aria-expanded="true"] {
    border-color: transparent;
    background: var(--pp-wash);
    color: var(--pp-ink);
  }

  .sp-group-toggle--active,
  .sp-mine-toggle--active {
    border-color: transparent;
    background: var(--sp-accent-light);
    color: var(--sp-accent-text);
    box-shadow: none;
  }

  @media ${HOVER} {
    .sp-sort-btn:hover,
    .sp-group-toggle:hover,
    .sp-mine-toggle:hover {
      border-color: transparent;
      background: var(--pp-wash);
      color: var(--pp-ink);
    }

    .sp-group-toggle--active:hover,
    .sp-mine-toggle--active:hover {
      background: var(--sp-accent-light);
      color: var(--sp-accent-text);
    }
  }

  /* ---- Menus (type, sort, export) ---- */

  .sp-filter-dropdown-menu,
  .sp-sort-menu,
  .sp-export-menu {
    padding: 6px;
    border: none;
    border-radius: 18px;
    background: var(--pp-sheet);
    box-shadow: var(--sp-shadow-lg), inset 0 0 0 1px var(--pp-edge);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  @media ${WIDE} {
    .sp-filter-dropdown-menu {
      top: calc(100% + 8px);
      min-width: 220px;
    }

    .sp-sort-menu {
      top: calc(100% + 8px);
      min-width: 200px;
    }
  }

  .sp-export-menu {
    top: calc(100% + 8px);
    min-width: 200px;
  }

  .sp-filter-dropdown-option,
  .sp-sort-option,
  .sp-export-option {
    gap: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    font-size: 14.5px;
  }

  .sp-sort-option,
  .sp-export-option {
    color: var(--pp-ink);
  }

  .sp-filter-dropdown-option__icon {
    width: 28px;
    height: 28px;
    border-radius: 9px;
  }

  .sp-filter-dropdown-option__icon svg {
    width: 15px;
    height: 15px;
  }

  .sp-export-option-icon svg {
    width: 18px;
    height: 18px;
  }

  .sp-export-option:focus-visible {
    background: var(--pp-wash);
    color: var(--pp-ink);
  }

  @media ${HOVER} {
    .sp-filter-dropdown-option:hover,
    .sp-sort-option:hover,
    .sp-export-option:hover {
      background: var(--pp-wash);
      color: var(--pp-ink);
    }
  }

  /* ============ Cards (notes) ============ */

  .sp-list {
    padding: 6px 16px 28px;
  }

  .sp-list::-webkit-scrollbar-thumb {
    background: var(--pp-wash-2);
  }

  .sp-card {
    padding: 18px 18px 14px 20px;
    margin-bottom: 12px;
    border: none;
    border-radius: 20px;
    background: var(--pp-sheet);
    box-shadow: var(--sp-shadow-sm), inset 0 0 0 1px var(--pp-edge);
  }

  @media ${HOVER} {
    .sp-card:hover {
      border-color: transparent;
      background: var(--pp-sheet);
      box-shadow: var(--sp-shadow-md), inset 0 0 0 1px var(--pp-edge);
    }
  }

  /* The type is the coloured tag: the side stripe would say it twice. */
  .sp-card-bar {
    display: none;
  }

  .sp-card-header {
    gap: 6px 8px;
    margin-bottom: 8px;
  }

  .sp-card-number {
    font-size: 13px;
    font-weight: 600;
    color: var(--pp-ink-3);
  }

  .sp-badge {
    padding: 3px 11px;
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .sp-card-date {
    font-size: 13px;
    color: var(--pp-ink-3);
  }

  .sp-card-message {
    font-size: 15px;
    line-height: 1.55;
  }

  .sp-card-expand {
    padding: 6px 0 0;
    font-size: 13.5px;
    font-weight: 600;
  }

  .sp-lost {
    margin-top: 6px;
    font-size: 13px;
    color: var(--pp-ink-3);
  }

  .sp-card-footer {
    gap: 8px;
    margin-top: 14px;
  }

  .sp-btn-resolve,
  .sp-btn-delete {
    height: 36px;
    padding: 0 14px;
    gap: 6px;
    border: none;
    background: var(--pp-wash);
    color: var(--pp-ink-2);
    font-size: 13.5px;
    font-weight: 600;
  }

  .sp-btn-resolve svg,
  .sp-btn-delete svg {
    width: 15px;
    height: 15px;
  }

  @media ${HOVER} {
    .sp-btn-resolve:hover {
      background: var(--sp-status-open-bg);
      color: var(--sp-status-open);
    }

    .sp-btn-delete:hover {
      background: var(--sp-type-bug-bg);
      color: var(--sp-type-bug);
    }
  }

  /* Closed notes sit flat on the page: outlined, not lifted. */
  .sp-card--resolved {
    opacity: 1;
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--pp-hair);
  }

  .sp-card--resolved .sp-card-message {
    color: var(--pp-ink-2);
    text-decoration-color: color-mix(in srgb, var(--pp-ink-2) 60%, transparent);
  }

  .sp-card--selected {
    border-left: none !important;
    background: color-mix(in srgb, var(--sp-accent) 7%, var(--pp-sheet)) !important;
    box-shadow: 0 0 0 2px var(--sp-accent), var(--sp-shadow-sm);
  }

  @media ${HOVER} {
    .sp-card--selected:hover {
      background: color-mix(in srgb, var(--sp-accent) 7%, var(--pp-sheet)) !important;
    }
  }

  .sp-card--focused {
    outline-offset: 2px;
  }

  .sp-bulk-checkbox,
  .sp-bulk-checkbox svg {
    width: 20px;
    height: 20px;
  }

  .sp-bulk-checkbox {
    border-radius: 6px;
    color: var(--pp-ink-3);
  }

  .sp-bulk-checkbox--checked {
    color: var(--sp-accent);
    filter: none;
  }

  .sp-bulk-select-all {
    gap: 10px;
    padding: 8px 14px;
    border-radius: 14px;
    font-size: 13.5px;
    color: var(--pp-ink-2);
  }

  /* ---- Bulk bar ---- */

  .sp-bulk-bar {
    left: 14px;
    right: 14px;
    bottom: 14px;
    padding: 10px 10px 10px 20px;
    border: none;
    border-radius: 22px;
    background: var(--pp-sheet);
    box-shadow: var(--sp-shadow-xl), inset 0 0 0 1px var(--pp-edge);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  .sp-bulk-bar-count {
    font-size: 14.5px;
    font-weight: 600;
  }

  .sp-bulk-bar-actions {
    gap: 8px;
  }

  .sp-bulk-btn-resolve,
  .sp-bulk-btn-delete {
    height: 40px;
    padding: 0 16px;
    gap: 6px;
    border: none;
    font-size: 14px;
  }

  .sp-bulk-btn-resolve {
    background: var(--sp-status-open-bg);
    color: var(--sp-status-open);
  }

  .sp-bulk-btn-delete {
    background: var(--sp-type-bug-bg);
    color: var(--sp-type-bug);
  }

  @media ${HOVER} {
    .sp-bulk-btn-resolve:hover {
      background: var(--sp-status-open-bg);
      box-shadow: inset 0 0 0 1.5px currentColor;
    }

    .sp-bulk-btn-delete:hover {
      background: var(--sp-type-bug-bg);
      box-shadow: inset 0 0 0 1.5px currentColor;
    }

    .sp-bulk-btn-deselect:hover {
      border-color: transparent;
      background: var(--pp-wash-2);
      color: var(--pp-ink);
    }
  }

  .sp-bulk-btn-deselect {
    width: 40px;
    height: 40px;
    border: none;
    background: var(--pp-wash);
    color: var(--pp-ink-2);
  }

  .sp-bulk-btn-deselect svg {
    width: 14px;
    height: 14px;
  }

  /* ---- Page groups ---- */

  .sp-group-header {
    gap: 10px;
    margin: 4px 0 10px;
    padding: 10px 14px;
    border-bottom: none;
    border-radius: 14px;
    background: var(--pp-wash);
  }

  @media ${HOVER} {
    .sp-group-header:hover {
      background: var(--pp-wash-2);
    }
  }

  .sp-group-header-path {
    font-size: 14px;
    font-weight: 600;
    color: var(--pp-ink);
  }

  .sp-group-header-chevron svg,
  .sp-group-header-icon svg {
    width: 15px;
    height: 15px;
    color: var(--pp-ink-3);
  }

  .sp-group-header-count {
    padding: 2px 9px;
    font-size: 12.5px;
    color: var(--sp-accent-text) !important;
  }

  /* ---- Empty, loading, load more ---- */

  .sp-empty {
    gap: 12px;
    padding: 64px 32px;
    color: var(--pp-ink-2);
  }

  /* A blank note: decorative, one warm mid-tone that reads on both themes. */
  .sp-empty::before {
    content: "";
    width: 64px;
    height: 64px;
    margin-bottom: 4px;
    border-radius: 22px;
    background:
      url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a39684' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M20 14.5a2 2 0 0 1-2 2H8l-4 3.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z'/><path d='M8.5 8.5h7M8.5 12h4.5'/></svg>")
        center / 30px no-repeat,
      var(--pp-wash);
  }

  .sp-empty-text {
    max-width: 30ch;
    font-size: 15.5px;
    line-height: 1.5;
  }

  .sp-spinner {
    border-color: var(--pp-wash-2);
    border-top-color: var(--sp-accent);
  }

  .sp-load-more-wrap {
    padding: 8px 0 4px;
  }

  /* ============ Buttons and fields ============ */

  .sp-btn-primary {
    height: 44px;
    padding: 0 24px;
    border-radius: 999px;
    background: var(--sp-accent);
    font-size: 15px;
    box-shadow: 0 6px 16px -6px color-mix(in srgb, var(--sp-accent) 70%, transparent);
  }

  @media ${HOVER} {
    .sp-btn-primary:hover {
      box-shadow: 0 8px 22px -6px color-mix(in srgb, var(--sp-accent) 85%, transparent);
    }
  }

  .sp-btn-ghost {
    height: 44px;
    padding: 0 22px;
    border: none;
    border-radius: 999px;
    background: var(--pp-wash);
    color: var(--pp-ink);
    font-size: 15px;
    font-weight: 600;
  }

  @media ${HOVER} {
    .sp-btn-ghost:hover {
      border-color: transparent;
      background: var(--pp-wash-2);
      color: var(--pp-ink);
    }
  }

  .sp-btn-danger {
    height: 44px;
    padding: 0 24px;
    border-radius: 999px;
    font-size: 15px;
    box-shadow: 0 6px 16px -6px rgba(220, 38, 38, 0.55);
  }

  .sp-input {
    height: 48px;
    padding: 0 16px;
    border: none;
    border-radius: 14px;
    background: var(--pp-wash);
    font-size: 15px;
  }

  .sp-input::placeholder {
    color: var(--pp-ink-3);
  }

  .sp-input:focus {
    background: var(--pp-sheet);
    box-shadow: 0 0 0 2px var(--sp-accent), 0 0 0 6px var(--sp-accent-light);
  }

  .sp-input-label {
    margin-bottom: 8px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--pp-ink-2);
  }

  /* ============ Detail ============ */

  .sp-detail {
    background: var(--pp-paper);
  }

  .sp-detail-header {
    gap: 12px;
    min-height: 76px;
    padding: 16px 20px 8px 16px;
    border-bottom: none;
    background: var(--pp-paper);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  .sp-detail-back {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: var(--pp-wash);
    color: var(--pp-ink-2);
  }

  .sp-detail-back svg {
    width: 20px;
    height: 20px;
  }

  @media ${HOVER} {
    .sp-detail-back:hover {
      background: var(--pp-wash-2);
      color: var(--pp-ink);
    }
  }

  .sp-detail-title {
    font-size: 20px;
    font-weight: 650;
    letter-spacing: -0.015em;
  }

  .sp-detail-header .sp-badge {
    padding: 4px 12px;
    font-size: 13px;
  }

  .sp-detail-section {
    padding: 10px 24px 22px;
    border-bottom: none;
  }

  .sp-detail-section-title {
    gap: 8px;
    margin-bottom: 10px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--pp-ink-2);
    text-transform: none;
    letter-spacing: 0;
  }

  .sp-detail-section-title svg {
    width: 15px;
    height: 15px;
    color: var(--pp-ink-3);
    opacity: 1;
  }

  .sp-detail-status {
    margin-bottom: 16px;
  }

  .sp-detail-status-pill {
    gap: 7px;
    padding: 6px 14px;
    border: none;
    font-size: 13.5px;
    letter-spacing: 0.01em;
  }

  .sp-detail-status-dot {
    width: 8px;
    height: 8px;
  }

  .sp-detail-actions {
    gap: 10px;
  }

  .sp-detail-actions button,
  .sp-detail-actions a {
    height: 48px;
    padding: 0 20px;
    gap: 8px;
    border-radius: 999px;
    font-size: 15px;
    font-weight: 600;
  }

  .sp-detail-actions button svg,
  .sp-detail-actions a svg {
    width: 17px;
    height: 17px;
  }

  .sp-detail-btn-resolve {
    --pp-glow: light-dark(color-mix(in srgb, var(--sp-status-open) 60%, transparent), rgba(0, 0, 0, 0.45));
    border: none;
    background: var(--sp-status-open);
    color: var(--pp-on-fill);
    box-shadow: 0 6px 16px -6px var(--pp-glow);
  }

  .sp-detail-btn-reopen {
    border: none;
    background: var(--sp-accent-light);
    color: var(--sp-accent-text);
  }

  .sp-detail-btn-delete {
    border: none;
    background: var(--sp-type-bug-bg);
    color: var(--sp-type-bug);
  }

  .sp-detail-btn-custom {
    border: none;
    background: var(--pp-wash);
    color: var(--pp-ink);
  }

  @media ${HOVER} {
    .sp-detail-btn-resolve:hover {
      background: var(--sp-status-open);
      box-shadow: 0 10px 22px -6px var(--pp-glow);
    }

    .sp-detail-btn-reopen:hover {
      background: var(--sp-accent-light);
      box-shadow: inset 0 0 0 1.5px currentColor;
    }

    .sp-detail-btn-delete:hover {
      background: var(--sp-type-bug-bg);
      box-shadow: inset 0 0 0 1.5px currentColor;
    }

    .sp-detail-btn-custom:hover {
      border-color: transparent;
      background: var(--pp-wash-2);
      color: var(--pp-ink);
      box-shadow: none;
    }
  }

  /* ---- The message as a speech bubble, the thread as a chat ---- */

  .sp-detail-message {
    padding: 16px 18px;
    border-left: none;
    border-radius: 22px 22px 8px 22px;
    background: var(--pp-wash);
    font-size: 15.5px;
    line-height: 1.6;
  }

  .sp-comment {
    margin-top: 10px;
    margin-left: 12%;
    padding: 12px 16px 14px;
    border-radius: 20px 20px 6px 20px;
    font-size: 15px;
    line-height: 1.55;
  }

  .sp-comment[data-role="team"] {
    margin-left: 0;
    margin-right: 12%;
    border-radius: 20px 20px 20px 6px;
    background: var(--sp-accent-light);
  }

  .sp-comment-head {
    gap: 8px;
    margin-bottom: 4px;
    font-size: 13px;
  }

  .sp-comment-head time {
    font-size: 12.5px;
    color: var(--pp-ink-2);
  }

  .sp-comment-head .sp-badge {
    padding: 1px 9px;
    font-size: 11.5px;
    color: var(--sp-accent-text);
  }

  .sp-comment[data-role="team"] .sp-badge {
    background: var(--pp-sheet);
  }

  .sp-thread-input {
    height: auto;
    margin-top: 14px;
    padding: 14px 16px;
    border-radius: 18px;
    font-size: 15px;
    line-height: 1.5;
  }

  .sp-thread-foot {
    margin-top: 10px;
    font-size: 13px;
  }

  .sp-thread-error {
    padding: 10px 14px;
    border-radius: 14px;
    font-size: 13.5px;
  }

  .sp-detail-screenshot {
    border: none;
    border-radius: 18px;
    background: var(--pp-wash);
    box-shadow: var(--sp-shadow-sm), 0 0 0 1px var(--pp-hair);
  }

  /* ---- Details and annotation, as soft cards ---- */

  .sp-detail-meta {
    gap: 16px;
    padding: 18px;
    border-radius: 20px;
    background: var(--pp-wash);
  }

  .sp-detail-meta-row {
    gap: 14px;
  }

  .sp-detail-meta-row svg,
  .sp-detail-annotation-row svg {
    width: 16px;
    height: 16px;
    margin-top: 2px;
    color: var(--pp-ink-3);
  }

  .sp-detail-meta-label,
  .sp-detail-annotation-label {
    margin-bottom: 4px;
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1.3;
    color: var(--pp-ink-2);
    text-transform: none;
    letter-spacing: 0;
  }

  .sp-detail-meta-value {
    font-size: 15px;
    line-height: 1.45;
    word-break: break-word;
  }

  .sp-detail-meta-value--mono,
  .sp-detail-annotation-value--mono {
    padding: 2px 8px;
    border: none;
    border-radius: 8px;
    background: var(--pp-sheet);
    font-size: 12.5px;
  }

  .sp-detail-meta-value--secondary {
    font-size: 13.5px;
    color: var(--pp-ink-2);
  }

  .sp-detail-annotation {
    gap: 14px;
  }

  .sp-detail-annotation-info {
    gap: 12px;
    padding: 18px;
    border: none;
    border-radius: 20px;
    background: var(--pp-wash);
  }

  .sp-detail-annotation-value {
    font-size: 14px;
  }

  .sp-detail-btn-goto {
    height: 48px;
    border-radius: 999px;
    background: var(--sp-accent);
    font-size: 15px;
    box-shadow: 0 6px 16px -6px color-mix(in srgb, var(--sp-accent) 70%, transparent);
  }

  @media ${HOVER} {
    .sp-detail-btn-goto:hover {
      box-shadow: 0 10px 22px -6px color-mix(in srgb, var(--sp-accent) 85%, transparent);
    }
  }

  /* ---- Diagnostics ---- */

  .sp-detail-diag-toggle {
    padding: 12px 16px;
    border: none;
    border-radius: 16px;
    background: var(--pp-wash);
    font-size: 14px;
  }

  @media ${HOVER} {
    .sp-detail-diag-toggle:hover {
      background: var(--pp-wash-2);
    }
  }

  .sp-detail-diag-count {
    padding: 2px 9px;
    background: var(--pp-sheet);
    color: var(--pp-ink-2);
  }

  .sp-detail-diag-count--errors {
    background: var(--sp-type-bug-bg);
    color: var(--sp-type-bug);
  }

  .sp-detail-diag-group-title {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--pp-ink-2);
    text-transform: none;
    letter-spacing: 0;
  }

  .sp-detail-diag-list {
    border: none;
    border-radius: 16px;
    background: var(--pp-wash);
  }

  .sp-detail-diag-list li {
    padding: 10px 14px;
    border-bottom-color: var(--pp-hair);
    font-size: 12px;
  }

  /* ============ Dialogs ============ */

  .sp-confirm-backdrop,
  .sp-identity-backdrop,
  .sp-shortcuts-overlay {
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
  }

  .sp-confirm-dialog {
    width: min(380px, calc(100vw - 32px));
    padding: 28px 26px 22px;
    border: none;
    border-radius: 28px;
    background: var(--pp-paper);
    box-shadow: var(--sp-shadow-xl), inset 0 0 0 1px var(--pp-edge);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  .sp-confirm-title,
  .sp-identity-title {
    font-size: 20px;
    font-weight: 650;
    letter-spacing: -0.015em;
  }

  .sp-confirm-title {
    margin-bottom: 10px;
  }

  .sp-confirm-message {
    margin-bottom: 24px;
    font-size: 15px;
    line-height: 1.55;
  }

  .sp-confirm-actions,
  .sp-identity-actions {
    gap: 10px;
  }

  .sp-identity-modal {
    border: none;
    box-shadow: var(--sp-shadow-xl), inset 0 0 0 1px var(--pp-edge);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  @media ${WIDE} {
    .sp-identity-modal {
      width: 380px;
      padding: 28px;
    }
  }

  .sp-identity-actions {
    margin-top: 24px;
  }

  /* ---- Shortcuts ---- */

  .sp-shortcuts-card {
    width: 400px;
    padding: 26px 28px 24px;
    border: none;
    border-radius: 28px;
    background: var(--pp-paper);
    box-shadow: var(--sp-shadow-xl), inset 0 0 0 1px var(--pp-edge);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  .sp-shortcuts-title {
    gap: 10px;
    margin-bottom: 20px;
    font-size: 19px;
    font-weight: 650;
  }

  .sp-shortcuts-close {
    top: 18px;
    right: 18px;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    background: var(--pp-wash);
    color: var(--pp-ink-2);
  }

  @media ${HOVER} {
    .sp-shortcuts-close:hover {
      background: var(--pp-wash-2);
      color: var(--pp-ink);
    }
  }

  .sp-shortcuts-grid {
    gap: 12px;
  }

  .sp-kbd {
    min-width: 30px;
    height: 28px;
    padding: 0 8px;
    border: none;
    border-radius: 9px;
    background: var(--pp-raised);
    box-shadow: 0 0 0 1px var(--pp-hair), 0 2px 0 var(--pp-hair);
    font-size: 13px;
    color: var(--pp-ink);
  }

  .sp-shortcuts-desc {
    font-size: 14.5px;
    line-height: 1.4;
    color: var(--pp-ink-2);
  }

  .sp-shortcuts-hint {
    right: 14px;
    bottom: 14px;
    width: 30px;
    height: 30px;
    border: none;
    background: var(--pp-wash);
    color: var(--pp-ink-2);
    font-size: 13px;
  }

  @media ${HOVER} {
    .sp-shortcuts-hint:hover {
      border-color: transparent;
      background: var(--sp-accent-light);
      color: var(--sp-accent-text);
    }
  }

  .sp-shortcuts-hint::after {
    padding: 6px 10px;
    border: none;
    border-radius: 10px;
    background: var(--pp-ink);
    color: var(--pp-paper);
    font-size: 12.5px;
    box-shadow: var(--sp-shadow-md);
  }

  /* ============ Forced colours: the shadows that drew edges are gone ============ */

  @media (forced-colors: active) {
    .sp-card--selected {
      border-left: 4px solid Highlight !important;
    }

    .sp-identity-modal,
    .sp-shortcuts-card,
    .sp-radial-label,
    .sp-toast,
    .sp-comment,
    .sp-detail-meta,
    .sp-detail-annotation-info {
      border: 1px solid CanvasText;
    }
  }

  /* ============ Touch: finger-sized, 16px fields (no iOS zoom) ============ */

  @media (pointer: coarse) {
    .sp-search,
    .sp-input {
      font-size: 16px;
    }

    .sp-filter-dropdown-btn {
      height: 40px;
    }

    .sp-segmented {
      padding: 2px;
    }

    .sp-segmented__btn {
      height: 40px;
    }

    .sp-sort-btn,
    .sp-group-toggle,
    .sp-mine-toggle,
    .sp-btn-resolve,
    .sp-btn-delete {
      height: 40px;
    }

    .sp-card-expand {
      min-height: 40px;
    }

    .sp-shortcuts-close {
      width: 44px;
      height: 44px;
    }
  }

  /* ============ Phone: bottom sheets ============ */

  @media ${COMPACT} {
    .sp-panel {
      box-shadow: 0 -10px 40px var(--pp-sh);
    }

    .sp-panel-header {
      padding: 26px 12px 8px 22px;
    }

    .sp-detail-header {
      padding: 26px 18px 8px 14px;
    }

    .sp-panel-header::before,
    .sp-detail-header::before {
      top: 9px;
      width: 40px;
      height: 5px;
      margin-left: -20px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--pp-ink) 20%, transparent);
    }

    .sp-export-btn,
    .sp-btn-delete-all {
      width: 44px;
      height: 44px;
      padding: 0;
      border-radius: 999px;
      background: var(--pp-wash);
    }

    .sp-export-btn svg,
    .sp-btn-delete-all svg {
      width: 18px;
      height: 18px;
    }

    .sp-stats-bar {
      padding: 2px 22px 14px;
    }

    .sp-stats-row {
      gap: 18px;
    }

    .sp-stats-value {
      font-size: 22px;
    }

    .sp-filters {
      padding: 2px 18px 10px;
    }

    .sp-filter-bar {
      margin: 0 -18px 6px;
      padding: 0 18px 2px;
    }

    .sp-filter-dropdown-menu,
    .sp-sort-menu {
      padding: 8px;
      border-radius: 26px;
      box-shadow: var(--sp-shadow-xl);
    }

    .sp-filter-dropdown-option,
    .sp-sort-option {
      min-height: 48px;
      font-size: 15px;
    }

    .sp-list {
      padding: 4px 14px calc(16px + env(safe-area-inset-bottom, 0px));
    }

    .sp-bulk-bar {
      bottom: calc(14px + env(safe-area-inset-bottom, 0px));
    }

    .sp-detail-section {
      padding: 8px 20px 20px;
    }

    .sp-toast {
      bottom: calc(96px + env(safe-area-inset-bottom, 0px));
    }
  }
`;

/* Surfaces on the host page: their look is inline, so every value is !important. */
const lightCss = /* css */ `
  :is([data-proto-surface], #sp-tooltip, #siteping-markers) {
    --pp-paper: #fffdf8;
    --pp-sheet: #ffffff;
    --pp-wash: #f8f4ee;
    --pp-wash-2: #f1ebe2;
    --pp-hair: #efe7da;
    --pp-ink: #2b2621;
    --pp-ink-2: #6b6158;
    --pp-ink-3: #6f655b;
    --pp-sh: rgba(84, 60, 32, 0.14);
    --pp-sh-soft: rgba(84, 60, 32, 0.07);
    --pp-pin-ink: #ffffff;
    /* Pins wear a light sticker edge in both themes: it lifts them off any page. */
    --pp-pin-ring: rgba(255, 253, 248, 0.95);
    /* Selected type tiles: text at 5.5:1 or more on its own tint. */
    --pp-q: #2563eb;
    --pp-q-ink: #1d4ed8;
    --pp-q-tint: color-mix(in srgb, #2563eb 8%, #fffdf8);
    --pp-c: #b45309;
    --pp-c-ink: #92400e;
    --pp-c-tint: color-mix(in srgb, #b45309 10%, #fffdf8);
    --pp-b: #d01f1f;
    --pp-b-ink: #b91c1c;
    --pp-b-tint: color-mix(in srgb, #d01f1f 8%, #fffdf8);
    --pp-o: #6b6158;
    --pp-o-ink: #4b4540;
    --pp-o-tint: #f1ebe2;
    --pp-cancel-hover-bg: #fbe9e4;
    --pp-cancel-hover-ink: #b42318;
    --pp-font: ${FONT};
  }

  html[data-proto-theme="dark"] :is([data-proto-surface], #sp-tooltip, #siteping-markers) {
    --pp-paper: #24211d;
    --pp-sheet: #24211d;
    --pp-wash: #302b26;
    --pp-wash-2: #38332d;
    --pp-hair: #3a352e;
    --pp-ink: #f3eee6;
    --pp-ink-2: #b5aa9c;
    --pp-ink-3: #b5aa9c;
    --pp-sh: rgba(0, 0, 0, 0.5);
    --pp-sh-soft: rgba(0, 0, 0, 0.3);
    --pp-pin-ink: #1c1a17;
    --pp-q: #60a5fa;
    --pp-q-ink: #93c5fd;
    --pp-q-tint: color-mix(in srgb, #60a5fa 16%, #24211d);
    --pp-c: #fbbf24;
    --pp-c-ink: #fcd34d;
    --pp-c-tint: color-mix(in srgb, #fbbf24 14%, #24211d);
    --pp-b: #f87171;
    --pp-b-ink: #fca5a5;
    --pp-b-tint: color-mix(in srgb, #f87171 16%, #24211d);
    --pp-o: #b5aa9c;
    --pp-o-ink: #e2d9cc;
    --pp-o-tint: #3a352e;
    --pp-cancel-hover-bg: #3a2724;
    --pp-cancel-hover-ink: #fca5a5;
  }

  :is([data-proto-surface="popup"], [data-proto-surface="toolbar"], #sp-tooltip, #siteping-markers),
  :is([data-proto-surface="popup"], [data-proto-surface="toolbar"], #sp-tooltip, #siteping-markers) * {
    font-family: var(--pp-font) !important;
  }

  /* ============ Comment popup: a big friendly card ============ */

  [data-proto-surface="popup"] {
    width: 344px !important;
    padding: 22px !important;
    border: none !important;
    border-radius: 26px !important;
    background: var(--pp-paper) !important;
    color: var(--pp-ink) !important;
    box-shadow:
      0 2px 6px var(--pp-sh-soft),
      0 24px 56px -12px var(--pp-sh),
      inset 0 0 0 1px rgba(255, 255, 255, 0.04) !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  [data-proto-surface="popup"] > div:first-child {
    gap: 8px !important;
    margin-bottom: 14px !important;
  }

  /* The four types as tiles: icon above the label. */
  [data-proto-surface="popup"] button[data-type] {
    flex-direction: column !important;
    gap: 6px !important;
    height: 68px !important;
    border: none !important;
    border-radius: 18px !important;
    background: var(--pp-wash) !important;
    color: var(--pp-ink-2) !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    line-height: 1.2 !important;
  }

  [data-proto-surface="popup"] button[data-type] svg {
    width: 20px !important;
    height: 20px !important;
  }

  @media ${HOVER} {
    [data-proto-surface="popup"] button[data-type][aria-pressed="false"]:not(:disabled):hover {
      background: var(--pp-wash-2) !important;
      color: var(--pp-ink) !important;
    }
  }

  [data-proto-surface="popup"] button[data-type="question"][aria-pressed="true"] {
    background: var(--pp-q-tint) !important;
    color: var(--pp-q-ink) !important;
    box-shadow: inset 0 0 0 2px var(--pp-q) !important;
  }

  [data-proto-surface="popup"] button[data-type="change"][aria-pressed="true"] {
    background: var(--pp-c-tint) !important;
    color: var(--pp-c-ink) !important;
    box-shadow: inset 0 0 0 2px var(--pp-c) !important;
  }

  [data-proto-surface="popup"] button[data-type="bug"][aria-pressed="true"] {
    background: var(--pp-b-tint) !important;
    color: var(--pp-b-ink) !important;
    box-shadow: inset 0 0 0 2px var(--pp-b) !important;
  }

  [data-proto-surface="popup"] button[data-type="other"][aria-pressed="true"] {
    background: var(--pp-o-tint) !important;
    color: var(--pp-o-ink) !important;
    box-shadow: inset 0 0 0 2px var(--pp-o) !important;
  }

  [data-proto-surface="popup"] > textarea {
    min-height: 104px !important;
    padding: 14px 16px !important;
    border: none !important;
    border-radius: 18px !important;
    background: var(--pp-wash) !important;
    color: var(--pp-ink) !important;
    font-size: 15px !important;
    line-height: 1.55 !important;
    box-shadow: none !important;
  }

  [data-proto-surface="popup"] > textarea::placeholder {
    color: var(--pp-ink-3);
  }

  [data-proto-surface="popup"] > textarea:focus {
    background: var(--pp-sheet) !important;
    box-shadow:
      0 0 0 2px var(--proto-accent),
      0 0 0 6px color-mix(in srgb, var(--proto-accent) 16%, transparent) !important;
  }

  [data-proto-surface="popup"] > div:nth-child(3) {
    margin-top: 8px !important;
    color: var(--pp-ink-3) !important;
    font-size: 12.5px !important;
  }

  [data-proto-surface="popup"] > div:last-child {
    align-items: center !important;
    gap: 10px !important;
    margin-top: 16px !important;
  }

  [data-proto-surface="popup"] > div:last-child > button {
    height: 48px !important;
    border: none !important;
    border-radius: 999px !important;
    font-size: 15px !important;
    font-weight: 600 !important;
  }

  [data-proto-surface="popup"] > div:last-child > button:first-child {
    padding: 0 20px !important;
    background: var(--pp-wash) !important;
    color: var(--pp-ink-2) !important;
  }

  @media ${HOVER} {
    [data-proto-surface="popup"] > div:last-child > button:first-child:hover {
      background: var(--pp-wash-2) !important;
      color: var(--pp-ink) !important;
    }
  }

  [data-proto-surface="popup"] > div:last-child > button:last-child {
    min-width: 120px !important;
    padding: 0 28px !important;
    background: var(--proto-accent) !important;
    color: #ffffff !important;
    box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--proto-accent) 80%, transparent) !important;
  }

  /* Empty message: a calm, readable resting Send, not a ghost. */
  [data-proto-surface="popup"] > div:last-child > button:last-child:disabled {
    opacity: 1 !important;
    background: var(--pp-wash-2) !important;
    color: var(--pp-ink-2) !important;
    box-shadow: none !important;
  }

  @media (pointer: coarse) {
    [data-proto-surface="popup"] > textarea {
      font-size: 16px !important;
    }
  }

  @media ${COMPACT} {
    [data-proto-surface="popup"] {
      width: auto !important;
      padding: 22px 20px calc(20px + env(safe-area-inset-bottom, 0px)) !important;
      border-radius: 28px 28px 0 0 !important;
      background: var(--pp-paper) !important;
      box-shadow: 0 -12px 40px var(--pp-sh) !important;
    }

    [data-proto-surface="popup"] > div:last-child > button:last-child {
      min-width: 0 !important;
    }
  }

  /* ============ Annotation toolbar: a floating card near the top ============ */

  [data-proto-surface="toolbar"] {
    top: calc(env(safe-area-inset-top, 0px) + 14px) !important;
    width: fit-content !important;
    max-width: calc(100vw - 24px) !important;
    min-height: 64px !important;
    margin: 0 auto !important;
    padding: 10px 10px 10px 22px !important;
    gap: 14px !important;
    border: none !important;
    border-radius: 24px !important;
    background: var(--pp-paper) !important;
    color: var(--pp-ink) !important;
    font-size: 15.5px !important;
    line-height: 1.4 !important;
    box-shadow:
      0 2px 6px var(--pp-sh-soft),
      0 18px 44px -12px var(--pp-sh) !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  [data-proto-surface="toolbar"] > span:first-child {
    width: 10px !important;
    height: 10px !important;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--proto-accent) 18%, transparent) !important;
  }

  [data-proto-surface="toolbar"] > button {
    height: 44px !important;
    padding: 0 20px !important;
    border: none !important;
    border-radius: 999px !important;
    background: var(--pp-wash) !important;
    color: var(--pp-ink-2) !important;
    font-size: 15px !important;
    font-weight: 600 !important;
  }

  @media ${HOVER} {
    [data-proto-surface="toolbar"] > button:not([aria-disabled="true"]):hover {
      background: var(--pp-cancel-hover-bg) !important;
      color: var(--pp-cancel-hover-ink) !important;
    }
  }

  @media ${COMPACT} {
    [data-proto-surface="toolbar"] {
      top: calc(env(safe-area-inset-top, 0px) + 10px) !important;
      width: auto !important;
      margin: 0 10px !important;
      padding: 10px 10px 10px 18px !important;
      border-radius: 22px !important;
      font-size: 15px !important;
    }
  }

  /* ============ Drawing overlay ============ */

  [data-proto-surface="overlay"] {
    background: rgba(43, 38, 33, 0.06) !important;
  }

  html[data-proto-theme="dark"] [data-proto-surface="overlay"] {
    background: rgba(0, 0, 0, 0.16) !important;
  }

  [data-proto-surface="overlay"] > div {
    border: 2.5px solid var(--proto-accent) !important;
    border-radius: 16px !important;
    background: color-mix(in srgb, var(--proto-accent) 8%, transparent) !important;
    box-shadow:
      0 0 0 5px color-mix(in srgb, var(--proto-accent) 14%, transparent),
      0 12px 30px -12px rgba(84, 60, 32, 0.3) !important;
  }

  /* ============ Pins: a drop pointing at the note's element ============ */

  #siteping-markers > [data-feedback-id] {
    width: 28px !important;
    height: 28px !important;
    border-width: 2.5px !important;
    border-radius: 50% 50% 50% 5px !important;
    /* The pin's own type colour (its inline color) becomes the fill. */
    background-color: currentColor !important;
    background-clip: border-box !important;
    -webkit-text-fill-color: var(--pp-pin-ink) !important;
    font-size: 12.5px !important;
    font-weight: 700 !important;
    box-shadow:
      0 0 0 1.5px var(--pp-pin-ring),
      0 2px 4px rgba(84, 60, 32, 0.2),
      0 8px 16px -4px rgba(84, 60, 32, 0.28) !important;
    /* The hover zoom grows from the tip, which stays on its element. */
    transform-origin: 3px calc(100% - 3px) !important;
  }

  /* In progress (the only pin whose ring has four colours): the fill stops at
     the ring, so its faded half reads as the dashboard's half-filled circle. */
  #siteping-markers > [data-feedback-id][style*="border-color:"] {
    background-clip: padding-box !important;
  }

  /* Closed pins (resolved, won't fix): paper, the glyph in quiet ink. */
  #siteping-markers > [data-feedback-id][style*="rgb(203, 213, 225)"] {
    background-color: var(--pp-wash-2) !important;
    border-color: var(--pp-hair) !important;
    color: var(--pp-ink-2) !important;
    -webkit-text-fill-color: var(--pp-ink-2) !important;
  }

  #siteping-markers .sp-cluster-badge {
    min-width: 18px !important;
    height: 18px !important;
    border: 2px solid var(--pp-pin-ring) !important;
    -webkit-text-fill-color: #ffffff !important;
    font-size: 10.5px !important;
  }

  /* The highlighted element of a hovered pin: a soft rounded frame. */
  #siteping-markers > div:not([data-feedback-id]) {
    border-radius: 14px !important;
  }

  /* ============ Tooltip: a warm speech bubble ============ */

  #sp-tooltip {
    max-width: 300px !important;
    padding: 14px 16px 15px !important;
    border: none !important;
    border-radius: 20px !important;
    background: var(--pp-paper) !important;
    box-shadow:
      0 2px 6px var(--pp-sh-soft),
      0 16px 40px -10px var(--pp-sh) !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  #sp-tooltip > div:first-child {
    margin-bottom: 8px !important;
  }

  #sp-tooltip > div:first-child > span {
    font-size: 12.5px !important;
  }

  #sp-tooltip > div:first-child > span:not(:last-child) {
    padding: 3px 11px !important;
  }

  #sp-tooltip > div:first-child > span:last-child {
    color: var(--pp-ink-2) !important;
  }

  #sp-tooltip > div:nth-child(2) {
    color: var(--pp-ink) !important;
    font-size: 15px !important;
    line-height: 1.5 !important;
    -webkit-line-clamp: 3 !important;
  }

  /* Forced colours drop the shadows that drew these edges and rings. */
  @media (forced-colors: active) {
    :is([data-proto-surface="popup"], [data-proto-surface="toolbar"], #sp-tooltip),
    [data-proto-surface="popup"] button[data-type],
    [data-proto-surface="popup"] > div:last-child > button,
    [data-proto-surface="popup"] > textarea,
    [data-proto-surface="toolbar"] > button {
      border: 1px solid CanvasText !important;
    }

    [data-proto-surface="popup"] button[data-type][aria-pressed="true"] {
      outline: 3px solid Highlight !important;
      outline-offset: -3px;
    }
  }

  /* The tail, rounded at its tip. */
  #sp-tooltip > div:last-child {
    width: 14px !important;
    height: 14px !important;
    border-color: transparent !important;
    background: var(--pp-paper) !important;
  }

  #sp-tooltip > div:last-child[style*="bottom"] {
    margin-bottom: -1px !important;
    border-bottom-right-radius: 4px !important;
  }

  #sp-tooltip > div:last-child:not([style*="bottom"]) {
    margin-top: -1px !important;
    border-top-left-radius: 4px !important;
  }
`;

export const papier: Skin = {
  name: "Papier",
  axis: "Chaleur et lisibilité pour le client : papier chaud, texte plus grand, formes rondes, gestes rassurants",
  shadowCss,
  lightCss,
};
