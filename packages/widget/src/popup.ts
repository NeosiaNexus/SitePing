import type { FeedbackType } from "@siteping/core";
import { EASE_OUT, POPUP_HIDE_TRANSITION_MS, Z_INDEX_MAX } from "./constants.js";
import { el, focusRing, isMacPlatform, parseSvg, pressable, setText } from "./dom-utils.js";
import { addSurfaceKeydownListener, isolateFromHost, setSurfaceInert } from "./host-isolation.js";
import type { TFunction, Translations } from "./i18n/index.js";
import { ICON_BUG, ICON_CHANGE, ICON_OTHER, ICON_QUESTION } from "./icons.js";
import {
  computePopupPosition,
  NO_VIEWPORT_INSETS,
  POPUP_FALLBACK_SIZE,
  type ViewportInsets,
} from "./popup-placement.js";
import { getTypeColor, SYSTEM_FONT, type ThemeColors } from "./styles/theme.js";
import { canHover, isCoarsePointer, isCompactViewport, prefersReducedMotion, trackKeyboardInset } from "./viewport.js";

// Map each feedback type to its translation key, so `refreshLabels()` can
// re-localize the existing type buttons without re-rendering the popup.
const TYPE_LABEL_KEYS: Record<FeedbackType, keyof Translations> = {
  question: "type.question",
  change: "type.change",
  bug: "type.bug",
  other: "type.other",
};

/**
 * The popup's open/close animation. Declared once: `show()` swaps it for
 * `none` under reduced motion and must restore this exact value, since the
 * root has no other transition (an empty inline value removes it).
 */
