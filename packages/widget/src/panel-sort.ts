/**
 * Sort and group-by-page controls for the feedback panel.
 *
 * Provides:
 * - Sort dropdown (newest, oldest, by-type, open-first)
 * - Group by page toggle (collapsible URL sections)
 * - Pure sort/group utility functions
 *
 * System look: borderless fill capsules, a material menu with a check on
 * the current order, section headers on a blurred band.
 */

import { type FeedbackResponse, type FeedbackType, isClosedStatus } from "@siteping/core";
import { el, onClickOutside, parseSvg, setText } from "./dom-utils.js";
import type { TFunction } from "./i18n/index.js";
import { ICON_CHECK } from "./icons.js";

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
        // Still-actionable (0: open, in_progress) before closed (1: resolved, wont_fix)
        const statusA = isClosedStatus(a.status) ? 1 : 0;
        const statusB = isClosedStatus(b.status) ? 1 : 0;
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
export function createPageGroupHeader(pagePath: string, count: number): HTMLElement {
  const header = el("div", { class: "sp-group-header" });
  header.setAttribute("role", "button");
  header.setAttribute("tabindex", "0");
  header.setAttribute("aria-expanded", "true");

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
  private readonly sortDropdown: HTMLElement;
  private groupToggle: HTMLButtonElement;
  private readonly t: TFunction;
  private readonly onChange: () => void;
  private removeOutsideClick: (() => void) | null = null;

  constructor(onChange: () => void, t: TFunction) {
    this.onChange = onChange;
    this.t = t;

    this.element = el("div", { class: "sp-sort-controls" });

    // Sort button
    this.sortBtn = document.createElement("button");
    this.sortBtn.className = "sp-sort-btn";
    this.sortBtn.setAttribute("aria-haspopup", "listbox");
    this.sortBtn.setAttribute("aria-expanded", "false");

    const sortIcon = parseSvg(ICON_SORT);
    this.sortBtn.appendChild(sortIcon);

    this.sortBtn.appendChild(el("span", { class: "sp-sort-btn-label" }));
    this.updateSortLabel();

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

    // The trigger and its menu: a click anywhere else closes the menu.
    this.sortDropdown = el("div", { class: "sp-sort-dropdown" });
    this.sortDropdown.appendChild(this.sortBtn);

    this.element.appendChild(this.sortDropdown);
    this.element.appendChild(this.groupToggle);

    // Close the open menu on Escape from anywhere in the controls: a click
    // leaves focus on the trigger, not in the menu.
    this.element.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !this.menuEl) return;
      e.stopPropagation(); // Close the menu only, not the panel
      this.closeMenu();
      this.sortBtn.focus();
    });
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

      setText(item, opt.label);
      if (opt.mode === this._sortMode) item.appendChild(parseSvg(ICON_CHECK));

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
    this.sortDropdown.appendChild(this.menuEl);

    // Close on outside click. Armed now, not in a frame that closeMenu()
    // could miss: capture listeners added while the opening click is at its
    // target never see that click.
    this.removeOutsideClick = onClickOutside(this.sortDropdown, () => this.closeMenu());
  }

  private closeMenu(): void {
    if (this.menuEl) {
      this.menuEl.remove();
      this.menuEl = null;
    }
    this.sortBtn.setAttribute("aria-expanded", "false");
    this.removeOutsideClick?.();
    this.removeOutsideClick = null;
  }

  private updateSortLabel(): void {
    const labelMap: Record<SortMode, string> = {
      newest: this.t("sort.newest"),
      oldest: this.t("sort.oldest"),
      "by-type": this.t("sort.byType"),
      "open-first": this.t("sort.openFirst"),
    };
    const text = labelMap[this._sortMode];
    const label = this.sortBtn.querySelector(".sp-sort-btn-label");
    if (label) setText(label as HTMLElement, text);
    // The name holds the visible mode, which speech users read off the button (WCAG 2.5.3).
    this.sortBtn.setAttribute("aria-label", `${this.t("sort.label")}: ${text}`);
  }

  destroy(): void {
    this.closeMenu();
  }
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

