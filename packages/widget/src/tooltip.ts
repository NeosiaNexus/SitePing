import type { FeedbackResponse } from "@siteping/core";
import { EASE_OUT, Z_INDEX_MAX } from "./constants.js";
import { el, formatRelativeDate, setText } from "./dom-utils.js";
import { isolateFromHost } from "./host-isolation.js";
import { createT, getStatusLabel, getTypeLabel } from "./i18n/index.js";
import { getStatusBgColor, getStatusColor, getTypeBgColor, getTypeColor, type ThemeColors } from "./styles/theme.js";

const SHOW_DELAY = 120;
const HIDE_DELAY = 80;
const FADE_MS = 150;
/** Within this long after a tooltip closed, the next one opens at once, without a fade. */
const WARM_MS = 300;
/**
 * Declared once: `show()` swaps it for `none` under reduced motion and must
 * restore this exact value, since an empty inline value removes it.
 */
const TOOLTIP_TRANSITION = `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ${EASE_OUT}`;
const HIDDEN_TRANSFORM = "scale(0.97)";

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
  /** When the last tooltip went away: a sweep across pins shows the next one instantly. */
  private closedAt = 0;

  readonly tooltipId = "sp-tooltip";

  constructor(
    private readonly colors: ThemeColors,
    private readonly locale: string = "en",
  ) {
    this.root = el("div", {
      style: /* css */ `
        position: fixed;
        z-index: ${Z_INDEX_MAX};
        max-width: 280px;
        padding: 12px 14px;
        border-radius: 14px;
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        font-family: "Inter", system-ui, -apple-system, sans-serif;
        pointer-events: auto;
        opacity: 0;
        transform: ${HIDDEN_TRANSFORM};
        transition: ${TOOLTIP_TRANSITION};
        visibility: hidden;
        -webkit-font-smoothing: antialiased;
      `,
    });

    this.root.setAttribute("role", "tooltip");
    this.root.id = this.tooltipId;

    // Arrow element
    this.arrow = el("div", {
      style: /* css */ `
        position: absolute;
        width: 12px;
        height: 12px;
        transform: rotate(45deg);
        pointer-events: none;
      `,
    });
    this.root.appendChild(this.arrow);
    this.restyle();

    this.root.addEventListener("mouseenter", () => this.cancelHide());
    this.root.addEventListener("mouseleave", () => this.scheduleHide());
    isolateFromHost(this.root);
    document.body.appendChild(this.root);
  }

  /**
   * Paint the surface from the palette — at construction, and again when an
   * `auto` theme follows the OS. The arrow is repainted on every placement.
   */
  restyle(): void {
    const { glassBgHeavy, glassBorder, shadow } = this.colors;
    const { style } = this.root;
    style.background = glassBgHeavy;
    style.border = `1px solid ${glassBorder}`;
    style.boxShadow = `0 8px 32px ${shadow}, 0 2px 8px ${shadow}`;
  }

  show(feedback: FeedbackResponse, anchorRect: DOMRect): void {
    // Cancel a pending hide first — the pointer may have left the marker and
    // come back within HIDE_DELAY, which re-shows the same feedback.
    this.cancelHide();
    if (this.currentFeedbackId === feedback.id) return;
    this.cancelShow();

    // One tooltip already open (or just closed): the user is sweeping across
    // pins, so the next one skips both the delay and the fade.
    const warm = this.root.style.visibility === "visible" || Date.now() - this.closedAt < WARM_MS;
    this.showTimer = setTimeout(
      () => {
        this.currentFeedbackId = feedback.id;
        this.render(feedback);
        this.position(anchorRect);

        // Check prefers-reduced-motion live (not cached at construction time)
        const reduceMotion =
          typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        this.root.style.transition = reduceMotion || warm ? "none" : TOOLTIP_TRANSITION;

        this.root.style.visibility = "visible";
        this.root.style.opacity = "1";
        this.root.style.transform = "none";
      },
      warm ? 0 : SHOW_DELAY,
    );
  }

  scheduleHide(): void {
    this.cancelHide();
    this.hideTimer = setTimeout(() => this.hide(), HIDE_DELAY);
  }

  hide(): void {
    this.cancelShow();
    if (this.currentFeedbackId) this.closedAt = Date.now();
    this.currentFeedbackId = null;
    this.root.style.opacity = "0";
    this.root.style.transform = HIDDEN_TRANSFORM;
    setTimeout(() => {
      if (!this.currentFeedbackId) {
        this.root.style.visibility = "hidden";
      }
    }, FADE_MS);
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
    const t = createT(this.locale);
    const typeLabel = getTypeLabel(feedback.type, t);

    // Header row: type badge + status chip + date
    const header = el("div", {
      style: "display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;margin-bottom:8px;",
    });

    const chip = (label: string, color: string, bg: string): HTMLElement => {
      const span = el("span", {
        style: /* css */ `
          padding:3px 10px;border-radius:9999px;
          font-size:11px;font-weight:600;white-space:nowrap;
          color:${color};background:${bg};
          letter-spacing:0.02em;
        `,
      });
      setText(span, label);
      return span;
    };

    const date = el("span", {
      style: `font-size:11px;color:${this.colors.textSecondary};margin-left:auto;white-space:nowrap;font-variant-numeric:tabular-nums;`,
    });
    setText(date, formatRelativeDate(feedback.createdAt, this.locale));

    header.appendChild(chip(typeLabel, typeColor, typeBg));
    header.appendChild(
      chip(
        getStatusLabel(feedback.status, t),
        getStatusColor(feedback.status, this.colors),
        getStatusBgColor(feedback.status, this.colors),
      ),
    );
    header.appendChild(date);

    // Message body (safe — textContent only)
    const body = el("div", {
      style: `font-size:13px;line-height:1.55;color:${this.colors.text};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;`,
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
    // Grow out of the pin it describes, through the arrow's tip.
    this.root.style.transformOrigin = `${arrowLeft + 6}px ${isAbove ? "100%" : "0"}`;

    if (isAbove) {
      // Arrow at bottom, pointing down
      this.arrow.style.cssText = /* css */ `
        position:absolute;
        width:12px;height:12px;
        background:${this.colors.glassBgHeavy};
        border-right:1px solid ${this.colors.glassBorder};
        border-bottom:1px solid ${this.colors.glassBorder};
        transform:rotate(45deg);
        pointer-events:none;
        bottom:-6px;
        left:${arrowLeft}px;
      `;
    } else {
      // Arrow at top, pointing up
      this.arrow.style.cssText = /* css */ `
        position:absolute;
        width:12px;height:12px;
        background:${this.colors.glassBgHeavy};
        border-left:1px solid ${this.colors.glassBorder};
        border-top:1px solid ${this.colors.glassBorder};
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
