/**
 * Keyboard shortcuts system for the feedback panel.
 *
 * Gmail/GitHub-style single-key shortcuts:
 *   J/K — navigate cards, R — resolve, D — delete,
 *   F or / — focus search, X — toggle select, ? — help overlay.
 *
 * Active only when the panel is open. Ignores keypresses inside
 * input/textarea elements. Uses a Map<string, handler> for O(1) lookup.
 */

import { el, parseSvg, setText } from "./dom-utils.js";
import type { TFunction, Translations } from "./i18n/index.js";
import type { ThemeColors } from "./styles/theme.js";

// ---------------------------------------------------------------------------
// Icon
// ---------------------------------------------------------------------------

export const ICON_KEYBOARD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M6 12h.01"/><path d="M18 12h.01"/><path d="M8 16h8"/></svg>`;

// All translation keys are sourced from the central i18n dict via t().
type ShortcutsI18nKey = Extract<keyof Translations, `shortcuts.${string}`>;

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

export interface ShortcutCallbacks {
  onNavigate: (direction: "up" | "down") => void;
  onResolve: () => void;
  onDelete: () => void;
  onFocusSearch: () => void;
  onToggleSelect: () => void;
}

// ---------------------------------------------------------------------------
// Card focus helpers
// ---------------------------------------------------------------------------

/** Get the currently focused card index from the list container (-1 if none). */
export function getFocusedCardIndex(listContainer: HTMLElement): number {
  const cards = listContainer.querySelectorAll<HTMLElement>(".sp-card");
  for (let i = 0; i < cards.length; i++) {
    if (cards[i]?.classList.contains("sp-card--focused")) return i;
  }
  return -1;
}

/** Focus a card by index in the list container. Clamps to valid range. */
export function focusCardByIndex(listContainer: HTMLElement, index: number): void {
  const cards = listContainer.querySelectorAll<HTMLElement>(".sp-card");
  if (cards.length === 0) return;

  // Remove previous focus
  for (const card of cards) {
    card.classList.remove("sp-card--focused");
  }

  const clamped = Math.max(0, Math.min(index, cards.length - 1));
  const target = cards[clamped];
  if (!target) return;
  target.classList.add("sp-card--focused");
  target.scrollIntoView({ block: "nearest", behavior: "smooth" });
  target.focus({ preventScroll: true });
}

// ---------------------------------------------------------------------------
// Shortcut definitions (used to build help grid)
// ---------------------------------------------------------------------------

interface ShortcutDef {
  keys: string[];
  label: ShortcutsI18nKey;
}

const SHORTCUT_DEFS: ShortcutDef[] = [
  { keys: ["J", "K"], label: "shortcuts.navigate" },
  { keys: ["R"], label: "shortcuts.resolve" },
  { keys: ["D"], label: "shortcuts.delete" },
  { keys: ["F", "/"], label: "shortcuts.search" },
  { keys: ["X"], label: "shortcuts.select" },
  { keys: ["?"], label: "shortcuts.help" },
  { keys: ["Esc"], label: "shortcuts.close" },
];

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

