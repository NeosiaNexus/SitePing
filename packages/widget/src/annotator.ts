import type { AnnotationPayload, FeedbackType } from "@siteping/core";
import { Z_INDEX_MAX } from "./constants.js";
import { findAnchorElement, generateAnchor, rectToPercentages } from "./dom/anchor.js";
import { el, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import type { TFunction } from "./i18n/index.js";
import { Popup } from "./popup.js";
import { captureScreenshot } from "./screenshot.js";
import type { ThemeColors } from "./styles/theme.js";

export interface AnnotationComplete {
  annotation: AnnotationPayload;
  type: FeedbackType;
  message: string;
  /**
   * Base64 JPEG `data:` URL captured by html2canvas, or null when capture
   * is disabled / failed / the peer dep is missing.
   */
  screenshotDataUrl?: string | null | undefined;
}

/**
 * Annotation mode: full-page overlay with rectangle drawing.
 *
 * Glassmorphism design:
 * - Frosted glass toolbar at top
 * - Subtle tinted overlay
 * - Accent-colored drawing rectangle with glow
 */
export class Annotator {
  private overlay: HTMLElement | null = null;
  private toolbar: HTMLElement | null = null;
  private drawingRect: HTMLElement | null = null;
  private startX = 0;
  private startY = 0;
  private isDrawing = false;
  private isActive = false;
  private popup: Popup;
  private savedOverflow = "";
  private preActiveFocusElement: Element | null = null;
  private rafId: number | null = null;
  private pendingMoveEvent: MouseEvent | Touch | null = null;

  constructor(
    private readonly colors: ThemeColors,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly t: TFunction,
    private readonly enableScreenshot: boolean = false,
  ) {
    this.popup = new Popup(colors, t);

    this.bus.on("annotation:start", () => this.activate());
  }

  /**
   * Capture a screenshot of the drawn rect when `enableScreenshot` is on.
   * Returns null on disable / capture failure / missing peer dep — the
   * feedback is always submitted regardless.
   */
  private async maybeCapture(rect: DOMRect): Promise<string | null> {
    if (!this.enableScreenshot) return null;
    return captureScreenshot(rect);
  }

  private activate(): void {
    if (this.isActive) return;
    this.isActive = true;

    // Capture the focused element before activation for keyboard annotation
    this.preActiveFocusElement = document.activeElement;

    // Lock page scroll
    this.savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Overlay — subtle blue tint for depth
    this.overlay = el("div", {
      style: `
        position:fixed;inset:0;
        z-index:${Z_INDEX_MAX - 1};
        background:rgba(15, 23, 42, 0.04);
        cursor:crosshair;
      `,
    });
    this.overlay.setAttribute("aria-hidden", "true");

    // Toolbar — glassmorphism bar
    this.toolbar = el("div", {
      style: `
        position:fixed;top:0;left:0;right:0;
        z-index:${Z_INDEX_MAX};
        height:52px;
        background:${this.colors.glassBg};
        backdrop-filter:blur(24px);
        -webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
        box-shadow:0 4px 16px ${this.colors.shadow};
        -webkit-font-smoothing:antialiased;
      `,
    });

    const dot = el("span", {
      style: `
        width:8px;height:8px;border-radius:50%;
        background:${this.colors.accent};
        box-shadow:0 0 8px ${this.colors.accentGlow};
        animation:pulse 1.5s ease-in-out infinite;
      `,
    });

    // Add pulse animation inline (respects prefers-reduced-motion)
    const style = document.createElement("style");
    style.textContent = [
      "@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}",
      "@media(prefers-reduced-motion:reduce){@keyframes pulse{from,to{opacity:1}}}",
    ].join("");
    this.toolbar.appendChild(style);

    const instruction = el("span", { style: "font-weight:500;letter-spacing:-0.01em;" });
    setText(instruction, this.t("annotator.instruction"));

    const cancelBtn = document.createElement("button");
    cancelBtn.style.cssText = `
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};
      background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
      transition:all 0.2s ease;
    `;
    setText(cancelBtn, this.t("annotator.cancel"));
    cancelBtn.addEventListener("click", () => this.deactivate());
    cancelBtn.addEventListener("mouseenter", () => {
      cancelBtn.style.borderColor = this.colors.typeBug;
      cancelBtn.style.color = this.colors.typeBug;
      cancelBtn.style.background = this.colors.typeBugBg;
    });
    cancelBtn.addEventListener("mouseleave", () => {
      cancelBtn.style.borderColor = this.colors.border;
      cancelBtn.style.color = this.colors.textTertiary;
      cancelBtn.style.background = this.colors.glassBg;
    });

    this.toolbar.appendChild(dot);
    this.toolbar.appendChild(instruction);
    this.toolbar.appendChild(cancelBtn);

    // Mouse events
    this.overlay.addEventListener("mousedown", this.onMouseDown);
    this.overlay.addEventListener("mousemove", this.onMouseMove);
    this.overlay.addEventListener("mouseup", this.onMouseUp);

    // Touch events (Surface Pro, iPad, etc.)
    this.overlay.addEventListener("touchstart", this.onTouchStart, { passive: false });
    this.overlay.addEventListener("touchmove", this.onTouchMove, { passive: false });
    this.overlay.addEventListener("touchend", this.onTouchEnd);

    // Keyboard annotation: Enter selects the pre-activation focused element
    this.overlay.addEventListener("keydown", this.onOverlayKeyDown);

    // Allow tab-through so keyboard users can reach underlying elements
    this.overlay.setAttribute("tabindex", "0");

    // Escape to cancel
    document.addEventListener("keydown", this.onKeyDown);

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.toolbar);
  }

  private deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.isDrawing = false;
    this.preActiveFocusElement = null;

    // Cancel any pending rAF to prevent stale callbacks
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingMoveEvent = null;

    document.body.style.overflow = this.savedOverflow;
    document.removeEventListener("keydown", this.onKeyDown);

    this.overlay?.remove();
    this.toolbar?.remove();
    this.drawingRect?.remove();
    this.overlay = null;
    this.toolbar = null;
    this.drawingRect = null;

    this.bus.emit("annotation:end");
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this.deactivate();
  };

  /**
   * Keyboard annotation: pressing Enter while the overlay is active selects
   * the element that was focused before activation and creates a full-bounds
   * annotation covering that element (WCAG 2.1.1 Level A).
   */
  private onOverlayKeyDown = async (e: KeyboardEvent): Promise<void> => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const target = this.preActiveFocusElement;
    if (!target || !(target instanceof HTMLElement)) return;

    const bounds = target.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    const rectBounds = new DOMRect(bounds.x, bounds.y, bounds.width, bounds.height);

    const anchor = generateAnchor(target);
    const annotation: AnnotationPayload = {
      anchor,
      rect: { xPct: 0, yPct: 0, wPct: 1, hPct: 1 },
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    };

    // Submission stays inside the popup so the user gets a visible spinner
    // until the server confirms — see finishDrawing for the rationale.
    const screenshotCache: { value?: string | null } = {};
    const result = await this.popup.show(rectBounds, (formResult) =>
      this.runSubmission(annotation, formResult, rectBounds, screenshotCache),
    );

    if (result) this.deactivate();
  };

  private onMouseDown = (e: MouseEvent): void => {
    this.startDrawing(e.clientX, e.clientY);
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) this.startDrawing(touch.clientX, touch.clientY);
  };

  private startDrawing(clientX: number, clientY: number): void {
    this.isDrawing = true;
    this.startX = clientX;
    this.startY = clientY;

    this.drawingRect?.remove();
    this.drawingRect = el("div", {
      style: `
        position:fixed;
        border:2px solid ${this.colors.accent};
        background:${this.colors.accent}12;
        pointer-events:none;
        border-radius:8px;
        box-shadow:0 0 16px ${this.colors.accentGlow};
        transition:box-shadow 0.15s ease;
      `,
    });
    this.overlay?.appendChild(this.drawingRect);
  }

  private onMouseMove = (e: MouseEvent): void => {
    this.scheduleRectUpdate(e);
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches[0]) this.scheduleRectUpdate(e.touches[0]);
  };

  private scheduleRectUpdate(source: MouseEvent | Touch): void {
    if (!this.isDrawing || !this.drawingRect) return;

    this.pendingMoveEvent = source;
    if (this.rafId !== null) return;

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      const evt = this.pendingMoveEvent;
      if (!evt || !this.drawingRect) return;

      const x = Math.min(evt.clientX, this.startX);
      const y = Math.min(evt.clientY, this.startY);
      const w = Math.abs(evt.clientX - this.startX);
      const h = Math.abs(evt.clientY - this.startY);

      this.drawingRect.style.left = `${x}px`;
      this.drawingRect.style.top = `${y}px`;
      this.drawingRect.style.width = `${w}px`;
      this.drawingRect.style.height = `${h}px`;
    });
  }

  private onTouchEnd = async (e: TouchEvent): Promise<void> => {
    const touch = e.changedTouches[0];
    if (touch) await this.finishDrawing(touch.clientX, touch.clientY);
  };

  private onMouseUp = async (e: MouseEvent): Promise<void> => {
    await this.finishDrawing(e.clientX, e.clientY);
  };

  private finishDrawing = async (clientX: number, clientY: number): Promise<void> => {
    if (!this.isDrawing || !this.drawingRect) return;
    this.isDrawing = false;

    const x = Math.min(clientX, this.startX);
    const y = Math.min(clientY, this.startY);
    const w = Math.abs(clientX - this.startX);
    const h = Math.abs(clientY - this.startY);

    // Ignore tiny rectangles (accidental clicks)
    if (w < 10 || h < 10) {
      this.drawingRect.remove();
      this.drawingRect = null;
      return;
    }

    const rectBounds = new DOMRect(x, y, w, h);

    // Build annotation payload BEFORE the popup opens — the overlay is still
    // up so `findAnchorElement` can briefly disable pointer events on it.
    const annotation = this.buildAnnotation(rectBounds);

    // Keep the drawn rectangle visible while the popup is open so the user
    // can see what they're sending feedback about — including while the
    // submit-spinner is running. We only remove it after the popup closes.
    const screenshotCache: { value?: string | null } = {};
    const result = await this.popup.show(rectBounds, (formResult) =>
      this.runSubmission(annotation, formResult, rectBounds, screenshotCache),
    );

    this.drawingRect?.remove();
    this.drawingRect = null;
    if (result) this.deactivate();
  };

  /**
   * Submit handler passed into `popup.show()`. Captures the screenshot once
   * (cached across retries) and emits `annotation:complete` on the bus, then
   * waits for either `feedback:sent` (resolve) or `feedback:error` (reject —
   * popup restores so the user can retry without re-entering the form).
   */
  private async runSubmission(
    annotation: AnnotationPayload,
    formResult: { type: FeedbackType; message: string },
    rectBounds: DOMRect,
    screenshotCache: { value?: string | null },
  ): Promise<void> {
    // Screenshot capture is the slow part. Capture once and reuse the
    // cached data URL on every retry — re-running html2canvas after each
    // failed submit would punish the user for a network blip.
    if (screenshotCache.value === undefined) {
      screenshotCache.value = await this.maybeCapture(rectBounds);
    }
    const screenshotDataUrl = screenshotCache.value;

    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        unsubSent();
        unsubError();
      };
      const unsubSent = this.bus.on("feedback:sent", () => {
        cleanup();
        resolve();
      });
      const unsubError = this.bus.on("feedback:error", (err) => {
        cleanup();
        reject(err);
      });

      this.bus.emit("annotation:complete", {
        annotation,
        type: formResult.type,
        message: formResult.message,
        screenshotDataUrl,
      });
    });
  }

  /**
   * Build an AnnotationPayload from a drawn rectangle.
   * Temporarily hides the overlay to access the real DOM underneath.
   */
  private buildAnnotation(rectBounds: DOMRect): AnnotationPayload {
    // Temporarily hide overlay to find the real element underneath
    if (this.overlay) this.overlay.style.pointerEvents = "none";
    const anchorElement = findAnchorElement(rectBounds);
    if (this.overlay) this.overlay.style.pointerEvents = "auto";

    const anchor = generateAnchor(anchorElement);
    const anchorBounds = anchorElement.getBoundingClientRect();
    const rect = rectToPercentages(rectBounds, anchorBounds);

    return {
      anchor,
      rect,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    };
  }
  destroy(): void {
    this.deactivate();
    this.popup.destroy();
  }
}
