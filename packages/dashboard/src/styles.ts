/**
 * Complete stylesheet for `<SitepingInbox />`.
 *
 * Design: Linear/Vercel — speed, density, sobriety. The dashboard is MATTE:
 * 1px borders, flat surfaces, no glassmorphism. Deliberate contrast with the
 * glassy widget; same family via accent, slate ramp, Inter.
 *
 * Principles:
 * - Every selector is scoped under `.spd-root`; specificity stays flat
 *   (single class nesting), no `!important` anywhere.
 * - All custom properties are `--spd-*`; the palette switches via
 *   `.spd-root[data-theme="dark"|"light"]`. The accent is injected inline on
 *   the root (`style="--spd-accent: #0066ff"`) and every accent derivative is
 *   a `color-mix()` — no JS color math beyond hex normalization.
 * - The root is a container (`container-name: spd`); responsive behavior uses
 *   container queries, never viewport media queries.
 * - Drop shadows appear in exactly three places: drawer overlay mode, toast,
 *   and the annotation rect glow. Everything else is borders.
 *
 * Class hooks beyond the S2 inventory (components must use these names):
 * - `.spd-type-square[data-type]` — 6×6 rounded type marker (row + drawer).
 * - `.spd-type-label` — type text inside `.spd-row-type` (shown ≥720cq).
 * - `.spd-row-leaving` — transient class animating a row out after a status
 *   change removes it from the current filter.
 * - `.spd-status-menu-trigger` / `.spd-status-menu-pop` / `.spd-status-menu-item`
 *   — status menu internals (`data-status` on trigger and items).
 * - `[data-status]` on the direct parent of a glyph `<svg>` colors it (first
 *   svg only, so trailing chevrons/check marks keep the text color).
 * - `.spd-diag-entry[data-expanded="true"]` — un-clamps the console message.
 * - `.spd-micro` — micro-label (10.5px caps); `.spd-mono` — mono metadata;
 *   `.spd-clamp-2` — 2-line clamp (userAgent, console messages).
 * - `.spd-evidence-zoomed` — toggled on `.spd-evidence-stage`; region overlay
 *   is hidden while zoomed (percentages only map to the fitted image).
 */