export const SHORTCUTS_CSS = /* css */ `
  /* ---- Help overlay backdrop ---- */

  .sp-shortcuts-overlay {
    position: fixed;
    inset: 0;
    background: var(--sp-backdrop, rgba(15, 23, 42, 0.2));
    backdrop-filter: blur(var(--sp-blur));
    -webkit-backdrop-filter: blur(var(--sp-blur));
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }

  .sp-shortcuts-overlay--visible {
    opacity: 1;
    pointer-events: auto;
  }

  /* ---- Glassmorphism card ---- */

  .sp-shortcuts-card {
    width: 380px;
    max-width: calc(100vw - 32px);
    padding: 24px 28px 20px;
    border-radius: 20px;
    background: var(--sp-glass-bg-heavy);
    backdrop-filter: blur(var(--sp-blur-heavy));
    -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
    border: 1px solid var(--sp-glass-border);
    box-shadow: var(--sp-shadow-xl);
    font-family: var(--sp-font);
    position: relative;
    transform: scale(0.92) translateY(8px);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .sp-shortcuts-overlay--visible .sp-shortcuts-card {
    transform: scale(1) translateY(0);
  }

  /* ---- Title row ---- */

  .sp-shortcuts-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 700;
    color: var(--sp-text);
    margin-bottom: 18px;
  }

  .sp-shortcuts-title svg {
    width: 18px;
    height: 18px;
    color: var(--sp-text-secondary);
    flex-shrink: 0;
  }

  /* ---- Close button ---- */

  .sp-shortcuts-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--sp-text-tertiary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .sp-shortcuts-close:hover {
    background: var(--sp-bg-hover);
    color: var(--sp-text);
  }

  .sp-shortcuts-close svg {
    width: 14px;
    height: 14px;
  }

  /* ---- Two-column grid ---- */

  .sp-shortcuts-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .sp-shortcuts-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .sp-shortcuts-keys {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 80px;
    justify-content: flex-end;
  }

  .sp-shortcuts-separator {
    font-size: 11px;
    color: var(--sp-text-tertiary);
    user-select: none;
  }

  /* ---- Key badge (<kbd> styling) ---- */

  .sp-kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 26px;
    padding: 0 7px;
    border-radius: 6px;
    background: var(--sp-bg-hover);
    border: 1px solid var(--sp-border);
    box-shadow:
      inset 0 -1px 0 rgba(0, 0, 0, 0.08),
      0 1px 2px rgba(0, 0, 0, 0.04);
    font-family: ui-monospace, "SF Mono", "Cascadia Code", "Segoe UI Mono", Menlo, monospace;
    font-size: 12px;
    font-weight: 600;
    color: var(--sp-text);
    text-align: center;
    line-height: 1;
    user-select: none;
  }

  /* ---- Description text ---- */

  .sp-shortcuts-desc {
    font-size: 13px;
    color: var(--sp-text-secondary);
    line-height: 1.3;
  }

  /* ---- Hint button (bottom-right of panel) ---- */

  .sp-shortcuts-hint {
    width: 24px;
    height: 24px;
    border-radius: var(--sp-radius-full);
    border: 1px solid var(--sp-border);
    background: var(--sp-bg-hover);
    color: var(--sp-text-tertiary);
    font-family: ui-monospace, "SF Mono", "Cascadia Code", "Segoe UI Mono", Menlo, monospace;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    position: absolute;
    bottom: 12px;
    right: 12px;
  }

  .sp-shortcuts-hint:hover {
    background: var(--sp-accent-light);
    color: var(--sp-accent);
    border-color: var(--sp-accent);
  }

  .sp-shortcuts-hint::after {
    content: attr(aria-label);
    position: absolute;
    bottom: calc(100% + 6px);
    right: 0;
    padding: 4px 8px;
    border-radius: 6px;
    background: var(--sp-glass-bg-heavy);
    border: 1px solid var(--sp-glass-border);
    box-shadow: var(--sp-shadow-sm);
    font-family: var(--sp-font);
    font-size: 11px;
    font-weight: 500;
    color: var(--sp-text-secondary);
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transform: translateY(4px);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }

  .sp-shortcuts-hint:hover::after {
    opacity: 1;
    transform: translateY(0);
  }

  /* ---- Card focus highlight (navigation) ---- */

  .sp-card--focused {
    outline: 2px solid var(--sp-accent);
    outline-offset: -2px;
    border-radius: inherit;
  }

  /* ---- Reduced motion ---- */

  @media (prefers-reduced-motion: reduce) {
    .sp-shortcuts-overlay,
    .sp-shortcuts-card,
    .sp-shortcuts-close,
    .sp-shortcuts-hint,
    .sp-shortcuts-hint::after {
      transition-duration: 0.01ms !important;
    }
  }
`;

// ---------------------------------------------------------------------------
// Close icon (small X) — reused from icons.ts pattern
// ---------------------------------------------------------------------------

const ICON_CLOSE_SM = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

// ---------------------------------------------------------------------------
// KeyboardShortcuts
// ---------------------------------------------------------------------------

export class KeyboardShortcuts {
  /** Help overlay element — append to shadow root. */
  readonly helpOverlay: HTMLElement;
  /** Small "?" hint button — append inside the panel. */
  readonly hintButton: HTMLButtonElement;

  private readonly keyMap: Map<string, () => void>;
  private readonly boundHandler: (e: KeyboardEvent) => void;
  private shadowRoot: ShadowRoot | HTMLElement | null = null;
  private enabled = false;
  private helpVisible = false;
  private destroyed = false;

