import type { FeedbackType } from "@siteping/core";
import { Z_INDEX_MAX } from "./constants.js";
import { el, parseSvg, setText } from "./dom-utils.js";
import type { TFunction, Translations } from "./i18n/index.js";
import { ICON_BUG, ICON_CHANGE, ICON_OTHER, ICON_QUESTION } from "./icons.js";
import { getTypeBgColor, getTypeColor, type ThemeColors } from "./styles/theme.js";

// Map each feedback type to its translation key, so `refreshLabels()` can
// re-localize the existing type buttons without re-rendering the popup.
const TYPE_LABEL_KEYS: Record<FeedbackType, keyof Translations> = {
  question: "type.question",
  change: "type.change",
  bug: "type.bug",
  other: "type.other",
};

/**
 * Detect whether the host platform uses ⌘+Enter (macOS) vs Ctrl+Enter.
 * Resolved at call time so we can recompute the popup hint when the locale
 * dictionary lands.
 */
function isMacPlatform(): boolean {
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  return uaData
    ? uaData.platform === "macOS"
    : (navigator.platform?.includes("Mac") ?? /Macintosh|Mac OS X/i.test(navigator.userAgent));
}

interface PopupResult {
  type: FeedbackType;
  message: string;
}

interface TypeOption {
  type: FeedbackType;
  icon: string;
}

/**
 * Popup form shown after drawing an annotation rectangle.
 *
 * Glassmorphism design: frosted glass background, soft shadows,
 * pill-shaped type buttons, gradient submit button.
 * Lives outside Shadow DOM.
 */