const POPUP_TRANSITION = `opacity ${POPUP_HIDE_TRANSITION_MS}ms ease,transform ${POPUP_HIDE_TRANSITION_MS}ms ${EASE_OUT}`;
/** The phone sheet rises on the drawer curve, a little longer; it leaves on the faster default. */
const SHEET_IN_TRANSITION = "opacity 300ms ease,transform 300ms cubic-bezier(0.32, 0.72, 0, 1)";
/** The controls' own transition: colours ease, the press answers fast. */
const CONTROL_TRANSITION = `background-color 0.15s ease,border-color 0.15s ease,color 0.15s ease,box-shadow 0.15s ease,opacity 0.15s ease,scale 0.16s ${EASE_OUT}`;
/** The card's material: the page shows through, blurred and saturated, as under an Apple sheet. */
const MATERIAL_BLUR = "blur(30px) saturate(180%)";

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
 * A floating card of translucent material (Apple's native look): grey
 * filled controls, the categories as tiles tinted by their own colour, a
 * filled accent Send. On phones it is a solid bottom sheet of grouped rows
 * that rides above the on-screen keyboard instead of a card floating over
 * the annotated area.
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
  /** Removes the focus trap `show()` installs (see `addSurfaceKeydownListener`). */
  private removeKeydownTrap: (() => void) | null = null;
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
  /** Rendered as a bottom sheet — decided per `show()` from the viewport. */
  private sheet = false;
  private stopKeyboardTracking: (() => void) | null = null;

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

  /** Where the open bottom sheet begins (viewport y), or null when not shown as a sheet. */
  get sheetTop(): number | null {
    return this.sheet && this.isOpen ? window.innerHeight - this.root.offsetHeight : null;
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
        border:none;
        border-radius:18px;
        color:${this.colors.text};
        font-family:${SYSTEM_FONT};
        opacity:0;
        transform:scale(0.96);
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
    this.typeRow = el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;" });
    for (const option of typeOptions) {
      const btn = document.createElement("button");
      // A tile: the icon over its label, 50px tall (a finger target too).
      btn.style.cssText = /* css */ `
        height:50px;padding:0 12px;
        border:none;border-radius:12px;cursor:pointer;
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
        font-family:${SYSTEM_FONT};
        font-size:13px;font-weight:500;letter-spacing:-0.005em;
        transition:${CONTROL_TRANSITION};
      `;
      const icon = parseSvg(option.icon);
      // Through the CSSOM, not a `style` attribute: a strict CSP
      // (`style-src` without 'unsafe-inline') blocks the attribute only.
      // The icon always wears its category's colour, so the four read apart
      // before one is picked.
      icon.style.cssText = `width:17px;height:17px;flex-shrink:0;color:${getTypeColor(option.type, this.colors)};`;
      btn.appendChild(icon);
      btn.appendChild(document.createElement("span"));
      btn.dataset.type = option.type;
      btn.setAttribute("aria-pressed", "false");
      this.paintType(btn);

      btn.addEventListener("click", () => {
        if (this.submittingState) return;
        this.selectType(option.type, this.typeRow);
      });

      btn.addEventListener("mouseenter", () => {
        if (this.submittingState || !canHover()) return;
        this.paintType(btn, true);
      });

      btn.addEventListener("mouseleave", () => {
        if (this.submittingState) return;
        this.paintType(btn);
      });

      pressable(btn);
      focusRing(btn, this.colors.accent);
      this.typeRow.appendChild(btn);
    }

    // Textarea
    this.textarea = document.createElement("textarea");
    // A filled field, no border: focus lifts it to a solid row ringed in the accent.
    this.textarea.style.cssText = /* css */ `
      width:100%;min-height:80px;max-height:152px;
      padding:9px 12px;border:none;border-radius:12px;
      color:${this.colors.text};font-family:${SYSTEM_FONT};
      font-size:15px;line-height:1.35;letter-spacing:-0.01em;resize:vertical;
      outline:none;box-shadow:none;transition:${CONTROL_TRANSITION};
      box-sizing:border-box;
    `;
    this.textarea.maxLength = 5000;
    this.paintField(false);

    // Keyboard shortcut hint
    this.hint = el("div", {
      style: /* css */ `
        font-size:11px;color:${this.colors.textSecondary};
        text-align:right;margin-top:6px;
        font-family:${SYSTEM_FONT};
        letter-spacing:0.01em;
      `,
    });

    this.textarea.addEventListener("focus", () => {
      if (this.submittingState) return;
      this.paintField(true);
    });
    this.textarea.addEventListener("blur", () => {
      if (this.submittingState) return;
      this.paintField(false);
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

    // System buttons: a grey filled Cancel, a filled accent Send, both pills.
    this.cancelBtn = document.createElement("button");
    this.cancelBtn.style.cssText = /* css */ `
      height:34px;padding:0 18px;border:none;border-radius:9999px;
      color:${this.colors.text};font-family:${SYSTEM_FONT};
      font-size:15px;font-weight:500;letter-spacing:-0.01em;cursor:pointer;
      transition:${CONTROL_TRANSITION};
    `;
    this.paintCancel(false);
    this.cancelBtn.addEventListener("click", () => this.dismiss());
    this.cancelBtn.addEventListener("mouseenter", () => {
      if (this.submittingState || !canHover()) return;
      this.paintCancel(true);
    });
    this.cancelBtn.addEventListener("mouseleave", () => {
      if (this.submittingState) return;
      this.paintCancel(false);
    });

    this.submitBtn = document.createElement("button");
    this.submitBtn.style.cssText = /* css */ `
      position:relative;
      height:34px;padding:0 20px;border:none;border-radius:9999px;
      background:${this.colors.accent};
      color:#fff;font-family:${SYSTEM_FONT};
      font-size:15px;font-weight:600;letter-spacing:-0.01em;cursor:pointer;
      opacity:0.35;pointer-events:none;
      transition:${CONTROL_TRANSITION};
      display:inline-flex;align-items:center;justify-content:center;min-width:64px;
    `;
    // The submit label lives in its own <span> so the submitting-state spinner
    // can be appended/removed without disturbing it. `applyLabels()` binds its
    // text — never `setText` the button itself or it would wipe the spinner.
    this.submitLabel = document.createElement("span");
    this.submitBtn.appendChild(this.submitLabel);
    this.submitBtn.addEventListener("click", () => this.submit());
    // Darkens on hover; the pointer-events gate already keeps a disabled Send out of it.
    this.submitBtn.addEventListener("mouseenter", () => {
      if (this.submittingState || !canHover()) return;
      this.submitBtn.style.background = this.colors.accentDark;
    });
    this.submitBtn.addEventListener("mouseleave", () => {
      this.submitBtn.style.background = this.colors.accent;
    });

    pressable(this.cancelBtn);
    pressable(this.submitBtn);
    focusRing(this.cancelBtn, this.colors.accent);
    focusRing(this.submitBtn, this.colors.accent);
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
      // Decided first: the controls' fills differ on the sheet.
      const touch = isCoarsePointer();
      this.sheet = isCompactViewport();
      this.updateSubmitState();
      this.resetTypeButtons();

      // Save focus to restore on close
      this.previouslyFocused = document.activeElement as HTMLElement | null;

      // Finger-sized actions; 16px text so iOS doesn't zoom the page on focus.
      // No ⌘/Ctrl+Enter hint without a hardware keyboard.
      const buttonHeight = this.sheet ? "48px" : touch ? "44px" : "34px";
      this.cancelBtn.style.height = buttonHeight;
      this.submitBtn.style.height = buttonHeight;
      this.cancelBtn.style.flex = this.sheet ? "1" : "";
      this.submitBtn.style.flex = this.sheet ? "2" : "";
      this.textarea.style.fontSize = touch ? "16px" : "15px";
      this.textarea.style.minHeight = this.sheet ? "104px" : "80px";
      this.paintField(false);
      this.paintCancel(false);
      this.submitBtn.style.background = this.colors.accent;
      this.hint.style.display = touch ? "none" : "";
      this.root.style.transform = this.hiddenTransform();
      setSurfaceInert(this.root, false);
      this.root.style.display = "block";
      this.layout(rectBounds, insets);

      // Install focus trap. Escape cancels from any control, not only the
      // textarea, and bubbles on so the annotator ends the session too.
      this.removeKeydownTrap?.();
      this.removeKeydownTrap = addSurfaceKeydownListener(this.root, (e) => {
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
      });

      this.root.style.transition = prefersReducedMotion()
        ? "none"
        : this.sheet
          ? SHEET_IN_TRANSITION
          : POPUP_TRANSITION;

      // Trigger animation. Touch: focus the first type button rather than
      // the textarea, so the keyboard doesn't cover the sheet before the user
      // has even picked a type.
      this.showFrame = requestAnimationFrame(() => {
        this.showFrame = null;
        this.root.style.opacity = "1";
        this.root.style.transform = "none";
        (touch ? this.typeRow.querySelector("button") : this.textarea)?.focus();
      });
    });
  }

  /** Card next to the annotated rect, or — on phones — a bottom sheet above the keyboard. */
  private layout(rectBounds: DOMRect, insets: ViewportInsets): void {
    const style = this.root.style;
    const { surface } = this.colors;
    style.width = this.sheet ? "auto" : "300px";
    style.borderRadius = this.sheet ? "16px 16px 0 0" : "18px";
    // The sheet is solid grouped background (it covers half the screen and
    // holds the keyboard's focus); the card is material, lit along its top edge.
    style.background = this.sheet ? surface.grouped : surface.material;
    style.backdropFilter = this.sheet ? "none" : MATERIAL_BLUR;
    style.setProperty("-webkit-backdrop-filter", this.sheet ? "none" : MATERIAL_BLUR);
    style.boxShadow = this.sheet
      ? `0 -0.5px 0 ${surface.hairline}, 0 -10px 40px rgba(0, 0, 0, 0.16)`
      : `inset 0 0.5px 0 ${surface.edge}, ${surface.shadowCard}`;
    style.overscrollBehavior = this.sheet ? "contain" : "";
    this.stopKeyboardTracking?.();
    this.stopKeyboardTracking = null;
    if (this.sheet) {
      style.top = "auto";
      style.left = "0";
      style.right = "0";
      style.overflowY = "auto";
      const fit = (inset: number, visibleHeight = window.innerHeight) => {
        style.bottom = `${inset}px`;
        style.maxHeight = `${visibleHeight - 8}px`;
        // The keyboard covers the home indicator — no safe-area gap above it.
        style.padding = `16px 16px ${inset > 0 ? "16px" : "calc(16px + env(safe-area-inset-bottom, 0px))"}`;
      };
      fit(0);
      this.stopKeyboardTracking = trackKeyboardInset(fit);
      return;
    }
    style.right = "";
    style.bottom = "";
    style.padding = "16px";

    // Laid out while still transparent so placement uses its real size — it
    // varies with the locale's label lengths, font metrics, touch sizing and
    // the host's box-sizing. Any height cap from a previous show is dropped
    // first so the natural height is what gets measured.
    style.maxHeight = "";
    style.overflowY = "";
    const { top, left, maxHeight } = computePopupPosition(
      rectBounds,
      this.measure(),
      { width: window.innerWidth, height: window.innerHeight },
      insets,
    );
    style.top = `${top}px`;
    style.left = `${left}px`;
    // Grow out of the rectangle the user just drew: from its centre line, on
    // the side the card sits against.
    const { width, height } = this.measure();
    const originX = Math.min(Math.max(rectBounds.left + rectBounds.width / 2 - left, 0), width);
    style.transformOrigin = `${Math.round(originX)}px ${top >= rectBounds.top + rectBounds.height / 2 ? 0 : height}px`;
    if (maxHeight !== null) {
      // Taller than the usable band (short viewport, high zoom, long
      // localized labels): cap it and let it scroll, starting from the top
      // so the type buttons that enable Send are in view.
      style.maxHeight = `${Math.max(0, maxHeight - this.verticalChromeHeight())}px`;
      style.overflowY = "auto";
      this.root.scrollTop = 0;
    }
  }

  private hiddenTransform(): string {
    return this.sheet ? "translateY(100%)" : "scale(0.96)";
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
      btn.setAttribute("aria-pressed", String(btn.dataset.type === type));
      this.paintType(btn);
    }
    this.updateSubmitState();
  }

  private resetTypeButtons(): void {
    const buttons = this.root.querySelectorAll<HTMLButtonElement>("button[data-type]");
    for (const btn of buttons) {
      btn.setAttribute("aria-pressed", "false");
      btn.disabled = false;
      btn.style.cursor = "pointer";
      this.paintType(btn);
    }
  }

  /**
   * A category tile at rest, hovered or picked. Picked, it takes its own
   * colour: a tint over the row, the label pushed toward the text so it
   * reads 4.5:1 on it, and a ring that tells it apart without the tint.
   * Grey fill at rest, a solid row on the phone sheet's grouped background.
   */
  private paintType(btn: HTMLButtonElement, hover = false): void {
    const { surface } = this.colors;
    const style = btn.style;
    if (btn.getAttribute("aria-pressed") === "true") {
      const color = getTypeColor(btn.dataset.type ?? "", this.colors);
      style.background = `color-mix(in srgb, ${color} 15%, ${surface.row})`;
      style.color = `color-mix(in srgb, ${color} 78%, ${surface.inkMix})`;
      style.fontWeight = "600";
      style.boxShadow = `inset 0 0 0 1.5px ${color}`;
      return;
    }
    style.background = hover ? surface.fillStrong : this.sheet ? surface.row : surface.fill;
    style.color = this.colors.text;
    style.fontWeight = "500";
    style.boxShadow = "none";
  }

  /** The message field: filled at rest, a solid row with the accent ring while focused. */
  private paintField(focused: boolean): void {
    const { surface } = this.colors;
    this.textarea.style.background = focused || this.sheet ? surface.row : surface.fill;
    this.textarea.style.boxShadow = focused
      ? `0 0 0 3px color-mix(in srgb, ${this.colors.accent} 30%, transparent)`
      : "none";
  }

  /** Cancel's grey fill, a step stronger on hover and on the sheet (it sits on grouped grey there). */
  private paintCancel(hover: boolean): void {
    const { surface } = this.colors;
    this.cancelBtn.style.background = hover || this.sheet ? surface.fillStrong : surface.fill;
  }

  // A category helps triage but gates nothing: Send needs only a message, and
  // a feedback sent without a category is filed as "other" (#305).
  private updateSubmitState(): void {
    if (this.submittingState) return;
    const enabled = this.textarea.value.trim().length > 0;
    this.submitBtn.disabled = !enabled;
    this.submitBtn.style.opacity = enabled ? "1" : "0.35";
    this.submitBtn.style.pointerEvents = enabled ? "auto" : "none";
  }

  private submit(): void {
    if (this.submittingState) return;
    if (!this.textarea.value.trim()) return;

    const result: PopupResult = { type: this.selectedType ?? "other", message: this.textarea.value.trim() };

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

    // Submit: the spinner over the label. The label turns transparent rather
    // than `display: none`: it keeps the button's width, and it stays in the
    // accessibility tree as the button's name (axe button-name), which a
    // removed label would leave empty while `aria-busy` announces the wait.
    this.submitLabel.style.opacity = "0";
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
    this.submitLabel.style.opacity = "";
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
    // Centred over the transparent label by auto margins, not a transform:
    // the rotation below owns `transform`.
    spinner.style.cssText = /* css */ `
      position:absolute;inset:0;margin:auto;
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
    this.removeKeydownTrap?.();
    this.removeKeydownTrap = null;
    // Make sure the submitting decoration doesn't leak into the next show()
    if (this.submittingState) this.exitSubmittingState();
    this.onSubmit = null;
    this.stopKeyboardTracking?.();
    this.stopKeyboardTracking = null;
    if (!prefersReducedMotion()) this.root.style.transition = POPUP_TRANSITION;
    this.root.style.opacity = "0";
    this.root.style.transform = this.hiddenTransform();
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
    this.removeKeydownTrap?.();
    this.removeKeydownTrap = null;
    this.stopKeyboardTracking?.();
    this.stopKeyboardTracking = null;
    this.root.remove();
  }
}