  constructor(
    _colors: ThemeColors,
    callbacks: ShortcutCallbacks,
    private readonly t: TFunction,
  ) {
    // Build key map (O(1) dispatch)
    this.keyMap = new Map<string, () => void>([
      ["j", () => callbacks.onNavigate("down")],
      ["k", () => callbacks.onNavigate("up")],
      ["r", () => callbacks.onResolve()],
      ["d", () => callbacks.onDelete()],
      ["f", () => callbacks.onFocusSearch()],
      ["/", () => callbacks.onFocusSearch()],
      ["x", () => callbacks.onToggleSelect()],
      ["?", () => this.toggleHelp()],
    ]);

    // Build DOM
    this.helpOverlay = this.buildOverlay();
    this.hintButton = this.buildHintButton();

    // Bind handler once
    this.boundHandler = (e: KeyboardEvent) => this.handleKeydown(e);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Enable shortcuts. Provide the shadow root (or document) to attach the listener. */
  enable(root?: ShadowRoot | HTMLElement): void {
    if (this.destroyed || this.enabled) return;
    if (root) this.shadowRoot = root;
    const target = this.shadowRoot ?? document;
    target.addEventListener("keydown", this.boundHandler as EventListener);
    this.enabled = true;
  }

  /** Disable shortcuts (call when panel closes). */
  disable(): void {
    if (!this.enabled) return;
    const target = this.shadowRoot ?? document;
    target.removeEventListener("keydown", this.boundHandler as EventListener);
    this.enabled = false;
    // Also hide help if visible
    if (this.helpVisible) this.hideHelp();
  }

  /** Show/hide help overlay. */
  toggleHelp(): void {
    if (this.helpVisible) {
      this.hideHelp();
    } else {
      this.showHelp();
    }
  }

  /** Destroy and clean up all listeners. */
  destroy(): void {
    if (this.destroyed) return;
    this.disable();
    this.helpOverlay.remove();
    this.hintButton.remove();
    this.destroyed = true;
  }

  // -------------------------------------------------------------------------
  // Keyboard handler
  // -------------------------------------------------------------------------

  private handleKeydown(e: KeyboardEvent): void {
    // Escape closes help overlay only (panel close handled elsewhere)
    if (e.key === "Escape") {
      if (this.helpVisible) {
        e.preventDefault();
        e.stopPropagation();
        this.hideHelp();
      }
      return;
    }

    // If help overlay is open, block all other shortcuts
    if (this.helpVisible) return;

    // Ignore when focus is in an input, textarea, or contenteditable
    const active = e.composedPath()[0] as HTMLElement | undefined;
    if (active) {
      const tag = active.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (active.isContentEditable) return;
    }

    // Ignore modified keys (Ctrl, Alt, Meta) — except Shift for "?"
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const handler = this.keyMap.get(e.key);
    if (handler) {
      e.preventDefault();
      e.stopPropagation();
      handler();
    }
  }

  // -------------------------------------------------------------------------
  // Help overlay visibility
  // -------------------------------------------------------------------------

  private showHelp(): void {
    this.helpVisible = true;
    this.helpOverlay.classList.add("sp-shortcuts-overlay--visible");

    // Focus the close button for accessibility
    const closeBtn = this.helpOverlay.querySelector<HTMLButtonElement>(".sp-shortcuts-close");
    closeBtn?.focus();
  }

  private hideHelp(): void {
    this.helpVisible = false;
    this.helpOverlay.classList.remove("sp-shortcuts-overlay--visible");
  }

  // -------------------------------------------------------------------------
  // DOM builders
  // -------------------------------------------------------------------------

  private buildOverlay(): HTMLElement {
    const overlay = el("div", { class: "sp-shortcuts-overlay" });
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", this.t("shortcuts.title"));

    // Click backdrop to close
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.hideHelp();
    });

    const card = el("div", { class: "sp-shortcuts-card" });

    // Title
    const title = el("div", { class: "sp-shortcuts-title" });
    title.appendChild(parseSvg(ICON_KEYBOARD));
    const titleText = el("span");
    setText(titleText, this.t("shortcuts.title"));
    title.appendChild(titleText);
    card.appendChild(title);

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "sp-shortcuts-close";
    closeBtn.setAttribute("aria-label", this.t("shortcuts.close"));
    closeBtn.appendChild(parseSvg(ICON_CLOSE_SM));
    closeBtn.addEventListener("click", () => this.hideHelp());
    card.appendChild(closeBtn);

    // Grid
    const grid = el("div", { class: "sp-shortcuts-grid" });

    for (const def of SHORTCUT_DEFS) {
      const row = el("div", { class: "sp-shortcuts-row" });

      const keysWrap = el("div", { class: "sp-shortcuts-keys" });
      def.keys.forEach((key, i) => {
        if (i > 0) {
          const sep = el("span", { class: "sp-shortcuts-separator" });
          setText(sep, "/");
          keysWrap.appendChild(sep);
        }
        const kbd = el("span", { class: "sp-kbd" });
        setText(kbd, key);
        keysWrap.appendChild(kbd);
      });

      const desc = el("span", { class: "sp-shortcuts-desc" });
      setText(desc, this.t(def.label));

      row.appendChild(keysWrap);
      row.appendChild(desc);
      grid.appendChild(row);
    }

    card.appendChild(grid);
    overlay.appendChild(card);

    return overlay;
  }

  private buildHintButton(): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "sp-shortcuts-hint";
    btn.setAttribute("aria-label", this.t("shortcuts.hint"));
    setText(btn, "?");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleHelp();
    });
    return btn;
  }
}