export class Popup {
  private root: HTMLElement;
  private selectedType: FeedbackType | null = null;
  private textarea: HTMLTextAreaElement;
  private submitBtn: HTMLButtonElement;
  private cancelBtn: HTMLButtonElement;
  private hint: HTMLElement;
  private resolve: ((result: PopupResult | null) => void) | null = null;
  private previouslyFocused: HTMLElement | null = null;
  private onKeydownTrap: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    private readonly colors: ThemeColors,
    private readonly t: TFunction,
  ) {
    this.root = el("div", {
      style: `
        position:fixed;
        z-index:${Z_INDEX_MAX};
        width:300px;
        padding:16px;
        border-radius:16px;
        background:${this.colors.glassBg};
        backdrop-filter:blur(24px);
        -webkit-backdrop-filter:blur(24px);
        border:1px solid ${this.colors.glassBorder};
        box-shadow:0 8px 32px ${this.colors.shadow}, 0 2px 8px ${this.colors.shadow};
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        opacity:0;
        transform:translateY(8px) scale(0.98);
        transition:opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display:none;
        -webkit-font-smoothing:antialiased;
      `,
    });

    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");

    // Type selector grid (2x2). Labels are bound later by `applyLabels()` —
    // the constructor only builds the structure (icon + empty label span).
    const typeOptions: TypeOption[] = [
      { type: "question", icon: ICON_QUESTION },
      { type: "change", icon: ICON_CHANGE },
      { type: "bug", icon: ICON_BUG },
      { type: "other", icon: ICON_OTHER },
    ];
    const typeRow = el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;" });
    for (const option of typeOptions) {
      const btn = document.createElement("button");
      btn.style.cssText = `
        height:44px;
        border-radius:9999px;border:1px solid ${this.colors.border};
        background:${this.colors.glassBg};cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:5px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:13px;font-weight:500;color:${this.colors.textTertiary};
        transition:all 0.2s ease;
        padding:0 12px;
      `;
      const icon = parseSvg(option.icon);
      icon.setAttribute("style", "width:13px;height:13px;flex-shrink:0;");
      btn.appendChild(icon);
      btn.appendChild(document.createElement("span"));
      btn.dataset.type = option.type;
      btn.setAttribute("aria-pressed", "false");

      btn.addEventListener("click", () => {
        this.selectType(option.type, typeRow);
      });

      btn.addEventListener("mouseenter", () => {
        if (btn.dataset.type !== this.selectedType) {
          const bgColor = getTypeBgColor(btn.dataset.type ?? "", this.colors);
          btn.style.background = bgColor;
          btn.style.borderColor = getTypeColor(btn.dataset.type ?? "", this.colors) + "40";
        }
      });

      btn.addEventListener("mouseleave", () => {
        if (btn.dataset.type !== this.selectedType) {
          btn.style.background = this.colors.glassBg;
          btn.style.borderColor = this.colors.border;
        }
      });

      typeRow.appendChild(btn);
    }

    // Textarea
    this.textarea = document.createElement("textarea");
    this.textarea.style.cssText = `
      width:100%;min-height:72px;max-height:152px;
      padding:10px 12px;border-radius:12px;
      border:1px solid ${this.colors.border};
      background:${this.colors.glassBgHeavy};
      color:${this.colors.text};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;line-height:1.5;resize:vertical;
      outline:none;transition:all 0.2s ease;
      box-sizing:border-box;
    `;
    this.textarea.maxLength = 5000;

    // Keyboard shortcut hint
    this.hint = el("div", {
      style: `
        font-size:11px;color:${this.colors.textTertiary};
        text-align:right;margin-top:4px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        letter-spacing:0.01em;
      `,
    });

    this.textarea.addEventListener("focus", () => {
      this.textarea.style.borderColor = this.colors.accent;
      this.textarea.style.boxShadow = `0 0 0 3px ${this.colors.accent}14`;
      this.textarea.style.background = this.colors.bg;
    });
    this.textarea.addEventListener("blur", () => {
      this.textarea.style.borderColor = this.colors.border;
      this.textarea.style.boxShadow = "none";
      this.textarea.style.background = this.colors.glassBgHeavy;
    });
    this.textarea.addEventListener("input", () => {
      this.updateSubmitState();
    });
    this.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.submit();
      }
      if (e.key === "Escape") {
        this.cancel();
      }
    });

    // Button row
    const btnRow = el("div", { style: "display:flex;justify-content:flex-end;gap:8px;margin-top:12px;" });

    this.cancelBtn = document.createElement("button");
    this.cancelBtn.style.cssText = `
      height:34px;padding:0 16px;border-radius:9999px;
      border:1px solid ${this.colors.border};
      background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
      transition:all 0.2s ease;
    `;
    this.cancelBtn.addEventListener("click", () => this.cancel());
    this.cancelBtn.addEventListener("mouseenter", () => {
      this.cancelBtn.style.borderColor = this.colors.accent;
      this.cancelBtn.style.color = this.colors.accent;
    });
    this.cancelBtn.addEventListener("mouseleave", () => {
      this.cancelBtn.style.borderColor = this.colors.border;
      this.cancelBtn.style.color = this.colors.textTertiary;
    });

    this.submitBtn = document.createElement("button");
    this.submitBtn.style.cssText = `
      height:34px;padding:0 18px;border-radius:9999px;
      border:none;background:${this.colors.accentGradient};
      color:#fff;font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:600;cursor:pointer;
      opacity:0.35;pointer-events:none;
      transition:all 0.2s ease;
      box-shadow:0 2px 8px ${this.colors.accentGlow};
    `;
    this.submitBtn.addEventListener("click", () => this.submit());

    btnRow.appendChild(this.cancelBtn);
    btnRow.appendChild(this.submitBtn);

    this.root.appendChild(typeRow);
    this.root.appendChild(this.textarea);
    this.root.appendChild(this.hint);
    this.root.appendChild(btnRow);
    document.body.appendChild(this.root);

    // Bind every `t()`-derived string into the freshly-built DOM. Kept as a
    // single pass so the constructor and `refreshLabels()` never drift.
    this.applyLabels();
  }

  /**
   * Re-read every `t(...)`-derived label, placeholder, and aria-label from
   * the active translation function. Idempotent — call after the locale
   * dictionary has finished loading so the popup swaps from the English
   * fallback to the configured language.
   */
  refreshLabels(): void {
    this.applyLabels();
  }

  /**
   * Walk the already-built DOM and bind every translation-derived string —
   * the dialog `aria-label`, the four type-button labels, the textarea
   * `placeholder` + `aria-label`, the `⌘+Enter` / `Ctrl+Enter` hint, and the
   * cancel/submit `textContent`. The single source of truth for which node
   * gets which `t()` string, shared by the constructor and `refreshLabels()`
   * so the two can never drift.
   */
  private applyLabels(): void {
    this.root.setAttribute("aria-label", this.t("popup.ariaLabel"));

    const typeButtons = this.root.querySelectorAll<HTMLButtonElement>("button[data-type]");
    for (const btn of typeButtons) {
      const type = btn.dataset.type as FeedbackType | undefined;
      if (!type) continue;
      const key = TYPE_LABEL_KEYS[type];
      if (!key) continue;
      const labelSpan = btn.querySelector<HTMLSpanElement>("span");
      if (labelSpan) setText(labelSpan, this.t(key));
    }

    this.textarea.placeholder = this.t("popup.placeholder");
    this.textarea.setAttribute("aria-label", this.t("popup.textareaAria"));

    setText(this.hint, isMacPlatform() ? this.t("popup.submitHintMac") : this.t("popup.submitHintOther"));
    setText(this.cancelBtn, this.t("popup.cancel"));
    setText(this.submitBtn, this.t("popup.submit"));
  }

  /**
   * Show the popup near a drawn rectangle and return the user's input.
   * Returns null if cancelled.
   */
  show(rectBounds: DOMRect): Promise<PopupResult | null> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.selectedType = null;
      this.textarea.value = "";
      this.updateSubmitState();
      this.resetTypeButtons();

      // Save focus to restore on close
      this.previouslyFocused = document.activeElement as HTMLElement | null;

      // Position: bottom-left of rect, 8px below
      const popupH = 220;
      const popupW = 300;
      let top = rectBounds.bottom + 8;
      let left = rectBounds.left;

      // Vertical: prefer below; fall back to above; otherwise clamp inside viewport
      if (top + popupH > window.innerHeight) {
        const aboveTop = rectBounds.top - popupH - 8;
        if (aboveTop >= 8) {
          top = aboveTop;
        } else {
          // Rect is taller than the viewport allows on either side —
          // clamp to keep the popup fully visible.
          top = window.innerHeight - popupH - 8;
        }
      }
      // Collision: flip right if not enough space on left
      if (left + popupW > window.innerWidth) {
        left = rectBounds.right - popupW;
      }
      left = Math.max(8, left);
      top = Math.max(8, top);

      this.root.style.top = `${top}px`;
      this.root.style.left = `${left}px`;
      this.root.style.display = "block";

      // Install focus trap
      this.onKeydownTrap = (e: KeyboardEvent) => {
        if (e.key === "Tab") {
          const focusableEls = Array.from(
            this.root.querySelectorAll<HTMLElement>(
              'button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])',
            ),
          );
          if (focusableEls.length === 0) return;
          const first = focusableEls[0];
          const last = focusableEls[focusableEls.length - 1];
          if (!first || !last) return;
          if (e.shiftKey) {
            if (document.activeElement === first || !this.root.contains(document.activeElement)) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last || !this.root.contains(document.activeElement)) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };
      this.root.addEventListener("keydown", this.onKeydownTrap);

      // Check prefers-reduced-motion live (not cached at construction time)
      const reduceMotion =
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.root.style.transition = reduceMotion ? "none" : "";

      // Trigger animation
      requestAnimationFrame(() => {
        this.root.style.opacity = "1";
        this.root.style.transform = "translateY(0) scale(1)";
        this.textarea.focus();
      });
    });
  }

  private selectType(type: FeedbackType, container: HTMLElement): void {
    this.selectedType = type;
    const buttons = container.querySelectorAll<HTMLButtonElement>("button");
    for (const btn of buttons) {
      const isActive = btn.dataset.type === type;
      const color = getTypeColor(btn.dataset.type ?? "", this.colors);
      const bgColor = getTypeBgColor(btn.dataset.type ?? "", this.colors);
      btn.style.background = isActive ? bgColor : this.colors.glassBg;
      btn.style.borderColor = isActive ? color + "60" : this.colors.border;
      btn.style.color = isActive ? color : this.colors.textTertiary;
      btn.style.fontWeight = isActive ? "600" : "500";
      btn.setAttribute("aria-pressed", String(isActive));
    }
    this.updateSubmitState();
  }

  private resetTypeButtons(): void {
    const buttons = this.root.querySelectorAll<HTMLButtonElement>("button[data-type]");
    for (const btn of buttons) {
      btn.setAttribute("aria-pressed", "false");
      btn.style.background = this.colors.glassBg;
      btn.style.borderColor = this.colors.border;
      btn.style.color = this.colors.textTertiary;
      btn.style.fontWeight = "500";
    }
  }

  private updateSubmitState(): void {
    const enabled = this.selectedType !== null && this.textarea.value.trim().length > 0;
    this.submitBtn.disabled = !enabled;
    this.submitBtn.style.opacity = enabled ? "1" : "0.35";
    this.submitBtn.style.pointerEvents = enabled ? "auto" : "none";
  }

  private submit(): void {
    if (!this.selectedType || !this.textarea.value.trim()) return;
    this.resolve?.({ type: this.selectedType, message: this.textarea.value.trim() });
    this.resolve = null;
    this.hideElement();
  }

  private cancel(): void {
    this.resolve?.(null);
    this.resolve = null;
    this.hideElement();
  }

  private hideElement(): void {
    // Remove focus trap
    if (this.onKeydownTrap) {
      this.root.removeEventListener("keydown", this.onKeydownTrap);
      this.onKeydownTrap = null;
    }
    this.root.style.opacity = "0";
    this.root.style.transform = "translateY(8px) scale(0.98)";
    // Restore focus to the previously focused element
    this.previouslyFocused?.focus();
    this.previouslyFocused = null;
    setTimeout(() => {
      this.root.style.display = "none";
    }, 250);
  }

  destroy(): void {
    this.root.remove();
  }
}
