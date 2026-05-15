/**
 * Sort and group-by-page controls for the feedback panel.
 *
 * Provides:
 * - Sort dropdown (newest, oldest, by-type, open-first)
 * - Group by page toggle (collapsible URL sections)
 * - Pure sort/group utility functions
 *
 * Glassmorphism design — glass surfaces, accent gradients,
 * smooth micro-interactions.
 */

import type { FeedbackResponse, FeedbackType } from "@siteping/core";
import { el, parseSvg, setText } from "./dom-utils.js";
import type { TFunction } from "./i18n/index.js";
import type { ThemeColors } from "./styles/theme.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortMode = "newest" | "oldest" | "by-type" | "open-first";

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

export const ICON_SORT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5h10"/><path d="M11 9h7"/><path d="M11 13h4"/><path d="M3 17l3 3 3-3"/><path d="M6 18V4"/></svg>`;

export const ICON_PAGE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;

export const ICON_CHEVRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;

// ---------------------------------------------------------------------------
// Sort utilities
// ---------------------------------------------------------------------------

/** Type priority for "by-type" sort: question, change, bug, other */
const TYPE_ORDER: Record<FeedbackType, number> = {
  question: 0,
  change: 1,
  bug: 2,
  other: 3,
};

/** Sort feedbacks according to the given mode. Returns a new array. */
export function sortFeedbacks(feedbacks: FeedbackResponse[], mode: SortMode): FeedbackResponse[] {
  const sorted = [...feedbacks];

  switch (mode) {
    case "newest":
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;

    case "oldest":
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;

    case "by-type":
      sorted.sort((a, b) => {
        const typeA = TYPE_ORDER[a.type] ?? 99;
        const typeB = TYPE_ORDER[b.type] ?? 99;
        if (typeA !== typeB) return typeA - typeB;
        // Within same type: newest first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      break;

    case "open-first":
      sorted.sort((a, b) => {
        // Open (0) before resolved (1)
        const statusA = a.status === "open" ? 0 : 1;
        const statusB = b.status === "open" ? 0 : 1;
        if (statusA !== statusB) return statusA - statusB;
        // Within same status: newest first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      break;
  }

  return sorted;
}

// ---------------------------------------------------------------------------
// Group by page
// ---------------------------------------------------------------------------

/**
 * Extract the pathname from a full URL string.
 * Falls back to the raw string if URL parsing fails.
 */
function extractPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/** Truncate a path string, keeping the beginning and end visible. */
function truncatePath(path: string, maxLength: number): string {
  if (path.length <= maxLength) return path;
  const ellipsis = "\u2026";
  const keep = Math.floor((maxLength - 1) / 2);
  return path.slice(0, keep) + ellipsis + path.slice(-keep);
}

/**
 * Group feedbacks by URL pathname.
 * Returns a Map sorted by feedback count descending (most feedbacks first).
 * Each group's feedbacks maintain their original order.
 */
export function groupFeedbacksByPage(feedbacks: FeedbackResponse[]): Map<string, FeedbackResponse[]> {
  const groups = new Map<string, FeedbackResponse[]>();

  for (const fb of feedbacks) {
    const path = extractPathname(fb.url);
    const existing = groups.get(path);
    if (existing) {
      existing.push(fb);
    } else {
      groups.set(path, [fb]);
    }
  }

  // Sort by count descending
  const sorted = new Map([...groups.entries()].sort((a, b) => b[1].length - a[1].length));

  return sorted;
}

// ---------------------------------------------------------------------------
// Page group header
// ---------------------------------------------------------------------------

/**
 * Create a collapsible page group header element.
 * Click toggles the associated `.sp-group-content` sibling.
 */
export function createPageGroupHeader(pagePath: string, count: number, colors: ThemeColors): HTMLElement {
  const header = el("div", { class: "sp-group-header" });
  header.setAttribute("role", "button");
  header.setAttribute("tabindex", "0");
  header.setAttribute("aria-expanded", "true");
  header.style.borderBottomColor = colors.border;

  // Chevron
  const chevronWrap = el("span", { class: "sp-group-header-chevron" });
  chevronWrap.appendChild(parseSvg(ICON_CHEVRON));
  header.appendChild(chevronWrap);

  // Page icon
  const pageIcon = el("span", { class: "sp-group-header-icon" });
  pageIcon.appendChild(parseSvg(ICON_PAGE));
  header.appendChild(pageIcon);

  // Path
  const pathEl = el("span", { class: "sp-group-header-path" });
  const displayPath = truncatePath(pagePath, 40);
  setText(pathEl, displayPath);
  if (pagePath.length > 40) {
    pathEl.title = pagePath;
  }
  header.appendChild(pathEl);

  // Count badge
  const countEl = el("span", { class: "sp-group-header-count" });
  countEl.style.background = colors.accentLight;
  countEl.style.color = colors.accent;
  setText(countEl, String(count));
  header.appendChild(countEl);

  // Toggle behavior
  const toggle = () => {
    const isExpanded = header.getAttribute("aria-expanded") === "true";
    header.setAttribute("aria-expanded", String(!isExpanded));
    header.classList.toggle("sp-group-header--collapsed", isExpanded);

    const content = header.nextElementSibling;
    if (content?.classList.contains("sp-group-content")) {
      content.classList.toggle("sp-group-content--collapsed", isExpanded);
    }
  };

  header.addEventListener("click", toggle);
  header.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });

  return header;
}

// ---------------------------------------------------------------------------
// PanelSortControls
// ---------------------------------------------------------------------------

export class PanelSortControls {
  readonly element: HTMLElement;

  private _sortMode: SortMode = "newest";
  private _groupByPage = false;
  private menuEl: HTMLElement | null = null;
  private sortBtn: HTMLButtonElement;
  private groupToggle: HTMLButtonElement;
  private readonly t: TFunction;
  private readonly colors: ThemeColors;
  private readonly onChange: () => void;
  private outsideClickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(colors: ThemeColors, onChange: () => void, t: TFunction) {
    this.colors = colors;
    this.onChange = onChange;
    this.t = t;

    this.element = el("div", { class: "sp-sort-controls" });

    // Sort button
    this.sortBtn = document.createElement("button");
    this.sortBtn.className = "sp-sort-btn";
    this.sortBtn.setAttribute("aria-haspopup", "listbox");
    this.sortBtn.setAttribute("aria-expanded", "false");
    this.sortBtn.setAttribute("aria-label", this.t("sort.label"));

    const sortIcon = parseSvg(ICON_SORT);
    this.sortBtn.appendChild(sortIcon);

    const sortLabel = el("span", { class: "sp-sort-btn-label" });
    setText(sortLabel, this.t("sort.newest"));
    this.sortBtn.appendChild(sortLabel);

    this.sortBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });

    // Group by page toggle
    this.groupToggle = document.createElement("button");
    this.groupToggle.className = "sp-group-toggle";
    this.groupToggle.setAttribute("aria-pressed", "false");

    const groupIcon = parseSvg(ICON_PAGE);
    this.groupToggle.appendChild(groupIcon);

    const groupLabel = el("span", { class: "sp-group-toggle-label" });
    setText(groupLabel, this.t("group.byPage"));
    this.groupToggle.appendChild(groupLabel);

    this.groupToggle.addEventListener("click", () => {
      this._groupByPage = !this._groupByPage;
      this.groupToggle.classList.toggle("sp-group-toggle--active", this._groupByPage);
      this.groupToggle.setAttribute("aria-pressed", String(this._groupByPage));
      this.onChange();
    });

    this.element.appendChild(this.sortBtn);
    this.element.appendChild(this.groupToggle);
  }

  get sortMode(): SortMode {
    return this._sortMode;
  }

  get groupByPage(): boolean {
    return this._groupByPage;
  }

  private toggleMenu(): void {
    if (this.menuEl) {
      this.closeMenu();
      return;
    }
    this.openMenu();
  }

  private openMenu(): void {
    this.menuEl = el("div", { class: "sp-sort-menu" });
    this.menuEl.setAttribute("role", "listbox");
    this.menuEl.setAttribute("aria-label", this.t("sort.label"));
    this.sortBtn.setAttribute("aria-expanded", "true");

    const options: { mode: SortMode; label: string }[] = [
      { mode: "newest", label: this.t("sort.newest") },
      { mode: "oldest", label: this.t("sort.oldest") },
      { mode: "by-type", label: this.t("sort.byType") },
      { mode: "open-first", label: this.t("sort.openFirst") },
    ];

    for (const opt of options) {
      const item = document.createElement("button");
      item.className = `sp-sort-option${opt.mode === this._sortMode ? " sp-sort-option--active" : ""}`;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(opt.mode === this._sortMode));

      if (opt.mode === this._sortMode) {
        item.style.background = this.colors.accentLight;
        item.style.color = this.colors.accent;
      }

      setText(item, opt.label);

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        this._sortMode = opt.mode;
        this.updateSortLabel();
        this.closeMenu();
        this.onChange();
      });

      this.menuEl.appendChild(item);
    }

    // Position relative to button
    this.element.appendChild(this.menuEl);

    // Close on outside click (next tick to avoid the current click)
    requestAnimationFrame(() => {
      this.outsideClickHandler = (e: MouseEvent) => {
        if (this.menuEl && !this.element.contains(e.target as Node)) {
          this.closeMenu();
        }
      };
      document.addEventListener("click", this.outsideClickHandler, true);
    });

    // Close on Escape
    this.menuEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeMenu();
        this.sortBtn.focus();
      }
    });
  }

  private closeMenu(): void {
    if (this.menuEl) {
      this.menuEl.remove();
      this.menuEl = null;
    }
    this.sortBtn.setAttribute("aria-expanded", "false");
    if (this.outsideClickHandler) {
      document.removeEventListener("click", this.outsideClickHandler, true);
      this.outsideClickHandler = null;
    }
  }

  private updateSortLabel(): void {
    const labelMap: Record<SortMode, string> = {
      newest: this.t("sort.newest"),
      oldest: this.t("sort.oldest"),
      "by-type": this.t("sort.byType"),
      "open-first": this.t("sort.openFirst"),
    };
    const label = this.sortBtn.querySelector(".sp-sort-btn-label");
    if (label) setText(label as HTMLElement, labelMap[this._sortMode]);
  }

  destroy(): void {
    this.closeMenu();
  }
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

