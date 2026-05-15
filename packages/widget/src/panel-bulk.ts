/**
 * Bulk Actions system for the feedback panel.
 *
 * Allows multi-select on feedback cards with a floating action bar
 * for batch resolve/delete operations. Glassmorphism design with
 * spring animations and smooth transitions.
 */

import { el, parseSvg, setButtonLoading, setText } from "./dom-utils.js";
import type { TFunction } from "./i18n/index.js";
import type { ThemeColors } from "./styles/theme.js";

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

export const ICON_CHECKBOX = `<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="1" y="1" width="16" height="16" rx="4" stroke="currentColor" stroke-width="2"/></svg>`;

export const ICON_CHECKBOX_CHECKED = `<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="1" y="1" width="16" height="16" rx="4" fill="url(#sp-cb-grad)" stroke="none"/><polyline points="5 9 8 12 13 6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="sp-cb-grad" x1="0" y1="0" x2="18" y2="18" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="var(--sp-accent)"/><stop offset="100%" stop-color="var(--sp-accent-dark)"/></linearGradient></defs></svg>`;

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

export const BULK_CSS = `
  /* ============================
     Bulk Checkbox
     ============================ */

  .sp-bulk-checkbox {
    position: relative;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    cursor: pointer;
    border-radius: 4px;
    color: var(--sp-border);
    opacity: 0;
    transition: opacity 0.15s ease, color 0.15s ease, transform 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .sp-bulk-checkbox svg {
    width: 16px;
    height: 16px;
    display: block;
  }

  .sp-bulk-checkbox:hover {
    color: var(--sp-accent);
    transform: scale(1.1);
  }

  .sp-bulk-checkbox--checked {
    color: var(--sp-accent);
    opacity: 1 !important;
    filter: drop-shadow(0 0 4px var(--sp-accent-glow));
  }

  /* Show checkboxes when hovering a card */
  .sp-card:hover .sp-bulk-checkbox {
    opacity: 1;
  }

  /* When any card has selection, show ALL checkboxes */
  .sp-list--has-selection .sp-bulk-checkbox {
    opacity: 1;
  }

  /* ============================
     Card Selected State
     ============================ */

  .sp-card--selected {
    border-left: 3px solid var(--sp-accent) !important;
    background: var(--sp-accent-light) !important;
  }

  .sp-card--selected:hover {
    background: var(--sp-accent-light) !important;
  }

  /* ============================
     Select All Bar
     ============================ */

  .sp-bulk-select-all {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 4px;
    border-radius: var(--sp-radius);
    background: transparent;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s ease, background 0.2s ease;
    user-select: none;
    font-family: var(--sp-font);
    font-size: 12px;
    font-weight: 500;
    color: var(--sp-text-secondary);
  }

  .sp-bulk-select-all:hover {
    background: var(--sp-bg-hover);
  }

  /* Show select-all on list hover or when selections exist */
  .sp-list:hover .sp-bulk-select-all,
  .sp-list--has-selection .sp-bulk-select-all {
    opacity: 1;
  }

  .sp-bulk-select-all .sp-bulk-checkbox {
    opacity: 1;
  }

  /* ============================
     Floating Action Bar
     ============================ */

  @keyframes sp-bulk-bar-in {
    from {
      transform: translateY(100%) scale(0.95);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  @keyframes sp-bulk-bar-out {
    from {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    to {
      transform: translateY(100%) scale(0.95);
      opacity: 0;
    }
  }

  .sp-bulk-bar {
    position: absolute;
    bottom: 16px;
    left: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 16px;
    background: var(--sp-glass-bg-heavy);
    backdrop-filter: blur(var(--sp-blur-heavy));
    -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
    border: 1px solid var(--sp-glass-border);
    box-shadow: var(--sp-shadow-xl);
    z-index: 10;
    pointer-events: none;
    opacity: 0;
    transform: translateY(100%) scale(0.95);
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                opacity 0.25s ease;
    font-family: var(--sp-font);
  }

  .sp-bulk-bar--visible {
    pointer-events: auto;
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .sp-bulk-bar-count {
    font-size: 13px;
    font-weight: 600;
    color: var(--sp-text);
    white-space: nowrap;
    letter-spacing: -0.01em;
  }

  .sp-bulk-bar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .sp-bulk-btn-resolve,
  .sp-bulk-btn-delete {
    padding: 7px 14px;
    border-radius: var(--sp-radius-full);
    border: 1.5px solid transparent;
    background: transparent;
    font-family: var(--sp-font);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .sp-bulk-btn-resolve {
    color: #22c55e;
    border-color: #22c55e;
  }

  .sp-bulk-btn-resolve:hover {
    background: rgba(34, 197, 94, 0.1);
    box-shadow: 0 0 12px rgba(34, 197, 94, 0.15);
  }

  .sp-bulk-btn-resolve:active {
    transform: scale(0.96);
    transition-duration: 0.1s;
  }

  .sp-bulk-btn-delete {
    color: #ef4444;
    border-color: #ef4444;
  }

  .sp-bulk-btn-delete:hover {
    background: rgba(239, 68, 68, 0.1);
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.15);
  }

  .sp-bulk-btn-delete:active {
    transform: scale(0.96);
    transition-duration: 0.1s;
  }

  .sp-bulk-btn-resolve:disabled,
  .sp-bulk-btn-delete:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .sp-bulk-btn-deselect {
    width: 28px;
    height: 28px;
    border-radius: var(--sp-radius-full);
    border: 1px solid var(--sp-border);
    background: transparent;
    color: var(--sp-text-tertiary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
    padding: 0;
  }

  .sp-bulk-btn-deselect:hover {
    background: var(--sp-bg-hover);
    color: var(--sp-text);
    border-color: var(--sp-text-tertiary);
  }

  .sp-bulk-btn-deselect:active {
    transform: scale(0.92);
    transition-duration: 0.1s;
  }

  .sp-bulk-btn-deselect svg {
    width: 12px;
    height: 12px;
  }

  /* Spinner inside bulk bar buttons */
  .sp-bulk-btn-resolve .sp-spinner,
  .sp-bulk-btn-delete .sp-spinner {
    width: 14px;
    height: 14px;
  }

  /* ============================
     Forced Colors / High Contrast
     ============================ */

  @media (forced-colors: active) {
    .sp-bulk-checkbox,
    .sp-bulk-btn-resolve,
    .sp-bulk-btn-delete,
    .sp-bulk-btn-deselect,
    .sp-bulk-bar {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
      color: ButtonText !important;
    }

    .sp-bulk-checkbox--checked {
      background: Highlight !important;
      color: HighlightText !important;
    }

    .sp-card--selected {
      border-left: 4px solid Highlight !important;
    }
  }

  /* ============================
     Reduced Motion
     ============================ */

  @media (prefers-reduced-motion: reduce) {
    .sp-bulk-bar {
      transition-duration: 0.01ms !important;
    }

    .sp-bulk-checkbox {
      transition-duration: 0.01ms !important;
    }
  }
`;

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

