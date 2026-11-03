/**
 * Bulk Actions system for the feedback panel.
 *
 * Allows multi-select on feedback cards with a floating action bar
 * for batch resolve/delete operations: round checks, after the system's
 * edit mode, and a floating material capsule.
 */

import { el, hasFocusWithin, parseSvg, setButtonLoading, setHidden, setInert, setText } from "./dom-utils.js";
import { type TFunction, tWithParams } from "./i18n/index.js";
import type { ThemeColors } from "./styles/theme.js";

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

export const ICON_CHECKBOX = `<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="1" y="1" width="16" height="16" rx="8" stroke="currentColor" stroke-width="2"/></svg>`;

export const ICON_CHECKBOX_CHECKED = `<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="1" y="1" width="16" height="16" rx="8" fill="currentColor"/><polyline points="5 9 8 12 13 6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

export const BULK_CSS = /* css */ `
  /* ============================
     Bulk Checkbox
     ============================ */

  /* A round check, after the system's edit mode. */
  .sp-bulk-checkbox {
    position: relative;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    cursor: pointer;
    border-radius: 4px;
    color: var(--sp-gray3);
    opacity: 0;
    transition: opacity 0.15s ease, color 0.15s ease, transform 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .sp-bulk-checkbox svg {
    width: 18px;
    height: 18px;
    display: block;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-bulk-checkbox:hover {
      color: var(--sp-accent);
    }
  }

  .sp-bulk-checkbox--checked {
    color: var(--sp-accent);
    opacity: 1 !important;
  }

  /* Show checkboxes when hovering a card, or reaching one by keyboard */
  @media (hover: hover) and (pointer: fine) {
    .sp-card:hover .sp-bulk-checkbox {
      opacity: 1;
    }
  }

  .sp-bulk-checkbox:focus-visible {
    opacity: 1;
  }

  /* When any card has selection, show ALL checkboxes */
  .sp-list--has-selection .sp-bulk-checkbox {
    opacity: 1;
  }

  /* The card's check takes the type dot's place instead of pushing the row:
     the dot steps aside whenever the check shows. */
  .sp-card-header > .sp-bulk-checkbox {
    position: absolute;
    top: 13px;
    left: 9px;
  }

  .sp-list--has-selection .sp-card-bar,
  .sp-card:has(.sp-bulk-checkbox:focus-visible) .sp-card-bar {
    opacity: 0;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-card:hover:has(.sp-bulk-checkbox) .sp-card-bar {
      opacity: 0;
    }
  }

  @media not all and (hover: hover) and (pointer: fine) {
    .sp-card:has(.sp-bulk-checkbox) .sp-card-bar {
      opacity: 0;
    }
  }

  /* ============================
     Card Selected State
     ============================ */

  /* !important: the card's own hover background is more specific. */
  .sp-card--selected {
    background: color-mix(in srgb, var(--sp-accent) 9%, var(--sp-row)) !important;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sp-accent) 30%, transparent);
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-card--selected:hover {
      background: color-mix(in srgb, var(--sp-accent) 12%, var(--sp-row)) !important;
    }
  }

  /* ============================
     Select All Bar
     ============================ */

  .sp-bulk-select-all {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px;
    margin-bottom: 2px;
    border-radius: var(--sp-radius);
    background: transparent;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s ease, background 0.2s ease;
    user-select: none;
    font-family: var(--sp-font);
    font-size: 13px;
    font-weight: 500;
    color: var(--sp-text-secondary);
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-bulk-select-all:hover {
      background: var(--sp-fill);
    }
  }

  /* Show select-all on list hover or when selections exist */
  .sp-list--has-selection .sp-bulk-select-all {
    opacity: 1;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-list:hover .sp-bulk-select-all {
      opacity: 1;
    }
  }

  .sp-bulk-select-all .sp-bulk-checkbox {
    opacity: 1;
  }

  /* ============================
     Floating Action Bar
     ============================ */

  /* A floating material capsule over the list. */
  .sp-bulk-bar {
    position: absolute;
    bottom: 12px;
    left: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px 12px;
    padding: 8px 8px 8px 16px;
    border-radius: 18px;
    background: var(--sp-material-thick);
    backdrop-filter: var(--sp-material-blur);
    -webkit-backdrop-filter: var(--sp-material-blur);
    box-shadow: inset 0 0.5px 0 var(--sp-edge), var(--sp-shadow-float);
    z-index: 10;
    pointer-events: none;
    opacity: 0;
    /* Rises from the panel's bottom edge and leaves the same way. */
    transform: translateY(calc(100% + 16px));
    transition: transform 0.2s var(--sp-ease-out), opacity 0.15s ease;
    font-family: var(--sp-font);
  }

  .sp-bulk-bar--visible {
    pointer-events: auto;
    opacity: 1;
    transform: none;
  }

  .sp-bulk-bar-count {
    font-size: 15px;
    font-weight: 600;
    color: var(--sp-text);
    white-space: nowrap;
    letter-spacing: -0.02em;
  }

  .sp-bulk-bar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }

  /* Tinted buttons: an ink that reads 4.5:1 on its own tint. */
  .sp-bulk-btn-resolve,
  .sp-bulk-btn-delete {
    height: 34px;
    padding: 0 12px;
    border-radius: var(--sp-radius);
    border: none;
    font-family: var(--sp-font);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: var(--sp-tr);
    white-space: nowrap;
  }

  .sp-bulk-btn-resolve {
    color: var(--sp-ink-green);
    background: color-mix(in srgb, var(--sp-status-open) 13%, transparent);
  }

  .sp-bulk-btn-delete {
    color: var(--sp-ink-red);
    background: color-mix(in srgb, var(--sp-type-bug) 11%, transparent);
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-bulk-btn-resolve:hover {
      background: color-mix(in srgb, var(--sp-status-open) 19%, transparent);
    }

    .sp-bulk-btn-delete:hover {
      background: color-mix(in srgb, var(--sp-type-bug) 16%, transparent);
    }
  }

  .sp-bulk-btn-resolve:disabled,
  .sp-bulk-btn-delete:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .sp-bulk-btn-deselect {
    width: 30px;
    height: 30px;
    border-radius: var(--sp-radius-full);
    border: none;
    background: var(--sp-fill);
    color: var(--sp-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--sp-tr);
    flex-shrink: 0;
    padding: 0;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-bulk-btn-deselect:hover {
      background: var(--sp-fill-strong);
      color: var(--sp-text);
    }
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

    /* The disc takes the text colour: the white check would vanish on it. */
    .sp-bulk-checkbox--checked polyline {
      stroke: Highlight;
    }

    .sp-card--selected {
      border-left: 4px solid Highlight !important;
    }
  }
