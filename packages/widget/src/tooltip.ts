import type { FeedbackResponse } from "@siteping/core";
import { el, formatRelativeDate, setText } from "./dom-utils.js";
import { getTypeBgColor, getTypeColor, type ThemeColors } from "./styles/theme.js";

const SHOW_DELAY = 120;
const HIDE_DELAY = 80;

/**
 * Tooltip shown on annotation marker hover.
 *
 * Glassmorphism design: frosted glass with pastel badge,
 * smooth entrance animation, directional arrow.
 * Lives outside Shadow DOM.
 */
export class Tooltip {
  private root: HTMLElement;
  private arrow: HTMLElement;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private currentFeedbackId: string | null = null;

  readonly tooltipId = "sp-tooltip";

  constructor(private readonly colors: ThemeColors) {
    this.root = el("div", {
      style: `
        position: fixed;
        z-index: 2147483647;
        max-width: 280px;
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.88);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.35);
        box-shadow: 0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.04);
        font-family: "Inter", system-ui, -apple-system, sans-serif;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(6px) scale(0.97);
        transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        visibility: hidden;
        -webkit-font-smoothing: antialiased;
      `,
    });
    this.root.setAttribute("role", "tooltip");
    this.root.id = this.tooltipId;

    // Arrow element
    this.arrow = el("div", {
      style: `
        position: absolute;
        width: 12px;
        height: 12px;
        background: rgba(255, 255, 255, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.35);
        transform: rotate(45deg);
        pointer-events: none;
      `,
    });
    this.root.appendChild(this.arrow);

    this.root.addEventListener("mouseenter", () => this.cancelHide());
    this.root.addEventListener("mouseleave", () => this.scheduleHide());
    document.body.appendChild(this.root);
  }

  show(feedback: FeedbackResponse, anchorRect: DOMRect): void {
    if (this.currentFeedbackId === feedback.id) return;
    this.cancelHide();
    this.cancelShow();

    this.showTimer = setTimeout(() => {
      this.currentFeedbackId = feedback.id;
      this.render(feedback);
      this.position(anchorRect);
      this.root.style.visibility = "visible";
      this.root.style.opacity = "1";
      this.root.style.transform = "translateY(0) scale(1)";
    }, SHOW_DELAY);
  }

  scheduleHide(): void {
    this.cancelHide();
    this.hideTimer = setTimeout(() => this.hide(), HIDE_DELAY);
  }

  hide(): void {
    this.cancelShow();
    this.currentFeedbackId = null;
    this.root.style.opacity = "0";
    this.root.style.transform = "translateY(6px) scale(0.97)";
    setTimeout(() => {
      if (!this.currentFeedbackId) {
        this.root.style.visibility = "hidden";
      }
    }, 200);
  }

  private cancelShow(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private cancelHide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private render(feedback: FeedbackResponse): void {
    // Clear previous content safely (except arrow)
    const children = Array.from(this.root.children);
    for (const child of children) {
      if (child !== this.arrow) child.remove();
    }

    const typeColor = getTypeColor(feedback.type, this.colors);
    const typeBg = getTypeBgColor(feedback.type, this.colors);
    const typeLabel = feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1);

    // Header row: badge + date
    const header = el("div", { style: "display:flex;align-items:center;gap:8px;margin-bottom:8px;" });

    const badge = el("span", {
      style: `
        padding:3px 10px;border-radius:9999px;
        font-size:11px;font-weight:600;
        color:${typeColor};background:${typeBg};
        letter-spacing:0.02em;
      `,
    });
    setText(badge, typeLabel);

    const date = el("span", { style: "font-size:11px;color:#64748b;margin-left:auto;" });
    setText(date, formatRelativeDate(feedback.createdAt));

    header.appendChild(badge);
    header.appendChild(date);

    // Message body (safe — textContent only)
    const body = el("div", {
      style:
        "font-size:13px;line-height:1.55;color:#0f172a;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;",
    });
    setText(body, feedback.message);

    // Insert content before arrow
    this.root.insertBefore(header, this.arrow);
    this.root.insertBefore(body, this.arrow);
  }

  private position(anchorRect: DOMRect): void {
    const tooltipRect = this.root.getBoundingClientRect();
    const gap = 10;

    let top = anchorRect.top - tooltipRect.height - gap;
    let left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
    let isAbove = true;

    // Flip below if not enough space above
    if (top < 8) {
      top = anchorRect.bottom + gap;
      isAbove = false;
    }

    left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));

    this.root.style.top = `${top}px`;
    this.root.style.left = `${left}px`;

    // Position arrow
    const arrowLeft = Math.max(16, Math.min(anchorRect.left + anchorRect.width / 2 - left - 6, tooltipRect.width - 22));

    if (isAbove) {
      // Arrow at bottom, pointing down
      this.arrow.style.cssText = `
        position:absolute;
        width:12px;height:12px;
        background:rgba(255, 255, 255, 0.88);
        border-right:1px solid rgba(255, 255, 255, 0.35);
        border-bottom:1px solid rgba(255, 255, 255, 0.35);
        transform:rotate(45deg);
        pointer-events:none;
        bottom:-6px;
        left:${arrowLeft}px;
      `;
    } else {
      // Arrow at top, pointing up
      this.arrow.style.cssText = `
        position:absolute;
        width:12px;height:12px;
        background:rgba(255, 255, 255, 0.88);
        border-left:1px solid rgba(255, 255, 255, 0.35);
        border-top:1px solid rgba(255, 255, 255, 0.35);
        transform:rotate(45deg);
        pointer-events:none;
        top:-6px;
        left:${arrowLeft}px;
      `;
    }
  }

  /** Check if a DOM node belongs to this tooltip (for MutationObserver filtering). */
  contains(node: Node): boolean {
    return this.root.contains(node);
  }

  destroy(): void {
    this.cancelShow();
    this.cancelHide();
    this.root.remove();
  }
}
