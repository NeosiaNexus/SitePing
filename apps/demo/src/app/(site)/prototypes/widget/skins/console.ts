import type { Skin } from "./types";

/**
 * PROTOTYPE ONLY. Direction "Console": dense, flat, keyboard-first, in the
 * language of SitePing's own triage inbox (rows and hairlines, mono metadata,
 * one accent). Solid surfaces, hairlines for structure, one subtle shadow on
 * the layers that float. Motion stays between 120 and 160ms on the ease-out
 * curve, transform and opacity only.
 *
 * Tokens branch on the widget's own `color-scheme` (set on :host per theme)
 * through `light-dark()`, so one sheet serves both themes.
 */

const MONO = `ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace`;

const shadowCss = /* css */ `
/* ------------------------------------------------------------- tokens */
:host {
  --sp-bg: light-dark(#ffffff, #0f1115);
  --sp-bg-hover: light-dark(#f4f5f7, #1a1d23);
  --sp-text: light-dark(#0f1217, #eceef2);
  --sp-text-secondary: light-dark(#4b5462, #a4abb7);
  --sp-text-tertiary: light-dark(#5f6875, #8b93a0);
  --sp-border: light-dark(#e6e8eb, #23262d);
  --sp-glass-bg: var(--sp-bg);
  --sp-glass-bg-heavy: var(--sp-bg);
  --sp-glass-border: var(--sp-border);
  --sp-glass-border-subtle: var(--sp-border);
  --sp-backdrop: light-dark(rgba(15, 17, 21, 0.2), rgba(0, 0, 0, 0.55));
  --sp-identity-overlay: var(--sp-backdrop);
  --sp-identity-bg: var(--c-pop);
  --sp-scrim: light-dark(rgba(15, 17, 21, 0.3), rgba(0, 0, 0, 0.6));
  --sp-radius: 6px;
  --sp-radius-lg: 8px;
  --sp-radius-xl: 12px;
  --sp-blur: 0px;
  --sp-blur-heavy: 0px;
  --sp-shadow-xs: none;
  --sp-shadow-sm: none;
  --sp-shadow-md: var(--c-float);
  --sp-shadow-lg: var(--c-float);
  --sp-shadow-xl: var(--c-float);
  --sp-tr: color 120ms ease, background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease, transform 140ms var(--sp-ease-out);

  --c-pop: light-dark(#ffffff, #16191f);
  --c-raised: light-dark(#f7f8f9, #15181d);
  --c-line-strong: light-dark(#d3d7dd, #343841);
  --c-check: light-dark(#868c95, #737b87);
  --c-mono: ${MONO};
  --c-float: 0 1px 2px light-dark(rgba(16, 18, 23, 0.06), rgba(0, 0, 0, 0.4)), 0 8px 24px light-dark(rgba(16, 18, 23, 0.1), rgba(0, 0, 0, 0.5));
  --c-float-sm: 0 1px 2px light-dark(rgba(16, 18, 23, 0.08), rgba(0, 0, 0, 0.45));
  --c-sel: light-dark(color-mix(in srgb, var(--sp-accent) 7%, #ffffff), color-mix(in srgb, var(--sp-accent) 14%, #0f1115));
  --c-ink: var(--sp-text);
  --c-on-ink: var(--sp-bg);
  --c-ink-line: color-mix(in srgb, var(--sp-bg) 24%, var(--sp-text));
  --c-ink-hover: color-mix(in srgb, var(--sp-bg) 12%, var(--sp-text));
  --c-ink-muted: color-mix(in srgb, var(--sp-bg) 72%, var(--sp-text));
  --c-ink-danger: light-dark(#fca5a5, #b91c1c);
  --c-danger: #dc2626;
  --c-danger-hover: #b91c1c;
  font-size: 13px;
}

@media (prefers-contrast: more) {
  :host {
    --sp-border: var(--sp-text-tertiary);
    --c-line-strong: var(--sp-text-secondary);
  }
}

/* --------------------------------------------------------------- FAB */
.sp-fab {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--c-ink);
  color: var(--c-on-ink);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18), 0 6px 16px light-dark(rgba(16, 18, 23, 0.16), rgba(0, 0, 0, 0.5));
  transition: transform 140ms var(--sp-ease-out), background-color 120ms ease;
}
@media (hover: hover) and (pointer: fine) {
  .sp-fab:hover {
    background: color-mix(in srgb, var(--c-ink) 86%, var(--c-on-ink));
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18), 0 6px 16px light-dark(rgba(16, 18, 23, 0.16), rgba(0, 0, 0, 0.5));
  }
}
.sp-fab:focus-visible {
  outline: 2px solid var(--sp-accent);
  outline-offset: 2px;
}
.sp-fab svg {
  width: 20px;
  height: 20px;
}
.sp-fab-badge {
  top: -5px;
  right: -5px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 6px;
  background: var(--c-danger);
  border: 2px solid var(--sp-bg);
  font: 600 10.5px/1 var(--c-mono);
  letter-spacing: -0.02em;
}

/* --------------------------------------------------- speed dial menu */
.sp-radial {
  width: 44px;
  height: 44px;
}
.sp-radial-item {
  left: 4px;
  bottom: 4px;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--c-pop);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  border: 1px solid var(--sp-border);
  color: var(--sp-text-secondary);
  box-shadow: var(--c-float-sm);
  transition:
    transform 160ms var(--sp-ease-out),
    translate 160ms var(--sp-ease-out),
    opacity 120ms ease,
    background-color 120ms ease,
    border-color 120ms ease,
    color 120ms ease,
    scale 140ms var(--sp-ease-out);
}
/* The JS spaces items for 44px buttons: pull the 36px ones into an 8px rhythm. */
.sp-radial-item.sp-radial-item--open {
  translate: 0 calc(20px + var(--sp-i, 0) * 10px);
  transition-delay: calc(var(--sp-i, 0) * 20ms), calc(var(--sp-i, 0) * 20ms), calc(var(--sp-i, 0) * 20ms), 0s, 0s, 0s, 0s;
}
.sp-radial-item svg {
  width: 16px;
  height: 16px;
}
.sp-radial-item:focus-visible {
  background: var(--sp-bg-hover);
  border-color: var(--c-line-strong);
  color: var(--sp-text);
  box-shadow: var(--c-float-sm);
  outline: 2px solid var(--sp-accent);
  outline-offset: 2px;
}
@media (hover: hover) and (pointer: fine) {
  .sp-radial-item:hover {
    background: var(--sp-bg-hover);
    border-color: var(--c-line-strong);
    color: var(--sp-text);
    box-shadow: var(--c-float-sm);
  }
}
/* Labels read like keyboard hints. */
.sp-radial-label {
  padding: 4px 7px;
  border-radius: 5px;
  background: var(--c-pop);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  border: 1px solid var(--sp-border);
  box-shadow: inset 0 -1px 0 var(--sp-border), var(--c-float-sm);
  color: var(--sp-text-secondary);
  font: 500 11.5px/1.2 var(--c-mono);
  letter-spacing: -0.01em;
  transition: opacity 120ms ease, transform 140ms var(--sp-ease-out);
}
.sp-radial--bottom-right .sp-radial-label {
  right: calc(100% + 8px);
}
.sp-radial--bottom-left .sp-radial-label {
  left: calc(100% + 8px);
}

/* -------------------------------------------------------------- toast */
.sp-toast {
  bottom: 80px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--c-ink);
  color: var(--c-on-ink);
  font: 500 13px/1.4 var(--sp-font);
  box-shadow: var(--c-float);
  animation: sp-toast-in 160ms var(--sp-ease-out);
  transition: opacity 120ms ease;
}
.sp-toast--error {
  border-left: 0;
  box-shadow: inset 3px 0 0 #ef4444, var(--c-float);
  padding-left: 14px;
}

/* -------------------------------------------------------------- panel */
.sp-panel {
  width: 440px;
  background: var(--sp-bg);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  border-left: 1px solid var(--sp-border);
  box-shadow: -16px 0 40px -28px light-dark(rgba(16, 18, 23, 0.35), rgba(0, 0, 0, 0.9));
  font-size: 13px;
  transition: transform 120ms var(--sp-ease-out);
}
.sp-panel.sp-panel--open {
  transition: transform 160ms var(--sp-ease-out);
}
.sp-panel-header {
  height: 48px;
  flex-shrink: 0;
  gap: 8px;
  padding: 0 8px 0 16px;
  background: var(--sp-bg);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  border-bottom: 1px solid var(--sp-border);
}
.sp-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.sp-panel-header-right {
  gap: 2px;
}
.sp-export-btn,
.sp-btn-delete-all {
  height: 28px;
  padding: 0 8px;
  gap: 5px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--sp-text-secondary);
  font-size: 12px;
  font-weight: 500;
}
.sp-export-btn svg,
.sp-btn-delete-all svg {
  width: 14px;
  height: 14px;
}
@media (hover: hover) and (pointer: fine) {
  .sp-export-btn:hover {
    border-color: transparent;
    background: var(--sp-bg-hover);
    color: var(--sp-text);
  }
  .sp-btn-delete-all:hover {
    border-color: transparent;
    background: color-mix(in srgb, var(--sp-type-bug) 8%, transparent);
    color: var(--sp-type-bug);
  }
}
.sp-panel-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--sp-text-secondary);
}
.sp-panel-close svg {
  width: 14px;
  height: 14px;
}
@media (hover: hover) and (pointer: fine) {
  .sp-panel-close:hover {
    background: var(--sp-bg-hover);
    color: var(--sp-text);
  }
}

/* -------------------------------------- stats: one row, a 2px progress line */
.sp-stats-bar {
  position: relative;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  height: 34px;
  flex-shrink: 0;
  padding: 0 16px;
}
.sp-stats-row {
  gap: 14px;
}
.sp-stats-item {
  gap: 6px;
}
.sp-stats-dot {
  width: 6px;
  height: 6px;
}
/* Square = type, circle = status, as in the inbox. */
.sp-stats-item:nth-child(3) .sp-stats-dot {
  border-radius: 1.5px;
}
.sp-stats-value {
  font: 600 12px/1 var(--c-mono);
}
.sp-stats-label {
  font-size: 12px;
  line-height: 1;
  color: var(--sp-text-secondary);
  text-transform: none;
  letter-spacing: 0;
}
/* A 2px meter beside its figure, like a status bar. */
.sp-stats-progress {
  margin-left: auto;
  gap: 8px;
}
.sp-stats-progress-track {
  flex: 0 0 64px;
  height: 2px;
  border-radius: 1px;
  background: var(--sp-border);
}
.sp-stats-progress-fill {
  border-radius: 1px;
  background: var(--sp-text-secondary);
  transition: clip-path 240ms var(--sp-ease-out);
}
.sp-stats-progress-label {
  min-width: 0;
  font: 11.5px/1 var(--c-mono);
  color: var(--sp-text-tertiary);
}

/* ------------------------------------------------------------ filters */
.sp-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--sp-bg);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  flex-shrink: 0;
}
.sp-search-wrap {
  flex: 1 0 100%;
  margin: 0 0 2px;
}
/* "/" focuses the search: say so where the eye already is. */
.sp-search-wrap::after {
  content: "/";
  position: absolute;
  top: 50%;
  right: 7px;
  min-width: 18px;
  height: 18px;
  margin-top: -9px;
  padding: 0 4px;
  border: 1px solid var(--sp-border);
  border-radius: 4px;
  background: var(--sp-bg);
  color: var(--sp-text-tertiary);
  font: 500 11px/16px var(--c-mono);
  text-align: center;
  pointer-events: none;
  transition: opacity 120ms ease;
}
.sp-search-wrap:focus-within::after,
.sp-search-wrap:has(.sp-search:not(:placeholder-shown))::after {
  opacity: 0;
}
.sp-search {
  height: 30px;
  padding: 0 32px 0 30px;
  border-radius: 6px;
  border: 1px solid var(--sp-border);
  background: var(--c-raised);
  font-size: 13px;
}
.sp-search:focus {
  border-color: var(--sp-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--sp-accent) 22%, transparent);
  background: var(--sp-bg);
}
.sp-search-icon {
  left: 9px;
  width: 14px;
  height: 14px;
}
.sp-search:focus ~ .sp-search-icon,
.sp-search-wrap:focus-within .sp-search-icon {
  color: var(--sp-text-secondary);
}
/* One wrapping flow of 28px controls: [type, status] / [scope, mine ... sort, group]. */
.sp-filter-bar,
.sp-sort-controls {
  display: contents;
}
.sp-filter-dropdown {
  flex: 1 1 150px;
}
.sp-sort-dropdown {
  display: inline-flex;
  position: relative;
  margin-left: auto;
}
.sp-filter-dropdown-btn {
  --sp-chip-bg: var(--sp-bg-hover);
  height: 28px;
  gap: 6px;
  padding: 0 6px 0 8px;
  border-radius: 6px;
  border: 1px solid var(--sp-border);
  background: var(--sp-bg);
  font-size: 12px;
  font-weight: 500;
}
@media (hover: hover) and (pointer: fine) {
  .sp-filter-dropdown-btn:hover {
    border-color: var(--c-line-strong);
    background: var(--sp-bg-hover);
  }
}
.sp-filter-dropdown-btn[aria-expanded="true"] {
  border-color: var(--c-line-strong);
  background: var(--sp-bg-hover);
  box-shadow: none;
}
.sp-filter-dropdown-btn--filtered {
  border-color: color-mix(in srgb, var(--sp-chip-color) 45%, var(--sp-border));
  background: color-mix(in srgb, var(--sp-chip-color) 6%, var(--sp-bg));
}
.sp-filter-dropdown-btn__icon {
  width: 14px;
  height: 14px;
}
.sp-filter-dropdown-btn__icon svg {
  width: 13px;
  height: 13px;
}
.sp-filter-dropdown-btn__prefix {
  font: 500 10.5px/1 var(--c-mono);
  letter-spacing: 0.04em;
  color: var(--sp-text-tertiary);
}
.sp-filter-dropdown-btn__value {
  font-weight: 500;
}
.sp-filter-dropdown-btn__chevron {
  transition: transform 140ms var(--sp-ease-out), color 120ms ease;
}

/* Menus: solid, hairline, one shadow. */
.sp-filter-dropdown-menu,
.sp-sort-menu,
.sp-export-menu {
  padding: 4px;
  border-radius: 8px;
  background: var(--c-pop);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  border: 1px solid var(--sp-border);
  box-shadow: var(--c-float);
}
.sp-filter-dropdown-menu,
.sp-sort-menu {
  top: calc(100% + 4px);
  animation: sp-menu-in 120ms var(--sp-ease-out) backwards;
}
.sp-filter-dropdown-menu {
  min-width: 200px;
}
.sp-sort-menu {
  left: auto;
  right: 0;
  min-width: 168px;
  transform-origin: right top;
}
.sp-export-menu {
  top: calc(100% + 4px);
  min-width: 176px;
  transition: opacity 120ms ease, transform 120ms var(--sp-ease-out);
}
.sp-filter-dropdown-option,
.sp-sort-option,
.sp-export-option {
  min-height: 30px;
  padding: 0 8px;
  gap: 8px;
  border-radius: 5px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--sp-text);
}
.sp-filter-dropdown-option:focus-visible,
.sp-sort-option:focus-visible,
.sp-export-option:focus-visible {
  outline-offset: -2px;
  box-shadow: none;
  background: var(--sp-bg-hover);
  color: var(--sp-text);
}
.sp-filter-dropdown-option__icon {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: transparent;
}
@media (hover: hover) and (pointer: fine) {
  .sp-filter-dropdown-option:hover,
  .sp-filter-dropdown-option--active:hover,
  .sp-sort-option:hover,
  .sp-export-option:hover {
    background: var(--sp-bg-hover);
    color: var(--sp-text);
  }
  .sp-sort-option--active:hover {
    background: var(--sp-accent-light);
    color: var(--sp-accent-text);
  }
}
.sp-filter-dropdown-option--active {
  color: var(--sp-chip-color);
  font-weight: 600;
}
.sp-export-option-icon svg {
  width: 14px;
  height: 14px;
  color: var(--sp-text-tertiary);
}

/* Segmented: flat track, a subtle fill on the active segment. */
.sp-segmented {
  height: 28px;
  padding: 2px;
  gap: 1px;
  border-radius: 6px;
  border: 1px solid var(--sp-border);
  background: var(--sp-bg);
}
.sp-segmented__btn {
  height: 22px;
  padding: 0 8px;
  gap: 5px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--sp-text-secondary);
}
.sp-segmented__icon,
.sp-segmented__icon svg {
  width: 12px;
  height: 12px;
}
@media (hover: hover) and (pointer: fine) {
  .sp-segmented__btn:hover {
    color: var(--sp-text);
    background: var(--sp-bg-hover);
  }
}
.sp-segmented__btn.sp-segmented__btn--active {
  background: color-mix(in srgb, var(--sp-text) 8%, var(--sp-bg));
  color: var(--sp-text);
  font-weight: 500;
  box-shadow: none;
}

/* Toggles and the sort trigger: 28px, hairline, quiet. */
.sp-sort-btn,
.sp-group-toggle,
.sp-mine-toggle {
  height: 28px;
  padding: 0 8px;
  gap: 5px;
  border-radius: 6px;
  border: 1px solid var(--sp-border);
  background: var(--sp-bg);
  color: var(--sp-text-secondary);
  font-size: 12px;
  font-weight: 500;
}
.sp-sort-btn svg {
  width: 13px;
  height: 13px;
}
/* Text toggles: the label says it, the 28px row stays on two lines. */
.sp-group-toggle svg,
.sp-mine-toggle svg {
  display: none;
}
@media (hover: hover) and (pointer: fine) {
  .sp-sort-btn:hover,
  .sp-group-toggle:hover,
  .sp-mine-toggle:hover {
    border-color: var(--c-line-strong);
    background: var(--sp-bg-hover);
    color: var(--sp-text);
  }
  .sp-group-toggle--active:hover,
  .sp-mine-toggle--active:hover {
    border-color: color-mix(in srgb, var(--sp-accent) 55%, var(--sp-border));
    background: color-mix(in srgb, var(--sp-accent) 14%, var(--sp-bg));
    color: var(--sp-accent-text);
  }
}
.sp-sort-btn[aria-expanded="true"] {
  border-color: var(--c-line-strong);
  background: var(--sp-bg-hover);
  color: var(--sp-text);
}
.sp-group-toggle--active,
.sp-mine-toggle--active {
  border-color: color-mix(in srgb, var(--sp-accent) 45%, var(--sp-border));
  background: color-mix(in srgb, var(--sp-accent) 10%, var(--sp-bg));
  color: var(--sp-accent-text);
  box-shadow: none;
}

/* ------------------------------------------------------- list as rows */
.sp-list {
  padding: 0 0 44px;
  scrollbar-width: thin;
  scrollbar-color: var(--c-line-strong) transparent;
}
.sp-card {
  --c-row-bg: var(--sp-bg);
  position: relative;
  display: block;
  margin: 0;
  padding: 9px 14px 10px 36px;
  border: 0;
  border-bottom: 1px solid var(--sp-border);
  border-radius: 0;
  background: var(--c-row-bg);
  box-shadow: none;
  transition: background-color 120ms ease;
}
@media (hover: hover) and (pointer: fine) {
  .sp-card:hover {
    --c-row-bg: var(--sp-bg-hover);
    background: var(--c-row-bg);
    border-color: var(--sp-border);
    box-shadow: none;
  }
}
.sp-card:active {
  transform: none;
  --c-row-bg: color-mix(in srgb, var(--sp-text) 6%, var(--sp-bg));
}
.sp-card:focus-visible {
  outline: 2px solid var(--sp-accent);
  outline-offset: -2px;
  box-shadow: none;
}
.sp-card.sp-card--focused {
  --c-row-bg: var(--sp-bg-hover);
  outline: 0;
  box-shadow: inset 2px 0 0 var(--sp-accent);
}
.sp-card.sp-card--focused:focus-visible {
  outline: 2px solid var(--sp-accent);
  outline-offset: -2px;
}
@media not (forced-colors: active) {
  .sp-card.sp-card--selected {
    --c-row-bg: var(--c-sel);
    border-left: 0 !important;
    background: var(--c-row-bg) !important;
    box-shadow: inset 2px 0 0 var(--sp-accent);
  }
}
/* The type bar becomes a 6px square in the gutter (square = type). */
.sp-card-bar {
  position: absolute;
  left: 16px;
  top: 16px;
  width: 6px;
  height: 6px;
  margin: 0;
  border-radius: 1.5px;
  transition: opacity 120ms ease;
}
/* The checkbox takes the gutter when the row is pointed at or selected. */
.sp-card .sp-bulk-checkbox {
  position: absolute;
  left: 12px;
  top: 12px;
  width: 14px;
  height: 14px;
}
.sp-card .sp-bulk-checkbox svg {
  width: 14px;
  height: 14px;
}
.sp-bulk-checkbox {
  color: var(--c-check);
  transition: opacity 120ms ease, color 120ms ease, transform 140ms var(--sp-ease-out);
}
.sp-bulk-checkbox--checked {
  color: var(--sp-accent);
  filter: none;
}
@media (hover: hover) and (pointer: fine) {
  .sp-bulk-checkbox:hover {
    color: var(--sp-text-secondary);
  }
  .sp-bulk-checkbox--checked:hover {
    color: var(--sp-accent);
  }
  .sp-card:hover .sp-card-bar {
    opacity: 0;
  }
}
.sp-card:focus-within .sp-bulk-checkbox,
.sp-bulk-checkbox:focus-visible {
  opacity: 1;
}
.sp-card:focus-within .sp-card-bar,
.sp-list--has-selection .sp-card-bar {
  opacity: 0;
}
.sp-card-body {
  min-width: 0;
}
.sp-card-header {
  flex-wrap: nowrap;
  gap: 6px;
  min-height: 18px;
  margin-bottom: 3px;
}
.sp-card-number {
  min-width: 20px;
  font: 500 11.5px/1 var(--c-mono);
  color: var(--sp-text-tertiary);
}
.sp-badge {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 5px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  background: transparent !important;
  font: 500 11px/1 var(--c-mono);
  letter-spacing: -0.01em;
}
.sp-card-date {
  font: 11.5px/1 var(--c-mono);
  color: var(--sp-text-tertiary);
}
.sp-card-message {
  font-size: 13px;
  line-height: 1.45;
  color: var(--sp-text);
  -webkit-line-clamp: 2;
}
.sp-card--resolved {
  opacity: 1;
}
.sp-card--resolved .sp-card-message {
  color: var(--sp-text-secondary);
  text-decoration: none;
}
.sp-card-expand {
  position: relative;
  padding: 2px 0 0;
  font-size: 12px;
  color: var(--sp-accent-text);
}
.sp-lost {
  margin-top: 3px;
  font: 11px/1.4 var(--c-mono);
  color: var(--sp-text-tertiary);
}
/* Row actions: revealed on hover or keyboard focus, over the row's metadata. */
.sp-card-footer {
  position: absolute;
  top: 6px;
  right: 10px;
  gap: 4px;
  margin: 0;
  padding-left: 20px;
  background: linear-gradient(to right, transparent, var(--c-row-bg) 16px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
}
@media (hover: hover) and (pointer: fine) {
  .sp-card:hover .sp-card-footer {
    opacity: 1;
    pointer-events: auto;
  }
}
.sp-card:focus-within .sp-card-footer {
  opacity: 1;
  pointer-events: auto;
}
.sp-btn-resolve,
.sp-btn-delete {
  height: 24px;
  padding: 0 7px;
  gap: 4px;
  border-radius: 5px;
  border: 1px solid var(--sp-border);
  background: var(--sp-bg);
  color: var(--sp-text-secondary);
  font-size: 12px;
  font-weight: 500;
}
.sp-btn-resolve svg,
.sp-btn-delete svg {
  width: 13px;
  height: 13px;
}
@media (hover: hover) and (pointer: fine) {
  .sp-btn-resolve:hover {
    border-color: color-mix(in srgb, var(--sp-status-open) 45%, var(--sp-border));
    background: color-mix(in srgb, var(--sp-status-open) 7%, var(--sp-bg));
    color: var(--sp-status-open);
  }
  .sp-btn-delete:hover {
    border-color: color-mix(in srgb, var(--sp-type-bug) 45%, var(--sp-border));
    background: color-mix(in srgb, var(--sp-type-bug) 7%, var(--sp-bg));
    color: var(--sp-type-bug);
  }
}

/* Select all: a column header over the rows, its box in the gutter. Always
   shown on fine pointers (touch keeps the widget's own rule). */
.sp-bulk-select-all {
  opacity: 1;
  gap: 10px;
  height: 30px;
  margin: 0;
  padding: 0 16px 0 12px;
  border-radius: 0;
  border-bottom: 1px solid var(--sp-border);
  background: var(--c-raised);
  font: 500 10.5px/1 var(--c-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sp-text-tertiary);
  transition: opacity 120ms ease, background-color 120ms ease;
}
.sp-bulk-select-all .sp-bulk-checkbox,
.sp-bulk-select-all .sp-bulk-checkbox svg {
  width: 14px;
  height: 14px;
}
@media (hover: hover) and (pointer: fine) {
  .sp-bulk-select-all:hover {
    background: var(--sp-bg-hover);
  }
}

/* Bulk bar: the selection mode, in ink like the launcher. */
.sp-bulk-bar {
  left: 12px;
  right: 12px;
  bottom: 12px;
  gap: 6px 10px;
  padding: 6px 6px 6px 12px;
  border-radius: 8px;
  background: var(--c-ink);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  border: 0;
  box-shadow: var(--c-float);
  transform: translateY(calc(100% + 12px));
  transition: transform 160ms var(--sp-ease-out), opacity 120ms ease;
}
.sp-bulk-bar.sp-bulk-bar--visible {
  transform: none;
}
.sp-bulk-bar-count {
  color: var(--c-on-ink);
  font-size: 12.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
}
.sp-bulk-bar-actions {
  gap: 4px;
}
.sp-bulk-btn-resolve,
.sp-bulk-btn-delete {
  height: 28px;
  padding: 0 10px;
  gap: 5px;
  border-radius: 6px;
  border: 1px solid var(--c-ink-line);
  background: transparent;
  color: var(--c-on-ink);
  font-size: 12px;
  font-weight: 500;
}
.sp-bulk-btn-delete {
  color: var(--c-ink-danger);
}
@media (hover: hover) and (pointer: fine) {
  .sp-bulk-btn-resolve:hover,
  .sp-bulk-btn-delete:hover {
    background: var(--c-ink-hover);
    box-shadow: none;
  }
}
.sp-bulk-btn-deselect {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--c-ink-line);
  color: var(--c-ink-muted);
}
@media (hover: hover) and (pointer: fine) {
  .sp-bulk-btn-deselect:hover {
    background: var(--c-ink-hover);
    border-color: var(--c-ink-line);
    color: var(--c-on-ink);
  }
}

/* Page groups: a mono path header. */
.sp-group-header {
  gap: 6px;
  min-height: 30px;
  padding: 0 16px 0 12px;
  background: var(--c-raised);
  border-bottom: 1px solid var(--sp-border);
}
@media (hover: hover) and (pointer: fine) {
  .sp-group-header:hover {
    background: var(--sp-bg-hover);
  }
}
.sp-group-header-chevron {
  transition: transform 140ms var(--sp-ease-out);
}
.sp-group-header-path {
  font: 500 11.5px/1.2 var(--c-mono);
  color: var(--sp-text-secondary);
}
.sp-group-header-count {
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid var(--sp-border);
  background: transparent !important;
  color: var(--sp-text-tertiary) !important;
  font: 500 11px/1.2 var(--c-mono);
}

/* Empty, loading, load more. */
.sp-empty {
  padding: 48px 24px;
  gap: 6px;
}
.sp-empty-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--sp-text-secondary);
}
.sp-loading {
  padding: 40px 24px;
}
.sp-spinner {
  width: 16px;
  height: 16px;
  border-width: 1.5px;
}
.sp-load-more-wrap {
  padding: 10px 16px 4px;
}

/* ------------------------------------------------------------ buttons */
.sp-btn-primary,
.sp-btn-ghost,
.sp-btn-danger {
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  box-shadow: none;
}
.sp-btn-primary {
  background: var(--sp-accent);
}
@media (hover: hover) and (pointer: fine) {
  .sp-btn-primary:hover {
    background: color-mix(in srgb, var(--sp-accent) 86%, #000);
    box-shadow: none;
  }
}
.sp-btn-ghost {
  border: 1px solid var(--sp-border);
  background: var(--sp-bg);
  color: var(--sp-text);
}
@media (hover: hover) and (pointer: fine) {
  .sp-btn-ghost:hover {
    border-color: var(--c-line-strong);
    background: var(--sp-bg-hover);
    color: var(--sp-text);
  }
}
.sp-btn-danger {
  background: var(--c-danger);
}
@media (hover: hover) and (pointer: fine) {
  .sp-btn-danger:hover {
    background: var(--c-danger-hover);
    box-shadow: none;
  }
}
.sp-input {
  height: 32px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--sp-border);
  background: var(--sp-bg);
  font-size: 13px;
}
.sp-input:focus {
  border-color: var(--sp-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--sp-accent) 22%, transparent);
  background: var(--sp-bg);
}
.sp-input-label {
  margin-bottom: 5px;
  font: 500 10.5px/1.2 var(--c-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sp-text-tertiary);
}

/* ------------------------------------------- confirm and identity dialogs */
.sp-confirm-backdrop,
.sp-identity-backdrop {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  transition: opacity 140ms ease;
}
.sp-confirm-dialog,
.sp-identity-modal {
  padding: 16px;
  border-radius: 10px;
  background: var(--c-pop);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  border: 1px solid var(--sp-border);
  box-shadow: var(--c-float);
  transition: transform 160ms var(--sp-ease-out);
}
.sp-identity-modal {
  width: 340px;
  transform: translateY(6px) scale(0.98);
}
.sp-confirm-title,
.sp-identity-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.sp-confirm-title {
  margin-bottom: 4px;
}
.sp-identity-title {
  margin-bottom: 14px !important;
}
.sp-confirm-message {
  margin-bottom: 16px;
  font-size: 13px;
  line-height: 1.5;
}
.sp-confirm-actions,
.sp-identity-actions {
  gap: 6px;
}
.sp-identity-actions {
  margin-top: 16px;
}

/* ------------------------------------------------- shortcuts reference */
.sp-shortcuts-overlay {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  transition: opacity 140ms ease;
}
.sp-shortcuts-card {
  width: 340px;
  padding: 0;
  overflow: hidden;
  border-radius: 10px;
  background: var(--c-pop);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  border: 1px solid var(--sp-border);
  box-shadow: var(--c-float);
}
.sp-shortcuts-title {
  height: 42px;
  margin: 0;
  padding: 0 44px 0 14px;
  gap: 8px;
  border-bottom: 1px solid var(--sp-border);
  font-size: 13px;
  font-weight: 600;
}
.sp-shortcuts-title svg {
  width: 15px;
  height: 15px;
  color: var(--sp-text-tertiary);
}
.sp-shortcuts-close {
  top: 7px;
  right: 7px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--sp-text-secondary);
}
.sp-shortcuts-grid {
  gap: 0;
  padding: 4px 0;
}
.sp-shortcuts-row {
  flex-direction: row-reverse;
  justify-content: space-between;
  min-height: 34px;
  padding: 0 14px;
  gap: 12px;
}
.sp-shortcuts-row + .sp-shortcuts-row {
  border-top: 1px solid var(--sp-border);
}
.sp-shortcuts-keys {
  min-width: 0;
  gap: 4px;
}
.sp-shortcuts-separator {
  font: 11px/1 var(--c-mono);
}
.sp-shortcuts-desc {
  font-size: 13px;
  color: var(--sp-text);
}
.sp-kbd {
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 4px;
  background: var(--c-raised);
  border: 1px solid var(--sp-border);
  box-shadow: inset 0 -1px 0 var(--sp-border);
  font: 500 11px/1 var(--c-mono);
  color: var(--sp-text-secondary);
}
.sp-shortcuts-hint {
  right: 10px;
  bottom: 10px;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid var(--sp-border);
  background: var(--c-pop);
  color: var(--sp-text-secondary);
  font: 600 11.5px/1 var(--c-mono);
  box-shadow: inset 0 -1px 0 var(--sp-border);
}
@media (hover: hover) and (pointer: fine) {
  .sp-shortcuts-hint:hover {
    background: var(--sp-bg-hover);
    border-color: var(--c-line-strong);
    color: var(--sp-text);
  }
}
.sp-shortcuts-hint::after {
  padding: 4px 7px;
  border-radius: 5px;
  background: var(--c-pop);
  border: 1px solid var(--sp-border);
  box-shadow: var(--c-float-sm);
  font: 500 11.5px/1.2 var(--c-mono);
  color: var(--sp-text-secondary);
  transition: opacity 120ms ease, transform 140ms var(--sp-ease-out);
}

/* -------------------------------------------------------------- detail */
.sp-detail {
  background: var(--sp-bg);
  transition: transform 120ms var(--sp-ease-out);
}
.sp-detail.sp-detail--visible {
  transition: transform 160ms var(--sp-ease-out);
}
.sp-detail-header {
  height: 48px;
  min-height: 48px;
  gap: 6px;
  padding: 0 12px 0 8px;
  background: var(--sp-bg);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
.sp-detail-back {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--sp-text-secondary);
}
.sp-detail-back svg {
  width: 16px;
  height: 16px;
}
.sp-detail-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.sp-detail-content {
  scrollbar-width: thin;
  scrollbar-color: var(--c-line-strong) transparent;
}
.sp-detail-section {
  padding: 14px 16px;
}
.sp-detail-section-title {
  margin-bottom: 10px;
  gap: 6px;
  font: 600 10.5px/1.2 var(--c-mono);
  letter-spacing: 0.08em;
  color: var(--sp-text-tertiary);
}
.sp-detail-section-title svg {
  width: 12px;
  height: 12px;
  opacity: 0.8;
}
/* Status section: title, then [status ... actions] on one line. */
.sp-detail-section:has(> .sp-detail-status) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.sp-detail-section:has(> .sp-detail-status) > .sp-detail-section-title {
  flex: 1 0 100%;
  margin-bottom: 2px;
}
.sp-detail-status {
  margin: 0;
}
.sp-detail-status .sp-detail-status-pill {
  height: 24px;
  gap: 6px;
  padding: 0 8px;
  border-radius: 5px;
  background: transparent;
  border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  font: 500 11.5px/1 var(--c-mono);
  letter-spacing: -0.01em;
}
.sp-detail-actions {
  gap: 6px;
  margin-left: auto;
}
.sp-detail-actions button,
.sp-detail-actions a {
  flex: 0 0 auto;
  height: 32px;
  padding: 0 10px;
  gap: 6px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
}
.sp-detail-actions button svg,
.sp-detail-actions a svg {
  width: 14px;
  height: 14px;
}
.sp-detail-btn-resolve,
.sp-detail-btn-reopen,
.sp-detail-btn-delete,
.sp-detail-btn-custom {
  border: 1px solid var(--sp-border);
  background: var(--sp-bg);
  color: var(--sp-text);
  box-shadow: none;
}
.sp-detail-btn-resolve svg {
  color: var(--sp-status-open);
}
.sp-detail-btn-reopen svg {
  color: var(--sp-accent-text);
}
.sp-detail-btn-delete {
  color: var(--sp-type-bug);
}
@media (hover: hover) and (pointer: fine) {
  .sp-detail-btn-resolve:hover,
  .sp-detail-btn-reopen:hover,
  .sp-detail-btn-custom:hover {
    border-color: var(--c-line-strong);
    background: var(--sp-bg-hover);
    color: var(--sp-text);
    box-shadow: none;
  }
  .sp-detail-btn-delete:hover {
    border-color: color-mix(in srgb, var(--sp-type-bug) 45%, var(--sp-border));
    background: color-mix(in srgb, var(--sp-type-bug) 7%, var(--sp-bg));
    box-shadow: none;
  }
}
.sp-detail-actions--custom {
  flex: 1 0 100%;
  margin: 0;
}
/* The message and its thread: a compact log. */
.sp-detail-message {
  padding: 1px 0 1px 12px;
  border-left: 2px solid var(--sp-border);
  border-radius: 0;
  background: transparent;
  font-size: 13.5px;
  line-height: 1.55;
}
.sp-thread-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 10px;
}
.sp-comment {
  margin: 0;
  padding: 5px 0 5px 12px;
  border-left-color: var(--sp-border);
  font-size: 13px;
  line-height: 1.5;
}
.sp-comment[data-role="team"] {
  border-left-color: var(--sp-accent);
}
.sp-comment-head {
  gap: 6px;
  margin-bottom: 1px;
  font-size: 12px;
}
.sp-comment-head .sp-badge {
  height: 16px;
  padding: 0 4px;
  font-size: 10.5px;
  color: var(--sp-accent-text);
}
.sp-comment-head time {
  font: 11px/1 var(--c-mono);
  color: var(--sp-text-tertiary);
}
.sp-input.sp-thread-input {
  height: auto;
  min-height: 64px;
  margin-top: 10px;
  padding: 8px 10px;
  line-height: 1.45;
  resize: vertical;
}
.sp-thread-foot {
  margin-top: 6px;
  font: 11px/1.2 var(--c-mono);
  color: var(--sp-text-tertiary);
}
.sp-thread-error {
  border-radius: 6px;
}
.sp-detail-screenshot {
  border-radius: 6px;
  border: 1px solid var(--sp-border);
  background: var(--c-raised);
}
/* Metadata: a dense key / value grid. */
.sp-detail-meta,
.sp-detail-annotation-info {
  gap: 0;
}
.sp-detail-meta-row,
.sp-detail-annotation-row {
  display: grid;
  grid-template-columns: 14px 92px minmax(0, 1fr);
  column-gap: 10px;
  align-items: center;
  min-height: 28px;
  padding: 3px 0;
}
.sp-detail-meta-row svg,
.sp-detail-annotation-row svg {
  width: 13px;
  height: 13px;
  margin: 0;
}
.sp-detail-meta-content {
  display: contents;
}
.sp-detail-meta-label,
.sp-detail-annotation-label {
  margin: 0;
  font: 500 10.5px/1.2 var(--c-mono);
  letter-spacing: 0.06em;
  color: var(--sp-text-tertiary);
}
.sp-detail-meta-value,
.sp-detail-annotation-value {
  font-size: 12.5px;
  line-height: 1.4;
  word-break: break-word;
}
/* Page, dates and viewport are data: mono. */
.sp-detail-meta-row:is(:nth-child(1), :nth-child(3), :nth-child(6)) .sp-detail-meta-value,
.sp-detail-meta-value--mono,
.sp-detail-annotation-row:nth-child(3) .sp-detail-annotation-value {
  font: 12px/1.4 var(--c-mono);
  background: none;
  border: 0;
  padding: 0;
}
.sp-detail-annotation {
  gap: 10px;
}
.sp-detail-annotation-info {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
}
.sp-detail-annotation-value--mono {
  justify-self: start;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid var(--sp-border);
  background: var(--c-raised);
  font: 11.5px/1.4 var(--c-mono);
}
.sp-detail-btn-goto {
  height: 32px;
  gap: 6px;
  border-radius: 6px;
  border: 1px solid var(--sp-border);
  background: var(--sp-bg);
  color: var(--sp-text);
  box-shadow: none;
  font-size: 12.5px;
  font-weight: 500;
}
.sp-detail-btn-goto svg {
  width: 14px;
  height: 14px;
  color: var(--sp-accent-text);
}
@media (hover: hover) and (pointer: fine) {
  .sp-detail-btn-goto:hover {
    border-color: var(--c-line-strong);
    background: var(--sp-bg-hover);
    box-shadow: none;
  }
}
/* Diagnostics: a log viewer. */
.sp-detail-diag {
  gap: 8px;
}
.sp-detail-diag-toggle {
  height: 32px;
  padding: 0 8px 0 10px;
  border-radius: 6px;
  border: 1px solid var(--sp-border);
  background: var(--sp-bg);
  font-size: 12.5px;
  font-weight: 500;
}
@media (hover: hover) and (pointer: fine) {
  .sp-detail-diag-toggle:hover {
    background: var(--sp-bg-hover);
  }
}
.sp-detail-diag-toggle svg {
  transition: transform 140ms var(--sp-ease-out);
}
.sp-detail-diag-counts {
  gap: 4px;
}
.sp-detail-diag-count {
  padding: 2px 5px;
  border-radius: 4px;
  border: 1px solid var(--sp-border);
  background: transparent;
  color: var(--sp-text-secondary);
  font: 500 11px/1 var(--c-mono);
}
.sp-detail-diag-count--errors {
  border-color: color-mix(in srgb, var(--sp-type-bug) 35%, transparent);
  background: transparent;
  color: var(--sp-type-bug);
}
.sp-detail-diag-body {
  gap: 10px;
}
.sp-detail-diag-group-title {
  margin-bottom: 4px;
  font: 600 10.5px/1.2 var(--c-mono);
  letter-spacing: 0.08em;
}
.sp-detail-diag-list {
  border-radius: 6px;
  border: 1px solid var(--sp-border);
  background: var(--c-raised);
}
.sp-detail-diag-list li {
  padding: 5px 8px;
  border-bottom: 1px solid var(--sp-border);
  font: 11.5px/1.45 var(--c-mono);
}
.sp-detail-diag-level {
  width: 40px;
  font-size: 10.5px;
}

/* ----------------------------------------- touch: always reachable */
@media not all and (hover: hover) and (pointer: fine) {
  /* The row's actions share its metadata line instead of a line of their own. */
  .sp-card-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 8px;
  }
  .sp-card-body > * {
    grid-column: 1 / -1;
  }
  .sp-card-body > .sp-card-header {
    grid-column: 1;
    grid-row: 1;
    align-self: center;
  }
  .sp-card-body > .sp-card-footer {
    grid-column: 2;
    grid-row: 1;
    align-self: center;
    position: static;
    margin: 0;
    padding: 0;
    background: none;
    opacity: 1;
    pointer-events: auto;
  }
  .sp-card-bar {
    opacity: 0;
  }
  .sp-search-wrap::after {
    display: none;
  }
  .sp-list {
    padding-bottom: 0;
  }
}

/* --------------------------------------- coarse pointers: 40px targets */
@media (pointer: coarse) {
  .sp-radial-item {
    left: 0;
    bottom: 0;
    width: 44px;
    height: 44px;
    border-radius: 12px;
  }
  .sp-radial-item.sp-radial-item--open {
    translate: 0 calc(22px + var(--sp-i, 0) * 6px);
  }
  .sp-radial-item svg {
    width: 18px;
    height: 18px;
  }
  .sp-radial-label {
    padding: 6px 8px;
    font-size: 12px;
    font-weight: 500;
  }
  .sp-search,
  .sp-input {
    font-size: 16px;
  }
  .sp-panel-close,
  .sp-detail-back,
  .sp-export-btn,
  .sp-btn-delete-all {
    min-width: 40px;
    min-height: 40px;
  }
  .sp-filter-dropdown-btn,
  .sp-sort-btn,
  .sp-group-toggle,
  .sp-mine-toggle {
    height: 40px;
  }
  .sp-segmented {
    height: 40px;
    padding: 0;
  }
  .sp-segmented__btn {
    height: 38px;
    padding: 0 10px;
    border-radius: 5px;
  }
  .sp-bulk-btn-resolve,
  .sp-bulk-btn-delete {
    height: 40px;
    min-height: 40px;
    padding: 0 12px;
  }
  /* Row actions: 36px icon buttons with a 40px hit area; the label stays
     the accessible name, visually hidden. */
  .sp-btn-resolve,
  .sp-btn-delete {
    position: relative;
    width: 36px;
    height: 36px;
    min-height: 36px;
    padding: 0;
    justify-content: center;
    border-radius: 6px;
  }
  .sp-btn-resolve::after,
  .sp-btn-delete::after {
    content: "";
    position: absolute;
    inset: -2px;
  }
  .sp-btn-resolve svg,
  .sp-btn-delete svg {
    width: 16px;
    height: 16px;
  }
  .sp-btn-resolve span,
  .sp-btn-delete span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .sp-btn-delete {
    color: var(--sp-type-bug);
  }
  .sp-card:has(.sp-card-footer) .sp-bulk-checkbox {
    top: 20px;
  }
  .sp-bulk-btn-deselect {
    width: 40px;
    height: 40px;
  }
  .sp-card-expand::after {
    content: "";
    position: absolute;
    inset: -10px -8px;
  }
  .sp-detail-actions button,
  .sp-detail-actions a,
  .sp-detail-btn-goto,
  .sp-detail-diag-toggle,
  .sp-btn-primary,
  .sp-btn-ghost,
  .sp-btn-danger {
    height: 44px;
    min-height: 44px;
  }
  .sp-input {
    height: 44px;
  }
  .sp-group-header {
    min-height: 40px;
  }
  .sp-shortcuts-close {
    width: 40px;
    height: 40px;
    top: 1px;
    right: 1px;
  }
  .sp-filter-dropdown-option,
  .sp-sort-option,
  .sp-export-option {
    min-height: 44px;
  }
}

/* ----------------------------------------- phones: bottom sheets */
@media (max-width: 640px), (max-height: 500px) and (pointer: coarse) {
  .sp-toast {
    bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  }
  .sp-panel {
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    width: auto;
    max-width: none;
    height: calc(100dvh - 40px - env(safe-area-inset-top, 0px));
    border-left: 0;
    border-top: 1px solid var(--sp-border);
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -8px 32px light-dark(rgba(16, 18, 23, 0.12), rgba(0, 0, 0, 0.5));
    transform: translateY(105%);
  }
  .sp-panel.sp-panel--open {
    transform: translateY(0);
    transition: transform 200ms var(--sp-ease-drawer);
  }
  .sp-panel-header,
  .sp-detail-header {
    position: relative;
    height: auto;
    min-height: 60px;
    touch-action: none;
  }
  .sp-panel-header {
    padding: 14px 6px 4px 16px;
  }
  .sp-detail-header {
    padding: 14px 12px 4px 6px;
  }
  .sp-panel-header::before,
  .sp-detail-header::before {
    content: "";
    position: absolute;
    top: 6px;
    left: 50%;
    width: 32px;
    height: 4px;
    margin-left: -16px;
    border-radius: 2px;
    background: var(--c-line-strong);
  }
  .sp-export-btn,
  .sp-btn-delete-all {
    width: 40px;
    height: 40px;
    padding: 0;
    justify-content: center;
  }
  .sp-export-btn svg,
  .sp-btn-delete-all svg {
    width: 16px;
    height: 16px;
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
  .sp-stats-bar,
  .sp-filters {
    touch-action: pan-x;
  }
  .sp-filters {
    display: block;
    padding: 10px 16px 8px;
  }
  .sp-search-wrap {
    margin: 0;
  }
  .sp-search {
    height: 40px;
  }
  .sp-filter-bar {
    display: flex;
    flex-wrap: nowrap;
    gap: 6px;
    overflow-x: auto;
    margin: 8px -16px 0;
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
  .sp-sort-controls {
    display: flex;
    gap: 6px;
    margin-top: 6px;
    padding-top: 0;
    border-top: 0;
  }
  .sp-sort-dropdown {
    margin-left: 0;
  }
  .sp-filter-dropdown-menu,
  .sp-sort-menu {
    position: fixed;
    top: auto;
    left: 8px;
    right: 8px;
    bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    min-width: 0;
    padding: 4px;
    border-radius: 12px;
    z-index: 30;
    transform-origin: bottom center;
  }
  .sp-filter-dropdown-option,
  .sp-sort-option {
    min-height: 44px;
    font-size: 14px;
  }
  .sp-list {
    padding: 0 0 calc(12px + env(safe-area-inset-bottom, 0px));
  }
  .sp-bulk-bar {
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }
  .sp-detail-section {
    padding: 14px 16px;
  }
  .sp-detail-content {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .sp-identity-modal {
    width: 100%;
    max-width: none;
    margin-bottom: var(--sp-kb, 0px);
    padding: 16px 16px calc(16px + env(safe-area-inset-bottom, 0px));
    border-radius: 12px 12px 0 0;
    border-width: 1px 0 0;
    transform: translateY(100%);
  }
  .sp-identity-actions button {
    flex: 1;
    height: 44px;
  }
  .sp-identity-actions .sp-btn-primary {
    flex: 2;
  }
}
`;