export const SORT_CSS = `
  /* ============================
     Sort Controls Container
     ============================ */

  .sp-sort-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px solid var(--sp-border);
  }

  /* ============================
     Sort Dropdown Button
     ============================ */

  .sp-sort-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: var(--sp-radius-full);
    border: 1px solid var(--sp-border);
    background: var(--sp-glass-bg-heavy);
    color: var(--sp-text-secondary);
    font-family: var(--sp-font);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
    position: relative;
  }

  .sp-sort-btn svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  .sp-sort-btn:hover {
    border-color: var(--sp-accent);
    color: var(--sp-accent);
    background: var(--sp-accent-light);
  }

  .sp-sort-btn[aria-expanded="true"] {
    border-color: var(--sp-accent);
    color: var(--sp-accent);
    background: var(--sp-accent-light);
  }

  /* ============================
     Sort Floating Menu
     ============================ */

  .sp-sort-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    min-width: 170px;
    padding: 4px;
    border-radius: var(--sp-radius);
    background: var(--sp-glass-bg-heavy);
    backdrop-filter: blur(var(--sp-blur-heavy));
    -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
    border: 1px solid var(--sp-glass-border);
    box-shadow: var(--sp-shadow-md);
    z-index: 10;
    animation: sp-sort-menu-in 0.15s ease-out both;
  }

  @keyframes sp-sort-menu-in {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* ============================
     Sort Menu Option
     ============================ */

  .sp-sort-option {
    display: block;
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--sp-text-secondary);
    font-family: var(--sp-font);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
  }

  .sp-sort-option:hover {
    background: var(--sp-bg-hover);
    color: var(--sp-text);
  }

  .sp-sort-option--active {
    font-weight: 600;
  }

  .sp-sort-option--active:hover {
    background: var(--sp-accent-light);
    color: var(--sp-accent);
  }

  /* ============================
     Group by Page Toggle
     ============================ */

  .sp-group-toggle {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: var(--sp-radius-full);
    border: 1px solid var(--sp-border);
    background: var(--sp-glass-bg-heavy);
    color: var(--sp-text-secondary);
    font-family: var(--sp-font);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .sp-group-toggle svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }

  .sp-group-toggle:hover {
    border-color: var(--sp-accent);
    color: var(--sp-accent);
    background: var(--sp-accent-light);
  }

  .sp-group-toggle--active {
    background: var(--sp-accent-gradient);
    border-color: transparent;
    color: #fff;
    box-shadow: 0 2px 8px var(--sp-accent-glow);
  }

  .sp-group-toggle--active:hover {
    background: var(--sp-accent-gradient);
    border-color: transparent;
    color: #fff;
  }

  /* ============================
     Page Group Header
     ============================ */

  .sp-group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--sp-accent-light);
    border-bottom: 1px solid var(--sp-border);
    cursor: pointer;
    user-select: none;
    position: sticky;
    top: 0;
    z-index: 2;
    transition: background 0.2s ease;
  }

  .sp-group-header:hover {
    background: var(--sp-bg-hover);
  }

  .sp-group-header:focus-visible {
    outline: 2px solid var(--sp-accent);
    outline-offset: -2px;
  }

  .sp-group-header-chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    transition: transform 0.2s ease;
    transform: rotate(90deg);
  }

  .sp-group-header-chevron svg {
    width: 12px;
    height: 12px;
    color: var(--sp-text-tertiary);
  }

  .sp-group-header--collapsed .sp-group-header-chevron {
    transform: rotate(0deg);
  }

  .sp-group-header-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .sp-group-header-icon svg {
    width: 14px;
    height: 14px;
    color: var(--sp-text-tertiary);
  }

  .sp-group-header-path {
    font-size: 12px;
    font-weight: 600;
    color: var(--sp-text-secondary);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sp-group-header-count {
    font-size: 11px;
    font-weight: 700;
    padding: 1px 8px;
    border-radius: var(--sp-radius-full);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  /* ============================
     Page Group Content
     ============================ */

  .sp-group-content {
    overflow: hidden;
    transition: max-height 0.25s ease, opacity 0.2s ease;
    max-height: 5000px;
    opacity: 1;
  }

  .sp-group-content--collapsed {
    max-height: 0;
    opacity: 0;
    pointer-events: none;
  }

  /* ============================
     Forced Colors / High Contrast
     ============================ */

  @media (forced-colors: active) {
    .sp-sort-btn,
    .sp-group-toggle,
    .sp-sort-option,
    .sp-group-header {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
      color: ButtonText !important;
    }

    .sp-sort-btn:focus-visible,
    .sp-group-toggle:focus-visible,
    .sp-sort-option:focus-visible,
    .sp-group-header:focus-visible {
      outline: 3px solid Highlight !important;
    }

    .sp-sort-menu {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
    }
  }

  /* ============================
     Reduced Motion
     ============================ */

  @media (prefers-reduced-motion: reduce) {
    .sp-sort-menu {
      animation: none;
    }
    .sp-group-header-chevron {
      transition: none;
    }
    .sp-group-content {
      transition: none;
    }
  }
`;