export interface BulkActionCallbacks {
  onResolve: (ids: string[]) => Promise<void>;
  onDelete: (ids: string[]) => Promise<void>;
}

// ---------------------------------------------------------------------------
// BulkActions Class
// ---------------------------------------------------------------------------

export class BulkActions {
  /** The floating action bar element — append to panel root */
  readonly barElement: HTMLElement;

  private selected = new Set<string>();
  private checkboxMap = new Map<string, HTMLElement>();
  private countLabel: HTMLElement;
  private resolveBtn: HTMLButtonElement;
  private deleteBtn: HTMLButtonElement;
  private selectAllCheckbox: HTMLElement | null = null;
  private listContainer: HTMLElement | null = null;
  private isProcessing = false;
  private readonly t: TFunction;

  constructor(
    _colors: ThemeColors,
    private readonly callbacks: BulkActionCallbacks,
    t: TFunction,
  ) {
    this.t = t;
    // ----- Build floating bar -----
    this.barElement = el("div", { class: "sp-bulk-bar" });
    this.barElement.setAttribute("role", "toolbar");
    this.barElement.setAttribute("aria-label", "Bulk actions");

    // Left: count label
    this.countLabel = el("span", { class: "sp-bulk-bar-count" });
    setText(this.countLabel, this.t("bulk.selected").replace("{count}", "0"));

    // Right: action buttons
    const actions = el("div", { class: "sp-bulk-bar-actions" });

    this.resolveBtn = document.createElement("button");
    this.resolveBtn.className = "sp-bulk-btn-resolve";
    this.resolveBtn.type = "button";
    this.resolveBtn.addEventListener("click", () => this.handleResolve());

    this.deleteBtn = document.createElement("button");
    this.deleteBtn.className = "sp-bulk-btn-delete";
    this.deleteBtn.type = "button";
    this.deleteBtn.addEventListener("click", () => this.handleDelete());

    const deselectBtn = document.createElement("button");
    deselectBtn.className = "sp-bulk-btn-deselect";
    deselectBtn.type = "button";
    deselectBtn.setAttribute("aria-label", this.t("bulk.deselect"));
    deselectBtn.appendChild(
      parseSvg(
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      ),
    );
    deselectBtn.addEventListener("click", () => this.deselectAll());

    actions.appendChild(this.resolveBtn);
    actions.appendChild(this.deleteBtn);
    actions.appendChild(deselectBtn);

    this.barElement.appendChild(this.countLabel);
    this.barElement.appendChild(actions);

    // Initial button text
    this.updateButtonLabels();
  }