const lightCss = /* css */ `
/* Surfaces on the host page: inline styles, so !important. */
html {
  --cs-bg: #ffffff;
  --cs-track: #f3f4f6;
  --cs-hover: #eceef1;
  --cs-line: #e6e8eb;
  --cs-line-strong: #d3d7dd;
  --cs-text: #0f1217;
  --cs-text-2: #4b5462;
  --cs-text-3: #5f6875;
  --cs-ink: #0f1217;
  --cs-on-ink: #ffffff;
  --cs-disabled-bg: #f1f2f4;
  --cs-disabled-text: #8a919c;
  --cs-float: 0 1px 2px rgba(16, 18, 23, 0.06), 0 8px 24px rgba(16, 18, 23, 0.1);
  --cs-q: #2563eb;
  --cs-c: #b45309;
  --cs-b: #d01f1f;
  --cs-o: #5b6778;
  --cs-pin-ring: #ffffff;
  --cs-mono: ${MONO};
}
html[data-proto-theme="dark"] {
  --cs-bg: #16191f;
  --cs-track: #0f1115;
  --cs-hover: #20242b;
  --cs-line: #2a2e36;
  --cs-line-strong: #3a3f48;
  --cs-text: #eceef2;
  --cs-text-2: #a4abb7;
  --cs-text-3: #8b93a0;
  --cs-ink: #eceef2;
  --cs-on-ink: #0f1115;
  --cs-disabled-bg: #1d2026;
  --cs-disabled-text: #6b7280;
  --cs-float: 0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.5);
  --cs-q: #60a5fa;
  --cs-c: #fbbf24;
  --cs-b: #f87171;
  --cs-o: #94a3b8;
  --cs-pin-ring: #0f1115;
}

/* ---------------------------------------------------------- popup */
[data-proto-surface="popup"] {
  background: var(--cs-bg) !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  border: 1px solid var(--cs-line) !important;
  box-shadow: var(--cs-float) !important;
  color: var(--cs-text);
}
/* The four types: one segmented row. */
[data-proto-surface="popup"] > div:first-child {
  grid-template-columns: repeat(4, auto) !important;
  gap: 2px !important;
  margin-bottom: 8px !important;
  padding: 2px;
  border: 1px solid var(--cs-line);
  border-radius: 7px;
  background: var(--cs-track);
}
[data-proto-surface="popup"] > div:first-child > button[data-type] {
  height: 28px !important;
  min-width: 0;
  padding: 0 4px !important;
  gap: 5px !important;
  border: 0 !important;
  border-radius: 5px !important;
  background: transparent !important;
  color: var(--cs-text-2) !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  box-shadow: none;
  transition: background-color 120ms ease, color 120ms ease, box-shadow 120ms ease, scale 140ms cubic-bezier(0.23, 1, 0.32, 1) !important;
}
[data-proto-surface="popup"] > div:first-child > button[data-type] > svg {
  display: none;
}
[data-proto-surface="popup"] > div:first-child > button[data-type] > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-proto-surface="popup"] > div:first-child > button[data-type]::before {
  content: "";
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 1.5px;
  background: var(--cs-type);
}
[data-proto-surface="popup"] button[data-type="question"] { --cs-type: var(--cs-q); }
[data-proto-surface="popup"] button[data-type="change"] { --cs-type: var(--cs-c); }
[data-proto-surface="popup"] button[data-type="bug"] { --cs-type: var(--cs-b); }
[data-proto-surface="popup"] button[data-type="other"] { --cs-type: var(--cs-o); }
@media (hover: hover) and (pointer: fine) {
  [data-proto-surface="popup"] > div:first-child > button[data-type]:hover:not(:disabled) {
    background: var(--cs-hover) !important;
    color: var(--cs-text) !important;
  }
}
[data-proto-surface="popup"] > div:first-child > button[data-type][aria-pressed="true"] {
  background: var(--cs-bg) !important;
  color: var(--cs-text) !important;
  font-weight: 600 !important;
  box-shadow: 0 0 0 1px var(--cs-line), 0 1px 2px rgba(16, 18, 23, 0.08);
}
[data-proto-surface="popup"] > textarea {
  padding: 8px 10px !important;
  border: 1px solid var(--cs-line) !important;
  border-radius: 6px !important;
  background: var(--cs-bg) !important;
  box-shadow: none !important;
  color: var(--cs-text) !important;
  line-height: 1.45 !important;
}
[data-proto-surface="popup"] > textarea::placeholder {
  color: var(--cs-text-3);
}
[data-proto-surface="popup"] > textarea:focus {
  border-color: var(--proto-accent) !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--proto-accent) 22%, transparent) !important;
}
[data-proto-surface="popup"] > div:nth-child(3) {
  color: var(--cs-text-3) !important;
  font: 11px/1.2 var(--cs-mono) !important;
  letter-spacing: 0 !important;
}
[data-proto-surface="popup"] > div:last-child {
  gap: 6px !important;
  margin-top: 8px !important;
}
[data-proto-surface="popup"] > div:last-child > button {
  padding: 0 12px !important;
  border-radius: 6px !important;
  font-size: 12.5px !important;
  font-weight: 500 !important;
  box-shadow: none !important;
}
[data-proto-surface="popup"] > div:last-child > button:first-child {
  border: 1px solid var(--cs-line) !important;
  background: var(--cs-bg) !important;
  color: var(--cs-text-2) !important;
}
@media (hover: hover) and (pointer: fine) {
  [data-proto-surface="popup"] > div:last-child > button:first-child:hover {
    border-color: var(--cs-line-strong) !important;
    background: var(--cs-hover) !important;
    color: var(--cs-text) !important;
  }
  [data-proto-surface="popup"] > div:last-child > button:last-child:hover:not(:disabled) {
    background: color-mix(in srgb, var(--proto-accent) 86%, #000) !important;
  }
}
[data-proto-surface="popup"] > div:last-child > button:last-child {
  border: 1px solid transparent !important;
  background: var(--proto-accent) !important;
  color: #ffffff !important;
}
[data-proto-surface="popup"] > div:last-child > button:last-child:disabled {
  border-color: var(--cs-line) !important;
  background: var(--cs-disabled-bg) !important;
  color: var(--cs-disabled-text) !important;
  opacity: 1 !important;
}
/* Sending: disabled too, but busy, not empty: it keeps its colour. */
[data-proto-surface="popup"] > div:last-child > button:last-child[aria-busy="true"] {
  border-color: transparent !important;
  background: var(--proto-accent) !important;
  color: #ffffff !important;
}

/* Desktop card: 316px, 12px padding, the hint beside the buttons. */
@media (min-width: 641px) and (min-height: 501px), (min-width: 641px) and (pointer: fine), (min-width: 641px) and (pointer: none) {
  [data-proto-surface="popup"] {
    width: 316px !important;
    padding: 12px !important;
    border-radius: 10px !important;
  }
  [data-proto-surface="popup"] > div:nth-child(3) {
    position: absolute;
    left: 13px;
    bottom: 12px;
    height: 30px;
    display: flex;
    align-items: center;
    margin: 0 !important;
    pointer-events: none;
  }
}
@media (pointer: fine) {
  [data-proto-surface="popup"] > div:last-child > button {
    height: 30px !important;
  }
}
@media (max-width: 640px), (max-height: 500px) and (pointer: coarse) {
  [data-proto-surface="popup"] {
    border-width: 1px 0 0 !important;
    border-radius: 12px 12px 0 0 !important;
    box-shadow: 0 -8px 32px rgba(16, 18, 23, 0.12) !important;
  }
}
@media (pointer: coarse) {
  [data-proto-surface="popup"] > div:first-child > button[data-type] {
    height: 40px !important;
  }
}

/* --------------------------------------------- annotation toolbar */
[data-proto-surface="toolbar"] {
  min-height: 40px !important;
  padding-top: calc(env(safe-area-inset-top, 0px) + 4px) !important;
  padding-bottom: 4px !important;
  gap: 10px !important;
  background: var(--cs-bg) !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  border-bottom: 1px solid var(--cs-line) !important;
  box-shadow: 0 1px 2px rgba(16, 18, 23, 0.05) !important;
  color: var(--cs-text-2) !important;
  font-size: 13px !important;
}
[data-proto-surface="toolbar"] > span:first-child {
  width: 6px !important;
  height: 6px !important;
  background: var(--proto-accent) !important;
  box-shadow: none !important;
}
[data-proto-surface="toolbar"] > span:nth-child(2) {
  font-weight: 450 !important;
  letter-spacing: 0 !important;
}
[data-proto-surface="toolbar"] > button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px 0 10px !important;
  border: 1px solid var(--cs-line) !important;
  border-radius: 6px !important;
  background: var(--cs-bg) !important;
  color: var(--cs-text-2) !important;
  font-size: 12px !important;
  font-weight: 500 !important;
}
[data-proto-surface="toolbar"] > button::after {
  content: "Esc";
  padding: 2px 4px;
  border: 1px solid var(--cs-line);
  border-radius: 4px;
  background: var(--cs-track);
  color: var(--cs-text-3);
  font: 500 10.5px/1 var(--cs-mono);
}
@media (hover: hover) and (pointer: fine) {
  [data-proto-surface="toolbar"] > button:not([aria-disabled="true"]):hover {
    border-color: var(--cs-line-strong) !important;
    background: var(--cs-hover) !important;
    color: var(--cs-text) !important;
  }
}
@media (pointer: fine) {
  [data-proto-surface="toolbar"] > button {
    height: 28px !important;
  }
}
@media not all and (hover: hover) and (pointer: fine) {
  [data-proto-surface="toolbar"] > button {
    padding: 0 14px !important;
  }
  [data-proto-surface="toolbar"] > button::after {
    display: none;
  }
}

/* ------------------------------------------------ drawing overlay */
[data-proto-surface="overlay"] {
  background: rgba(15, 17, 21, 0.04) !important;
}
[data-proto-surface="overlay"] > div {
  border: 1px solid var(--proto-accent) !important;
  border-radius: 2px !important;
  box-shadow: none !important;
  background:
    linear-gradient(var(--proto-accent), var(--proto-accent)) top left / 5px 5px no-repeat,
    linear-gradient(var(--proto-accent), var(--proto-accent)) top right / 5px 5px no-repeat,
    linear-gradient(var(--proto-accent), var(--proto-accent)) bottom left / 5px 5px no-repeat,
    linear-gradient(var(--proto-accent), var(--proto-accent)) bottom right / 5px 5px no-repeat,
    color-mix(in srgb, var(--proto-accent) 6%, transparent) !important;
}

/* ------------------------------------------------------- tooltip */
#sp-tooltip {
  padding: 8px 10px !important;
  border-radius: 8px !important;
  background: var(--cs-bg) !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  border: 1px solid var(--cs-line) !important;
  box-shadow: var(--cs-float) !important;
}
#sp-tooltip > div:first-child {
  gap: 4px 6px !important;
  margin-bottom: 5px !important;
}
#sp-tooltip > div:first-child > span:not(:last-child) {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 5px !important;
  border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  border-radius: 4px !important;
  background: transparent !important;
  font: 500 11px/1 var(--cs-mono) !important;
  letter-spacing: -0.01em !important;
}
#sp-tooltip > div:first-child > span:last-child {
  color: var(--cs-text-3) !important;
  font: 11px/1 var(--cs-mono) !important;
}
#sp-tooltip > div:nth-child(2) {
  font-size: 13px !important;
  line-height: 1.45 !important;
}
#sp-tooltip > div:last-child {
  background: var(--cs-bg) !important;
  border-color: var(--cs-line) !important;
}

/* ---------------------------------------------------------- pins */
/* Filled rounded squares in the type colour, white mono number. The fill is
   the pin's inline colour (text keeps it, the glyph paints white through
   text-fill); the dark palette's light type colours map to the deep ones,
   on which white reads 4.5:1 (5.0 to 5.7). */
#siteping-markers > [data-feedback-id] {
  --cs-pin-fill: currentColor;
  width: 22px !important;
  height: 22px !important;
  margin: 2px 0 0 2px;
  border-width: 1.5px !important;
  border-color: var(--cs-pin-ring) !important;
  border-radius: 6px !important;
  background: var(--cs-pin-fill) !important;
  -webkit-text-fill-color: #ffffff;
  box-shadow: 0 1px 2px rgba(16, 18, 23, 0.2), 0 2px 8px rgba(16, 18, 23, 0.12) !important;
  font: 600 10.5px/1 var(--cs-mono) !important;
  letter-spacing: -0.03em;
}
#siteping-markers > [data-feedback-id][style*="96, 165, 250"] { --cs-pin-fill: #2563eb; }
#siteping-markers > [data-feedback-id][style*="251, 191, 36"] { --cs-pin-fill: #b45309; }
#siteping-markers > [data-feedback-id][style*="248, 113, 113"] { --cs-pin-fill: #d01f1f; }
#siteping-markers > [data-feedback-id][style*="148, 163, 184"] { --cs-pin-fill: #5b6778; }
/* In progress: a folded corner. */
#siteping-markers > [data-feedback-id][style*="0.25)"] {
  background:
    linear-gradient(225deg, var(--cs-pin-ring) 0 5px, transparent 5px) no-repeat,
    var(--cs-pin-fill) !important;
}
/* Closed (resolved, won't fix): hollow and quiet. */
#siteping-markers > [data-feedback-id][style*="rgb(203, 213, 225)"] {
  border-color: var(--cs-line-strong) !important;
  background: var(--cs-bg) !important;
  -webkit-text-fill-color: var(--cs-text-2);
  box-shadow: 0 1px 2px rgba(16, 18, 23, 0.12) !important;
}
#siteping-markers > [data-feedback-id][style*="rgb(203, 213, 225)"] > span[style*="rotate"] {
  background: var(--cs-text-2) !important;
}
/* Approximate anchor: a dashed outline instead of a faded pin. */
#siteping-markers > [data-feedback-id][style*="dashed"] {
  opacity: 1 !important;
  outline: 1.5px dashed currentColor;
  outline-offset: 2px;
}
#siteping-markers > [data-feedback-id]:focus-visible {
  outline: 2px solid var(--proto-accent);
  outline-offset: 2px;
}
#siteping-markers .sp-cluster-badge {
  top: -6px !important;
  right: -6px !important;
  min-width: 15px !important;
  height: 15px !important;
  padding: 0 3px !important;
  border: 1.5px solid var(--cs-pin-ring) !important;
  border-radius: 5px !important;
  background: var(--cs-ink) !important;
  -webkit-text-fill-color: var(--cs-on-ink);
  color: var(--cs-on-ink) !important;
  font: 600 9.5px/1 var(--cs-mono) !important;
}
/* The anchor highlight: square-ish, a hairline, no glow. */
#siteping-markers > div:not([data-feedback-id]) {
  border-width: 1.5px !important;
  border-radius: 3px !important;
  box-shadow: none !important;
}
`;

export const consoleSkin: Skin = {
  name: "Console",
  axis: "Densité et clavier : le widget parle la langue de l'inbox de tri, en lignes, filets et métadonnées mono.",
  shadowCss,
  lightCss,
};
