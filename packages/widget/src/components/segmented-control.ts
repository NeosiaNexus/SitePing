/**
 * Accessible segmented (radiogroup) control.
 *
 * Replaces the near-identical `buildStatusSegmented` / `buildScopeSegmented`
 * pairs that previously lived inline in `panel.ts`: keyboard navigation
 * (ArrowLeft/Right, Home/End), aria-checked toggling, `tabIndex` roving,
 * and optional icon+colour decoration.
 *
 * Visibility filtering — needed by the scope control which hides the
 * "this type" option when there is no urlPattern — is handled by
 * `setOptionVisible(value, visible)` and is respected by keyboard
 * navigation so users can't focus a hidden option via arrow keys.
 */

import { el, parseSvg, setText } from "../dom-utils.js";

/**
 * Visual decoration for a segmented option.
 * Both fields are optional: scope options omit them entirely.
 */
export interface SegmentedDecoration {
  icon?: string;
  color?: string;
  bg?: string;
}

export interface SegmentedOption<T extends string> extends SegmentedDecoration {
  value: T;
  label: string;
}

export interface SegmentedControlConfig<T extends string> {
  /** Options to render — order is preserved. */
  options: ReadonlyArray<SegmentedOption<T>>;
  /** Initial selected value — must appear in `options`. */
  value: T;
  /** Called whenever selection changes (click or keyboard). */
  onChange: (value: T) => void;
  /** Accessible label exposed via `aria-label` on the radiogroup. */
  ariaLabel: string;
  /** Extra CSS class appended to the wrapper (e.g. `sp-segmented--scope`). */
  extraClass?: string;
  /** dataset attribute name used per-button, e.g. `statusFilter` → `data-status-filter`. */
  datasetKey: string;
  /** Class prefix used for per-option modifier, e.g. `sp-segmented__btn--` + option.value. */
  modifierPrefix?: string;
}

/**
 * Build a segmented (radiogroup) control. Returns both the root element and
 * the imperative API for updating selection / visibility from outside —
 * Panel needs the latter when scope availability changes between SPA
 * navigations.
 */
export class SegmentedControl<T extends string> {
  readonly element: HTMLElement;
  private current: T;
  private readonly opts: ReadonlyArray<SegmentedOption<T>>;
  private readonly onChange: (value: T) => void;
  private readonly datasetKey: string;

  constructor(config: SegmentedControlConfig<T>) {
    this.opts = config.options;
    this.current = config.value;
    this.onChange = config.onChange;
    this.datasetKey = config.datasetKey;

    this.element = el("div", {
      class: `sp-segmented${config.extraClass ? ` ${config.extraClass}` : ""}`,
      role: "radiogroup",
    });
    this.element.setAttribute("aria-label", config.ariaLabel);

    for (const option of this.opts) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        config.modifierPrefix !== undefined
          ? `sp-segmented__btn ${config.modifierPrefix}${option.value}`
          : "sp-segmented__btn";
      btn.dataset[this.datasetKey] = option.value;
      btn.setAttribute("role", "radio");
      const isActive = this.current === option.value;
      btn.setAttribute("aria-checked", String(isActive));
      btn.tabIndex = isActive ? 0 : -1;
      if (isActive) btn.classList.add("sp-segmented__btn--active");
      if (option.color) btn.style.setProperty("--sp-chip-color", option.color);
      if (option.bg) btn.style.setProperty("--sp-chip-bg", option.bg);

      if (option.icon) {
        const iconWrap = el("span", { class: "sp-segmented__icon" });
        iconWrap.appendChild(parseSvg(option.icon));
        btn.appendChild(iconWrap);
      }

      const labelEl = el("span", { class: "sp-segmented__label" });
      setText(labelEl, option.label);
      btn.appendChild(labelEl);

      btn.addEventListener("click", () => this.select(option.value));
      btn.addEventListener("keydown", (e) => this.handleKey(e, option.value));

      this.element.appendChild(btn);
    }
  }

  /** Imperatively change the selected option (also fires `onChange`). */
  select(value: T): void {
    this.current = value;
    this.syncSelection();
    this.onChange(value);
  }

  /** Apply selection-only DOM updates without firing `onChange`. Useful on init refresh. */
  private syncSelection(): void {
    const buttons = this.element.querySelectorAll<HTMLButtonElement>(".sp-segmented__btn");
    for (const btn of buttons) {
      const isActive = btn.dataset[this.datasetKey] === this.current;
      btn.classList.toggle("sp-segmented__btn--active", isActive);
      btn.setAttribute("aria-checked", String(isActive));
      btn.tabIndex = isActive ? 0 : -1;
    }
  }

  /**
   * Show / hide a specific option. Hidden options are skipped during keyboard
   * navigation. Returns true when an option was actually toggled.
   */
  setOptionVisible(value: T, visible: boolean): boolean {
    const btn = this.element.querySelector<HTMLButtonElement>(`[data-${this.kebabKey()}="${value}"]`);
    if (!btn) return false;
    btn.style.display = visible ? "" : "none";
    return true;
  }

  /** Current selection. */
  get value(): T {
    return this.current;
  }

  /** Focus the button matching `value`, if it exists. */
  focusOption(value: T): void {
    const btn = this.element.querySelector<HTMLButtonElement>(`[data-${this.kebabKey()}="${value}"]`);
    btn?.focus();
  }

  private handleKey(e: KeyboardEvent, current: T): void {
    const visibleValues = this.opts
      .map((o) => o.value)
      .filter((v) => {
        const btn = this.element.querySelector<HTMLButtonElement>(`[data-${this.kebabKey()}="${v}"]`);
        return btn !== null && btn.style.display !== "none";
      });
    const idx = visibleValues.indexOf(current);
    if (idx < 0) return;

    let nextIdx: number;
    switch (e.key) {
      case "ArrowLeft":
        nextIdx = (idx - 1 + visibleValues.length) % visibleValues.length;
        break;
      case "ArrowRight":
        nextIdx = (idx + 1) % visibleValues.length;
        break;
      case "Home":
        nextIdx = 0;
        break;
      case "End":
        nextIdx = visibleValues.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const next = visibleValues[nextIdx];
    if (next === undefined) return;
    this.select(next);
    this.focusOption(next);
  }

  /** Convert datasetKey ("statusFilter") to its DOM attribute form ("status-filter"). */
  private kebabKey(): string {
    return this.datasetKey.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
  }
}
