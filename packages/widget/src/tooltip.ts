import type { FeedbackResponse } from "@siteping/core";
import { EASE_OUT, Z_INDEX_MAX } from "./constants.js";
import { el, formatRelativeDate, setText } from "./dom-utils.js";
import { isolateFromHost } from "./host-isolation.js";
import { createT, getStatusLabel, getTypeLabel } from "./i18n/index.js";
import { getStatusColor, getTypeColor, SYSTEM_FONT, type ThemeColors } from "./styles/theme.js";

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
/** Space between the pin and the callout. */
const GAP = 10;
/** The callout's material: the page shows through, blurred and saturated. */
const MATERIAL_BLUR = "blur(30px) saturate(180%)";

/**
 * Tooltip shown on annotation marker hover.
 *
 * A callout of translucent material (Apple's native look): tinted chips for
 * the type and status, then the message. No arrow: it grows out of the pin
 * it describes instead. Lives outside Shadow DOM.
 */
export class Tooltip {
  private root: HTMLElement;
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
        padding: 10px 14px 12px;
        border: none;
        border-radius: 14px;
        backdrop-filter: ${MATERIAL_BLUR};
        -webkit-backdrop-filter: ${MATERIAL_BLUR};
        font-family: ${SYSTEM_FONT};
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
    this.restyle();

    this.root.addEventListener("mouseenter", () => this.cancelHide());
    this.root.addEventListener("mouseleave", () => this.scheduleHide());
    isolateFromHost(this.root);
    document.body.appendChild(this.root);
  }

  /**
   * Paint the surface from the palette: at construction, and again when an
   * `auto` theme follows the OS. The content is painted on every show.
   */
  restyle(): void {
    const { surface } = this.colors;
    const { style } = this.root;
    style.background = surface.material;
    // Light catches the material's top edge.
    style.boxShadow = `inset 0 0.5px 0 ${surface.edge}, ${surface.shadowCard}`;
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
    const t = createT(this.locale);
    const { inkMix } = this.colors.surface;

    // Header row: type badge + status chip + date
    const header = el("div", {
      style: "display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;margin-bottom:8px;",
    });

    // A chip is its colour at 13% over the material, and its label that
    // colour pushed toward the text, so it reads 4.5:1 on its own tint in
    // either scheme.
    const chip = (label: string, color: string): HTMLElement => {
      const span = el("span", {
        style: /* css */ `
          padding:2px 8px;border-radius:9999px;
          font-size:11px;font-weight:600;white-space:nowrap;
          color:color-mix(in srgb, ${color} 74%, ${inkMix});
          background:color-mix(in srgb, ${color} 13%, transparent);
          letter-spacing:0.01em;
        `,
      });
      setText(span, label);
      return span;
    };

    const date = el("span", {
      style: /* css */ `
        font-size:12px;color:${this.colors.textSecondary};
        margin-left:auto;white-space:nowrap;font-variant-numeric:tabular-nums;
      `,
    });
    setText(date, formatRelativeDate(feedback.createdAt, this.locale));

    header.appendChild(chip(getTypeLabel(feedback.type, t), getTypeColor(feedback.type, this.colors)));
    header.appendChild(chip(getStatusLabel(feedback.status, t), getStatusColor(feedback.status, this.colors)));
    header.appendChild(date);

    // Message body (safe — textContent only)
    const body = el("div", {
      style: /* css */ `
        font-size:14px;line-height:1.43;letter-spacing:-0.006em;color:${this.colors.text};
        display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
        overflow:hidden;overflow-wrap:anywhere;
      `,
    });
    setText(body, feedback.message);

    this.root.replaceChildren(header, body);
  }

  private position(anchorRect: DOMRect): void {
    const tooltipRect = this.root.getBoundingClientRect();

    let top = anchorRect.top - tooltipRect.height - GAP;
    let left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
    let isAbove = true;

    // Flip below if not enough space above
    if (top < 8) {
      top = anchorRect.bottom + GAP;
      isAbove = false;
    }

    left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));

    this.root.style.top = `${top}px`;
    this.root.style.left = `${left}px`;

    // Grow out of the pin it describes: from the pin's centre line, on the
    // edge facing it (kept clear of the rounded corners).
    const originX = Math.max(22, Math.min(anchorRect.left + anchorRect.width / 2 - left, tooltipRect.width - 16));
    this.root.style.transformOrigin = `${originX}px ${isAbove ? "100%" : "0"}`;
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