export const SORT_CSS = /* css */ `
  /* ============================
     Sort Controls Container
     ============================ */

  .sp-sort-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Groups the sort button with its menu for outside clicks, without a box:
     both still lay out as children of .sp-sort-controls. */
  .sp-sort-dropdown {
    display: contents;
  }

  /* ============================
     Sort Button and Toggles
     ============================ */

  /* Borderless fill capsules, like the system's toolbar buttons; a toggle
     that is on fills with the accent. */
  .sp-sort-btn,
  .sp-group-toggle,
  .sp-mine-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 30px;
    padding: 0 12px;
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

  .sp-sort-btn {
    position: relative;
  }

  .sp-sort-btn svg,
  .sp-group-toggle svg,
  .sp-mine-toggle svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    color: var(--sp-text-secondary);
  }

  .sp-sort-btn svg {
    width: 14px;
    height: 14px;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-sort-btn:hover,
    .sp-group-toggle:hover,
    .sp-mine-toggle:hover {
      background: var(--sp-fill-strong);
    }

    .sp-group-toggle--active:hover,
    .sp-mine-toggle--active:hover {
      background: var(--sp-accent-dark);
    }
  }

  .sp-sort-btn[aria-expanded="true"] {
    background: var(--sp-fill-strong);
  }

  .sp-group-toggle--active,
  .sp-mine-toggle--active {
    background: var(--sp-accent);
    color: #fff;
  }

  .sp-group-toggle--active svg,
  .sp-mine-toggle--active svg {
    color: inherit;
  }

  /* ============================
     Sort Floating Menu
     ============================ */

  /* Hangs from the filters block (the dropdown wrapper has no box), aligned
     under its button. */
  .sp-sort-menu {
    position: absolute;
    top: calc(100% - 4px);
    left: 16px;
    min-width: 170px;
    padding: 6px;
    border-radius: var(--sp-radius-lg);
    background: var(--sp-material-thick);
    backdrop-filter: var(--sp-material-blur);
    -webkit-backdrop-filter: var(--sp-material-blur);
    box-shadow: inset 0 0.5px 0 var(--sp-edge), var(--sp-shadow-float);
    z-index: 10;
    transform-origin: top left;
    animation: sp-menu-in 0.15s var(--sp-ease-out) backwards;
  }

  /* ============================
     Sort Menu Option
     ============================ */

  .sp-sort-option {
    display: block;
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
    transition: var(--sp-tr);
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-sort-option:hover {
      background: var(--sp-fill);
    }
  }

  /* The current order carries a check, like the type menu, not a tint. */
  .sp-sort-option--active {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-weight: 600;
  }

  .sp-sort-option--active svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    color: var(--sp-accent-ink);
    stroke-width: 2.5;
  }

  /* ============================
     Page Group Header
     ============================ */

  /* A section header that stays on top of its cards, on a blurred band. */
  .sp-group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 2px -4px 6px;
    padding: 8px;
    border-radius: var(--sp-radius);
    background: color-mix(in srgb, var(--sp-grouped) 72%, transparent);
    backdrop-filter: var(--sp-material-blur);
    -webkit-backdrop-filter: var(--sp-material-blur);
    cursor: pointer;
    user-select: none;
    position: sticky;
    top: 0;
    z-index: 2;
    transition: background-color 0.15s ease;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-group-header:hover {
      background: color-mix(in srgb, var(--sp-grouped) 72%, var(--sp-fill-strong));
    }
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
    transition: transform 0.2s var(--sp-ease-out);
    transform: rotate(90deg);
  }

  .sp-group-header-chevron svg {
    width: 12px;
    height: 12px;
    color: var(--sp-text-secondary);
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
    color: var(--sp-text-secondary);
  }

  .sp-group-header-path {
    font-size: 13px;
    font-weight: 600;
    color: var(--sp-text-secondary);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sp-group-header-count {
    font-size: 12px;
    font-weight: 600;
    padding: 1px 8px;
    border-radius: var(--sp-radius-full);
    background: color-mix(in srgb, var(--sp-accent) 13%, transparent);
    color: var(--sp-accent-ink);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  /* ============================
     Page Group Content
     ============================ */

  /* Folded groups leave the layout (and the Tab order) entirely; the old
     max-height cap clipped every card past 5000px of one open group. */
  .sp-group-content--collapsed {
    display: none;
  }

  /* ============================
     Forced Colors / High Contrast
     ============================ */

  @media (forced-colors: active) {
    .sp-sort-btn,
    .sp-group-toggle,
    .sp-mine-toggle,
    .sp-sort-option,
    .sp-group-header {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
      color: ButtonText !important;
    }

    /* A pressed toggle, like an active segment */
    .sp-group-toggle--active,
    .sp-mine-toggle--active {
      background: Highlight !important;
      color: HighlightText !important;
    }

    .sp-sort-btn:focus-visible,
    .sp-group-toggle:focus-visible,
    .sp-mine-toggle:focus-visible,
    .sp-sort-option:focus-visible,
    .sp-group-header:focus-visible {
      outline: 3px solid Highlight !important;
    }

    .sp-sort-menu {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
    }
  }

`;
