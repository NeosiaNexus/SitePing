import type { FeedbackType } from "../types.js";
import { type ThemeColors, getTypeColor } from "../styles/theme.js";
import { el, setText, parseSvg } from "./dom-utils.js";
import { ICON_BUG, ICON_CHANGE, ICON_OTHER, ICON_QUESTION } from "./icons.js";

export interface PopupResult {
  type: FeedbackType;
  message: string;
}

interface TypeOption {
  type: FeedbackType;
  label: string;
  icon: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  { type: "question", label: "Question", icon: ICON_QUESTION },
  { type: "changement", label: "Changement", icon: ICON_CHANGE },
  { type: "bug", label: "Bug", icon: ICON_BUG },
  { type: "autre", label: "Autre", icon: ICON_OTHER },
];

/**
 * Popup form shown after drawing an annotation rectangle.
 *
 * Positioned at the bottom-left corner of the rect with viewport collision detection.
 * Layout: segmented type selector + textarea + submit/cancel buttons.
 * Lives outside Shadow DOM.
 */
export class Popup {
  private root: HTMLElement;
  private selectedType: FeedbackType | null = null;
  private textarea: HTMLTextAreaElement;
  private submitBtn: HTMLButtonElement;
  private resolve: ((result: PopupResult | null) => void) | null = null;

  constructor(private readonly colors: ThemeColors) {
    this.root = el("div", {
      style: `
        position:fixed;
        z-index:2147483647;
        width:280px;
        padding:14px;
        border-radius:12px;
        background:#fff;
        border:1px solid #e5e7eb;
        box-shadow:0 8px 24px rgba(0,0,0,0.12);
        font-family:system-ui,-apple-system,sans-serif;
        opacity:0;
        transform:translateY(6px);
        transition:opacity 0.2s ease-out,transform 0.2s ease-out;
        display:none;
      `,
    });

    // Type selector row
    const typeRow = el("div", { style: "display:flex;gap:4px;margin-bottom:10px;" });
    for (const option of TYPE_OPTIONS) {
      const btn = document.createElement("button");
      btn.style.cssText = `
        flex:1;height:32px;
        border-radius:6px;border:1px solid #e5e7eb;
        background:#fff;cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:4px;
        font-family:system-ui,-apple-system,sans-serif;
        font-size:11px;font-weight:500;color:#6b7280;
        transition:all 0.15s ease;
        padding:0 4px;
      `;
      const icon = parseSvg(option.icon);
      icon.setAttribute("style", "width:14px;height:14px;flex-shrink:0;");
      btn.appendChild(icon);
      const labelSpan = document.createElement("span");
      setText(labelSpan, option.label);
      btn.appendChild(labelSpan);
      btn.dataset.type = option.type;

      btn.addEventListener("click", () => {
        this.selectType(option.type, typeRow);
      });

      typeRow.appendChild(btn);
    }

    // Textarea
    this.textarea = document.createElement("textarea");
    this.textarea.style.cssText = `
      width:100%;min-height:64px;max-height:144px;
      padding:8px 10px;border-radius:8px;
      border:1px solid #e5e7eb;background:#fff;
      color:#1a1a1a;font-family:system-ui,-apple-system,sans-serif;
      font-size:13px;line-height:1.4;resize:vertical;
      outline:none;transition:border-color 0.15s ease;
      box-sizing:border-box;
    `;
    this.textarea.placeholder = "Décrivez votre retour...";
    this.textarea.addEventListener("focus", () => {
      this.textarea.style.borderColor = this.colors.accent;
    });
    this.textarea.addEventListener("blur", () => {
      this.textarea.style.borderColor = "#e5e7eb";
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
    const btnRow = el("div", { style: "display:flex;justify-content:flex-end;gap:8px;margin-top:10px;" });

    const cancelBtn = document.createElement("button");
    cancelBtn.style.cssText = `
      height:32px;padding:0 14px;border-radius:6px;
      border:1px solid #e5e7eb;background:transparent;
      color:#6b7280;font-family:system-ui,-apple-system,sans-serif;
      font-size:13px;cursor:pointer;transition:all 0.15s ease;
    `;
    setText(cancelBtn, "Annuler");
    cancelBtn.addEventListener("click", () => this.cancel());

    this.submitBtn = document.createElement("button");
    this.submitBtn.style.cssText = `
      height:32px;padding:0 14px;border-radius:6px;
      border:none;background:${this.colors.accent};
      color:#fff;font-family:system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
      opacity:0.5;pointer-events:none;
      transition:all 0.15s ease;
    `;
    setText(this.submitBtn, "Envoyer");
    this.submitBtn.addEventListener("click", () => this.submit());

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(this.submitBtn);

    this.root.appendChild(typeRow);
    this.root.appendChild(this.textarea);
    this.root.appendChild(btnRow);
    document.body.appendChild(this.root);
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

      // Position: bottom-left of rect, 8px below
      let top = rectBounds.bottom + 8;
      let left = rectBounds.left;

      // Collision: flip up if not enough space below
      if (top + 200 > window.innerHeight) {
        top = rectBounds.top - 200 - 8;
      }
      // Collision: flip right if not enough space on left
      if (left + 280 > window.innerWidth) {
        left = rectBounds.right - 280;
      }
      left = Math.max(8, left);
      top = Math.max(8, top);

      this.root.style.top = `${top}px`;
      this.root.style.left = `${left}px`;
      this.root.style.display = "block";

      // Trigger animation
      requestAnimationFrame(() => {
        this.root.style.opacity = "1";
        this.root.style.transform = "translateY(0)";
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
      btn.style.background = isActive ? color : "#fff";
      btn.style.borderColor = isActive ? color : "#e5e7eb";
      btn.style.color = isActive ? "#fff" : "#6b7280";
    }
    this.updateSubmitState();
  }

  private resetTypeButtons(): void {
    const buttons = this.root.querySelectorAll<HTMLButtonElement>("button[data-type]");
    for (const btn of buttons) {
      btn.style.background = "#fff";
      btn.style.borderColor = "#e5e7eb";
      btn.style.color = "#6b7280";
    }
  }

  private updateSubmitState(): void {
    const enabled = this.selectedType !== null && this.textarea.value.trim().length > 0;
    this.submitBtn.style.opacity = enabled ? "1" : "0.5";
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
    this.root.style.opacity = "0";
    this.root.style.transform = "translateY(6px)";
    setTimeout(() => { this.root.style.display = "none"; }, 200);
  }

  destroy(): void {
    this.root.remove();
  }
}