`;

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

/** What the panel's triage actions need — reviewer mode withholds both. */
export type TriagePermission = "canChangeStatus" | "canDelete";

export interface BulkActionCallbacks {
  onResolve: (ids: string[]) => Promise<void>;
  onDelete: (ids: string[]) => Promise<void>;
  /** False when a selected feedback refuses it — the bar hides that action. */
  permits?: (ids: string[], permission: TriagePermission) => boolean;
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
    this.barElement.setAttribute("aria-label", t("bulk.aria"));
    // Closed until something is selected (see `updateBar`).
    setInert(this.barElement, true);

    // Left: count label
    this.countLabel = el("span", { class: "sp-bulk-bar-count" });
    setText(this.countLabel, tWithParams(this.t, "bulk.selected", { count: 0 }));

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

  /**
   * Create a checkbox element for a card. Returns the checkbox wrapper.
   * `label` is the card's accessible name, so a screen reader names a
   * feedback a person recognises, never its id.
   */
  createCheckbox(feedbackId: string, label: string): HTMLElement {
    const wrapper = el("div", { class: "sp-bulk-checkbox" });
    wrapper.setAttribute("role", "checkbox");
    wrapper.setAttribute("tabindex", "0");
    wrapper.setAttribute("aria-label", tWithParams(this.t, "bulk.selectFeedback", { label }));

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
    // Re-renders (sort, group, load more) keep the selection — reflect it.
    this.updateCheckbox(feedbackId);
    return wrapper;
  }

  /** Whether a feedback is currently selected (for initial card state on render). */
  isSelected(feedbackId: string): boolean {
    return this.selected.has(feedbackId);
  }

  /**
   * Create a "Select all" bar element.
   * The caller should insert this at the top of the list container.
   */
  createSelectAllBar(feedbackIds: string[], label: string): HTMLElement {
    const wrapper = el("div", { class: "sp-bulk-select-all" });

    // Operable from the keyboard like the card checkboxes, and where focus
    // lands when the bulk bar closes under it.
    const checkbox = el("div", { class: "sp-bulk-checkbox" });
    checkbox.setAttribute("role", "checkbox");
    checkbox.setAttribute("tabindex", "0");
    checkbox.setAttribute("aria-label", label);
    this.selectAllCheckbox = checkbox;
    this.updateSelectAllCheckbox(feedbackIds.length > 0 && feedbackIds.every((id) => this.selected.has(id)));

    const labelEl = el("span");
    setText(labelEl, label);

    wrapper.appendChild(checkbox);
    wrapper.appendChild(labelEl);

    const toggleAll = () => {
      // If all selected, deselect; otherwise select all
      if (this.selected.size === feedbackIds.length && feedbackIds.length > 0) {
        this.deselectAll();
      } else {
        this.selectAll(feedbackIds);
      }
    };
    wrapper.addEventListener("click", toggleAll);
    checkbox.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        toggleAll();
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

    // The bar slides out but stays rendered: out of the tab order while
    // closed. Focus on one of its buttons (Deselect, a finished bulk action)
    // would drop to the page — hand it to the select-all checkbox instead.
    if (!visible && hasFocusWithin(this.barElement)) this.selectAllCheckbox?.focus();
    setInert(this.barElement, !visible);
    this.barElement.classList.toggle("sp-bulk-bar--visible", visible);
    setText(this.countLabel, tWithParams(this.t, "bulk.selected", { count }));
    // Acting on part of a selection would surprise: an action some selected feedback refuses is not offered.
    const ids = [...this.selected];
    setHidden(this.resolveBtn, this.callbacks.permits?.(ids, "canChangeStatus") === false);
    setHidden(this.deleteBtn, this.callbacks.permits?.(ids, "canDelete") === false);
    this.updateButtonLabels();
  }

  private updateButtonLabels(): void {
    const count = this.selected.size;
    const resolve = this.t("bulk.resolve");
    const del = this.t("bulk.delete");

    // The count shows once, in the bar (`.sp-bulk-bar-count`): repeating it
    // on both buttons pushed "Supprimer" and the deselect button off a 320px
    // screen. The accessible names keep it, for a screen reader on a button.
    this.resolveBtn.replaceChildren();
    const resolveLabel = document.createElement("span");
    setText(resolveLabel, resolve);
    this.resolveBtn.appendChild(resolveLabel);
    this.resolveBtn.setAttribute("aria-label", count > 0 ? `${resolve} ${count}` : resolve);

    this.deleteBtn.replaceChildren();
    const deleteLabel = document.createElement("span");
    setText(deleteLabel, del);
    this.deleteBtn.appendChild(deleteLabel);
    this.deleteBtn.setAttribute("aria-label", count > 0 ? `${del} ${count}` : del);
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

  private updateSelectAllCheckbox(
    allSelected = this.selected.size > 0 && this.selected.size === this.checkboxMap.size,
  ): void {
    if (!this.selectAllCheckbox) return;

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
    setButtonLoading(this.resolveBtn);
    this.deleteBtn.disabled = true;

    try {
      await this.callbacks.onResolve(ids);
    } catch {
      return; // Keep the selection so the user can retry
    } finally {
      this.endProcessing();
    }
    this.deselectAll();
  }

  private async handleDelete(): Promise<void> {
    if (this.isProcessing || this.selected.size === 0) return;
    this.isProcessing = true;

    const ids = [...this.selected];
    setButtonLoading(this.deleteBtn);
    this.resolveBtn.disabled = true;

    try {
      await this.callbacks.onDelete(ids);
    } catch {
      return; // Keep the selection so the user can retry
    } finally {
      this.endProcessing();
    }
    this.deselectAll();
  }

  /**
   * Leave the loading state after success and failure alike: re-enable both
   * buttons (reset() never does) and relabel them from the current selection,
   * which the panel narrows to the failed items after a partial failure.
   */
  private endProcessing(): void {
    this.isProcessing = false;
    this.resolveBtn.disabled = false;
    this.deleteBtn.disabled = false;
    this.updateButtonLabels();
  }
}
