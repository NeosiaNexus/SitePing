import type { FeedbackType } from "@siteping/core";
import { POPUP_HIDE_TRANSITION_MS, Z_INDEX_MAX } from "./constants.js";
import { el, parseSvg, setText } from "./dom-utils.js";
import { isolateFromHost, setSurfaceInert } from "./host-isolation.js";
import type { TFunction, Translations } from "./i18n/index.js";
import { ICON_BUG, ICON_CHANGE, ICON_OTHER, ICON_QUESTION } from "./icons.js";
import {
  computePopupPosition,
  NO_VIEWPORT_INSETS,
  POPUP_FALLBACK_SIZE,
  type ViewportInsets,
} from "./popup-placement.js";
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

/**
 * The popup's open/close animation. Declared once: `show()` swaps it for
 * `none` under reduced motion and must restore this exact value, since the
 * root has no other transition (an empty inline value removes it).
 */
const POPUP_TRANSITION = `opacity ${POPUP_HIDE_TRANSITION_MS}ms cubic-bezier(0.16, 1, 0.3, 1),transform ${POPUP_HIDE_TRANSITION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;

/** Read live, not cached at construction, so an OS setting change applies to the next open or close. */
function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
 * Optional async hook called when the user clicks "Send". While the returned
 * promise is pending the popup stays visible in a submitting state (spinner
 * on the submit button, every other control disabled). On resolution the
 * popup closes and `show()` resolves with the submitted result; on rejection
 * the popup restores so the user can retry without re-entering the form.
 */
type PopupSubmitHandler = (result: PopupResult) => Promise<void>;

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
  private typeRow: HTMLElement;
  private submitLabel: HTMLSpanElement;
  private hint: HTMLElement;
  private resolve: ((result: PopupResult | null) => void) | null = null;
  private previouslyFocused: HTMLElement | null = null;
  private onKeydownTrap: ((e: KeyboardEvent) => void) | null = null;
  private onSubmit: PopupSubmitHandler | null = null;
  private submittingState = false;
  /**
   * Frame in which `show()` fades the popup in and focuses it. A close that
   * comes first cancels it, or it would bring the closed popup back.
   */
  private showFrame: number | null = null;
  /**
   * Pending `display: none` scheduled by `hideElement()` once the fade-out
   * ends. Cleared by `show()` so a popup reopened inside the transition window
   * is not hidden by the previous session's timer.
   */
  private hideTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** WAAPI handle for the running spinner — cancelled when submitting ends. */
  private spinnerAnimation: Animation | null = null;

  /**
   * True from `show()` until its promise settles — through typing, the
   * in-flight `onSubmit` await, AND the failed-submit retry window. The
   * annotator's drawing guards read this to serialize popup sessions
   * (#114/#196): if a refactor ever nulls `resolve` before `onSubmit`
   * settles, those guards die silently — popup.test.ts pins the lifecycle.
   */
  get isOpen(): boolean {
    return this.resolve !== null;
  }

  constructor(
    private readonly colors: ThemeColors,
    private readonly t: TFunction,
  ) {
    this.root = el("div", {
      style: /* css */ `
        position:fixed;
        z-index:${Z_INDEX_MAX};
        pointer-events:auto;
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
        transition:${POPUP_TRANSITION};
        display:none;
        -webkit-font-smoothing:antialiased;
      `,
    });

    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");
    // Screenshot capture now runs while the popup is still visible (so the
    // spinner can show during the upload). Without this attribute the popup
    // would appear baked into the captured JPEG.
    this.root.setAttribute("data-siteping-ignore", "true");
    // The dialog `aria-label` is bound by `applyLabels()` at the end of the
    // constructor, alongside every other `t()`-derived string.

    // Type selector grid (2x2). Labels are bound later by `applyLabels()` —
    // the constructor only builds the structure (icon + empty label span).
    const typeOptions: TypeOption[] = [
      { type: "question", icon: ICON_QUESTION },
      { type: "change", icon: ICON_CHANGE },
      { type: "bug", icon: ICON_BUG },
      { type: "other", icon: ICON_OTHER },
    ];
    this.typeRow = el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;" });
    for (const option of typeOptions) {
      const btn = document.createElement("button");
      btn.style.cssText = /* css */ `
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
        if (this.submittingState) return;
        this.selectType(option.type, this.typeRow);
      });

      btn.addEventListener("mouseenter", () => {
        if (this.submittingState) return;
        if (btn.dataset.type !== this.selectedType) {
          const bgColor = getTypeBgColor(btn.dataset.type ?? "", this.colors);
          btn.style.background = bgColor;
          btn.style.borderColor = getTypeColor(btn.dataset.type ?? "", this.colors) + "40";
        }
      });

      btn.addEventListener("mouseleave", () => {
        if (this.submittingState) return;
        if (btn.dataset.type !== this.selectedType) {
          btn.style.background = this.colors.glassBg;
          btn.style.borderColor = this.colors.border;
        }
      });

      this.typeRow.appendChild(btn);
    }

    // Textarea
    this.textarea = document.createElement("textarea");
    this.textarea.style.cssText = /* css */ `
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
      style: /* css */ `
        font-size:11px;color:${this.colors.textTertiary};
        text-align:right;margin-top:4px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        letter-spacing:0.01em;
      `,
    });

    this.textarea.addEventListener("focus", () => {
      if (this.submittingState) return;
      this.textarea.style.borderColor = this.colors.accent;
      this.textarea.style.boxShadow = `0 0 0 3px ${this.colors.accent}14`;
      this.textarea.style.background = this.colors.bg;
    });
    this.textarea.addEventListener("blur", () => {
      if (this.submittingState) return;
      this.textarea.style.borderColor = this.colors.border;
      this.textarea.style.boxShadow = "none";
      this.textarea.style.background = this.colors.glassBgHeavy;
    });
    this.textarea.addEventListener("input", () => {
      this.updateSubmitState();
    });
    this.textarea.addEventListener("keydown", (e) => {
      if (this.submittingState) return;
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.submit();
      }
    });

    // Button row
    const btnRow = el("div", { style: "display:flex;justify-content:flex-end;gap:8px;margin-top:12px;" });

    this.cancelBtn = document.createElement("button");
    this.cancelBtn.style.cssText = /* css */ `
      height:34px;padding:0 16px;border-radius:9999px;
      border:1px solid ${this.colors.border};
      background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
      transition:all 0.2s ease;
    `;
    this.cancelBtn.addEventListener("click", () => this.dismiss());
    this.cancelBtn.addEventListener("mouseenter", () => {
      if (this.submittingState) return;
      this.cancelBtn.style.borderColor = this.colors.accent;
      this.cancelBtn.style.color = this.colors.accent;
    });
    this.cancelBtn.addEventListener("mouseleave", () => {
      if (this.submittingState) return;
      this.cancelBtn.style.borderColor = this.colors.border;
      this.cancelBtn.style.color = this.colors.textTertiary;
    });

    this.submitBtn = document.createElement("button");
    this.submitBtn.style.cssText = /* css */ `
      height:34px;padding:0 18px;border-radius:9999px;
      border:none;background:${this.colors.accentGradient};
      color:#fff;font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:600;cursor:pointer;
      opacity:0.35;pointer-events:none;
      transition:all 0.2s ease;
      box-shadow:0 2px 8px ${this.colors.accentGlow};
      display:inline-flex;align-items:center;justify-content:center;min-width:64px;
    `;
    // The submit label lives in its own <span> so the submitting-state spinner
    // can be appended/removed without disturbing it. `applyLabels()` binds its
    // text — never `setText` the button itself or it would wipe the spinner.
    this.submitLabel = document.createElement("span");
    this.submitBtn.appendChild(this.submitLabel);
    this.submitBtn.addEventListener("click", () => this.submit());

    btnRow.appendChild(this.cancelBtn);
    btnRow.appendChild(this.submitBtn);

    this.root.appendChild(this.typeRow);
    this.root.appendChild(this.textarea);
    this.root.appendChild(this.hint);
    this.root.appendChild(btnRow);
    isolateFromHost(this.root);
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
    // Target the label <span>, not the button — the button also hosts the
    // submitting-state spinner, which `setText` on the button would erase.
    setText(this.submitLabel, this.t("popup.submit"));
  }

  /**
   * Show the popup near a drawn rectangle and return the user's input.
   * Returns null if cancelled.
   *
   * When `onSubmit` is provided the popup stays visible while the handler
   * runs — the submit button shows a spinner, every other control is
   * disabled. On success the popup closes; on rejection it restores so the
   * user can retry without re-entering the form.
   *
   * `insets` reserves viewport bands the popup must not cover (the
   * annotation toolbar), so its actions never land behind them.
   */
  show(
    rectBounds: DOMRect,
    onSubmit?: PopupSubmitHandler,
    insets: ViewportInsets = NO_VIEWPORT_INSETS,
  ): Promise<PopupResult | null> {
    return new Promise((resolve) => {
      this.cancelPendingTransition();
      this.resolve = resolve;
      this.onSubmit = onSubmit ?? null;
      this.selectedType = null;
      this.textarea.value = "";
      this.submittingState = false;
      this.updateSubmitState();
      this.resetTypeButtons();

      // Save focus to restore on close
      this.previouslyFocused = document.activeElement as HTMLElement | null;

      // Lay the popup out (still transparent) so placement uses its real size
      // — it varies with the locale's label lengths, font metrics and the
      // host's box-sizing. Any height cap from a previous show is dropped
      // first so the natural height is what gets measured.
      setSurfaceInert(this.root, false);
      this.root.style.display = "block";
      this.root.style.maxHeight = "";
      this.root.style.overflowY = "";
      const { top, left, maxHeight } = computePopupPosition(
        rectBounds,
        this.measure(),
        { width: window.innerWidth, height: window.innerHeight },
        insets,
      );
      this.root.style.top = `${top}px`;
      this.root.style.left = `${left}px`;
      if (maxHeight !== null) {
        // Taller than the usable band (short viewport, high zoom, long
        // localized labels): cap it and let it scroll, starting from the top
        // so the type buttons that enable Send are in view.
        this.root.style.maxHeight = `${Math.max(0, maxHeight - this.verticalChromeHeight())}px`;
        this.root.style.overflowY = "auto";
        this.root.scrollTop = 0;
      }

      // Install focus trap. Escape cancels from any control, not only the
      // textarea, and bubbles on so the annotator ends the session too.
      this.onKeydownTrap = (e: KeyboardEvent) => {
        if (e.key === "Escape") this.dismiss();
        if (e.key === "Tab") {
          const focusableEls = Array.from(
            this.root.querySelectorAll<HTMLElement>(
              'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

      this.root.style.transition = prefersReducedMotion() ? "none" : POPUP_TRANSITION;

      // Trigger animation
      this.showFrame = requestAnimationFrame(() => {
        this.showFrame = null;
        this.root.style.opacity = "1";
        this.root.style.transform = "translateY(0) scale(1)";
        this.textarea.focus();
      });
    });
  }

  /** Rendered size, ignoring the entry transform; falls back when there is no layout. */
  private measure(): { width: number; height: number } {
    const width = this.root.offsetWidth;
    const height = this.root.offsetHeight;
    return width > 0 && height > 0 ? { width, height } : POPUP_FALLBACK_SIZE;
  }

  /**
   * Vertical padding + border of the popup: with the default `content-box`, a
   * `max-height` covering its whole rendered height must exclude them. A host
   * page that resets `box-sizing` to `border-box` already includes them.
   */
  private verticalChromeHeight(): number {
    const computed = window.getComputedStyle(this.root);
    if (computed.boxSizing === "border-box") return 0;
    return [computed.paddingTop, computed.paddingBottom, computed.borderTopWidth, computed.borderBottomWidth].reduce(
      (total, value) => total + (Number.parseFloat(value) || 0),
      0,
    );
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
      btn.disabled = false;
      btn.style.background = this.colors.glassBg;
      btn.style.borderColor = this.colors.border;
      btn.style.color = this.colors.textTertiary;
      btn.style.fontWeight = "500";
      btn.style.cursor = "pointer";
    }
  }

  private updateSubmitState(): void {
    if (this.submittingState) return;
    const enabled = this.selectedType !== null && this.textarea.value.trim().length > 0;
    this.submitBtn.disabled = !enabled;
    this.submitBtn.style.opacity = enabled ? "1" : "0.35";
    this.submitBtn.style.pointerEvents = enabled ? "auto" : "none";
  }

  private submit(): void {
    if (this.submittingState) return;
    if (!this.selectedType || !this.textarea.value.trim()) return;

    const result: PopupResult = { type: this.selectedType, message: this.textarea.value.trim() };

    if (!this.onSubmit) {
      // Legacy fire-and-forget path: resolve immediately and hide.
      this.resolve?.(result);
      this.resolve = null;
      this.hideElement();
      return;
    }

    this.enterSubmittingState();
    const submitter = this.onSubmit;
    submitter(result)
      .then(() => {
        this.resolve?.(result);
        this.resolve = null;
        this.hideElement();
      })
      .catch(() => {
        // Restore the form so the user can edit and retry. The caller is
        // responsible for surfacing the error (live region / toast) — we
        // intentionally do not show inline error text in the popup.
        this.exitSubmittingState();
      });
  }

  /**
   * Close the popup as cancelled (`show()` resolves null): its Cancel button,
   * Escape, and the annotation session ending from outside the popup (toolbar
   * Cancel, Escape). No-op when the popup is already closed, or while a
   * submission is in flight: abandoning mid-upload would leak a half-sent
   * feedback.
   */
  dismiss(): void {
    if (this.submittingState || !this.isOpen) return;
    this.resolve?.(null);
    this.resolve = null;
    this.hideElement();
  }

  /**
   * Swap the submit button's text for a spinner and freeze every other
   * control. Mirrors the panel's resolve/delete buttons (`sp-spinner--sm`)
   * but renders inline because the popup lives outside the Shadow DOM
   * and therefore can't reach the panel's CSS classes.
   */
  private enterSubmittingState(): void {
    this.submittingState = true;

    // Submit: spinner instead of text, keep button width stable
    this.submitLabel.style.display = "none";
    this.submitBtn.disabled = true;
    this.submitBtn.style.cursor = "wait";
    this.submitBtn.style.opacity = "0.85";
    this.submitBtn.setAttribute("aria-busy", "true");
    this.submitBtn.appendChild(this.buildSpinner());

    // Cancel: dimmed and non-interactive — abandoning mid-upload would leak a
    // half-sent feedback on the server, so we hold the user until we know.
    this.cancelBtn.disabled = true;
    this.cancelBtn.style.opacity = "0.5";
    this.cancelBtn.style.cursor = "not-allowed";
    this.cancelBtn.style.pointerEvents = "none";

    // Textarea + type buttons: read-only
    this.textarea.disabled = true;
    this.textarea.style.opacity = "0.6";
    const typeButtons = this.typeRow.querySelectorAll<HTMLButtonElement>("button");
    for (const btn of typeButtons) {
      btn.disabled = true;
      btn.style.cursor = "not-allowed";
      btn.style.opacity = "0.6";
    }
  }

  private exitSubmittingState(): void {
    this.submittingState = false;

    // Submit — tear down the spinner: cancel the WAAPI animation explicitly
    // (it has `iterations: Infinity`, so it never ends on its own) before
    // removing the element it drives.
    this.spinnerAnimation?.cancel();
    this.spinnerAnimation = null;
    const spinner = this.submitBtn.querySelector<HTMLDivElement>('[data-role="sp-popup-spinner"]');
    spinner?.remove();
    this.submitLabel.style.display = "";
    this.submitBtn.removeAttribute("aria-busy");
    this.submitBtn.style.cursor = "pointer";

    // Cancel
    this.cancelBtn.disabled = false;
    this.cancelBtn.style.opacity = "1";
    this.cancelBtn.style.cursor = "pointer";
    this.cancelBtn.style.pointerEvents = "auto";

    // Textarea + type buttons
    this.textarea.disabled = false;
    this.textarea.style.opacity = "1";
    const typeButtons = this.typeRow.querySelectorAll<HTMLButtonElement>("button");
    for (const btn of typeButtons) {
      btn.disabled = false;
      btn.style.cursor = "pointer";
      btn.style.opacity = "1";
    }

    // Recompute submit enabled state from the (preserved) form fields
    this.updateSubmitState();
  }

  /**
   * Build a spinner element styled inline. Web Animations API drives the
   * rotation so we don't have to inject `@keyframes` into the host document.
   * Respects `prefers-reduced-motion`: omits the animation and falls back to
   * a static ring. The returned `Animation` handle is stored on the instance
   * so `exitSubmittingState()` can explicitly cancel it.
   */
  private buildSpinner(): HTMLDivElement {
    const spinner = document.createElement("div");
    spinner.dataset.role = "sp-popup-spinner";
    spinner.style.cssText = /* css */ `
      width:14px;height:14px;
      border:2px solid rgba(255,255,255,0.35);
      border-top-color:#fff;
      border-radius:50%;
      box-sizing:border-box;
    `;
    // Web Animations API is available in every browser we target; the guard
    // is defensive for jsdom in tests, where `animate` may be undefined.
    if (!prefersReducedMotion() && typeof spinner.animate === "function") {
      this.spinnerAnimation = spinner.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], {
        duration: 600,
        iterations: Infinity,
        easing: "linear",
      });
    }
    return spinner;
  }

  private hideElement(): void {
    this.cancelPendingTransition();
    // Remove focus trap
    if (this.onKeydownTrap) {
      this.root.removeEventListener("keydown", this.onKeydownTrap);
      this.onKeydownTrap = null;
    }
    // Make sure the submitting decoration doesn't leak into the next show()
    if (this.submittingState) this.exitSubmittingState();
    this.onSubmit = null;
    this.root.style.opacity = "0";
    this.root.style.transform = "translateY(8px) scale(0.98)";
    // Restore focus to the previously focused element
    this.previouslyFocused?.focus();
    this.previouslyFocused = null;
    // Out of hit-testing and the Tab order while it fades: the transparent
    // popup sits above the overlay and the page, and would take the next
    // drag, click or Shift+Tab. The attribute, not the property, so jsdom
    // (which does not implement `inert`) can observe it.
    setSurfaceInert(this.root, true);
    if (prefersReducedMotion()) {
      this.root.style.display = "none";
      return;
    }
    this.hideTimeoutId = setTimeout(() => {
      this.hideTimeoutId = null;
      this.root.style.display = "none";
    }, POPUP_HIDE_TRANSITION_MS);
  }

  /** Drop the fade-in frame or the `display: none` still pending from an earlier show or close. */
  private cancelPendingTransition(): void {
    if (this.showFrame !== null) cancelAnimationFrame(this.showFrame);
    if (this.hideTimeoutId !== null) clearTimeout(this.hideTimeoutId);
    this.showFrame = null;
    this.hideTimeoutId = null;
  }

  destroy(): void {
    // Settle a pending `show()` promise so it cannot outlive teardown — a
    // `destroy()` mid-submit would otherwise leak the awaiting closure (and
    // whatever it retains: the annotation, the base64 screenshot). Resolving
    // with `null` reads as "cancelled", matching `dismiss()`.
    if (this.submittingState) this.exitSubmittingState();
    this.cancelPendingTransition();
    this.resolve?.(null);
    this.resolve = null;
    this.onSubmit = null;
    if (this.onKeydownTrap) {
      this.root.removeEventListener("keydown", this.onKeydownTrap);
      this.onKeydownTrap = null;
    }
    this.root.remove();
  }
}
