import { Z_INDEX_MAX } from "../constants.js";
import { EXPORT_CSS } from "../export-utils.js";
import { BULK_CSS } from "../panel-bulk.js";
import { DETAIL_CSS } from "../panel-detail.js";
import { SORT_CSS } from "../panel-sort.js";
import { STATS_CSS } from "../panel-stats.js";
import { SHORTCUTS_CSS } from "../shortcuts.js";
import { ANIMATION_CSS } from "./animations.js";
import { MOBILE_CSS } from "./mobile.js";
import { cssVariables, type ThemeColors } from "./theme.js";

/**
 * Build the complete CSS stylesheet for the Shadow DOM.
 *
 * Design: Glassmorphism — frosted glass surfaces, soft depth,
 * accent gradients, premium micro-interactions.
 *
 * Principles:
 * - :host uses `all: initial` to block inherited styles
 * - All classes prefixed with sp- (defense in depth)
 * - CSS custom properties for theming
 * - No external fonts — system-ui stack (Inter if available)
 * - :focus-visible on all interactive elements
 * - prefers-reduced-motion support
 */
export function buildStyles(colors: ThemeColors): string {
  return /* css */ `
    :host {
      all: initial;
      position: fixed;
      z-index: ${Z_INDEX_MAX};
      font-family: var(--sp-font);
      font-size: 14px;
      line-height: 1.5;
      color: var(--sp-text);
      /* Match native sub-controls (autofill, scrollbars, etc.) to the resolved theme */
      color-scheme: ${colors.bg === "#ffffff" ? "light" : "dark"};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      ${cssVariables(colors)}

      /* Motion tokens (Emil Kowalski's curves): enter and answer the user with
         ease-out, move across the screen with ease-in-out, slide panels with
         the drawer curve. styles/animations.ts holds the shared rules. */
      --sp-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
      --sp-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
      --sp-ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
      /* The one transition of controls: colours ease, the press answers fast. */
      --sp-tr: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.16s var(--sp-ease-out);

      /* Identity modal — theme-aware backdrop + panel */
      --sp-identity-bg: ${colors.glassBgHeavy};
      --sp-identity-overlay: ${colors.bg === "#ffffff" ? "rgba(15, 23, 42, 0.2)" : "rgba(0, 0, 0, 0.4)"};
      /* Phone layout — dims the page behind bottom sheets and the speed dial */
      --sp-scrim: ${colors.bg === "#ffffff" ? "rgba(15, 23, 42, 0.32)" : "rgba(0, 0, 0, 0.5)"};
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* ============================
       Focus visible (accessibility)
       ============================ */

    :focus-visible {
      outline: 2px solid var(--sp-accent);
      outline-offset: 2px;
      /* Double-ring against any background colour: the bg-coloured halo
         separates the accent ring from busy host-page surfaces. */
      box-shadow: 0 0 0 4px var(--sp-bg);
    }

    /* ============================
       Touch and press (every control)
       ============================ */

    /* No double-tap delay, no text selection on a long press: controls answer
       the finger like native ones. Content stays selectable. */
    button,
    [role="button"],
    [role="tab"],
    [role="menuitem"],
    [role="option"] {
      touch-action: manipulation;
      -webkit-user-select: none;
      user-select: none;
    }

    /* The press is felt on pointer-down, at once (zero specificity: a control
       that positions itself with transform keeps it). */
    :where(
      .sp-panel-close,
      .sp-filter-dropdown-btn,
      .sp-segmented__btn,
      .sp-btn-resolve,
      .sp-btn-delete,
      .sp-btn-delete-all,
      .sp-btn-danger,
      .sp-btn-primary,
      .sp-btn-ghost,
      .sp-sort-btn,
      .sp-group-toggle,
      .sp-mine-toggle,
      .sp-export-btn,
      .sp-bulk-btn-resolve,
      .sp-bulk-btn-delete,
      .sp-bulk-btn-deselect,
      .sp-detail-back,
      .sp-detail-btn-resolve,
      .sp-detail-btn-reopen,
      .sp-detail-btn-delete,
      .sp-detail-btn-custom,
      .sp-detail-btn-goto,
      .sp-shortcuts-close
    ):not(:disabled):active {
      transform: scale(0.97);
    }

    /* Solid surfaces asked for: the theme already made glass opaque, so the
       blur would only cost paint. */
    @media (prefers-reduced-transparency: reduce) {
      * {
        -webkit-backdrop-filter: none !important;
        backdrop-filter: none !important;
      }
    }

    /* ============================
       FAB (Floating Action Button)
       ============================ */

    .sp-fab {
      position: fixed;
      width: 52px;
      height: 52px;
      border-radius: var(--sp-radius-full);
      background: var(--sp-accent-gradient);
      color: #fff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        0 4px 20px var(--sp-accent-glow),
        0 2px 8px rgba(0, 0, 0, 0.08);
      transition:
        transform 0.16s var(--sp-ease-out),
        box-shadow 0.2s ease;
      outline: none;
      touch-action: manipulation;
      -webkit-user-select: none;
      user-select: none;
    }

    .sp-fab:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 3px;
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-fab:hover {
        box-shadow:
          0 8px 28px var(--sp-accent-glow),
          0 4px 12px rgba(0, 0, 0, 0.1);
      }
    }

    .sp-fab:active {
      transform: scale(0.97);
    }

    .sp-fab--bottom-right {
      bottom: 24px;
      right: 24px;
    }

    .sp-fab--bottom-left {
      bottom: 24px;
      left: 24px;
    }

    .sp-fab svg {
      width: 22px;
      height: 22px;
      fill: currentColor;
    }

    /* ---- FAB Badge ---- */

    .sp-fab-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: var(--sp-radius-full);
      background: #ef4444;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #fff;
      pointer-events: none;
      font-family: var(--sp-font);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    /* ---- Submission outcome toast ---- */

    .sp-toast {
      position: fixed;
      left: 50%;
      bottom: 92px;
      transform: translateX(-50%);
      max-width: min(360px, calc(100vw - 32px));
      padding: 10px 14px;
      border-radius: var(--sp-radius-lg);
      background: var(--sp-text);
      color: var(--sp-bg);
      font: 500 13px/1.4 var(--sp-font);
      box-shadow: var(--sp-shadow-lg);
      cursor: pointer;
      animation: sp-toast-in 0.2s var(--sp-ease-out);
    }

    .sp-toast[hidden] {
      display: none;
    }

    .sp-toast--error {
      border-left: 4px solid var(--sp-type-bug);
    }

    @keyframes sp-toast-in {
      from { opacity: 0; transform: translate(-50%, 8px); }
    }

    /* ============================
       Radial Menu
       ============================ */

    .sp-radial {
      position: fixed;
      pointer-events: none;
      width: 52px;
      height: 52px;
    }

    .sp-radial--bottom-right {
      bottom: 24px;
      right: 24px;
    }

    .sp-radial--bottom-left {
      bottom: 24px;
      left: 24px;
    }

    .sp-radial-item {
      position: absolute;
      left: 4px;
      bottom: 4px;
      width: 44px;
      height: 44px;
      border-radius: var(--sp-radius-full);
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(var(--sp-blur));
      -webkit-backdrop-filter: blur(var(--sp-blur));
      color: var(--sp-text);
      border: 1px solid var(--sp-glass-border);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--sp-shadow-md);
      font-size: 12px;
      font-weight: 600;
    }

    .sp-radial-item:focus-visible {
      background: rgba(255, 255, 255, 0.95);
      border-color: var(--sp-accent);
      color: var(--sp-accent-text);
      box-shadow:
        var(--sp-shadow-md),
        0 0 0 3px var(--sp-accent-light);
      outline: none;
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-radial-item:hover {
        background: rgba(255, 255, 255, 0.95);
        border-color: var(--sp-accent);
        color: var(--sp-accent-text);
        box-shadow:
          var(--sp-shadow-md),
          0 0 0 3px var(--sp-accent-light);
        outline: none;
      }
    }

    .sp-radial-item svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      stroke: currentColor;
      fill: none;
    }

    .sp-radial-label {
      position: absolute;
      top: 50%;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 500;
      color: var(--sp-text);
      pointer-events: none;
      opacity: 0;
      padding: 4px 12px;
      border-radius: var(--sp-radius);
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--sp-glass-border);
      box-shadow: var(--sp-shadow-sm);
      transform: translate(4px, -50%);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    .sp-radial--bottom-right .sp-radial-label {
      right: calc(100% + 12px);
    }

    .sp-radial--bottom-left .sp-radial-label {
      left: calc(100% + 12px);
      transform: translate(-4px, -50%);
    }

    .sp-radial-item:focus-visible .sp-radial-label {
      opacity: 1;
      transform: translate(0, -50%);
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-radial-item:hover .sp-radial-label {
        opacity: 1;
        transform: translate(0, -50%);
      }
    }

    /* ============================
       Panel (Side drawer)
       ============================ */

    .sp-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      max-width: 100vw;
      height: 100vh;
      height: 100dvh;
      background: var(--sp-glass-bg);
      backdrop-filter: blur(var(--sp-blur-heavy));
      -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
      border-left: 1px solid var(--sp-glass-border);
      box-shadow: var(--sp-shadow-xl);
      display: flex;
      flex-direction: column;
      /* clip, not hidden: a hidden box still scrolls under scrollIntoView and
         focus(), which shifted the header and the parked detail view. */
      overflow: clip;
    }

    .sp-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(var(--sp-blur));
      -webkit-backdrop-filter: blur(var(--sp-blur));
      position: relative;
      z-index: 2;
    }

    .sp-panel-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--sp-text);
      letter-spacing: -0.02em;
    }

    .sp-panel-close {
      width: 44px;
      height: 44px;
      border-radius: var(--sp-radius);
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--sp-text-tertiary);
      transition: var(--sp-tr);
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-panel-close:hover {
        background: var(--sp-bg-hover);
        color: var(--sp-text);
      }
    }

    .sp-panel-close svg {
      width: 16px;
      height: 16px;
    }

    /* ============================
       Filters & Search
       ============================ */

    .sp-filters {
      padding: 16px 24px;
      border-bottom: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(var(--sp-blur));
      -webkit-backdrop-filter: blur(var(--sp-blur));
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .sp-search-wrap {
      position: relative;
      margin-bottom: 12px;
    }

    .sp-search {
      width: 100%;
      height: 40px;
      padding: 0 12px 0 38px;
      border-radius: var(--sp-radius);
      border: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 13px;
      outline: none;
      transition: var(--sp-tr);
    }

    .sp-search::placeholder {
      color: var(--sp-text-tertiary);
    }

    .sp-search:focus {
      border-color: var(--sp-accent);
      box-shadow: 0 0 0 3px var(--sp-accent-light);
      background: var(--sp-bg);
    }

    .sp-search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--sp-text-tertiary);
      width: 16px;
      height: 16px;
      transition: color 0.2s ease;
    }

    .sp-search:focus ~ .sp-search-icon,
    .sp-search-wrap:focus-within .sp-search-icon {
      color: var(--sp-accent-text);
    }

    /* ============================
       Filter bar (type dropdown + status segmented)
       ============================ */

    .sp-filter-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    /* ============================
       Type filter dropdown
       ============================ */

    .sp-filter-dropdown {
      position: relative;
      flex: 1 1 auto;
      min-width: 0;
    }

    .sp-filter-dropdown-btn {
      --sp-chip-color: var(--sp-text-secondary);
      --sp-chip-bg: var(--sp-glass-bg-heavy);

      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      height: 32px;
      padding: 0 8px 0 10px;
      border-radius: var(--sp-radius-full);
      border: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: var(--sp-tr);
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-filter-dropdown-btn:hover {
        border-color: var(--sp-chip-color);
        background: var(--sp-chip-bg);
      }
    }

    .sp-filter-dropdown-btn[aria-expanded="true"] {
      border-color: var(--sp-chip-color);
      background: var(--sp-chip-bg);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--sp-chip-color) 14%, transparent);
    }

    .sp-filter-dropdown-btn--filtered {
      border-color: var(--sp-chip-color);
      background: var(--sp-chip-bg);
    }

    .sp-filter-dropdown-btn__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      color: var(--sp-chip-color);
    }

    .sp-filter-dropdown-btn__icon svg {
      width: 14px;
      height: 14px;
    }

    .sp-filter-dropdown-btn__label {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }

    .sp-filter-dropdown-btn__prefix {
      color: var(--sp-text-tertiary);
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .sp-filter-dropdown-btn__value {
      color: var(--sp-chip-color);
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sp-filter-dropdown-btn__chevron {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      color: var(--sp-text-tertiary);
      transition: transform 0.2s var(--sp-ease-out), color 0.15s ease;
    }

    .sp-filter-dropdown-btn__chevron svg {
      width: 12px;
      height: 12px;
    }

    .sp-filter-dropdown-btn[aria-expanded="true"] .sp-filter-dropdown-btn__chevron {
      transform: rotate(180deg);
      color: var(--sp-chip-color);
    }

    .sp-filter-dropdown-menu {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      min-width: 180px;
      padding: 4px;
      border-radius: var(--sp-radius);
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(var(--sp-blur-heavy));
      -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
      border: 1px solid var(--sp-glass-border);
      box-shadow: var(--sp-shadow-md);
      z-index: 10;
      transform-origin: top left;
      animation: sp-menu-in 0.15s var(--sp-ease-out) backwards;
    }

    /* Every dropdown grows out of its trigger, above it (origin set per menu). */
    @keyframes sp-menu-in {
      from { opacity: 0; transform: scale(0.96); }
    }

    .sp-filter-dropdown-option {
      --sp-chip-color: var(--sp-text-secondary);
      --sp-chip-bg: transparent;

      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px 10px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: background-color 0.12s ease, color 0.12s ease;
    }

    .sp-filter-dropdown-option__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      border-radius: 6px;
      background: var(--sp-chip-bg);
      color: var(--sp-chip-color);
    }

    .sp-filter-dropdown-option__icon svg {
      width: 13px;
      height: 13px;
    }

    .sp-filter-dropdown-option__label {
      flex: 1;
      min-width: 0;
    }

    .sp-filter-dropdown-option__check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      color: var(--sp-chip-color);
    }

    .sp-filter-dropdown-option__check svg {
      width: 13px;
      height: 13px;
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-filter-dropdown-option:hover {
        background: var(--sp-bg-hover);
      }
    }

    .sp-filter-dropdown-option--active {
      color: var(--sp-chip-color);
      font-weight: 600;
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-filter-dropdown-option--active:hover {
        background: var(--sp-chip-bg);
      }
    }

    /* ============================
       Status segmented control
       ============================ */

    .sp-segmented {
      display: inline-flex;
      align-items: stretch;
      padding: 2px;
      border-radius: var(--sp-radius-full);
      border: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      flex-shrink: 0;
    }

    .sp-segmented__btn {
      --sp-chip-color: var(--sp-text-tertiary);
      --sp-chip-bg: transparent;

      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 26px;
      padding: 0 10px;
      border: none;
      border-radius: var(--sp-radius-full);
      background: transparent;
      color: var(--sp-text-secondary);
      font-family: var(--sp-font);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: var(--sp-tr);
    }

    .sp-segmented__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 13px;
      height: 13px;
      flex-shrink: 0;
      color: var(--sp-chip-color);
      transition: color 0.15s ease;
    }

    .sp-segmented__icon svg {
      width: 13px;
      height: 13px;
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-segmented__btn:hover {
        color: var(--sp-chip-color);
      }
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-segmented__btn:hover .sp-segmented__icon {
        color: var(--sp-chip-color);
      }
    }

    .sp-segmented__btn--active {
      background: var(--sp-chip-bg);
      color: var(--sp-chip-color);
      font-weight: 600;
      box-shadow:
        inset 0 0 0 1px color-mix(in srgb, var(--sp-chip-color) 35%, transparent),
        0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .sp-segmented__btn--active .sp-segmented__icon {
      color: var(--sp-chip-color);
    }

    /* ============================
       Feedback Cards
       ============================ */

    .sp-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 12px;
    }

    .sp-list::-webkit-scrollbar {
      width: 6px;
    }

    .sp-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .sp-list::-webkit-scrollbar-thumb {
      background: var(--sp-border);
      border-radius: var(--sp-radius-full);
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-list::-webkit-scrollbar-thumb:hover {
        background: var(--sp-text-tertiary);
      }
    }

    .sp-card {
      display: flex;
      padding: 14px 16px;
      margin-bottom: 6px;
      cursor: pointer;
      border-radius: var(--sp-radius);
      background: var(--sp-glass-bg-heavy);
      border: 1px solid var(--sp-glass-border);
      box-shadow: var(--sp-shadow-xs);
      transition: var(--sp-tr);
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-card:hover {
        background: var(--sp-bg);
        border-color: var(--sp-border);
        box-shadow: var(--sp-shadow-md);
      }
    }

    .sp-card:active {
      transform: scale(0.99);
    }

    .sp-card-bar {
      width: 3px;
      border-radius: var(--sp-radius-full);
      margin-right: 14px;
      flex-shrink: 0;
    }

    .sp-card-body {
      flex: 1;
      min-width: 0;
    }

    /* Long translated statuses (ru, fr, de) wrap the row, never a badge. */
    .sp-card-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 8px;
      margin-bottom: 6px;
    }

    .sp-card-number {
      font-size: 12px;
      font-weight: 700;
      color: var(--sp-text-tertiary);
      font-variant-numeric: tabular-nums;
    }

    .sp-badge {
      white-space: nowrap;
      padding: 2px 10px;
      border-radius: var(--sp-radius-full);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .sp-card-date {
      font-size: 11px;
      color: var(--sp-text-tertiary);
      margin-left: auto;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .sp-lost {
      font-size: 11px;
      color: var(--sp-text-tertiary);
      margin-top: 4px;
    }

    .sp-card-message {
      font-size: 13px;
      line-height: 1.5;
      color: var(--sp-text);
      /* URLs and long compounds break instead of running out of the card. */
      overflow-wrap: anywhere;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .sp-card-message--expanded {
      -webkit-line-clamp: unset;
    }

    .sp-card-expand {
      font-size: 12px;
      font-weight: 500;
      color: var(--sp-accent-text);
      cursor: pointer;
      background: none;
      border: none;
      padding: 4px 0;
      font-family: var(--sp-font);
      transition: opacity 0.15s ease;
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-card-expand:hover {
        opacity: 0.8;
      }
    }

    .sp-card-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      margin-top: 10px;
    }

    .sp-btn-resolve,
    .sp-btn-delete {
      padding: 8px 14px;
      border-radius: var(--sp-radius-full);
      border: 1px solid var(--sp-border);
      background: transparent;
      color: var(--sp-text-secondary);
      font-family: var(--sp-font);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: var(--sp-tr);
    }

    .sp-btn-resolve svg,
    .sp-btn-delete svg {
      width: 14px;
      height: 14px;
    }

    /* Hovered text in the theme's own green and red: green-500 and red-500
       read 2.2:1 and 3.8:1 on this tint in the light theme. */
    @media (hover: hover) and (pointer: fine) {
      .sp-btn-resolve:hover {
        border-color: var(--sp-status-open);
        color: var(--sp-status-open);
        background: rgba(34, 197, 94, 0.06);
      }
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-btn-delete:hover {
        border-color: var(--sp-type-bug);
        color: var(--sp-type-bug);
        background: rgba(239, 68, 68, 0.06);
      }
    }

    .sp-btn-resolve:disabled,
    .sp-btn-delete:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .sp-spinner--sm {
      width: 14px;
      height: 14px;
    }

    /* ---- Delete All (header) ---- */

    .sp-panel-header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sp-btn-delete-all {
      padding: 5px 12px;
      border-radius: var(--sp-radius-full);
      border: 1px solid var(--sp-border);
      background: transparent;
      color: var(--sp-text-tertiary);
      font-family: var(--sp-font);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: var(--sp-tr);
    }

    .sp-btn-delete-all svg {
      width: 13px;
      height: 13px;
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-btn-delete-all:hover {
        border-color: #ef4444;
        color: #ef4444;
        background: rgba(239, 68, 68, 0.06);
      }
    }

    .sp-btn-delete-all:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* ---- Confirm Dialog ---- */

    .sp-confirm-backdrop {
      position: fixed;
      inset: 0;
      background: var(--sp-backdrop, rgba(15, 23, 42, 0.2));
      backdrop-filter: blur(var(--sp-blur));
      -webkit-backdrop-filter: blur(var(--sp-blur));
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: ${Z_INDEX_MAX};
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .sp-confirm-dialog {
      width: min(340px, calc(100vw - 32px));
      padding: 28px;
      border-radius: 20px;
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(var(--sp-blur-heavy));
      -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
      border: 1px solid var(--sp-glass-border);
      box-shadow: var(--sp-shadow-xl);
      font-family: var(--sp-font);
      transform: translateY(8px) scale(0.97);
      transition: transform 0.2s var(--sp-ease-out);
    }

    .sp-confirm-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--sp-text);
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }

    .sp-confirm-message {
      font-size: 14px;
      color: var(--sp-text-secondary);
      line-height: 1.5;
      margin-bottom: 20px;
    }

    .sp-confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .sp-btn-danger {
      height: 40px;
      padding: 0 22px;
      border-radius: var(--sp-radius);
      border: none;
      background: #ef4444;
      color: #fff;
      font-family: var(--sp-font);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: var(--sp-tr);
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-btn-danger:hover {
        background: #dc2626;
        box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
      }
    }

    .sp-card--resolved {
      opacity: 0.5;
    }

    .sp-card--resolved .sp-card-message {
      text-decoration: line-through;
      text-decoration-color: var(--sp-text-tertiary);
    }

    /* ============================
       Loading State
       ============================ */

    .sp-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
    }

    /* ============================
       Identity Form
       ============================ */

    .sp-identity-backdrop {
      position: fixed;
      inset: 0;
      background: var(--sp-identity-overlay);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: ${Z_INDEX_MAX};
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .sp-identity-modal {
      width: 340px;
      max-width: calc(100vw - 32px);
      padding: 28px;
      border-radius: var(--sp-radius-xl);
      background: var(--sp-identity-bg);
      backdrop-filter: blur(var(--sp-blur-heavy));
      -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
      border: 1px solid var(--sp-glass-border);
      box-shadow: 0 16px 48px var(--sp-shadow), 0 8px 16px var(--sp-shadow);
      font-family: var(--sp-font);
      color: var(--sp-text);
      transform: translateY(12px) scale(0.97);
      transition: transform 0.2s var(--sp-ease-out);
    }

    .sp-identity--open {
      opacity: 1;
    }

    .sp-identity--open .sp-identity-modal {
      transform: none;
    }

    .sp-identity-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 20px;
    }

    .sp-identity-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--sp-text);
      letter-spacing: -0.02em;
    }

    .sp-input {
      width: 100%;
      height: 42px;
      padding: 0 14px;
      border-radius: var(--sp-radius);
      border: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 14px;
      outline: none;
      transition: var(--sp-tr);
    }

    .sp-input::placeholder {
      color: var(--sp-text-tertiary);
    }

    .sp-input:focus {
      border-color: var(--sp-accent);
      box-shadow: 0 0 0 3px var(--sp-accent-light);
      background: var(--sp-bg);
    }

    .sp-input-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--sp-text-secondary);
      margin-bottom: 6px;
      display: block;
    }

    /* ============================
       Buttons
       ============================ */

    .sp-btn-primary {
      height: 40px;
      padding: 0 22px;
      border-radius: var(--sp-radius);
      border: none;
      background: var(--sp-accent-gradient);
      color: #fff;
      font-family: var(--sp-font);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: var(--sp-tr);
      box-shadow: 0 2px 8px var(--sp-accent-glow);
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-btn-primary:hover {
        box-shadow: 0 4px 16px var(--sp-accent-glow);
      }
    }

    .sp-btn-primary:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .sp-btn-ghost {
      height: 40px;
      padding: 0 22px;
      border-radius: var(--sp-radius);
      border: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      color: var(--sp-text-secondary);
      font-family: var(--sp-font);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: var(--sp-tr);
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-btn-ghost:hover {
        border-color: var(--sp-accent);
        color: var(--sp-accent-text);
        background: var(--sp-accent-light);
      }
    }

    /* ============================
       Empty State
       ============================ */

    .sp-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 56px 24px;
      color: var(--sp-text-tertiary);
      text-align: center;
      gap: 8px;
    }

    .sp-empty-text {
      font-size: 14px;
      font-weight: 500;
    }

    /* ============================
       Load More
       ============================ */

    .sp-load-more-wrap {
      display: flex;
      justify-content: center;
      padding: 12px 0 4px;
    }

    .sp-btn-load-more {
      width: 100%;
    }

    /* ============================
       Forced Colors / High Contrast
       ============================ */

    @media (forced-colors: active) {
      .sp-fab,
      .sp-radial-item,
      .sp-filter-dropdown-btn,
      .sp-segmented,
      .sp-segmented__btn,
      .sp-card,
      .sp-panel-close,
      .sp-search,
      .sp-btn-resolve,
      .sp-btn-delete,
      .sp-btn-delete-all,
      .sp-btn-primary,
      .sp-btn-ghost,
      .sp-btn-danger,
      .sp-card-expand,
      .sp-input,
      .sp-confirm-dialog {
        border: 2px solid ButtonText !important;
        background: Canvas !important;
        color: ButtonText !important;
      }

      .sp-segmented__btn--active {
        background: Highlight !important;
        color: HighlightText !important;
      }

      .sp-filter-dropdown-menu {
        border: 2px solid ButtonText !important;
        background: Canvas !important;
      }

      .sp-filter-dropdown-option--active {
        background: Highlight !important;
        color: HighlightText !important;
      }

      .sp-fab:focus-visible,
      .sp-radial-item:focus-visible,
      .sp-filter-dropdown-btn:focus-visible,
      .sp-segmented__btn:focus-visible,
      .sp-filter-dropdown-option:focus-visible,
      .sp-panel-close:focus-visible,
      .sp-btn-resolve:focus-visible,
      .sp-btn-delete:focus-visible,
      .sp-btn-delete-all:focus-visible,
      .sp-btn-primary:focus-visible,
      .sp-btn-ghost:focus-visible,
      .sp-btn-danger:focus-visible,
      .sp-card-expand:focus-visible,
      .sp-input:focus-visible,
      .sp-search:focus-visible {
        outline: 3px solid Highlight !important;
      }

      .sp-panel {
        border: 2px solid ButtonText !important;
      }

      .sp-fab-badge {
        border: 2px solid ButtonText !important;
        background: Canvas !important;
        color: ButtonText !important;
      }

      .sp-card-bar {
        background: ButtonText !important;
      }
    }

    ${ANIMATION_CSS}
    ${STATS_CSS}
    ${SORT_CSS}
    ${BULK_CSS}
    ${EXPORT_CSS}
    ${SHORTCUTS_CSS}
    ${DETAIL_CSS}
    ${MOBILE_CSS}
  `;
}
