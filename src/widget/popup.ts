import { getTypeColor, getTypeBgColor, type ThemeColors } from "../styles/theme.js";
import type { FeedbackType } from "../types.js";
import { el, parseSvg, setText } from "./dom-utils.js";
import { ICON_BUG, ICON_CHANGE, ICON_OTHER, ICON_QUESTION } from "./icons.js";

interface PopupResult {
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
 * Glassmorphism design: frosted glass background, soft shadows,
 * pill-shaped type buttons, gradient submit button.
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
        width:300px;
        padding:16px;
        border-radius:16px;
        background:rgba(255, 255, 255, 0.82);
        backdrop-filter:blur(24px);
        -webkit-backdrop-filter:blur(24px);
        border:1px solid rgba(255, 255, 255, 0.35);
        box-shadow:0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.04);
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        opacity:0;
        transform:translateY(8px) scale(0.98);
        transition:opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display:none;
        -webkit-font-smoothing:antialiased;
      `,
    });

    // Type selector row
    const typeRow = el("div", { style: "display:flex;gap:6px;margin-bottom:12px;" });
    for (const option of TYPE_OPTIONS) {
      const btn = document.createElement("button");
      btn.style.cssText = `
        flex:1;height:34px;
        border-radius:9999px;border:1px solid #e2e8f0;
        background:rgba(255,255,255,0.8);cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:4px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:11px;font-weight:500;color:#64748b;
        transition:all 0.2s ease;
        padding:0 6px;
      `;
      const icon = parseSvg(option.icon);
      icon.setAttribute("style", "width:13px;height:13px;flex-shrink:0;");
      btn.appendChild(icon);
      const labelSpan = document.createElement("span");
      setText(labelSpan, option.label);
      btn.appendChild(labelSpan);
      btn.dataset.type = option.type;

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
          btn.style.background = "rgba(255,255,255,0.8)";
          btn.style.borderColor = "#e2e8f0";
        }
      });

      typeRow.appendChild(btn);
    }

    // Textarea
    this.textarea = document.createElement("textarea");
    this.textarea.style.cssText = `
      width:100%;min-height:72px;max-height:152px;
      padding:10px 12px;border-radius:12px;
      border:1px solid #e2e8f0;
      background:rgba(255,255,255,0.85);
      color:#0f172a;font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;line-height:1.5;resize:vertical;
      outline:none;transition:all 0.2s ease;
      box-sizing:border-box;
    `;
    this.textarea.placeholder = "Décrivez votre retour...";
    this.textarea.setAttribute("aria-label", "Message de feedback");

    // Keyboard shortcut hint
    const hint = el("div", {
      style: `
        font-size:11px;color:#94a3b8;
        text-align:right;margin-top:4px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        letter-spacing:0.01em;
      `,
    });
    const isMac = navigator.platform.includes("Mac");
    setText(hint, isMac ? "\u2318+Entr\u00e9e pour envoyer" : "Ctrl+Entr\u00e9e pour envoyer");

    this.textarea.addEventListener("focus", () => {
      this.textarea.style.borderColor = this.colors.accent;
      this.textarea.style.boxShadow = `0 0 0 3px ${this.colors.accent}14`;
      this.textarea.style.background = "#fff";
    });
    this.textarea.addEventListener("blur", () => {
      this.textarea.style.borderColor = "#e2e8f0";
      this.textarea.style.boxShadow = "none";
      this.textarea.style.background = "rgba(255,255,255,0.85)";
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

    const cancelBtn = document.createElement("button");
    cancelBtn.style.cssText = `
      height:34px;padding:0 16px;border-radius:9999px;
      border:1px solid #e2e8f0;
      background:rgba(255,255,255,0.8);
      color:#64748b;font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
      transition:all 0.2s ease;
    `;
    setText(cancelBtn, "Annuler");
    cancelBtn.addEventListener("click", () => this.cancel());
    cancelBtn.addEventListener("mouseenter", () => {
      cancelBtn.style.borderColor = this.colors.accent;
      cancelBtn.style.color = this.colors.accent;
    });
    cancelBtn.addEventListener("mouseleave", () => {
      cancelBtn.style.borderColor = "#e2e8f0";
      cancelBtn.style.color = "#64748b";
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
    setText(this.submitBtn, "Envoyer");
    this.submitBtn.addEventListener("click", () => this.submit());

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(this.submitBtn);

    this.root.appendChild(typeRow);
    this.root.appendChild(this.textarea);
    this.root.appendChild(hint);
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
      if (top + 220 > window.innerHeight) {
        top = rectBounds.top - 220 - 8;
      }
      // Collision: flip right if not enough space on left
      if (left + 300 > window.innerWidth) {
        left = rectBounds.right - 300;
      }
      left = Math.max(8, left);
      top = Math.max(8, top);

      this.root.style.top = `${top}px`;
      this.root.style.left = `${left}px`;
      this.root.style.display = "block";

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
      btn.style.background = isActive ? bgColor : "rgba(255,255,255,0.8)";
      btn.style.borderColor = isActive ? color + "60" : "#e2e8f0";
      btn.style.color = isActive ? color : "#64748b";
      btn.style.fontWeight = isActive ? "600" : "500";
    }
    this.updateSubmitState();
  }

  private resetTypeButtons(): void {
    const buttons = this.root.querySelectorAll<HTMLButtonElement>("button[data-type]");
    for (const btn of buttons) {
      btn.style.background = "rgba(255,255,255,0.8)";
      btn.style.borderColor = "#e2e8f0";
      btn.style.color = "#64748b";
      btn.style.fontWeight = "500";
    }
  }

  private updateSubmitState(): void {
    const enabled = this.selectedType !== null && this.textarea.value.trim().length > 0;
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
    this.root.style.opacity = "0";
    this.root.style.transform = "translateY(8px) scale(0.98)";
    setTimeout(() => {
      this.root.style.display = "none";
    }, 250);
  }

  destroy(): void {
    this.root.remove();
  }
}
