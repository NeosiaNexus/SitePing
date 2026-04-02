import type { AnnotationPayload, FeedbackType, SitepingConfig } from "../types.js";
import type { ThemeColors } from "../styles/theme.js";
import { generateAnchor, findAnchorElement, rectToPercentages } from "../dom/anchor.js";
import { el, setText } from "./dom-utils.js";
import { Popup } from "./popup.js";
import type { EventBus, WidgetEvents } from "./events.js";

export interface AnnotationComplete {
  annotation: AnnotationPayload;
  type: FeedbackType;
  message: string;
}

/**
 * Annotation mode: full-page overlay with rectangle drawing.
 *
 * Architecture:
 * - Overlay lives OUTSIDE Shadow DOM (sibling of <siteping-widget>)
 * - z-index: 2147483646 (one below the widget)
 * - Blocks page scroll while active
 * - mousedown/mousemove/mouseup for rectangle drawing
 * - After drawing: shows Popup for type + message
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

  constructor(
    private readonly config: SitepingConfig,
    private readonly colors: ThemeColors,
    private readonly bus: EventBus<WidgetEvents>,
  ) {
    this.popup = new Popup(colors);

    this.bus.on("annotation:start", () => this.activate());
  }

  private activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.config.onAnnotationStart?.();

    // Lock page scroll
    this.savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Overlay
    this.overlay = el("div", {
      style: `
        position:fixed;inset:0;
        z-index:2147483646;
        background:rgba(0,0,0,0.05);
        cursor:crosshair;
      `,
    });

    // Toolbar
    this.toolbar = el("div", {
      style: `
        position:fixed;top:0;left:0;right:0;
        z-index:2147483647;
        height:48px;
        background:#fff;
        border-bottom:1px solid #e5e7eb;
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:system-ui,-apple-system,sans-serif;
        font-size:14px;color:#1a1a1a;
        box-shadow:0 2px 8px rgba(0,0,0,0.06);
      `,
    });

    const instruction = el("span");
    setText(instruction, "Tracez un rectangle sur la zone \u00e0 commenter");

    const cancelBtn = document.createElement("button");
    cancelBtn.style.cssText = `
      height:32px;padding:0 16px;border-radius:6px;
      border:1px solid #e5e7eb;background:#fff;
      color:#6b7280;font-family:system-ui,-apple-system,sans-serif;
      font-size:13px;cursor:pointer;
    `;
    setText(cancelBtn, "Annuler");
    cancelBtn.addEventListener("click", () => this.deactivate());

    this.toolbar.appendChild(instruction);
    this.toolbar.appendChild(cancelBtn);

    // Mouse events
    this.overlay.addEventListener("mousedown", this.onMouseDown);
    this.overlay.addEventListener("mousemove", this.onMouseMove);
    this.overlay.addEventListener("mouseup", this.onMouseUp);

    // Escape to cancel
    document.addEventListener("keydown", this.onKeyDown);

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.toolbar);
  }

  private deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.isDrawing = false;

    document.body.style.overflow = this.savedOverflow;
    document.removeEventListener("keydown", this.onKeyDown);

    this.overlay?.remove();
    this.toolbar?.remove();
    this.drawingRect?.remove();
    this.overlay = null;
    this.toolbar = null;
    this.drawingRect = null;

    this.config.onAnnotationEnd?.();
    this.bus.emit("annotation:end");
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this.deactivate();
  };

  private onMouseDown = (e: MouseEvent): void => {
    this.isDrawing = true;
    this.startX = e.clientX;
    this.startY = e.clientY;

    this.drawingRect?.remove();
    this.drawingRect = el("div", {
      style: `
        position:fixed;
        border:2px solid ${this.colors.accent};
        background:${this.colors.accent}1a;
        pointer-events:none;
        border-radius:4px;
      `,
    });
    this.overlay?.appendChild(this.drawingRect);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDrawing || !this.drawingRect) return;

    const x = Math.min(e.clientX, this.startX);
    const y = Math.min(e.clientY, this.startY);
    const w = Math.abs(e.clientX - this.startX);
    const h = Math.abs(e.clientY - this.startY);

    this.drawingRect.style.left = `${x}px`;
    this.drawingRect.style.top = `${y}px`;
    this.drawingRect.style.width = `${w}px`;
    this.drawingRect.style.height = `${h}px`;
  };

  private onMouseUp = async (e: MouseEvent): Promise<void> => {
    if (!this.isDrawing || !this.drawingRect) return;
    this.isDrawing = false;

    const x = Math.min(e.clientX, this.startX);
    const y = Math.min(e.clientY, this.startY);
    const w = Math.abs(e.clientX - this.startX);
    const h = Math.abs(e.clientY - this.startY);

    // Ignore tiny rectangles (accidental clicks)
    if (w < 10 || h < 10) {
      this.drawingRect.remove();
      this.drawingRect = null;
      return;
    }

    const rectBounds = new DOMRect(x, y, w, h);

    // Show popup for type + message
    const result = await this.popup.show(rectBounds);

    if (!result) {
      this.drawingRect?.remove();
      this.drawingRect = null;
      return;
    }

    // Build annotation payload BEFORE deactivating (needs overlay for elementFromPoint)
    const annotation = this.buildAnnotation(rectBounds);
    this.drawingRect?.remove();
    this.drawingRect = null;
    this.deactivate();

    // Emit via event bus (not DOM — overlay is already null after deactivate)
    this.bus.emit("annotation:complete", {
      annotation,
      type: result.type,
      message: result.message,
    });
  };

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

  getPopup(): Popup {
    return this.popup;
  }

  destroy(): void {
    this.deactivate();
    this.popup.destroy();
  }
}
