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
 * Design: native, after Apple's system UI. The panel is a floating sheet of
 * thick translucent material, lists are inset grouped rows, and controls are
 * the system ones: filled search field, segmented control, tinted capsules,
 * filled buttons. Surfaces read the `--sp-*` tokens of styles/theme.ts.
 *
 * Principles:
 * - :host uses `all: initial` to block inherited styles
 * - All classes prefixed with sp- (defense in depth)
 * - CSS custom properties for theming, resolved per scheme in JS (no
 *   light-dark(), which browsers before 2024 drop)
 * - No external fonts: the system face (San Francisco on Apple, Inter if available)
 * - :focus-visible on all interactive elements
 * - prefers-reduced-motion support
 */
export function buildStyles(colors: ThemeColors): string {
  const dark = colors.scheme === "dark";
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
      color-scheme: ${colors.scheme};
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

      /* Neutral dims behind the confirm and shortcuts dialogs, the identity
         form, and (phones) the bottom sheets and the speed dial. */
      --sp-backdrop: ${dark ? "rgba(0, 0, 0, 0.45)" : "rgba(0, 0, 0, 0.2)"};
      --sp-identity-overlay: ${dark ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.2)"};
      --sp-scrim: ${dark ? "rgba(0, 0, 0, 0.55)" : "rgba(0, 0, 0, 0.24)"};
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

    /* ============================
       FAB (Floating Action Button)
       ============================ */

    /* Flat accent, a top sheen and a coloured drop shadow, like a system button. */
    .sp-fab {
      position: fixed;
      width: 54px;
      height: 54px;
      border-radius: var(--sp-radius-full);
      background: var(--sp-accent);
      color: #fff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.22),
        0 8px 24px color-mix(in srgb, var(--sp-accent) 36%, transparent),
        0 2px 6px rgba(0, 0, 0, 0.12);
      transition:
        transform 0.16s var(--sp-ease-out),
        opacity 0.2s ease,
        box-shadow 0.2s ease;
      outline: none;
      touch-action: manipulation;
      -webkit-user-select: none;
      user-select: none;
    }

    .sp-fab:focus-visible {
      outline: 2px solid var(--sp-accent);
      outline-offset: 3px;
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-fab:hover {
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.22),
          0 12px 32px color-mix(in srgb, var(--sp-accent) 46%, transparent),
          0 3px 8px rgba(0, 0, 0, 0.14);
      }
    }

    .sp-fab:active {
      transform: scale(0.97);
    }

    /* The open sheet covers the button: it steps back instead of glowing
       through the material. */
    div:has(> .sp-fab):has(~ .sp-panel.sp-panel--open) > .sp-fab {
      opacity: 0;
      transform: scale(0.9);
      pointer-events: none;
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
      width: 23px;
      height: 23px;
      fill: currentColor;
    }

    /* ---- FAB Badge ---- */

    .sp-fab-badge {
      position: absolute;
      top: -3px;
      right: -3px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: var(--sp-radius-full);
      background: var(--sp-danger);
      color: #fff;
      font: 600 11px/1 var(--sp-font);
      display: flex;
      align-items: center;
      justify-content: center;
      /* Cut out of the button by a ring of the page-facing background. */
      border: 2px solid var(--sp-bg);
      pointer-events: none;
    }

    /* ---- Submission outcome toast: a material capsule ---- */

    .sp-toast {
      position: fixed;
      left: 50%;
      bottom: 96px;
      transform: translateX(-50%);
      max-width: min(360px, calc(100vw - 32px));
      padding: 11px 18px;
      border-radius: 20px;
      background: var(--sp-material-thick);
      -webkit-backdrop-filter: var(--sp-material-blur);
      backdrop-filter: var(--sp-material-blur);
      color: var(--sp-text);
      font: 500 14px/1.35 var(--sp-font);
      letter-spacing: -0.01em;
      box-shadow: inset 0 0.5px 0 var(--sp-edge), var(--sp-shadow-float);
      cursor: pointer;
      animation: sp-toast-in 0.2s var(--sp-ease-out);
      transition: opacity 0.15s ease;
    }

    .sp-toast--leaving {
      opacity: 0;
    }

    .sp-toast[hidden] {
      display: none;
    }

    /* A failure carries a red dot before its text. */
    .sp-toast--error::before {
      content: "";
      display: inline-block;
      width: 8px;
      height: 8px;
      margin-right: 8px;
      border-radius: 50%;
      background: var(--sp-type-bug);
      vertical-align: 1px;
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
      width: 54px;
      height: 54px;
    }

    .sp-radial--bottom-right {
      bottom: 24px;
      right: 24px;
    }

    .sp-radial--bottom-left {
      bottom: 24px;
      left: 24px;
    }

    /* Material buttons and labels: the bright top edge catches the light. */
    .sp-radial-item {
      position: absolute;
      left: 5px;
      bottom: 5px;
      width: 44px;
      height: 44px;
      border-radius: var(--sp-radius-full);
      background: var(--sp-material-thick);
      -webkit-backdrop-filter: var(--sp-material-blur);
      backdrop-filter: var(--sp-material-blur);
      color: var(--sp-text);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 0.5px 0 var(--sp-edge), var(--sp-shadow-float);
      font-size: 12px;
      font-weight: 600;
    }

    .sp-radial-item:focus-visible {
      background: var(--sp-row);
      color: var(--sp-accent-ink);
      box-shadow: var(--sp-shadow-float), var(--sp-ring);
      outline: none;
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-radial-item:hover {
        background: var(--sp-row);
        color: var(--sp-accent-ink);
      }
    }

    .sp-radial-item svg {
      width: 19px;
      height: 19px;
      flex-shrink: 0;
      stroke: currentColor;
      fill: none;
    }

    .sp-radial-label {
      position: absolute;
      top: 50%;
      white-space: nowrap;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: -0.01em;
      color: var(--sp-text);
      pointer-events: none;
      opacity: 0;
      padding: 6px 12px;
      border-radius: var(--sp-radius-full);
      background: var(--sp-material-thick);
      -webkit-backdrop-filter: var(--sp-material-blur);
      backdrop-filter: var(--sp-material-blur);
      box-shadow: inset 0 0.5px 0 var(--sp-edge), var(--sp-shadow-float);
      transform: translate(4px, -50%);
      transition:
        opacity 0.18s ease,
        transform 0.2s var(--sp-ease-out);
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
       Panel: a floating inset sheet
       ============================ */

    .sp-panel {
      position: fixed;
      top: 12px;
      right: 12px;
      bottom: 12px;
      width: 380px;
      max-width: calc(100vw - 24px);
      border-radius: var(--sp-radius-xl);
      background: var(--sp-material);
      -webkit-backdrop-filter: var(--sp-material-blur);
      backdrop-filter: var(--sp-material-blur);
      /* A bright top edge, a faint inner rim, then the hairline and the drop. */
      box-shadow: inset 0 0.5px 0 var(--sp-edge), inset 0 0 0 0.5px var(--sp-sheen-soft), var(--sp-shadow-sheet);
      display: flex;
      flex-direction: column;
      /* clip, not hidden: a hidden box still scrolls under scrollIntoView and
         focus(), which shifted the header and the parked detail view. */
      overflow: clip;
    }

    /* The header and the filters sit on the sheet's own material: no bands. */
    .sp-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 12px 8px 20px;
      position: relative;
      z-index: 2;
    }

    /* A large title, as at the top of a system list. */
    .sp-panel-title {
      font-family: var(--sp-font-display);
      font-size: 28px;
      font-weight: 700;
      line-height: 1.15;
      color: var(--sp-text);
      letter-spacing: -0.022em;
    }

    /* Close: a 30px filled circle inside a 44px target. */
    .sp-panel-close {
      position: relative;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--sp-text-secondary);
      transition: var(--sp-tr);
    }

    .sp-panel-close::before {
      content: "";
      position: absolute;
      inset: 7px;
      border-radius: 50%;
      background: var(--sp-fill);
      transition: background-color 0.15s ease;
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-panel-close:hover {
        color: var(--sp-text);
      }

      .sp-panel-close:hover::before {
        background: var(--sp-fill-strong);
      }
    }

    .sp-panel-close svg {
      position: relative;
      width: 13px;
      height: 13px;
      stroke-width: 2.6;
    }

    /* ============================
       Filters & Search
       ============================ */

    .sp-filters {
      padding: 2px 16px 10px;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .sp-search-wrap {
      position: relative;
      margin-bottom: 10px;
    }

    /* A filled field; focus adds the accent ring, not a border. */
    .sp-search {
      width: 100%;
      height: 36px;
      padding: 0 12px 0 34px;
      border-radius: var(--sp-radius);
      border: none;
      background: var(--sp-fill);
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 15px;
      letter-spacing: -0.01em;
      outline: none;
      transition: var(--sp-tr);
    }

    .sp-search::placeholder {
      color: var(--sp-text-secondary);
    }

    .sp-search:focus {
      box-shadow: var(--sp-ring);
    }

    .sp-search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--sp-text-secondary);
      width: 16px;
      height: 16px;
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

    /* Type menu trigger: a borderless fill capsule, tinted once it filters. */
    .sp-filter-dropdown-btn {
      --sp-chip-color: var(--sp-text-secondary);

      display: inline-flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      height: 32px;
      padding: 0 10px;
      border-radius: var(--sp-radius-full);
      border: none;
      background: var(--sp-fill);
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: var(--sp-tr);
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-filter-dropdown-btn:hover {
        background: var(--sp-fill-strong);
      }
    }

    .sp-filter-dropdown-btn[aria-expanded="true"] {
      background: var(--sp-fill-strong);
    }

    .sp-filter-dropdown-btn--filtered,
    .sp-filter-dropdown-btn--filtered[aria-expanded="true"] {
      background: color-mix(in srgb, var(--sp-chip-color) 14%, transparent);
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
      color: var(--sp-text-secondary);
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .sp-filter-dropdown-btn__value {
      color: var(--sp-text);
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* The chosen type in its own colour, pushed toward the text to read on its tint. */
    .sp-filter-dropdown-btn--filtered .sp-filter-dropdown-btn__value {
      color: color-mix(in srgb, var(--sp-chip-color) var(--sp-ink-pct), var(--sp-ink-mix));
    }

    .sp-filter-dropdown-btn__chevron {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      color: var(--sp-text-secondary);
      transition: transform 0.2s var(--sp-ease-out);
    }

    .sp-filter-dropdown-btn__chevron svg {
      width: 12px;
      height: 12px;
    }

    .sp-filter-dropdown-btn[aria-expanded="true"] .sp-filter-dropdown-btn__chevron {
      transform: rotate(180deg);
    }

    /* Menus: thick material, rounded, rows highlight with a fill. */
    .sp-filter-dropdown-menu {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      min-width: 180px;
      padding: 6px;
      border-radius: var(--sp-radius-lg);
      background: var(--sp-material-thick);
      -webkit-backdrop-filter: var(--sp-material-blur);
      backdrop-filter: var(--sp-material-blur);
      box-shadow: inset 0 0.5px 0 var(--sp-edge), var(--sp-shadow-float);
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

      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      min-height: 34px;
      padding: 7px 10px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 13px;
      font-weight: 400;
      letter-spacing: -0.005em;
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
      background: color-mix(in srgb, var(--sp-chip-color) 14%, transparent);
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
      color: var(--sp-accent-ink);
    }

    .sp-filter-dropdown-option__check svg {
      width: 13px;
      height: 13px;
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-filter-dropdown-option:hover {
        background: var(--sp-fill);
      }
    }

    /* The chosen row keeps the text colour: the check marks it. */
    .sp-filter-dropdown-option--active {
      font-weight: 600;
    }

    /* ============================
       Status segmented control
       ============================ */

    /* A grey track and a raised thumb; the status icons keep their colour. */
    .sp-segmented {
      display: inline-flex;
      align-items: stretch;
      padding: 2px;
      border-radius: 9px;
      background: var(--sp-fill);
      flex-shrink: 0;
    }

    .sp-segmented__btn {
      --sp-chip-color: var(--sp-text-tertiary);

      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 28px;
      padding: 0 10px;
      border: none;
      border-radius: 7px;
      background: transparent;
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 13px;
      font-weight: 500;
      letter-spacing: -0.01em;
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
    }

    .sp-segmented__icon svg {
      width: 13px;
      height: 13px;
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-segmented__btn:not(.sp-segmented__btn--active):hover {
        background: var(--sp-sheen);
      }
    }

    .sp-segmented__btn--active {
      background: var(--sp-thumb);
      font-weight: 600;
      box-shadow: var(--sp-shadow-thumb);
    }

    /* ============================
       Feedback Cards
       ============================ */

    /* Inset grouped list: solid rows on the material. The top edge fades so
       rows slide under the filters instead of being cut. */
    .sp-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 16px 16px;
      -webkit-mask-image: linear-gradient(to bottom, transparent, #000 8px);
      mask-image: linear-gradient(to bottom, transparent, #000 8px);
    }

    .sp-list::-webkit-scrollbar {
      width: 6px;
    }

    .sp-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .sp-list::-webkit-scrollbar-thumb {
      background: var(--sp-fill-strong);
      border-radius: var(--sp-radius-full);
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-list::-webkit-scrollbar-thumb:hover {
        background: var(--sp-text-tertiary);
      }
    }

    .sp-card {
      position: relative;
      display: flex;
      padding: 12px 14px 12px 12px;
      margin-bottom: 8px;
      cursor: pointer;
      border-radius: var(--sp-radius-lg);
      background: var(--sp-row);
      box-shadow: var(--sp-shadow-row);
      transition: var(--sp-tr);
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-card:hover {
        background: var(--sp-row-hover);
        box-shadow: var(--sp-shadow-row-hover);
      }
    }

    .sp-card:active {
      transform: scale(0.985);
    }

    /* The type as a dot beside the number, not a bar down the row. */
    .sp-card-bar {
      align-self: flex-start;
      width: 8px;
      height: 8px;
      margin: 6px 10px 0 2px;
      border-radius: 50%;
      flex-shrink: 0;
      /* Edit mode hides it under the round check (panel-bulk.ts). */
      transition: opacity 0.15s ease;
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
      gap: 4px 6px;
      margin-bottom: 4px;
    }

    .sp-card-number {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--sp-text);
      font-variant-numeric: tabular-nums;
    }

    /* Tinted capsules. panel.ts paints each badge inline (colour and pastel
       background per type and status): the tint is drawn from that colour,
       hence !important over the inline background, and the text is the colour
       pushed toward the text so it reads on the tint. */
    .sp-badge {
      white-space: nowrap;
      padding: 2px 8px;
      border-radius: var(--sp-radius-full);
      font-size: 11px;
      font-weight: 600;
      line-height: 16px;
      letter-spacing: 0.01em;
      background: color-mix(in srgb, currentColor 13%, transparent) !important;
      -webkit-text-fill-color: color-mix(in srgb, currentColor var(--sp-ink-pct-badge), var(--sp-ink-mix));
    }

    .sp-card-date {
      font-size: 12px;
      color: var(--sp-text-tertiary);
      margin-left: auto;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .sp-lost {
      font-size: 12px;
      color: var(--sp-text-tertiary);
      margin-top: 4px;
    }

    .sp-card-message {
      font-size: 14px;
      line-height: 1.43;
      letter-spacing: -0.006em;
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
      font-size: 13px;
      font-weight: 500;
      color: var(--sp-accent-ink);
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

    /* Card actions: tinted text buttons, aligned on the row's right edge. */
    .sp-card-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 2px;
      margin-top: 6px;
      margin-right: -6px;
    }

    .sp-btn-resolve,
    .sp-btn-delete {
      height: 30px;
      padding: 0 10px;
      border-radius: 8px;
      border: none;
      background: transparent;
      font-family: var(--sp-font);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: var(--sp-tr);
    }

    .sp-btn-resolve svg,
    .sp-btn-delete svg {
      width: 14px;
      height: 14px;
    }

    /* Inks, not the raw status colours: they read 4.5:1 on the row and on
       their own hover tint. Reopening (a resolved card) is an accent action. */
    .sp-btn-resolve {
      color: var(--sp-ink-green);
    }

    .sp-card--resolved .sp-btn-resolve {
      color: var(--sp-accent-ink);
    }

    .sp-btn-delete {
      color: var(--sp-ink-red);
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-btn-resolve:hover {
        background: color-mix(in srgb, var(--sp-status-open) 10%, transparent);
      }

      .sp-card--resolved .sp-btn-resolve:hover {
        background: color-mix(in srgb, var(--sp-accent) 10%, transparent);
      }

      .sp-btn-delete:hover {
        background: color-mix(in srgb, var(--sp-type-bug) 10%, transparent);
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
      gap: 2px;
    }

    /* A borderless red text capsule, like a destructive bar button. */
    .sp-btn-delete-all {
      height: 30px;
      padding: 0 8px;
      border-radius: var(--sp-radius-full);
      border: none;
      background: transparent;
      color: var(--sp-ink-red);
      font-family: var(--sp-font);
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: var(--sp-tr);
    }

    .sp-btn-delete-all svg {
      width: 13px;
      height: 13px;
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-btn-delete-all:hover {
        background: color-mix(in srgb, var(--sp-type-bug) 10%, transparent);
      }
    }

    .sp-btn-delete-all:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* ---- Confirm Dialog ---- */

    /* ---- Confirm Dialog: a centred alert ---- */

    /* A plain dim: the sheet's own material carries the blur. */
    .sp-confirm-backdrop {
      position: fixed;
      inset: 0;
      background: var(--sp-backdrop);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: ${Z_INDEX_MAX};
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .sp-confirm-dialog,
    .sp-identity-modal {
      border-radius: var(--sp-radius-xl);
      background: var(--sp-material-thick);
      -webkit-backdrop-filter: var(--sp-material-blur);
      backdrop-filter: var(--sp-material-blur);
      box-shadow: inset 0 0.5px 0 var(--sp-edge), var(--sp-shadow-sheet);
    }

    .sp-confirm-dialog {
      width: min(300px, calc(100vw - 32px));
      padding: 22px 16px 16px;
      text-align: center;
      transform: translateY(8px) scale(0.97);
      transition: transform 0.2s var(--sp-ease-out);
    }

    .sp-confirm-title {
      font-size: 17px;
      font-weight: 600;
      color: var(--sp-text);
      letter-spacing: -0.022em;
      margin-bottom: 4px;
    }

    .sp-confirm-message {
      font-size: 13px;
      color: var(--sp-text-secondary);
      line-height: 1.4;
      margin-bottom: 18px;
    }

    /* Both choices share the width, as in a system alert. */
    .sp-confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .sp-confirm-actions > button,
    .sp-identity-actions > button {
      flex: 1 1 0;
      height: 44px;
    }

    /* Closed cards stay legible: secondary text and a soft strike, not a fade. */
    .sp-card--resolved .sp-card-number,
    .sp-card--resolved .sp-card-message {
      color: var(--sp-text-secondary);
    }

    .sp-card--resolved .sp-card-message {
      text-decoration: line-through;
      text-decoration-color: color-mix(in srgb, var(--sp-text-secondary) 60%, transparent);
    }

    /* ============================
       Loading State
       ============================ */

    .sp-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 56px 24px;
    }

    /* ============================
       Identity Form
       ============================ */

    .sp-identity-backdrop {
      position: fixed;
      inset: 0;
      background: var(--sp-identity-overlay);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: ${Z_INDEX_MAX};
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    /* Material, radius and depth are shared with the confirm dialog. */
    .sp-identity-modal {
      width: 340px;
      max-width: calc(100vw - 32px);
      padding: 24px 20px 18px;
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
      font-family: var(--sp-font-display);
      font-size: 20px;
      font-weight: 700;
      color: var(--sp-text);
      letter-spacing: -0.022em;
    }

    /* Filled fields: focus lifts them to the row colour inside the accent ring. */
    .sp-input {
      width: 100%;
      height: 40px;
      padding: 0 12px;
      border-radius: var(--sp-radius);
      border: none;
      background: var(--sp-fill);
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 15px;
      letter-spacing: -0.01em;
      outline: none;
      transition: var(--sp-tr);
    }

    .sp-input::placeholder {
      color: var(--sp-text-secondary);
    }

    .sp-input:focus {
      background: var(--sp-row);
      box-shadow: var(--sp-ring);
    }

    .sp-input-label {
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.02em;
      color: var(--sp-text-secondary);
      margin: 0 0 6px 4px;
      display: block;
    }

    /* ============================
       Buttons: filled, flat, rounded rectangles
       ============================ */

    .sp-btn-primary,
    .sp-btn-ghost,
    .sp-btn-danger {
      height: 40px;
      padding: 0 18px;
      border-radius: 12px;
      border: none;
      color: #fff;
      font-family: var(--sp-font);
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.01em;
      cursor: pointer;
      transition: var(--sp-tr);
    }

    .sp-btn-primary {
      background: var(--sp-accent);
    }

    /* Secondary: a grey fill, the text colour. */
    .sp-btn-ghost {
      background: var(--sp-fill);
      color: var(--sp-text);
      font-weight: 500;
    }

    /* White reads 4.5:1 or more on the system red of either scheme. */
    .sp-btn-danger {
      background: var(--sp-danger);
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-btn-primary:hover {
        background: var(--sp-accent-dark);
      }

      .sp-btn-ghost:hover {
        background: var(--sp-fill-strong);
      }

      .sp-btn-danger:hover {
        background: var(--sp-danger-press);
      }
    }

    .sp-btn-primary:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
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
      color: var(--sp-text-secondary);
      text-align: center;
      gap: 8px;
    }

    .sp-empty-text {
      font-size: 15px;
      font-weight: 500;
      letter-spacing: -0.01em;
    }

    /* ============================
       Load More: one more row of the list
       ============================ */

    .sp-load-more-wrap {
      display: flex;
      justify-content: center;
      padding: 4px 0 0;
    }

    .sp-btn-ghost.sp-btn-load-more {
      width: 100%;
      height: 44px;
      border-radius: var(--sp-radius-lg);
      background: var(--sp-row);
      color: var(--sp-accent-ink);
      box-shadow: var(--sp-shadow-row);
    }

    @media (hover: hover) and (pointer: fine) {
      .sp-btn-ghost.sp-btn-load-more:hover {
        background: var(--sp-row-hover);
      }
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