  /** Create a checkbox element for a card. Returns the checkbox wrapper. */
  createCheckbox(feedbackId: string): HTMLElement {
    const wrapper = el("div", { class: "sp-bulk-checkbox" });
    wrapper.setAttribute("role", "checkbox");
    wrapper.setAttribute("aria-checked", "false");
    wrapper.setAttribute("tabindex", "0");
    wrapper.setAttribute("aria-label", `Select feedback ${feedbackId}`);

    // Render unchecked icon
    wrapper.appendChild(parseSvg(ICON_CHECKBOX));

    // Click handler
    wrapper.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle(feedbackId);
    });

    // Keyboard: space/enter to toggle
    wrapper.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === " " || (e as KeyboardEvent).key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        this.toggle(feedbackId);
      }
    });

    this.checkboxMap.set(feedbackId, wrapper);
    return wrapper;
  }

  /**
   * Create a "Select all" bar element.
   * The caller should insert this at the top of the list container.
   */
  createSelectAllBar(feedbackIds: string[], label: string): HTMLElement {
    const wrapper = el("div", { class: "sp-bulk-select-all" });

    const checkbox = el("div", { class: "sp-bulk-checkbox" });
    checkbox.appendChild(parseSvg(ICON_CHECKBOX));
    this.selectAllCheckbox = checkbox;

    const labelEl = el("span");
    setText(labelEl, label);

    wrapper.appendChild(checkbox);
    wrapper.appendChild(labelEl);

    wrapper.addEventListener("click", () => {
      // If all selected, deselect; otherwise select all
      if (this.selected.size === feedbackIds.length && feedbackIds.length > 0) {
        this.deselectAll();
      } else {
        this.selectAll(feedbackIds);
      }
    });

    return wrapper;
  }

  /** Set the list container reference (for toggling .sp-list--has-selection) */
  setListContainer(container: HTMLElement): void {
    this.listContainer = container;
  }

  /** Toggle selection for a feedback */
  toggle(feedbackId: string): void {
    if (this.isProcessing) return;

    if (this.selected.has(feedbackId)) {
      this.selected.delete(feedbackId);
    } else {
      this.selected.add(feedbackId);
    }
    this.updateCheckbox(feedbackId);
    this.updateBar();
    this.updateSelectAllCheckbox();
    this.updateListSelectionClass();
    this.updateCardSelectedState(feedbackId);
  }

  /** Select all from the given list */
  selectAll(feedbackIds: string[]): void {
    if (this.isProcessing) return;

    for (const id of feedbackIds) {
      this.selected.add(id);
      this.updateCheckbox(id);
      this.updateCardSelectedState(id);
    }
    this.updateBar();
    this.updateSelectAllCheckbox();
    this.updateListSelectionClass();
  }

  /** Clear all selections */
  deselectAll(): void {
    const prevSelected = [...this.selected];
    this.selected.clear();
    for (const id of prevSelected) {
      this.updateCheckbox(id);
      this.updateCardSelectedState(id);
    }
    this.updateBar();
    this.updateSelectAllCheckbox();
    this.updateListSelectionClass();
  }

  /** Get currently selected IDs */
  get selectedIds(): string[] {
    return [...this.selected];
  }

  /** Get selection count */
  get count(): number {
    return this.selected.size;
  }

  /** Whether any items are selected */
  get hasSelection(): boolean {
    return this.selected.size > 0;
  }

  /** Reset state (e.g., after feedbacks reload) */
  reset(): void {
    this.selected.clear();
    this.checkboxMap.clear();
    this.selectAllCheckbox = null;

    this.isProcessing = false;
    this.updateBar();
    this.updateListSelectionClass();
  }

  /** Destroy / cleanup */
  destroy(): void {
    this.selected.clear();
    this.checkboxMap.clear();
    this.selectAllCheckbox = null;

    this.listContainer = null;
    this.barElement.remove();
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  /** Update the bar visibility and counts */
  private updateBar(): void {
    const count = this.selected.size;
    const visible = count > 0;

    this.barElement.classList.toggle("sp-bulk-bar--visible", visible);
    setText(this.countLabel, this.t("bulk.selected").replace("{count}", String(count)));
    this.updateButtonLabels();
  }

  private updateButtonLabels(): void {
    const count = this.selected.size;
    const resolve = this.t("bulk.resolve");
    const del = this.t("bulk.delete");

    // Resolve button
    this.resolveBtn.replaceChildren();
    const resolveLabel = document.createElement("span");
    setText(resolveLabel, count > 0 ? `${resolve} ${count}` : resolve);
    this.resolveBtn.appendChild(resolveLabel);

    // Delete button
    this.deleteBtn.replaceChildren();
    const deleteLabel = document.createElement("span");
    setText(deleteLabel, count > 0 ? `${del} ${count}` : del);
    this.deleteBtn.appendChild(deleteLabel);
  }

  private updateCheckbox(feedbackId: string): void {
    const checkbox = this.checkboxMap.get(feedbackId);
    if (!checkbox) return;

    const isChecked = this.selected.has(feedbackId);
    checkbox.classList.toggle("sp-bulk-checkbox--checked", isChecked);
    checkbox.setAttribute("aria-checked", String(isChecked));

    // Swap SVG icon
    checkbox.replaceChildren();
    checkbox.appendChild(parseSvg(isChecked ? ICON_CHECKBOX_CHECKED : ICON_CHECKBOX));
  }

  private updateSelectAllCheckbox(): void {
    if (!this.selectAllCheckbox) return;

    const allSelected = this.selected.size > 0 && this.selected.size === this.checkboxMap.size;
    this.selectAllCheckbox.classList.toggle("sp-bulk-checkbox--checked", allSelected);
    this.selectAllCheckbox.setAttribute("aria-checked", String(allSelected));

    this.selectAllCheckbox.replaceChildren();
    this.selectAllCheckbox.appendChild(parseSvg(allSelected ? ICON_CHECKBOX_CHECKED : ICON_CHECKBOX));
  }

  private updateListSelectionClass(): void {
    if (!this.listContainer) return;
    this.listContainer.classList.toggle("sp-list--has-selection", this.selected.size > 0);
  }

  private updateCardSelectedState(feedbackId: string): void {
    if (!this.listContainer) return;
    const escapedId = CSS.escape(feedbackId);
    const card = this.listContainer.querySelector<HTMLElement>(`[data-feedback-id="${escapedId}"]`);
    if (card) {
      card.classList.toggle("sp-card--selected", this.selected.has(feedbackId));
    }
  }

  private async handleResolve(): Promise<void> {
    if (this.isProcessing || this.selected.size === 0) return;
    this.isProcessing = true;

    const ids = [...this.selected];
    const restoreResolve = setButtonLoading(this.resolveBtn);
    this.deleteBtn.disabled = true;

    try {
      await this.callbacks.onResolve(ids);
      this.reset();
    } catch {
      restoreResolve();
      this.deleteBtn.disabled = false;
    } finally {
      this.isProcessing = false;
    }
  }

  private async handleDelete(): Promise<void> {
    if (this.isProcessing || this.selected.size === 0) return;
    this.isProcessing = true;

    const ids = [...this.selected];
    const restoreDelete = setButtonLoading(this.deleteBtn);
    this.resolveBtn.disabled = true;

    try {
      await this.callbacks.onDelete(ids);
      this.reset();
    } catch {
      restoreDelete();
      this.resolveBtn.disabled = false;
    } finally {
      this.isProcessing = false;
    }
  }
}
