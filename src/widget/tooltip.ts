import type { FeedbackResponse } from "../types.js";
import { getTypeColor, type ThemeColors } from "../styles/theme.js";
import { el, setText, formatRelativeDate } from "./dom-utils.js";

const SHOW_DELAY = 150;
const HIDE_DELAY = 100;

/**
 * Tooltip shown on annotation marker hover.
 *
 * All user content is set via textContent (never innerHTML).
 * Lives outside Shadow DOM (same layer as markers/overlay).
 */
export class Tooltip {
  private root: HTMLElement;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private currentFeedbackId: string | null = null;

  constructor(private readonly colors: ThemeColors) {
    this.root = el("div", {
      style: `
        position: fixed;
        z-index: 2147483647;
        max-width: 260px;
        padding: 10px 12px;
        border-radius: 8px;
        background: #fff;
        border: 1px solid #e5e7eb;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        font-family: system-ui, -apple-system, sans-serif;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.15s ease-out, transform 0.15s ease-out;
        visibility: hidden;
      `,
    });

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
      this.root.style.transform = "translateY(0)";
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
    this.root.style.transform = "translateY(4px)";
    setTimeout(() => {
      if (!this.currentFeedbackId) {
        this.root.style.visibility = "hidden";
      }
    }, 150);
  }

  private cancelShow(): void {
    if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null; }
  }

  private cancelHide(): void {
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
  }

  private render(feedback: FeedbackResponse): void {
    // Clear previous content safely
    this.root.replaceChildren();

    const typeColor = getTypeColor(feedback.type, this.colors);
    const typeLabel = feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1);

    // Header row: badge + date
    const header = el("div", { style: "display:flex;align-items:center;gap:8px;margin-bottom:6px;" });

    const badge = el("span", {
      style: `padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;color:#fff;background:${typeColor};`,
    });
    setText(badge, typeLabel);

    const date = el("span", { style: "font-size:11px;color:#6b7280;margin-left:auto;" });
    setText(date, formatRelativeDate(feedback.createdAt));

    header.appendChild(badge);
    header.appendChild(date);

    // Message body (safe — textContent only)
    const body = el("div", {
      style: "font-size:13px;line-height:1.4;color:#1a1a1a;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;",
    });
    setText(body, feedback.message);

    this.root.appendChild(header);
    this.root.appendChild(body);
  }

  private position(anchorRect: DOMRect): void {
    const tooltipRect = this.root.getBoundingClientRect();
    const gap = 8;

    let top = anchorRect.top - tooltipRect.height - gap;
    let left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;

    if (top < 8) top = anchorRect.bottom + gap;
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));

    this.root.style.top = `${top}px`;
    this.root.style.left = `${left}px`;
  }

  destroy(): void {
    this.cancelShow();
    this.cancelHide();
    this.root.remove();
  }
}