export const INBOX_CSS = `
/* ---------------------------------------------------------------- tokens */
.spd-root {
  --spd-accent: #0066ff; /* overridden inline via style="--spd-accent: ..." */
  --spd-font: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --spd-mono: ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  --spd-fs-body: 13px;
  --spd-radius: 10px;
  --spd-radius-sm: 6px;
  --spd-radius-xs: 4px;
  --spd-ease: cubic-bezier(0.32, 0.72, 0, 1);
  --spd-row-h: 44px;

  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 480px;
  height: 100%;
  container-type: inline-size;
  container-name: spd;
  border: 1px solid var(--spd-border);
  border-radius: var(--spd-radius);
  background: var(--spd-bg);
  color: var(--spd-text);
  font-family: var(--spd-font);
  font-size: var(--spd-fs-body);
  font-weight: 400;
  line-height: 1.45;
  text-align: left;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

.spd-root[data-theme="dark"] {
  color-scheme: dark;
  --spd-bg: #0b1120;
  --spd-surface: #0f172a;
  --spd-raised: #1e293b;
  --spd-border: #1e293b;
  --spd-border-strong: #334155;
  --spd-text: #f1f5f9;
  --spd-text-2: #a5b3c7;
  --spd-text-3: #8a99b0; /* >=4.5:1 on every dark surface incl. raised */
  --spd-accent-bright: color-mix(in srgb, var(--spd-accent) 65%, #ffffff);
  --spd-st-open: var(--spd-accent-bright);
  --spd-st-progress: #fbbf24;
  --spd-st-resolved: #34d399;
  --spd-st-wontfix: #94a3b8;
  --spd-ty-question: #60a5fa;
  --spd-ty-change: #fbbf24;
  --spd-ty-bug: #f87171;
  --spd-ty-other: #94a3b8;
  --spd-danger: #f87171;
  --spd-danger-strong: #ef4444;
  --spd-dim: rgb(2 6 23 / 0.42);
}

.spd-root[data-theme="light"] {
  color-scheme: light;
  --spd-bg: #f8fafc;
  --spd-surface: #ffffff;
  --spd-raised: #f1f5f9;
  --spd-border: #e2e8f0;
  --spd-border-strong: #cbd5e1;
  --spd-text: #0f172a;
  --spd-text-2: #475569;
  --spd-text-3: #56657b; /* >=4.5:1 on white AND raised #f1f5f9 */
  --spd-accent-bright: var(--spd-accent);
  --spd-st-open: var(--spd-accent);
  --spd-st-progress: #b45309;
  --spd-st-resolved: #047857;
  --spd-st-wontfix: #64748b;
  --spd-ty-question: #3b82f6;
  --spd-ty-change: #b45309;
  --spd-ty-bug: #ef4444;
  --spd-ty-other: #64748b;
  --spd-danger: #dc2626;
  --spd-danger-strong: #b91c1c;
  --spd-dim: rgb(2 6 23 / 0.42);
}

.spd-root[data-density="comfortable"] { --spd-row-h: 44px; }
.spd-root[data-density="compact"] { --spd-row-h: 36px; }

/* ----------------------------------------------------------------- reset */
.spd-root *,
.spd-root *::before,
.spd-root *::after { box-sizing: border-box; }

.spd-root :is(h1, h2, h3, h4, p, ul, ol, figure, blockquote) { margin: 0; padding: 0; }
.spd-root :is(ul, ol) { list-style: none; }
.spd-root :where(a) { color: inherit; text-decoration: none; }
.spd-root svg { display: block; flex: none; }

/* :where() keeps this reset at zero specificity so every component rule
   below wins by source order — :is(button) would weigh 0-1-1 and silently
   defeat single-class rules like .spd-tab. */
.spd-root :where(button, input, select) {
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  margin: 0;
  padding: 0;
}
.spd-root :where(button) { cursor: pointer; }
.spd-root :where(button):disabled { opacity: 0.55; cursor: default; }
.spd-root :where(button):not(:disabled):active { transform: translateY(0.5px); }
.spd-root :where(h2, h3, p, dl, dt, dd, ul, li, figure) { margin: 0; padding: 0; font: inherit; list-style: none; }

/* visually hidden, exposed to assistive tech */
.spd-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.spd-root :focus-visible {
  outline: 2px solid var(--spd-accent-bright);
  outline-offset: 2px;
}

.spd-root :is(.spd-list-pane, .spd-drawer-scroll, .spd-shortcuts-card, .spd-evidence-stage) {
  scrollbar-width: thin;
  scrollbar-color: var(--spd-border-strong) transparent;
}

/* --------------------------------------------------------------- toolbar */
.spd-toolbar {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 8px 10px;
  background: var(--spd-surface);
  border-bottom: 1px solid var(--spd-border);
}

.spd-project,
.spd-type-filter {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: none;
}

.spd-root :is(.spd-project-select, .spd-type-filter select, select.spd-type-filter) {
  appearance: none;
  height: 28px;
  padding: 0 22px 0 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--spd-text);
  border: 1px solid var(--spd-border);
  border-radius: var(--spd-radius-sm);
  background: transparent;
  cursor: pointer;
  max-width: 160px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spd-root :is(.spd-project-select, .spd-type-filter select, select.spd-type-filter):hover {
  background: var(--spd-raised);
  border-color: var(--spd-border-strong);
}
.spd-root :is(.spd-project, .spd-type-filter) > svg {
  position: absolute;
  right: 6px;
  width: 12px;
  height: 12px;
  color: var(--spd-text-3);
  pointer-events: none;
}

/* tabs */
/* Segmented control: inset track one step below the toolbar surface, the
   active tab lifted back up as a bordered pill — each tab owns a clear zone
   so a count never visually attaches to the next tab's glyph. */
/* Each tab is a standalone bordered chip with real air between them; the
   active one is tinted with the accent so the current filter is unmissable. */
.spd-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.spd-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 28px;
  padding: 0 13px;
  font-size: 12px;
  font-weight: 500;
  color: var(--spd-text-2);
  background: color-mix(in srgb, var(--spd-raised) 55%, transparent);
  box-shadow: inset 0 0 0 1px var(--spd-border);
  border-radius: var(--spd-radius-sm);
  white-space: nowrap;
}
.spd-tab:hover {
  color: var(--spd-text);
  background: color-mix(in srgb, var(--spd-raised) 90%, transparent);
  box-shadow: inset 0 0 0 1px var(--spd-border-strong);
}
.spd-tab[aria-checked="true"] {
  color: var(--spd-text);
  background: color-mix(in srgb, var(--spd-accent) 16%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--spd-accent) 42%, transparent);
}
.spd-tab-glyph { display: inline-flex; }
.spd-tab-glyph svg { width: 13px; height: 13px; }
.spd-tab-count {
  min-width: 18px;
  padding: 0 5px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--spd-text-3) 16%, transparent);
  font-size: 10.5px;
  font-weight: 500;
  line-height: 16px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--spd-text-2);
}
/* count chips take their status hue — each label reads as its own object */
.spd-tab[data-status="open"] .spd-tab-count {
  background: color-mix(in srgb, var(--spd-st-open) 20%, transparent);
  color: color-mix(in srgb, var(--spd-st-open) 75%, var(--spd-text));
}
.spd-tab[data-status="in_progress"] .spd-tab-count {
  background: color-mix(in srgb, var(--spd-st-progress) 20%, transparent);
  color: color-mix(in srgb, var(--spd-st-progress) 75%, var(--spd-text));
}
.spd-tab[data-status="resolved"] .spd-tab-count {
  background: color-mix(in srgb, var(--spd-st-resolved) 20%, transparent);
  color: color-mix(in srgb, var(--spd-st-resolved) 75%, var(--spd-text));
}
.spd-tab[data-status="wont_fix"] .spd-tab-count {
  background: color-mix(in srgb, var(--spd-st-wontfix) 20%, transparent);
  color: color-mix(in srgb, var(--spd-st-wontfix) 75%, var(--spd-text));
}
.spd-tab[aria-checked="true"] .spd-tab-count { font-weight: 600; }

.spd-toolbar-spacer { flex: 1 1 0; min-width: 0; }

/* search */
.spd-search {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  width: 200px;
  padding: 0 8px;
  background: var(--spd-raised);
  border: 1px solid var(--spd-border);
  border-radius: var(--spd-radius-sm);
  flex: none;
}
.spd-search:focus-within { border-color: var(--spd-accent); }
.spd-search > svg { width: 14px; height: 14px; color: var(--spd-text-3); }
.spd-search-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  font-size: 12px;
  color: var(--spd-text);
}
.spd-search-input::placeholder { color: var(--spd-text-3); }
.spd-search-clear {
  display: inline-flex;
  flex: none;
  color: var(--spd-text-3);
  border-radius: var(--spd-radius-xs);
}
.spd-search-clear:hover { color: var(--spd-text); }
.spd-search-clear svg { width: 12px; height: 12px; }
.spd-search-input::-webkit-search-cancel-button { -webkit-appearance: none; }
.spd-search-input:focus-visible { outline: none; }

/* kbd chips */
.spd-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-family: var(--spd-mono);
  font-size: 10.5px;
  line-height: 1;
  color: var(--spd-text-3);
  background: var(--spd-raised);
  border: 1px solid var(--spd-border-strong);
  border-radius: var(--spd-radius-xs);
  white-space: nowrap;
}

/* icon buttons */
.spd-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  color: var(--spd-text-2);
  border-radius: var(--spd-radius-sm);
}
.spd-icon-btn:hover { color: var(--spd-text); background: var(--spd-raised); }
.spd-spin svg { animation: spd-spin 0.8s linear infinite; }
@keyframes spd-spin { to { transform: rotate(360deg); } }

/* ------------------------------------------------------------------ body */
.spd-body {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  min-height: 0;
}
.spd-list-pane {
  flex: 1 1 auto;
  min-width: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.spd-list { outline: none; transition: opacity 120ms var(--spd-ease); }
.spd-list[aria-busy="true"] { opacity: 0.6; pointer-events: none; }
.spd-list:focus-visible { outline: none; }

/* ------------------------------------------------------------------ rows */
.spd-row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: var(--spd-row-h);
  padding: 0 12px;
  border-bottom: 1px solid var(--spd-border);
  cursor: pointer;
  transition: opacity 160ms var(--spd-ease), height 160ms var(--spd-ease);
}
.spd-row:hover { background: var(--spd-raised); }
.spd-row-focused,
.spd-row[aria-selected="true"] {
  background: var(--spd-raised);
  box-shadow: inset 2px 0 0 0 var(--spd-accent-bright);
}
.spd-list:focus-visible .spd-row-focused {
  outline: 2px solid var(--spd-accent-bright);
  outline-offset: -2px;
}
/* Transient exit after a status change removes the row from the filter.
   A @keyframes animation, NOT a transition — ghost rows are inserted fresh
   into the DOM and transitions never fire on newly inserted elements. */
.spd-row-leaving {
  overflow: hidden;
  pointer-events: none;
  animation: spd-row-leave 160ms var(--spd-ease) forwards;
}
@keyframes spd-row-leave {
  from {
    opacity: 1;
    height: var(--spd-row-h);
  }
  to {
    opacity: 0;
    height: 0;
    min-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    border-bottom-width: 0;
  }
}

.spd-row-status { display: inline-flex; flex: none; }
.spd-row[data-status="open"] .spd-row-status { color: var(--spd-st-open); }
.spd-row[data-status="in_progress"] .spd-row-status { color: var(--spd-st-progress); }
.spd-row[data-status="resolved"] .spd-row-status { color: var(--spd-st-resolved); }
.spd-row[data-status="wont_fix"] .spd-row-status { color: var(--spd-st-wontfix); }

/* status glyph coloring contract: data-status on the glyph's direct parent
   (first svg only — trailing chevrons/checks keep the text color) */
.spd-root [data-status="open"] > svg:first-of-type { color: var(--spd-st-open); }
.spd-root [data-status="in_progress"] > svg:first-of-type { color: var(--spd-st-progress); }
.spd-root [data-status="resolved"] > svg:first-of-type { color: var(--spd-st-resolved); }
.spd-root [data-status="wont_fix"] > svg:first-of-type { color: var(--spd-st-wontfix); }
.spd-tab[data-status="open"] .spd-tab-glyph { color: var(--spd-st-open); }
.spd-tab[data-status="in_progress"] .spd-tab-glyph { color: var(--spd-st-progress); }
.spd-tab[data-status="resolved"] .spd-tab-glyph { color: var(--spd-st-resolved); }
.spd-tab[data-status="wont_fix"] .spd-tab-glyph { color: var(--spd-st-wontfix); }

/* type marker: 6×6 filled rounded square — square = type, circle = status */
.spd-type-square {
  width: 6px;
  height: 6px;
  border-radius: 1.5px;
  flex: none;
  background: currentColor;
}
.spd-type-square[data-type="question"] { background: var(--spd-ty-question); }
.spd-type-square[data-type="change"] { background: var(--spd-ty-change); }
.spd-type-square[data-type="bug"] { background: var(--spd-ty-bug); }
.spd-type-square[data-type="other"] { background: var(--spd-ty-other); }

.spd-row-type {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  font-size: 12px;
  color: var(--spd-text-2);
}
.spd-row-type .spd-type-label { display: none; }

.spd-row-message {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 450;
}
.spd-row[data-status="resolved"] .spd-row-message,
.spd-row[data-status="wont_fix"] .spd-row-message { color: var(--spd-text-2); }

.spd-row-path {
  display: none;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--spd-mono);
  font-size: 11.5px;
  color: var(--spd-text-3);
}
.spd-row-author {
  display: none;
  flex: none;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--spd-text-2);
}
.spd-row-camera { display: inline-flex; flex: none; color: var(--spd-text-3); }
.spd-row-camera svg { width: 13px; height: 13px; }
.spd-row-time {
  flex: none;
  font-family: var(--spd-mono);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: var(--spd-text-3);
}

.spd-loadmore {
  display: flex;
  justify-content: center;
  padding: 8px 12px;
}

/* -------------------------------------------------------------- buttons */
.spd-root :is(.spd-btn, .spd-btn-ghost, .spd-btn-primary, .spd-btn-danger, .spd-btn-danger-ghost) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: var(--spd-radius-sm);
  white-space: nowrap;
  cursor: pointer;
}
.spd-btn {
  color: var(--spd-text);
  background: var(--spd-raised);
  border-color: var(--spd-border-strong);
}
.spd-btn:hover { border-color: var(--spd-text-3); }
.spd-btn-ghost { color: var(--spd-text-2); }
.spd-btn-ghost:hover { color: var(--spd-text); background: var(--spd-raised); }
.spd-btn-primary { color: #ffffff; background: var(--spd-accent); }
.spd-btn-primary:hover { background: color-mix(in srgb, var(--spd-accent) 88%, #ffffff); }
.spd-btn-primary svg { width: 13px; height: 13px; }
.spd-btn-danger { color: #ffffff; background: var(--spd-danger-strong); }
.spd-btn-danger:hover { background: color-mix(in srgb, var(--spd-danger-strong) 85%, #ffffff); }
.spd-btn-danger-ghost { color: var(--spd-danger); }
.spd-btn-danger-ghost:hover { background: color-mix(in srgb, var(--spd-danger) 12%, transparent); }

/* -------------------------------------------------------------- skeleton */
.spd-skel-row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: var(--spd-row-h);
  padding: 0 12px;
  border-bottom: 1px solid var(--spd-border);
}
.spd-skel-bar {
  height: 8px;
  border-radius: 4px;
  background: var(--spd-raised);
  animation: spd-pulse 1.6s linear infinite;
}
.spd-skel-bar:nth-child(1) { width: 16px; height: 16px; border-radius: 8px; }
.spd-skel-bar:nth-child(2) { width: 45%; }
.spd-skel-bar:nth-child(3) { width: 90px; margin-left: auto; }
.spd-skel-row:nth-child(2) .spd-skel-bar { animation-delay: 0.15s; }
.spd-skel-row:nth-child(3) .spd-skel-bar { animation-delay: 0.3s; }
.spd-skel-row:nth-child(4) .spd-skel-bar { animation-delay: 0.45s; }
.spd-skel-row:nth-child(5) .spd-skel-bar { animation-delay: 0.6s; }
@keyframes spd-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

/* --------------------------------------------------------- empty / error */
.spd-empty,
.spd-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 280px;
  padding: 48px 24px;
  text-align: center;
}
.spd-empty-glyph {
  display: inline-flex;
  margin-bottom: 8px;
  color: var(--spd-text-3);
}
.spd-empty-glyph > svg { width: 20px; height: 20px; }
.spd-empty-title { font-size: 13px; font-weight: 600; color: var(--spd-text); }
.spd-empty-sub { font-size: 12px; color: var(--spd-text-2); }
.spd-root :is(.spd-empty, .spd-error) :is(.spd-btn, .spd-btn-ghost) { margin-top: 10px; }

/* ---------------------------------------------------------------- drawer */
.spd-drawer-backdrop {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: var(--spd-dim);
  animation: spd-fade-in 180ms var(--spd-ease);
}
@keyframes spd-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.spd-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  width: min(420px, 100%);
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--spd-surface);
  border-left: 1px solid var(--spd-border);
  box-shadow: 0 0 0 1px var(--spd-border), -24px 0 48px -24px rgb(0 0 0 / 0.5);
  animation: spd-drawer-in 180ms var(--spd-ease);
}
@keyframes spd-drawer-in {
  from { transform: translateX(16px); opacity: 0; }
  to { transform: none; opacity: 1; }
}

.spd-drawer-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 12px;
  border-bottom: 1px solid var(--spd-border);
}
.spd-drawer-titles {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.spd-drawer-type {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--spd-text);
  white-space: nowrap;
}
.spd-drawer-id {
  font-family: var(--spd-mono);
  font-size: 11.5px;
  color: var(--spd-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spd-drawer-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 14px 14px 18px;
}

.spd-drawer-foot {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--spd-border);
}
.spd-drawer-foot .spd-btn-primary { flex: 1 1 auto; }

/* ----------------------------------------------------------- status menu */
.spd-status-menu { position: relative; flex: none; }
.spd-status-menu-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 9px;
  font-size: 12px;
  font-weight: 500;
  color: var(--spd-text);
  border: 1px solid var(--spd-border-strong);
  border-radius: var(--spd-radius-sm);
  white-space: nowrap;
}
.spd-status-menu-trigger:hover { background: var(--spd-raised); }
.spd-status-menu-trigger > svg { width: 13px; height: 13px; }
.spd-status-menu-pop {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 7;
  min-width: 160px;
  padding: 4px;
  background: var(--spd-surface);
  border: 1px solid var(--spd-border-strong);
  border-radius: var(--spd-radius-sm);
}
.spd-status-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--spd-text-2);
  border-radius: var(--spd-radius-xs);
  text-align: left;
}
.spd-status-menu-item:hover,
.spd-status-menu-item-active { color: var(--spd-text); background: var(--spd-raised); }
.spd-status-menu-item[aria-selected="true"] { color: var(--spd-text); }
.spd-status-menu-item > svg:last-child { margin-left: auto; color: var(--spd-text-2); }

/* expandable console entries render as real buttons; inherit the mono look.
   No display here — the base .spd-diag-msg -webkit-box clamp must keep
   applying while collapsed (data-expanded flips it to block). */
.spd-root :where(button).spd-diag-msg { width: 100%; text-align: left; }
.spd-root :where(button).spd-diag-msg:hover { color: var(--spd-text); }

/* --------------------------------------------- evidence card (signature) */
.spd-evidence {
  flex: none;
  border: 1px solid var(--spd-border);
  border-radius: var(--spd-radius-sm);
  overflow: hidden;
  background: var(--spd-surface);
}
.spd-evidence-stage {
  position: relative;
  overflow: hidden;
  background: #000000;
}
.spd-root[data-theme="light"] .spd-evidence-stage { background: #f1f5f9; }
.spd-evidence-img {
  display: block;
  width: 100%;
  height: auto;
  cursor: zoom-in;
}
.spd-evidence-zoomed { overflow: auto; max-height: 420px; }
.spd-evidence-zoomed .spd-evidence-img {
  width: auto;
  max-width: none;
  cursor: zoom-out;
}
/* the region overlay only maps onto the fitted (non-zoomed) image */
.spd-evidence-zoomed :is(.spd-evidence-dim, .spd-evidence-rect) { display: none; }

.spd-evidence-dim {
  position: absolute;
  background: rgb(2 6 23 / 0.42);
  pointer-events: none;
}
.spd-evidence-rect {
  position: absolute;
  border: 1.5px solid var(--spd-accent-bright);
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgb(255 255 255 / 0.25), 0 0 20px color-mix(in srgb, var(--spd-accent) 45%, transparent);
  pointer-events: none;
}
/* viewfinder corner brackets — 8 gradient strips, one element, always shown */
.spd-evidence-corners {
  position: absolute;
  inset: 5px;
  pointer-events: none;
  background-image:
    linear-gradient(var(--spd-accent), var(--spd-accent)),
    linear-gradient(var(--spd-accent), var(--spd-accent)),
    linear-gradient(var(--spd-accent), var(--spd-accent)),
    linear-gradient(var(--spd-accent), var(--spd-accent)),
    linear-gradient(var(--spd-accent), var(--spd-accent)),
    linear-gradient(var(--spd-accent), var(--spd-accent)),
    linear-gradient(var(--spd-accent), var(--spd-accent)),
    linear-gradient(var(--spd-accent), var(--spd-accent));
  background-repeat: no-repeat;
  background-size: 12px 1.5px, 1.5px 12px, 12px 1.5px, 1.5px 12px, 12px 1.5px, 1.5px 12px, 12px 1.5px, 1.5px 12px;
  background-position: 0 0, 0 0, 100% 0, 100% 0, 0 100%, 0 100%, 100% 100%, 100% 100%;
}

.spd-evidence-caption {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 6px 10px;
  border-top: 1px solid var(--spd-border);
  font-family: var(--spd-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--spd-text-3);
}
.spd-evidence-caption > * { white-space: nowrap; }
.spd-evidence-caption > :first-child {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.spd-evidence-toggle {
  margin-left: auto;
  padding: 2px 5px;
  font-family: var(--spd-font);
  font-size: 11px;
  font-weight: 500;
  color: var(--spd-text-2);
  border-radius: var(--spd-radius-xs);
  white-space: nowrap;
}
.spd-evidence-toggle:hover { color: var(--spd-text); background: var(--spd-raised); }

/* no-screenshot fallback — same bracket framing around the anchor data */
.spd-evidence-fallback {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px 18px;
}
.spd-anchor-selector {
  font-family: var(--spd-mono);
  font-size: 11.5px;
  color: var(--spd-text-2);
  background: var(--spd-raised);
  padding: 4px 8px;
  border-radius: var(--spd-radius-xs);
  overflow-wrap: anywhere;
  cursor: copy;
}
.spd-anchor-selector:hover { color: var(--spd-text); }
.spd-anchor-snippet {
  padding: 2px 0 2px 10px;
  border-left: 2px solid var(--spd-border-strong);
  font-size: 12px;
  font-style: italic;
  line-height: 1.5;
  color: var(--spd-text-2);
  overflow-wrap: anywhere;
}

/* --------------------------------------------------------- drawer content */
.spd-message {
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--spd-text);
}

.spd-micro,
.spd-meta-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--spd-text-3);
}
.spd-mono {
  font-family: var(--spd-mono);
  font-size: 11.5px;
}
.spd-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.spd-meta-grid {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 7px 12px;
  align-items: baseline;
}
.spd-meta-value {
  min-width: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--spd-text);
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}
.spd-meta-value a { color: var(--spd-accent-bright); }
.spd-meta-value a:hover { text-decoration: underline; }
/* technical values (URL, viewport, email) get the mono treatment */
.spd-meta-value[data-mono],
.spd-meta-value [data-mono] {
  font-family: var(--spd-mono);
  font-size: 11.5px;
  overflow-wrap: anywhere;
}

/* ------------------------------------------------------------ diagnostics */
.spd-diagnostics {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.spd-diag-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.spd-diag-entry {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 4px 8px 4px 10px;
  border-left: 2px solid var(--spd-border-strong);
  font-family: var(--spd-mono);
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--spd-text-2);
}
.spd-diag-entry[data-level="error"] { border-left-color: var(--spd-danger); }
.spd-diag-entry[data-level="warn"] { border-left-color: var(--spd-st-progress); }
.spd-diag-time {
  flex: none;
  color: var(--spd-text-3);
  font-variant-numeric: tabular-nums;
}
.spd-diag-level {
  flex: none;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.spd-diag-entry[data-level="error"] :is(.spd-diag-level, .spd-diag-status) { color: var(--spd-danger); }
.spd-diag-entry[data-level="warn"] .spd-diag-level { color: var(--spd-st-progress); }
.spd-diag-msg {
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: pointer;
}
.spd-diag-entry[data-expanded="true"] .spd-diag-msg { display: block; }
.spd-diag-method { flex: none; font-weight: 600; }
.spd-diag-status { flex: none; font-variant-numeric: tabular-nums; }
.spd-diag-url {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spd-diag-dur {
  flex: none;
  color: var(--spd-text-3);
  font-variant-numeric: tabular-nums;
}

/* ------------------------------------------------------------ danger zone */
.spd-danger-zone {
  display: flex;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--spd-border);
}
.spd-confirm {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--spd-text-2);
}

/* ----------------------------------------------------------------- hints */
.spd-hints {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  height: 32px;
  padding: 0 12px;
  border-top: 1px solid var(--spd-border);
  background: var(--spd-surface);
  font-size: 11px;
  color: var(--spd-text-3);
  overflow: hidden;
  white-space: nowrap;
}
.spd-hints > * {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
}

/* ----------------------------------------------------------------- toast */
.spd-toast {
  position: absolute;
  left: 50%;
  bottom: 44px;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 6px 5px 12px;
  background: var(--spd-surface);
  border: 1px solid var(--spd-border-strong);
  border-radius: var(--spd-radius-sm);
  box-shadow: 0 8px 24px -8px rgb(0 0 0 / 0.4);
  font-size: 12px;
  color: var(--spd-text);
  white-space: nowrap;
  animation: spd-toast-in 160ms var(--spd-ease);
}
@keyframes spd-toast-in {
  from { transform: translate(-50%, 8px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
}
.spd-toast-msg { min-width: 0; overflow: hidden; text-overflow: ellipsis; }

/* ------------------------------------------------------ shortcuts overlay */
.spd-shortcuts {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--spd-dim);
  animation: spd-fade-in 160ms var(--spd-ease);
}
.spd-shortcuts-card {
  min-width: 260px;
  max-width: 340px;
  max-height: 100%;
  overflow-y: auto;
  padding: 18px 20px;
  background: var(--spd-surface);
  border: 1px solid var(--spd-border-strong);
  border-radius: var(--spd-radius);
  font-size: 12px;
  color: var(--spd-text-2);
}
.spd-shortcuts-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 14px;
  align-items: center;
  margin-top: 12px;
}
.spd-shortcut-keys {
  display: inline-flex;
  gap: 4px;
  justify-self: start;
}
.spd-shortcut-label::first-letter { text-transform: uppercase; }

/* ---------------------------------------------------- container queries */
@container spd (min-width: 560px) {
  .spd-row-path { display: block; }
}
@container spd (min-width: 640px) {
  .spd-row-author { display: block; }
}
@container spd (min-width: 720px) {
  .spd-row-type .spd-type-label { display: inline; }
}
@container spd (min-width: 960px) {
  .spd-drawer {
    position: static;
    flex: none;
    width: 400px;
    box-shadow: none;
    z-index: auto;
    animation: none;
  }
  .spd-drawer-backdrop { display: none; }
}
/* narrow containers: keep the toolbar on one line */
@container spd (max-width: 719.98px) {
  .spd-search { width: 150px; }
  .spd-search .spd-kbd { display: none; }
}
@container spd (max-width: 619.98px) {
  .spd-tab .spd-tab-label { display: none; }
  .spd-tab[data-status="all"] .spd-tab-label,
  .spd-tab[aria-checked="true"] .spd-tab-label { display: inline; }
}
@container spd (max-width: 479.98px) {
  /* Keep the type filter reachable (WCAG 1.4.10 reflow) — the wrapping
     toolbar absorbs the width; just tighten it. */
  .spd-type-filter select { max-width: 110px; }
  .spd-search { width: 120px; }
}

/* ---------------------------------------------------------------- motion */
@media (prefers-reduced-motion: reduce) {
  /* !important is deliberate: this kill-switch must beat every specificity,
     including compound rules like .spd-spin svg. */
  .spd-root *,
  .spd-root *::before,
  .spd-root *::after {
    animation: none !important;
    transition: none !important;
  }
}

/* ---------------------------------------------------------- forced colors */
@media (forced-colors: active) {
  .spd-root,
  .spd-root * { border-color: CanvasText; }
  .spd-row-focused,
  .spd-row[aria-selected="true"] {
    outline: 2px solid Highlight;
    outline-offset: -2px;
  }
}
`;
