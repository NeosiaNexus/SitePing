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

import { el, hasFocusWithin, parseSvg, setInert, setText } from "./dom-utils.js";
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
  /** True while another layer (e.g. the detail view) covers the list. */
  isSuspended?: () => boolean;
}

// ---------------------------------------------------------------------------
// Card focus helpers
// ---------------------------------------------------------------------------

/** Get the currently focused card index from the list container (-1 if none). */
export function getFocusedCardIndex(listContainer: HTMLElement): number {
  const cards = Array.from(listContainer.querySelectorAll<HTMLElement>(".sp-card"));
  // Real focus wins over the J/K highlight — a card reached by Tab or click
  // must not leave R/D acting on the last J/K target.
  const root = listContainer.getRootNode() as Document | ShadowRoot;
  const activeCard = root.activeElement?.closest<HTMLElement>(".sp-card");
  const activeIdx = activeCard ? cards.indexOf(activeCard) : -1;
  if (activeIdx >= 0) return activeIdx;
  return cards.findIndex((card) => card.classList.contains("sp-card--focused"));
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
  // j/k is keyboard navigation: the list jumps, it never glides.
  target.scrollIntoView({ block: "nearest" });
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
  private readonly isSuspended: () => boolean;
  private readonly boundHandler: (e: KeyboardEvent) => void;
  private shadowRoot: ShadowRoot | HTMLElement | null = null;
  private enabled = false;
  private helpVisible = false;
  /** The element focused when the help opened — `hideHelp` gives focus back to it. */
  private opener: HTMLElement | null = null;
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
    this.isSuspended = callbacks.isSuspended ?? (() => false);

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

  /** Whether the help overlay is showing (it consumes Escape before the panel). */
  get isHelpVisible(): boolean {
    return this.helpVisible;
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

    // A modal layer (confirm dialog) or a view covering the list owns the
    // keyboard — R/D must not act on a card hidden behind it.
    if (this.isSuspended()) return;
    const path = e.composedPath();
    if (path.some((n) => n instanceof Element && n.getAttribute("aria-modal") === "true")) return;

    // Ignore when focus is in an input, textarea, or contenteditable
    const active = path[0] as HTMLElement | undefined;
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
    const active = (this.helpOverlay.getRootNode() as Document | ShadowRoot).activeElement;
    this.opener = active instanceof HTMLElement ? active : null;
    this.helpVisible = true;
    setInert(this.helpOverlay, false);
    this.helpOverlay.classList.add("sp-shortcuts-overlay--visible");

    // Focus the close button for accessibility
    const closeBtn = this.helpOverlay.querySelector<HTMLButtonElement>(".sp-shortcuts-close");
    closeBtn?.focus();
  }

  private hideHelp(): void {
    this.helpVisible = false;
    // Back to where the overlay was opened from (the "?" hint, a card)
    // rather than to the page, once its close button goes inert.
    const refocus = hasFocusWithin(this.helpOverlay);
    setInert(this.helpOverlay, true);
    this.helpOverlay.classList.remove("sp-shortcuts-overlay--visible");
    if (refocus && this.opener?.isConnected) this.opener.focus();
    this.opener = null;
  }

  // -------------------------------------------------------------------------
  // DOM builders
  // -------------------------------------------------------------------------

  private buildOverlay(): HTMLElement {
    const overlay = el("div", { class: "sp-shortcuts-overlay" });
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", this.t("shortcuts.title"));
    // Faded out while closed, but still rendered: out of the tab order.
    setInert(overlay, true);

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
