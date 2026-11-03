import type { Skin } from "./types";

/**
 * PROTOTYPE ONLY. Direction "Natif": material and system, after Apple.
 *
 * The panel is a floating inset sheet of thick translucent material; lists
 * are inset grouped rows; controls are the system ones (segmented control,
 * filled search field, tinted capsules, filled buttons). Light and dark come
 * from `light-dark()` in the Shadow DOM (the widget sets `color-scheme` on
 * its host) and from `html[data-proto-theme]` on the page surfaces.
 *
 * Text tokens are chosen for 4.5:1 in the worst case: secondary text on the
 * material over a black page (light) or a white page (dark). Tertiary text
 * only ever sits on solid rows.
 */

const FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Inter, system-ui, sans-serif`;
const DISPLAY = `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Inter, system-ui, sans-serif`;
const MONO = `ui-monospace, "SF Mono", Menlo, "Cascadia Code", Consolas, monospace`;
/** Same query as the widget's COMPACT_MEDIA (constants.ts): phones become bottom sheets. */
const COMPACT = "(max-width: 640px), (max-height: 500px) and (pointer: coarse)";
const FINE = "(hover: hover) and (pointer: fine)";

const shadowCss = /* css */ `
:host {
  --sp-font: ${FONT};
  --n-display: ${DISPLAY};
  --n-mono: ${MONO};

  /* System palette: neutral greys, Apple text colours. */
  --sp-bg: light-dark(#ffffff, #1c1c1e);
  --sp-bg-hover: light-dark(#f2f2f7, #2c2c2e);
  --sp-text: light-dark(#1d1d1f, #f5f5f7);
  --sp-text-secondary: light-dark(#4f4f54, #c1c1c6);
  --sp-text-tertiary: light-dark(#636368, #a8a8ae);
  --sp-border: light-dark(#e3e3e8, #3a3a3c);
  --sp-shadow: light-dark(rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.4));
  --sp-accent-gradient: var(--sp-accent);

  /* Materials and fills */
  --n-material: light-dark(rgba(246, 246, 248, 0.84), rgba(28, 28, 30, 0.84));
  --n-material-thick: light-dark(rgba(248, 248, 250, 0.92), rgba(38, 38, 40, 0.92));
  --n-grouped: light-dark(#f2f2f7, #1c1c1e);
  --n-row: light-dark(#ffffff, #2c2c2e);
  --n-row-hover: light-dark(#f8f8fa, #333336);
  --n-fill: light-dark(rgba(118, 118, 128, 0.12), rgba(118, 118, 128, 0.24));
  --n-fill-strong: light-dark(rgba(118, 118, 128, 0.2), rgba(118, 118, 128, 0.36));
  --n-sep: light-dark(rgba(60, 60, 67, 0.17), rgba(84, 84, 88, 0.6));
  --n-edge: light-dark(rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.12));
  --n-hairline: light-dark(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.55));
  --n-thumb: light-dark(#ffffff, #636366);
  --n-grabber: light-dark(rgba(60, 60, 67, 0.3), rgba(235, 235, 245, 0.3));
  --n-blur: blur(30px) saturate(180%);

  /* Inks: a status or type colour pushed toward the text (darker in light, lighter in dark), so it reads on its tint and on the material. */
  --n-ink-green: light-dark(color-mix(in srgb, var(--sp-status-open) 82%, #000), color-mix(in srgb, var(--sp-status-open) 80%, #fff));
  --n-ink-red: light-dark(color-mix(in srgb, var(--sp-type-bug) 86%, #000), color-mix(in srgb, var(--sp-type-bug) 66%, #fff));
  --n-ink-amber: light-dark(color-mix(in srgb, var(--sp-status-in-progress) 80%, #000), color-mix(in srgb, var(--sp-status-in-progress) 70%, #fff));
  --n-accent-ink: light-dark(var(--sp-accent-text), color-mix(in srgb, var(--sp-accent-text) 70%, #fff));
  --n-danger: light-dark(#d70015, #e0251b);
  --n-danger-press: light-dark(#b8000f, #c81e15);

  /* Depth */
  --n-shadow-sheet: 0 0 0 0.5px var(--n-hairline),
    0 24px 60px -8px light-dark(rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0.66)),
    0 6px 18px light-dark(rgba(0, 0, 0, 0.06), rgba(0, 0, 0, 0.3));
  --n-shadow-float: 0 0 0 0.5px var(--n-hairline),
    0 10px 30px light-dark(rgba(0, 0, 0, 0.14), rgba(0, 0, 0, 0.5)),
    0 2px 6px light-dark(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.25));
  --n-shadow-row: 0 1px 2px light-dark(rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.2));
  --n-ring: 0 0 0 3px color-mix(in srgb, var(--sp-accent) 30%, transparent);

  /* The widget's own tokens, mapped onto the materials (covers anything not restyled below). */
  --sp-glass-bg: var(--n-material);
  --sp-glass-bg-heavy: var(--n-material-thick);
  --sp-glass-border: var(--n-edge);
  --sp-glass-border-subtle: var(--n-sep);
  --sp-radius: 10px;
  --sp-radius-lg: 14px;
  --sp-radius-xl: 22px;
  --sp-blur: 20px;
  --sp-blur-heavy: 30px;
  --sp-shadow-xs: var(--n-shadow-row);
  --sp-shadow-sm: var(--n-shadow-float);
  --sp-shadow-md: var(--n-shadow-float);
  --sp-shadow-lg: var(--n-shadow-float);
  --sp-shadow-xl: var(--n-shadow-sheet);
  --sp-identity-bg: var(--n-material-thick);
  --sp-identity-overlay: light-dark(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.5));
  --sp-backdrop: light-dark(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.45));
  --sp-scrim: light-dark(rgba(0, 0, 0, 0.24), rgba(0, 0, 0, 0.55));
  letter-spacing: 0;
}

/* ---------- FAB and speed dial ---------- */

.sp-fab {
  width: 54px;
  height: 54px;
  background: var(--sp-accent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 8px 24px color-mix(in srgb, var(--sp-accent) 36%, transparent),
    0 2px 6px rgba(0, 0, 0, 0.12);
  transition:
    transform 0.16s var(--sp-ease-out),
    opacity 0.2s ease,
    box-shadow 0.2s ease;
}
@media ${FINE} {
  .sp-fab:hover {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.22),
      0 12px 32px color-mix(in srgb, var(--sp-accent) 46%, transparent),
      0 3px 8px rgba(0, 0, 0, 0.14);
  }
}
.sp-fab:focus-visible {
  outline: 2px solid var(--sp-accent);
  outline-offset: 3px;
}
.sp-fab svg {
  width: 23px;
  height: 23px;
}
/* The open sheet covers the button: it steps back instead of glowing through the material. */
div:has(> .sp-fab):has(~ .sp-panel.sp-panel--open) > .sp-fab {
  opacity: 0;
  transform: scale(0.9);
  pointer-events: none;
}
.sp-fab-badge {
  top: -3px;
  right: -3px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--n-danger);
  border: 2px solid light-dark(#ffffff, #1c1c1e);
  font: 600 11px/1 var(--sp-font);
  letter-spacing: 0;
}
.sp-radial {
  width: 54px;
  height: 54px;
}
.sp-radial-item {
  left: 5px;
  bottom: 5px;
  border: none;
  background: var(--n-material-thick);
  -webkit-backdrop-filter: var(--n-blur);
  backdrop-filter: var(--n-blur);
  color: var(--sp-text);
  box-shadow: inset 0 0.5px 0 var(--n-edge), var(--n-shadow-float);
}
.sp-radial-item:focus-visible {
  background: var(--n-row);
  color: var(--n-accent-ink);
  box-shadow: var(--n-shadow-float), var(--n-ring);
}
@media ${FINE} {
  .sp-radial-item:hover {
    background: var(--n-row);
    border-color: transparent;
    color: var(--n-accent-ink);
    box-shadow: inset 0 0.5px 0 var(--n-edge), var(--n-shadow-float);
  }
}
.sp-radial-item svg {
  width: 19px;
  height: 19px;
}
.sp-radial-label {
  padding: 6px 12px;
  border: none;
  border-radius: 999px;
  background: var(--n-material-thick);
  -webkit-backdrop-filter: var(--n-blur);
  backdrop-filter: var(--n-blur);
  box-shadow: inset 0 0.5px 0 var(--n-edge), var(--n-shadow-float);
  color: var(--sp-text);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
  transition:
    opacity 0.18s ease,
    transform 0.2s var(--sp-ease-out);
}

/* ---------- Toast: a material capsule ---------- */

.sp-toast {
  bottom: 96px;
  padding: 11px 18px;
  border-radius: 20px;
  background: var(--n-material-thick);
  -webkit-backdrop-filter: var(--n-blur);
  backdrop-filter: var(--n-blur);
  color: var(--sp-text);
  font: 500 14px/1.35 var(--sp-font);
  letter-spacing: -0.01em;
  box-shadow: inset 0 0.5px 0 var(--n-edge), var(--n-shadow-float);
}
.sp-toast--error {
  border-left: none;
}
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

/* ---------- The sheet ---------- */

.sp-panel {
  top: 12px;
  right: 12px;
  bottom: 12px;
  width: 380px;
  max-width: calc(100vw - 24px);
  height: auto;
  border: none;
  border-radius: 22px;
  background: var(--n-material);
  -webkit-backdrop-filter: var(--n-blur);
  backdrop-filter: var(--n-blur);
  box-shadow: inset 0 0.5px 0 var(--n-edge), inset 0 0 0 0.5px light-dark(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.06)), var(--n-shadow-sheet);
  font-family: var(--sp-font);
}
.sp-panel-header {
  padding: 16px 12px 8px 20px;
  border-bottom: none;
  background: transparent;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
.sp-panel-title {
  font-family: var(--n-display);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.022em;
}
.sp-panel-header-right {
  gap: 2px;
}
/* Close: a 30px filled circle inside a 44px target. */
.sp-panel-close {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: transparent;
  color: var(--sp-text-secondary);
}
.sp-panel-close::before {
  content: "";
  position: absolute;
  inset: 7px;
  border-radius: 50%;
  background: var(--n-fill);
  transition: background-color 0.15s ease;
}
.sp-panel-close svg {
  position: relative;
  width: 13px;
  height: 13px;
  stroke-width: 2.6;
}
@media ${FINE} {
  .sp-panel-close:hover {
    background: transparent;
    color: var(--sp-text);
  }
  .sp-panel-close:hover::before {
    background: var(--n-fill-strong);
  }
}
.sp-export-btn,
.sp-btn-delete-all {
  height: 30px;
  padding: 0 8px;
  white-space: nowrap;
  border: none;
  border-radius: 999px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  gap: 5px;
}
.sp-export-btn {
  color: var(--n-accent-ink);
}
.sp-btn-delete-all {
  color: var(--n-ink-red);
}
@media ${FINE} {
  .sp-export-btn:hover {
    border-color: transparent;
    color: var(--n-accent-ink);
    background: color-mix(in srgb, var(--sp-accent) 10%, transparent);
  }
  .sp-btn-delete-all:hover {
    border-color: transparent;
    color: var(--n-ink-red);
    background: color-mix(in srgb, var(--sp-type-bug) 10%, transparent);
  }
}
.sp-export-btn:active,
.sp-btn-delete-all:active {
  transform: scale(0.97);
}

/* Push to the detail: the list slides a little left and fades, like a navigation stack. */
.sp-panel > :is(.sp-panel-header, .sp-stats-bar, .sp-filters, .sp-list) {
  transition:
    opacity 0.2s var(--sp-ease-out),
    transform 0.2s var(--sp-ease-out),
    visibility 0s;
}
.sp-panel:has(> .sp-detail--visible) > :is(.sp-panel-header, .sp-stats-bar, .sp-filters, .sp-list) {
  opacity: 0;
  transform: translateX(-24%);
  visibility: hidden;
  transition:
    opacity 0.3s var(--sp-ease-drawer),
    transform 0.3s var(--sp-ease-drawer),
    visibility 0s linear 0.3s;
}
.sp-panel:has(> .sp-detail--visible) > :is(.sp-bulk-bar, .sp-shortcuts-hint) {
  visibility: hidden;
  opacity: 0;
}

/* ---------- Summary ---------- */

.sp-stats-bar {
  gap: 8px;
  padding: 2px 20px 12px;
  border-bottom: none;
}
.sp-stats-row {
  gap: 18px;
}
.sp-stats-dot {
  width: 7px;
  height: 7px;
}
.sp-stats-value {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.sp-stats-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--sp-text-secondary);
  letter-spacing: 0.04em;
}
.sp-stats-progress-track {
  height: 4px;
  border-radius: 2px;
  background: var(--n-fill-strong);
}
.sp-stats-progress-fill {
  background: var(--sp-accent);
}
.sp-stats-progress-label {
  font-size: 11px;
  color: var(--sp-text-secondary);
}

/* ---------- Search and filters ---------- */

.sp-filters {
  padding: 2px 16px 10px;
  border-bottom: none;
  background: transparent;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
.sp-search-wrap {
  margin-bottom: 10px;
}
.sp-search {
  height: 36px;
  padding: 0 12px 0 34px;
  border: none;
  border-radius: 10px;
  background: var(--n-fill);
  color: var(--sp-text);
  font-size: 15px;
  letter-spacing: -0.01em;
}
.sp-search::placeholder {
  color: var(--sp-text-secondary);
}
.sp-search:focus {
  border-color: transparent;
  background: var(--n-fill);
  box-shadow: var(--n-ring);
}
.sp-search-icon {
  left: 10px;
  width: 16px;
  height: 16px;
  color: var(--sp-text-secondary);
}
.sp-search:focus ~ .sp-search-icon,
.sp-search-wrap:focus-within .sp-search-icon {
  color: var(--sp-text-secondary);
}
.sp-filter-bar {
  gap: 8px;
  margin-bottom: 8px;
}

/* Type menu trigger: a borderless capsule, tinted once it filters. */
.sp-filter-dropdown-btn {
  height: 32px;
  padding: 0 10px;
  gap: 6px;
  border: none;
  border-radius: 999px;
  background: var(--n-fill);
  color: var(--sp-text);
  font-size: 13px;
}
@media ${FINE} {
  .sp-filter-dropdown-btn:hover {
    border-color: transparent;
    background: var(--n-fill-strong);
  }
}
.sp-filter-dropdown-btn[aria-expanded="true"] {
  border-color: transparent;
  background: var(--n-fill-strong);
  box-shadow: none;
}
.sp-filter-dropdown-btn--filtered,
.sp-filter-dropdown-btn--filtered[aria-expanded="true"] {
  background: color-mix(in srgb, var(--sp-chip-color) 14%, transparent);
}
.sp-filter-dropdown-btn__prefix {
  color: var(--sp-text-secondary);
  font-size: 11px;
  letter-spacing: 0.04em;
}
.sp-filter-dropdown-btn__value {
  color: var(--sp-text);
  font-weight: 600;
}
.sp-filter-dropdown-btn--filtered .sp-filter-dropdown-btn__value {
  color: light-dark(color-mix(in srgb, var(--sp-chip-color) 76%, #000), color-mix(in srgb, var(--sp-chip-color) 62%, #fff));
}
.sp-filter-dropdown-btn__chevron,
.sp-filter-dropdown-btn[aria-expanded="true"] .sp-filter-dropdown-btn__chevron {
  color: var(--sp-text-secondary);
}

/* Menus: material, rounded, rows highlight with a fill. */
.sp-filter-dropdown-menu,
.sp-sort-menu,
.sp-export-menu {
  padding: 6px;
  border: none;
  border-radius: 14px;
  background: var(--n-material-thick);
  -webkit-backdrop-filter: var(--n-blur);
  backdrop-filter: var(--n-blur);
  box-shadow: inset 0 0.5px 0 var(--n-edge), var(--n-shadow-float);
}
.sp-filter-dropdown-option,
.sp-sort-option,
.sp-export-option {
  min-height: 34px;
  padding: 7px 10px;
  border-radius: 8px;
  color: var(--sp-text);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: -0.005em;
}
@media ${FINE} {
  .sp-filter-dropdown-option:hover,
  .sp-sort-option:hover,
  .sp-export-option:hover {
    background: var(--n-fill);
    color: var(--sp-text);
  }
  .sp-filter-dropdown-option--active:hover,
  .sp-sort-option--active:hover {
    background: var(--n-fill);
    color: var(--sp-text);
  }
}
.sp-export-option:focus-visible {
  background: var(--n-fill);
  color: var(--sp-text);
}
.sp-filter-dropdown-option--active,
.sp-sort-option--active {
  color: var(--sp-text);
  font-weight: 600;
}
/* The sort menu hangs from the filters block: align it under its button. */
.sp-sort-menu {
  top: calc(100% - 4px);
  left: 16px;
}
/* Its active row carries the same check as the type menu, not a tinted fill. */
.sp-sort-option--active {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: transparent !important;
  color: var(--sp-text) !important;
}
.sp-sort-option--active::after {
  content: "";
  flex-shrink: 0;
  width: 13px;
  height: 13px;
  background: var(--n-accent-ink);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E") center / contain no-repeat;
}
@media ${FINE} {
  .sp-sort-option--active:hover {
    background: var(--n-fill) !important;
  }
}
.sp-filter-dropdown-option__icon {
  border-radius: 6px;
  background: color-mix(in srgb, var(--sp-chip-color) 14%, transparent);
}
.sp-filter-dropdown-option__check {
  color: var(--n-accent-ink);
}
.sp-export-option-icon {
  color: var(--sp-text-secondary);
}

/* Segmented control: a grey track and a raised white thumb. */
.sp-segmented {
  padding: 2px;
  border: none;
  border-radius: 9px;
  background: var(--n-fill);
}
.sp-segmented__btn {
  height: 28px;
  padding: 0 10px;
  border-radius: 7px;
  color: var(--sp-text);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
}
@media ${FINE} {
  .sp-segmented__btn:hover {
    color: var(--sp-text);
  }
  .sp-segmented__btn:not(.sp-segmented__btn--active):hover {
    background: light-dark(rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.06));
  }
}
.sp-segmented__btn--active {
  background: var(--n-thumb);
  color: var(--sp-text);
  font-weight: 600;
  box-shadow:
    0 3px 8px light-dark(rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.3)),
    0 1px 1px light-dark(rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.2)),
    0 0 0 0.5px light-dark(rgba(0, 0, 0, 0.04), transparent);
}

/* Toggles and sort: borderless fill capsules; on = filled accent. */
.sp-sort-controls {
  gap: 8px;
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}
.sp-sort-btn,
.sp-group-toggle,
.sp-mine-toggle {
  min-height: 30px;
  padding: 0 12px;
  gap: 6px;
  border: none;
  border-radius: 999px;
  background: var(--n-fill);
  color: var(--sp-text);
  font-size: 13px;
  font-weight: 500;
}
.sp-sort-btn svg,
.sp-group-toggle svg,
.sp-mine-toggle svg {
  color: var(--sp-text-secondary);
}
@media ${FINE} {
  .sp-sort-btn:hover,
  .sp-group-toggle:hover,
  .sp-mine-toggle:hover {
    border-color: transparent;
    background: var(--n-fill-strong);
    color: var(--sp-text);
  }
  .sp-group-toggle--active:hover,
  .sp-mine-toggle--active:hover {
    background: var(--sp-accent-dark);
    color: #ffffff;
  }
}
.sp-sort-btn[aria-expanded="true"] {
  border-color: transparent;
  background: var(--n-fill-strong);
  color: var(--sp-text);
}
.sp-group-toggle--active,
.sp-mine-toggle--active {
  background: var(--sp-accent);
  color: #ffffff;
  box-shadow: none;
}
.sp-group-toggle--active svg,
.sp-mine-toggle--active svg {
  color: inherit;
}

/* ---------- Inset grouped list ---------- */

.sp-list {
  padding: 8px 16px 16px;
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 8px);
  mask-image: linear-gradient(to bottom, transparent, #000 8px);
}
.sp-list::-webkit-scrollbar-thumb,
.sp-detail-content::-webkit-scrollbar-thumb {
  background: var(--n-fill-strong);
}
.sp-card {
  padding: 12px 14px 12px 12px;
  margin-bottom: 8px;
  border: none;
  border-radius: 14px;
  background: var(--n-row);
  box-shadow: var(--n-shadow-row);
}
@media ${FINE} {
  .sp-card:hover {
    border-color: transparent;
    background: var(--n-row-hover);
    box-shadow: var(--n-shadow-row), 0 6px 16px light-dark(rgba(0, 0, 0, 0.06), rgba(0, 0, 0, 0.25));
  }
}
.sp-card:active {
  transform: scale(0.985);
}
.sp-card {
  position: relative;
}
.sp-card-bar {
  align-self: flex-start;
  width: 8px;
  height: 8px;
  margin: 6px 10px 0 2px;
  border-radius: 50%;
  transition: opacity 0.15s ease;
}
/* Edit mode: the round check takes the type dot's place instead of pushing the row. */
.sp-card-header > .sp-bulk-checkbox {
  position: absolute;
  top: 13px;
  left: 9px;
}
.sp-bulk-checkbox:focus-visible {
  opacity: 1;
}
.sp-list--has-selection .sp-card-bar,
.sp-card:has(.sp-bulk-checkbox:focus-visible) .sp-card-bar {
  opacity: 0;
}
@media ${FINE} {
  .sp-card:hover:has(.sp-bulk-checkbox) .sp-card-bar {
    opacity: 0;
  }
}
@media not all and ${FINE} {
  .sp-card:has(.sp-bulk-checkbox) .sp-card-bar {
    opacity: 0;
  }
}
.sp-card-header {
  gap: 4px 6px;
  margin-bottom: 4px;
}
.sp-card-number {
  color: var(--sp-text);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.sp-badge {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  letter-spacing: 0.01em;
  background: color-mix(in srgb, currentColor 13%, transparent) !important;
  -webkit-text-fill-color: light-dark(color-mix(in srgb, currentColor 74%, #000), color-mix(in srgb, currentColor 62%, #fff));
}
.sp-card-date {
  color: var(--sp-text-tertiary);
  font-size: 12px;
}
.sp-card-message {
  color: var(--sp-text);
  font-size: 14px;
  line-height: 1.43;
  letter-spacing: -0.006em;
}
.sp-card-expand {
  color: var(--n-accent-ink);
  font-size: 13px;
}
.sp-lost {
  color: var(--sp-text-tertiary);
  font-size: 12px;
}
.sp-card--resolved {
  opacity: 1;
}
.sp-card--resolved .sp-card-number,
.sp-card--resolved .sp-card-message {
  color: var(--sp-text-secondary);
}
.sp-card--resolved .sp-card-message {
  text-decoration-color: color-mix(in srgb, var(--sp-text-secondary) 60%, transparent);
}

/* Card actions: tinted text buttons. */
.sp-card-footer {
  gap: 2px;
  margin-top: 6px;
  margin-right: -6px;
}
.sp-btn-resolve,
.sp-btn-delete {
  height: 30px;
  padding: 0 10px;
  gap: 5px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
}
.sp-btn-resolve {
  color: var(--n-ink-green);
}
.sp-card--resolved .sp-btn-resolve {
  color: var(--n-accent-ink);
}
.sp-btn-delete {
  color: var(--n-ink-red);
}
@media ${FINE} {
  .sp-btn-resolve:hover {
    border-color: transparent;
    color: var(--n-ink-green);
    background: color-mix(in srgb, var(--sp-status-open) 10%, transparent);
  }
  .sp-card--resolved .sp-btn-resolve:hover {
    color: var(--n-accent-ink);
    background: color-mix(in srgb, var(--sp-accent) 10%, transparent);
  }
  .sp-btn-delete:hover {
    border-color: transparent;
    color: var(--n-ink-red);
    background: color-mix(in srgb, var(--sp-type-bug) 10%, transparent);
  }
}
.sp-btn-resolve:active,
.sp-btn-delete:active {
  transform: scale(0.97);
}

/* Selection: round checks, a tinted row. */
.sp-bulk-checkbox {
  width: 18px;
  height: 18px;
  color: light-dark(#c7c7cc, #636366);
}
.sp-bulk-checkbox svg {
  width: 18px;
  height: 18px;
}
.sp-bulk-checkbox svg rect {
  rx: 8px;
}
.sp-bulk-checkbox--checked {
  color: var(--sp-accent);
  filter: none;
}
.sp-bulk-checkbox--checked svg rect {
  fill: var(--sp-accent);
}
@media ${FINE} {
  .sp-bulk-checkbox:hover {
    color: var(--sp-accent);
  }
}
.sp-card--selected {
  border-left: none !important;
  background: color-mix(in srgb, var(--sp-accent) 9%, var(--n-row)) !important;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sp-accent) 30%, transparent);
}
@media ${FINE} {
  .sp-card--selected:hover {
    background: color-mix(in srgb, var(--sp-accent) 12%, var(--n-row)) !important;
  }
}
.sp-bulk-select-all {
  padding: 6px 4px;
  margin-bottom: 2px;
  border-radius: 10px;
  color: var(--sp-text-secondary);
  font-size: 13px;
}
@media ${FINE} {
  .sp-bulk-select-all:hover {
    background: var(--n-fill);
  }
}

/* Bulk bar: a floating material capsule. */
.sp-bulk-bar {
  left: 12px;
  right: 12px;
  bottom: 12px;
  padding: 8px 8px 8px 16px;
  border: none;
  border-radius: 18px;
  background: var(--n-material-thick);
  -webkit-backdrop-filter: var(--n-blur);
  backdrop-filter: var(--n-blur);
  box-shadow: inset 0 0.5px 0 var(--n-edge), var(--n-shadow-float);
}
.sp-bulk-bar-count {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.sp-bulk-btn-resolve,
.sp-bulk-btn-delete {
  height: 34px;
  padding: 0 12px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
}
.sp-bulk-btn-resolve {
  color: var(--n-ink-green);
  background: color-mix(in srgb, var(--sp-status-open) 13%, transparent);
}
.sp-bulk-btn-delete {
  color: var(--n-ink-red);
  background: color-mix(in srgb, var(--sp-type-bug) 11%, transparent);
}
@media ${FINE} {
  .sp-bulk-btn-resolve:hover {
    background: color-mix(in srgb, var(--sp-status-open) 19%, transparent);
    box-shadow: none;
  }
  .sp-bulk-btn-delete:hover {
    background: color-mix(in srgb, var(--sp-type-bug) 16%, transparent);
    box-shadow: none;
  }
  .sp-bulk-btn-deselect:hover {
    border-color: transparent;
    background: var(--n-fill-strong);
    color: var(--sp-text);
  }
}
.sp-bulk-btn-deselect {
  width: 30px;
  height: 30px;
  border: none;
  background: var(--n-fill);
  color: var(--sp-text-secondary);
}

/* Group headers: section headers that stay on top, on a blurred band. */
.sp-group-header {
  gap: 8px;
  margin: 2px -4px 6px;
  padding: 8px 8px;
  border-bottom: none !important;
  border-radius: 10px;
  background: color-mix(in srgb, var(--n-grouped) 72%, transparent);
  -webkit-backdrop-filter: var(--n-blur);
  backdrop-filter: var(--n-blur);
}
@media ${FINE} {
  .sp-group-header:hover {
    background: color-mix(in srgb, var(--n-grouped) 72%, var(--n-fill-strong));
  }
}
.sp-group-header-chevron svg,
.sp-group-header-icon svg {
  color: var(--sp-text-secondary);
}
.sp-group-header-path {
  color: var(--sp-text-secondary);
  font-size: 13px;
  font-weight: 600;
}
.sp-group-header-count {
  padding: 1px 8px;
  font-size: 12px;
  font-weight: 600;
  background: color-mix(in srgb, var(--sp-accent) 13%, transparent) !important;
  color: var(--n-accent-ink) !important;
}

/* States */
.sp-loading {
  padding: 56px 24px;
}
.sp-spinner {
  border-color: var(--n-fill-strong);
  border-top-color: var(--sp-text-secondary);
}
.sp-empty {
  color: var(--sp-text-secondary);
  padding: 56px 24px;
}
.sp-empty-text {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.sp-load-more-wrap {
  padding: 4px 0 0;
}
.sp-btn-ghost.sp-btn-load-more {
  height: 44px;
  border-radius: 14px;
  background: var(--n-row);
  color: var(--n-accent-ink);
  box-shadow: var(--n-shadow-row);
}

/* ---------- Buttons and fields ---------- */

.sp-btn-primary,
.sp-btn-ghost,
.sp-btn-danger {
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  letter-spacing: -0.01em;
  box-shadow: none;
}
.sp-btn-primary {
  background: var(--sp-accent);
  font-weight: 600;
}
.sp-btn-ghost {
  background: var(--n-fill);
  color: var(--sp-text);
  font-weight: 500;
}
.sp-btn-danger {
  background: var(--n-danger);
  font-weight: 600;
}
@media ${FINE} {
  .sp-btn-primary:hover {
    background: var(--sp-accent-dark);
    box-shadow: none;
  }
  .sp-btn-ghost:hover {
    border-color: transparent;
    background: var(--n-fill-strong);
    color: var(--sp-text);
  }
  .sp-btn-ghost.sp-btn-load-more:hover {
    background: var(--n-row-hover);
    color: var(--n-accent-ink);
  }
  .sp-btn-danger:hover {
    background: var(--n-danger-press);
    box-shadow: none;
  }
}
.sp-btn-primary:disabled {
  box-shadow: none;
}
.sp-input {
  height: 40px;
  padding: 0 12px;
  border: none;
  border-radius: 10px;
  background: var(--n-fill);
  color: var(--sp-text);
  font-size: 15px;
  letter-spacing: -0.01em;
}
.sp-input::placeholder {
  color: var(--sp-text-secondary);
}
.sp-input:focus {
  border-color: transparent;
  background: var(--n-row);
  box-shadow: var(--n-ring);
}
.sp-input-label {
  margin: 0 0 6px 4px;
  color: var(--sp-text-secondary);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

/* ---------- Dialogs ---------- */

.sp-confirm-backdrop,
.sp-identity-backdrop,
.sp-shortcuts-overlay {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
.sp-confirm-dialog,
.sp-identity-modal,
.sp-shortcuts-card {
  border: none;
  border-radius: 22px;
  background: var(--n-material-thick);
  -webkit-backdrop-filter: var(--n-blur);
  backdrop-filter: var(--n-blur);
  box-shadow: inset 0 0.5px 0 var(--n-edge), var(--n-shadow-sheet);
}
.sp-confirm-dialog {
  width: min(300px, calc(100vw - 32px));
  padding: 22px 16px 16px;
  text-align: center;
}
.sp-confirm-title {
  margin-bottom: 4px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.022em;
}
.sp-confirm-message {
  margin-bottom: 18px;
  color: var(--sp-text-secondary);
  font-size: 13px;
  line-height: 1.4;
}
.sp-confirm-actions,
.sp-identity-actions {
  gap: 8px;
}
.sp-confirm-actions > button,
.sp-identity-actions > button {
  flex: 1 1 0;
  height: 44px;
}
.sp-identity-modal {
  padding: 24px 20px 18px;
}
.sp-identity-title {
  font-family: var(--n-display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.022em;
}
.sp-shortcuts-card {
  width: min(356px, calc(100% - 24px));
  padding: 22px 22px 18px;
}
.sp-shortcuts-title {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.022em;
}
.sp-shortcuts-title svg {
  color: var(--sp-text-secondary);
}
.sp-shortcuts-close {
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--n-fill);
  color: var(--sp-text-secondary);
}
@media ${FINE} {
  .sp-shortcuts-close:hover {
    background: var(--n-fill-strong);
    color: var(--sp-text);
  }
}
.sp-shortcuts-desc {
  color: var(--sp-text);
  font-size: 13px;
}
.sp-shortcuts-separator {
  color: var(--sp-text-secondary);
}
.sp-kbd {
  min-width: 26px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: var(--n-row);
  box-shadow: 0 0 0 0.5px var(--n-sep), 0 1px 0 light-dark(rgba(0, 0, 0, 0.14), rgba(0, 0, 0, 0.6));
  font-family: var(--sp-font);
  font-size: 12px;
  font-weight: 500;
}
.sp-shortcuts-hint {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--n-material-thick);
  -webkit-backdrop-filter: var(--n-blur);
  backdrop-filter: var(--n-blur);
  box-shadow: inset 0 0.5px 0 var(--n-edge), var(--n-shadow-float);
  color: var(--sp-text-secondary);
  font-family: var(--sp-font);
  font-size: 13px;
  font-weight: 600;
}
@media ${FINE} {
  .sp-shortcuts-hint:hover {
    border-color: transparent;
    background: color-mix(in srgb, var(--sp-accent) 14%, transparent);
    color: var(--n-accent-ink);
  }
}
.sp-shortcuts-hint::after {
  padding: 5px 10px;
  border: none;
  border-radius: 999px;
  background: var(--n-material-thick);
  -webkit-backdrop-filter: var(--n-blur);
  backdrop-filter: var(--n-blur);
  box-shadow: inset 0 0.5px 0 var(--n-edge), var(--n-shadow-float);
  color: var(--sp-text);
  font-size: 12px;
}

/* ---------- Detail: a navigation push into inset grouped sections ---------- */

.sp-detail {
  background: transparent;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
.sp-detail-header {
  gap: 4px;
  min-height: 60px;
  padding: 10px 12px 6px 6px;
  border-bottom: none;
  background: transparent;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
.sp-detail-back {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  color: var(--n-accent-ink);
}
.sp-detail-back svg {
  width: 20px;
  height: 20px;
  stroke-width: 2.4;
}
@media ${FINE} {
  .sp-detail-back:hover {
    background: var(--n-fill);
    color: var(--n-accent-ink);
  }
}
.sp-detail-title {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.024em;
}
.sp-detail-content {
  padding: 0 0 20px;
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 10px);
  mask-image: linear-gradient(to bottom, transparent, #000 10px);
}
.sp-detail-section {
  margin-top: 22px;
  padding: 0 16px;
  border-bottom: none;
}
.sp-detail-section:first-child {
  margin-top: 8px;
}
.sp-detail-section-title {
  margin: 0 16px 7px;
  color: var(--sp-text-secondary);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
}
.sp-detail-section-title svg {
  display: none;
}

.sp-detail-status {
  margin-bottom: 12px;
}
.sp-detail-status-pill {
  padding: 5px 12px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.005em;
}
.sp-detail-status-dot {
  width: 7px;
  height: 7px;
}
.sp-detail-status-pill--open {
  background: color-mix(in srgb, var(--sp-status-open) 13%, transparent);
  color: var(--n-ink-green);
  border: none;
}
.sp-detail-status-pill--in-progress {
  background: color-mix(in srgb, var(--sp-status-in-progress) 13%, transparent);
  color: var(--n-ink-amber);
  border: none;
}
.sp-detail-status-pill--resolved,
.sp-detail-status-pill--wont-fix {
  background: var(--n-fill);
  color: var(--sp-text-secondary);
  border: none;
}
.sp-detail-actions {
  gap: 10px;
}
.sp-detail-actions button,
.sp-detail-actions a {
  height: 44px;
  gap: 6px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.sp-detail-actions button svg,
.sp-detail-actions a svg {
  width: 16px;
  height: 16px;
}
.sp-detail-btn-resolve {
  border: none;
  background: color-mix(in srgb, var(--sp-status-open) 14%, transparent);
  color: var(--n-ink-green);
}
.sp-detail-btn-reopen {
  border: none;
  background: color-mix(in srgb, var(--sp-accent) 13%, transparent);
  color: var(--n-accent-ink);
}
.sp-detail-btn-delete {
  border: none;
  background: color-mix(in srgb, var(--sp-type-bug) 11%, transparent);
  color: var(--n-ink-red);
}
.sp-detail-btn-custom {
  border: none;
  background: var(--n-fill);
  color: var(--sp-text);
}
@media ${FINE} {
  .sp-detail-btn-resolve:hover {
    background: color-mix(in srgb, var(--sp-status-open) 20%, transparent);
    box-shadow: none;
  }
  .sp-detail-btn-reopen:hover {
    background: color-mix(in srgb, var(--sp-accent) 19%, transparent);
    box-shadow: none;
  }
  .sp-detail-btn-delete:hover {
    background: color-mix(in srgb, var(--sp-type-bug) 16%, transparent);
    box-shadow: none;
  }
  .sp-detail-btn-custom:hover {
    border-color: transparent;
    background: var(--n-fill-strong);
    color: var(--sp-text);
    box-shadow: none;
  }
}

.sp-detail-message {
  padding: 12px 16px;
  border-left: none;
  border-radius: 14px;
  background: var(--n-row);
  color: var(--sp-text);
  font-size: 15px;
  line-height: 1.47;
  letter-spacing: -0.012em;
  box-shadow: var(--n-shadow-row);
}
.sp-comment {
  margin-top: 8px;
}
.sp-comment[data-role="team"] {
  background: color-mix(in srgb, var(--sp-accent) 8%, var(--n-row));
}
.sp-comment-head {
  font-size: 13px;
}
.sp-comment-head time,
.sp-thread-foot,
.sp-thread-input::placeholder {
  color: var(--sp-text-secondary);
}
.sp-input.sp-thread-input {
  height: auto;
  min-height: 84px;
  margin-top: 8px;
  padding: 11px 16px;
  border-radius: 14px;
  background: var(--n-row);
  line-height: 1.4;
  box-shadow: var(--n-shadow-row);
}
.sp-input.sp-thread-input:focus {
  background: var(--n-row);
  box-shadow: var(--n-ring);
}
.sp-thread-foot {
  margin-top: 8px;
  padding-left: 16px;
  font-size: 12px;
}
.sp-thread-foot .sp-btn-primary {
  height: 34px;
  padding: 0 18px;
  border-radius: 999px;
}
.sp-thread-error {
  border-radius: 12px;
  background: color-mix(in srgb, var(--sp-type-bug) 11%, transparent);
  color: var(--n-ink-red);
}

.sp-detail-screenshot {
  border: none;
  border-radius: 14px;
  background: var(--n-row);
  box-shadow: 0 0 0 0.5px var(--n-sep);
}

/* Details and annotation: rows with inset separators. */
.sp-detail-meta,
.sp-detail-annotation-info {
  gap: 0;
  padding: 0 16px;
  border: none;
  border-radius: 14px;
  background: var(--n-row);
  box-shadow: var(--n-shadow-row);
}
.sp-detail-meta-row,
.sp-detail-annotation-row {
  gap: 12px;
}
.sp-detail-meta-row svg,
.sp-detail-annotation-row svg {
  width: 16px;
  height: 16px;
  margin-top: 13px;
  color: var(--sp-text-tertiary);
}
.sp-detail-meta-content {
  padding: 10px 0;
}
.sp-detail-meta-row + .sp-detail-meta-row .sp-detail-meta-content,
.sp-detail-annotation-row + .sp-detail-annotation-row .sp-detail-meta-content {
  border-top: 0.5px solid var(--n-sep);
}
.sp-detail-meta-label,
.sp-detail-annotation-label {
  margin-bottom: 3px;
  color: var(--sp-text-tertiary);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
}
.sp-detail-meta-value,
.sp-detail-annotation-value {
  color: var(--sp-text);
  font-size: 15px;
  line-height: 1.33;
  letter-spacing: -0.01em;
}
.sp-detail-meta-value--mono,
.sp-detail-annotation-value--mono {
  padding: 1px 6px;
  border: none;
  border-radius: 6px;
  background: var(--n-fill);
  font-family: var(--n-mono);
  font-size: 12px;
  letter-spacing: 0;
}
.sp-detail-meta-value--secondary {
  color: var(--sp-text-secondary);
  font-size: 13px;
}
.sp-detail-annotation {
  gap: 10px;
}
.sp-detail-btn-goto {
  height: 44px;
  border-radius: 12px;
  background: var(--sp-accent);
  font-size: 15px;
  letter-spacing: -0.01em;
  box-shadow: none;
}
@media ${FINE} {
  .sp-detail-btn-goto:hover {
    background: var(--sp-accent-dark);
    box-shadow: none;
  }
}

/* Diagnostics: a disclosure row, then grouped mono lists. */
.sp-detail-diag {
  gap: 14px;
}
.sp-detail-diag-toggle {
  min-height: 44px;
  padding: 0 14px 0 16px;
  border: none;
  border-radius: 14px;
  background: var(--n-row);
  color: var(--sp-text);
  font-size: 15px;
  font-weight: 400;
  letter-spacing: -0.01em;
  box-shadow: var(--n-shadow-row);
}
@media ${FINE} {
  .sp-detail-diag-toggle:hover {
    background: var(--n-row-hover);
  }
}
.sp-detail-diag-toggle svg {
  color: var(--sp-text-tertiary);
}
.sp-detail-diag-counts {
  color: var(--sp-text-secondary);
}
.sp-detail-diag-count {
  padding: 2px 8px;
  background: var(--n-fill);
  color: var(--sp-text-secondary);
  font-size: 12px;
  font-weight: 500;
}
.sp-detail-diag-count--errors {
  background: color-mix(in srgb, var(--sp-type-bug) 11%, transparent);
  color: var(--n-ink-red);
}
.sp-detail-diag-group-title {
  margin: 0 16px 7px;
  color: var(--sp-text-secondary);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
}
.sp-detail-diag-list {
  border: none;
  border-radius: 14px;
  background: var(--n-row);
  box-shadow: var(--n-shadow-row);
}
.sp-detail-diag-list li {
  padding: 9px 14px;
  border-bottom: 0.5px solid var(--n-sep);
  font-family: var(--n-mono);
}
.sp-detail-diag-empty {
  color: var(--sp-text-tertiary);
}

/* ---------- Touch: 40px targets at least ---------- */

@media (pointer: coarse) {
  .sp-radial-item {
    left: 3px;
    bottom: 3px;
  }
  .sp-radial-label {
    padding: 8px 14px;
    font-size: 14px;
    font-weight: 500;
  }
  .sp-search,
  .sp-input {
    font-size: 16px;
  }
  .sp-filter-dropdown-btn,
  .sp-sort-btn,
  .sp-group-toggle,
  .sp-mine-toggle {
    height: 40px;
    min-height: 40px;
  }
  .sp-segmented__btn {
    height: 40px;
  }
  .sp-btn-resolve,
  .sp-btn-delete,
  .sp-bulk-btn-resolve,
  .sp-bulk-btn-delete {
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
  .sp-thread-foot .sp-btn-primary {
    height: 40px;
  }
  .sp-export-option,
  .sp-filter-dropdown-option,
  .sp-sort-option {
    min-height: 44px;
  }
  .sp-panel-close::before {
    inset: 5px;
  }
  .sp-search {
    height: 40px;
  }
  .sp-export-btn,
  .sp-btn-delete-all,
  .sp-bulk-select-all {
    min-height: 40px;
  }
  .sp-group-header {
    min-height: 44px;
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

/* ---------- Phone: a bottom sheet with a grabber ---------- */

@media ${COMPACT} {
  .sp-panel {
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    width: auto;
    max-width: none;
    height: calc(100dvh - 40px - env(safe-area-inset-top, 0px));
    border-radius: 16px 16px 0 0;
    background: var(--n-grouped);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    box-shadow: 0 -0.5px 0 var(--n-hairline), 0 -10px 40px light-dark(rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.5));
  }
  .sp-panel-header {
    padding: 24px 8px 6px 20px;
    background: transparent;
  }
  .sp-detail-header {
    padding: 22px 12px 4px 6px;
    background: transparent;
  }
  .sp-panel-header::before,
  .sp-detail-header::before {
    top: 6px;
    background: var(--n-grabber);
  }
  .sp-export-btn,
  .sp-btn-delete-all {
    width: 40px;
    height: 40px;
    padding: 0;
    border-radius: 50%;
    background: transparent;
  }
  .sp-export-btn svg,
  .sp-btn-delete-all svg {
    width: 19px;
    height: 19px;
  }
  .sp-stats-bar {
    padding: 2px 20px 10px;
  }
  .sp-filters {
    padding: 2px 16px 8px;
    background: transparent;
  }
  .sp-search {
    height: 40px;
  }
  .sp-filter-bar {
    margin: 0 -16px 8px;
    padding: 0 16px 2px;
  }
  .sp-filter-dropdown-menu,
  .sp-sort-menu {
    top: auto;
    left: 8px;
    right: 8px;
    bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    padding: 6px;
    border-radius: 16px;
    background: var(--n-row);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    box-shadow: 0 0 0 0.5px var(--n-hairline), 0 18px 50px light-dark(rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0.6));
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
  .sp-detail {
    background: transparent;
  }
  .sp-detail-section {
    padding: 0 16px;
  }
  .sp-detail-content {
    padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  }
  .sp-identity-modal {
    padding: 22px 20px calc(20px + env(safe-area-inset-bottom, 0px));
    border-radius: 16px 16px 0 0;
    background: var(--n-grouped);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
  .sp-identity-modal .sp-input {
    background: var(--n-row);
  }
  .sp-identity-actions button {
    height: 50px;
  }
}

/* ---------- Accessibility preferences ---------- */

@media (prefers-reduced-transparency: reduce) {
  :host {
    --n-material: var(--n-grouped);
    --n-material-thick: var(--n-grouped);
  }
}
@media (prefers-contrast: more) {
  :host {
    --n-material: var(--n-grouped);
    --n-material-thick: var(--n-grouped);
    --n-sep: var(--sp-text-secondary);
    --n-hairline: var(--sp-text-secondary);
    --n-fill: light-dark(rgba(118, 118, 128, 0.22), rgba(118, 118, 128, 0.4));
  }
  .sp-card,
  .sp-detail-message,
  .sp-detail-meta,
  .sp-detail-annotation-info,
  .sp-detail-diag-toggle {
    box-shadow: inset 0 0 0 1px var(--n-sep);
  }
}
`;

const lightCss = /* css */ `
html {
  --natif-font: ${FONT};
  --natif-material: rgba(246, 246, 248, 0.86);
  --natif-grouped: #f2f2f7;
  --natif-row: #ffffff;
  --natif-fill: rgba(118, 118, 128, 0.12);
  --natif-fill-strong: rgba(118, 118, 128, 0.2);
  --natif-text: #1d1d1f;
  --natif-text-2: #4f4f54;
  --natif-edge: rgba(255, 255, 255, 0.8);
  --natif-hairline: rgba(0, 0, 0, 0.1);
  --natif-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.1), 0 18px 48px -6px rgba(0, 0, 0, 0.2), 0 4px 14px rgba(0, 0, 0, 0.06);
  --natif-ink-mix: #000000;
  --natif-bug: #d01f1f;
  --natif-change: #b45309;
  --natif-question: #2563eb;
  --natif-other: #5b6778;
  --natif-overlay: rgba(0, 0, 0, 0.06);
}
html[data-proto-theme="dark"] {
  --natif-material: rgba(30, 30, 32, 0.86);
  --natif-grouped: #1c1c1e;
  --natif-row: #2c2c2e;
  --natif-fill: rgba(118, 118, 128, 0.24);
  --natif-fill-strong: rgba(118, 118, 128, 0.36);
  --natif-text: #f5f5f7;
  --natif-text-2: #c1c1c6;
  --natif-edge: rgba(255, 255, 255, 0.12);
  --natif-hairline: rgba(0, 0, 0, 0.55);
  --natif-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.55), 0 18px 48px -6px rgba(0, 0, 0, 0.6), 0 4px 14px rgba(0, 0, 0, 0.3);
  --natif-ink-mix: #ffffff;
  --natif-bug: #f87171;
  --natif-change: #fbbf24;
  --natif-question: #60a5fa;
  --natif-other: #a3b0c2;
  --natif-overlay: rgba(0, 0, 0, 0.22);
}

/* ---------- Comment popup: a material card ---------- */

[data-proto-surface="popup"] {
  border: none !important;
  border-radius: 18px !important;
  background: var(--natif-material) !important;
  -webkit-backdrop-filter: blur(30px) saturate(180%) !important;
  backdrop-filter: blur(30px) saturate(180%) !important;
  box-shadow: inset 0 0.5px 0 var(--natif-edge), var(--natif-shadow) !important;
  color: var(--natif-text) !important;
  font-family: var(--natif-font) !important;
}
[data-proto-surface="popup"] > div:first-child {
  gap: 8px !important;
}
[data-proto-surface="popup"] button[data-type] {
  --natif-type: var(--natif-other);
  flex-direction: column !important;
  gap: 2px !important;
  height: 50px !important;
  border: none !important;
  border-radius: 12px !important;
  background: var(--natif-fill) !important;
  color: var(--natif-text) !important;
  font-family: var(--natif-font) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  letter-spacing: -0.005em !important;
  box-shadow: none !important;
}
[data-proto-surface="popup"] button[data-type="bug"] {
  --natif-type: var(--natif-bug);
}
[data-proto-surface="popup"] button[data-type="change"] {
  --natif-type: var(--natif-change);
}
[data-proto-surface="popup"] button[data-type="question"] {
  --natif-type: var(--natif-question);
}
[data-proto-surface="popup"] button[data-type] svg {
  width: 17px !important;
  height: 17px !important;
  color: var(--natif-type) !important;
}
[data-proto-surface="popup"] button[data-type][aria-pressed="true"] {
  background: color-mix(in srgb, var(--natif-type) 15%, var(--natif-row)) !important;
  color: color-mix(in srgb, var(--natif-type) 78%, var(--natif-ink-mix)) !important;
  font-weight: 600 !important;
  box-shadow: inset 0 0 0 1.5px var(--natif-type) !important;
}
@media ${FINE} {
  [data-proto-surface="popup"] button[data-type]:not([aria-pressed="true"]):not(:disabled):hover {
    background: var(--natif-fill-strong) !important;
  }
}
[data-proto-surface="popup"] > textarea {
  min-height: 80px !important;
  padding: 9px 12px !important;
  border: none !important;
  border-radius: 12px !important;
  background: var(--natif-fill) !important;
  color: var(--natif-text) !important;
  font-family: var(--natif-font) !important;
  font-size: 15px !important;
  line-height: 1.35 !important;
  letter-spacing: -0.01em !important;
  box-shadow: none !important;
}
[data-proto-surface="popup"] > textarea::placeholder {
  color: var(--natif-text-2);
}
[data-proto-surface="popup"] > textarea:focus {
  background: var(--natif-row) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--proto-accent) 30%, transparent) !important;
}
[data-proto-surface="popup"] > div:nth-child(3) {
  margin-top: 6px !important;
  color: var(--natif-text-2) !important;
  font-family: var(--natif-font) !important;
  font-size: 11px !important;
}
[data-proto-surface="popup"] > div:last-child {
  gap: 8px !important;
  margin-top: 12px !important;
}
[data-proto-surface="popup"] > div:last-child > button {
  padding: 0 18px !important;
  border: none !important;
  border-radius: 999px !important;
  font-family: var(--natif-font) !important;
  font-size: 15px !important;
  letter-spacing: -0.01em !important;
}
[data-proto-surface="popup"] > div:last-child > button:first-child {
  background: var(--natif-fill) !important;
  color: var(--natif-text) !important;
  font-weight: 500 !important;
}
[data-proto-surface="popup"] > div:last-child > button:last-child {
  padding: 0 20px !important;
  background: var(--proto-accent) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  box-shadow: none !important;
}
@media ${FINE} {
  [data-proto-surface="popup"] > div:last-child > button:first-child:not(:disabled):hover {
    background: var(--natif-fill-strong) !important;
    color: var(--natif-text) !important;
  }
  [data-proto-surface="popup"] > div:last-child > button:last-child:not(:disabled):hover {
    background: color-mix(in srgb, var(--proto-accent) 86%, #000000) !important;
  }
}
[data-proto-surface="popup"] button:focus-visible,
[data-proto-surface="toolbar"] button:focus-visible {
  outline: 2px solid var(--proto-accent) !important;
  outline-offset: 2px !important;
}
@media (pointer: coarse) {
  [data-proto-surface="popup"] > textarea {
    font-size: 16px !important;
  }
}
@media ${COMPACT} {
  [data-proto-surface="popup"] {
    border-radius: 16px 16px 0 0 !important;
    background: var(--natif-grouped) !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
    box-shadow: 0 -0.5px 0 var(--natif-hairline), 0 -10px 40px rgba(0, 0, 0, 0.16) !important;
  }
  [data-proto-surface="popup"] button[data-type],
  [data-proto-surface="popup"] > textarea,
  [data-proto-surface="popup"] > textarea:focus {
    background: var(--natif-row) !important;
  }
  [data-proto-surface="popup"] > div:last-child > button:first-child {
    background: var(--natif-fill-strong) !important;
  }
  [data-proto-surface="popup"] > textarea {
    min-height: 104px !important;
  }
}

/* ---------- Annotation: a floating island at the top ---------- */

[data-proto-surface="toolbar"] {
  top: calc(env(safe-area-inset-top, 0px) + 10px) !important;
  right: 0 !important;
  left: 0 !important;
  width: max-content !important;
  max-width: calc(100vw - 24px) !important;
  min-height: 44px !important;
  margin-inline: auto !important;
  padding: 5px 5px 5px 16px !important;
  gap: 12px !important;
  border: none !important;
  border-radius: 22px !important;
  background: rgba(0, 0, 0, 0.86) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.14), 0 12px 32px rgba(0, 0, 0, 0.28) !important;
  color: #f5f5f7 !important;
  font-family: var(--natif-font) !important;
  font-size: 13px !important;
}
[data-proto-surface="toolbar"] > span:first-child {
  background: color-mix(in srgb, var(--proto-accent) 50%, #ffffff) !important;
  box-shadow: 0 0 10px color-mix(in srgb, var(--proto-accent) 60%, #ffffff) !important;
}
[data-proto-surface="toolbar"] > span:nth-child(2) {
  color: rgba(255, 255, 255, 0.94) !important;
  font-weight: 500 !important;
  letter-spacing: -0.005em !important;
}
[data-proto-surface="toolbar"] > button {
  padding: 0 14px !important;
  border: none !important;
  border-radius: 999px !important;
  background: rgba(255, 255, 255, 0.16) !important;
  color: #ffffff !important;
  font-family: var(--natif-font) !important;
  font-size: 13px !important;
  font-weight: 600 !important;
}
@media ${FINE} {
  [data-proto-surface="toolbar"] > button:not([aria-disabled="true"]):hover {
    background: rgba(255, 69, 58, 0.26) !important;
    color: #ff8a80 !important;
  }
}
[data-proto-surface="overlay"] {
  background: var(--natif-overlay) !important;
}
[data-proto-surface="overlay"] > div {
  border: 2px solid var(--proto-accent) !important;
  border-radius: 12px !important;
  background: color-mix(in srgb, var(--proto-accent) 10%, transparent) !important;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--proto-accent) 16%, transparent), 0 8px 24px rgba(0, 0, 0, 0.08) !important;
}

/* ---------- Tooltip: a material callout ---------- */

#sp-tooltip {
  padding: 10px 14px 12px !important;
  border: none !important;
  border-radius: 14px !important;
  background: var(--natif-material) !important;
  -webkit-backdrop-filter: blur(30px) saturate(180%) !important;
  backdrop-filter: blur(30px) saturate(180%) !important;
  box-shadow: inset 0 0.5px 0 var(--natif-edge), var(--natif-shadow) !important;
  font-family: var(--natif-font) !important;
}
#sp-tooltip > div:last-child {
  display: none !important;
}
#sp-tooltip > div:first-child > span:not(:last-child) {
  padding: 2px 8px !important;
  background: color-mix(in srgb, currentColor 13%, transparent) !important;
  -webkit-text-fill-color: color-mix(in srgb, currentColor 74%, var(--natif-ink-mix));
  font-size: 11px !important;
  letter-spacing: 0.01em !important;
}
#sp-tooltip > div:first-child > span:last-child {
  color: var(--natif-text-2) !important;
  font-size: 12px !important;
}
#sp-tooltip > div:nth-child(2) {
  color: var(--natif-text) !important;
  font-size: 14px !important;
  line-height: 1.43 !important;
  letter-spacing: -0.006em;
}

/* ---------- Pins: filled type colour, white number, white edge ---------- */

#siteping-markers > [data-feedback-id] {
  border-color: #ffffff !important;
  background: currentColor !important;
  -webkit-text-fill-color: #ffffff;
  box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.12), 0 3px 8px rgba(0, 0, 0, 0.22) !important;
  font-family: var(--natif-font) !important;
  font-size: 12px !important;
  letter-spacing: -0.01em;
}
@media ${FINE} {
  #siteping-markers > [data-feedback-id]:hover {
    box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.12), 0 6px 16px rgba(0, 0, 0, 0.28) !important;
  }
}
#siteping-markers > [data-feedback-id]:focus-visible {
  outline: 2px solid var(--proto-accent);
  outline-offset: 2px;
}
/* Dark: the type colours are pastel there; the fill keeps a 4.5:1 tone under white. */
html[data-proto-theme="dark"] #siteping-markers > [style*="color: rgb(248, 113, 113)"] {
  background: #d01f1f !important;
}
html[data-proto-theme="dark"] #siteping-markers > [style*="color: rgb(251, 191, 36)"] {
  background: #b45309 !important;
}
html[data-proto-theme="dark"] #siteping-markers > [style*="color: rgb(96, 165, 250)"] {
  background: #2563eb !important;
}
html[data-proto-theme="dark"] #siteping-markers > [style*="color: rgb(148, 163, 184)"] {
  background: #5b6778 !important;
}
/* In progress: tinted, with the widget's half ring (status reads by shape, not colour alone). */
#siteping-markers > [data-feedback-id][style*=") rgba("] {
  border-color: currentColor currentColor color-mix(in srgb, currentColor 35%, #ffffff) color-mix(in srgb, currentColor 35%, #ffffff) !important;
  background: color-mix(in srgb, currentColor 14%, #ffffff) !important;
  -webkit-text-fill-color: color-mix(in srgb, currentColor 80%, #000000);
}
html[data-proto-theme="dark"] #siteping-markers > [data-feedback-id][style*=") rgba("] {
  border-color: currentColor currentColor color-mix(in srgb, currentColor 35%, #2c2c2e) color-mix(in srgb, currentColor 35%, #2c2c2e) !important;
  background: color-mix(in srgb, currentColor 18%, #2c2c2e) !important;
  -webkit-text-fill-color: currentColor;
}
/* Closed: a quiet material disc with a grey glyph. */
#siteping-markers > [data-feedback-id][style*="rgba(241, 245, 249"],
html[data-proto-theme="dark"] #siteping-markers > [data-feedback-id][style*="rgba(241, 245, 249"] {
  border-color: #ffffff !important;
  background: rgba(255, 255, 255, 0.94) !important;
  color: #8e8e93 !important;
  -webkit-text-fill-color: #636366;
  box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.14) !important;
}
html[data-proto-theme="dark"] #siteping-markers > [data-feedback-id][style*="rgba(241, 245, 249"] {
  border-color: #48484a !important;
  background: rgba(44, 44, 46, 0.94) !important;
  color: #aeaeb2 !important;
  -webkit-text-fill-color: #c7c7cc;
}
#siteping-markers .sp-cluster-badge {
  border-color: #ffffff !important;
  background: #1d1d1f !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff;
  font-family: var(--natif-font) !important;
}
#siteping-markers > div:not([data-feedback-id]) {
  border-radius: 12px !important;
}

/* ---------- Preferences ---------- */

@media (prefers-reduced-transparency: reduce) {
  [data-proto-surface="popup"],
  #sp-tooltip {
    background: var(--natif-grouped) !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }
  [data-proto-surface="toolbar"] {
    background: #000000 !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }
}
`;

export const natif: Skin = {
  name: "Natif",
  axis: "Matière et système, à la manière d'Apple : feuille translucide flottante, listes groupées, contrôles natifs",
  shadowCss,
  lightCss,
};
