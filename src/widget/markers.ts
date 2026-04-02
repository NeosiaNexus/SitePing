import type { FeedbackResponse } from "../types.js";
import { getTypeColor, type ThemeColors } from "../styles/theme.js";
import { resolveAnnotation } from "../dom/resolver.js";
import { el, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import type { Tooltip } from "./tooltip.js";

interface MarkerEntry {
  feedback: FeedbackResponse;
  elements: HTMLElement[];
}

/**
 * Numbered markers on the page for each feedback annotation.
 *
 * 24x24px circles at top-right of annotation rects.
 * Lives OUTSIDE Shadow DOM (appended to document.body).
 * All user content set via textContent.
 */
export class MarkerManager {
  private container: HTMLElement;
  private entries: MarkerEntry[] = [];

  get count(): number {
    return this.entries.length;
  }

  constructor(
    private readonly colors: ThemeColors,
    private readonly tooltip: Tooltip,
    private readonly bus: EventBus<WidgetEvents>,
  ) {
    this.container = el("div", {
      style: "position:fixed;inset:0;pointer-events:none;z-index:2147483646;",
    });
    this.container.id = "siteping-markers";
    document.body.appendChild(this.container);

    this.bus.on("annotations:toggle", (visible) => {
      this.container.style.display = visible ? "block" : "none";
    });
  }

  render(feedbacks: FeedbackResponse[]): void {
    this.clear();
    feedbacks.forEach((feedback, i) => {
      const entry: MarkerEntry = { feedback, elements: [] };
      for (const annotation of feedback.annotations) {
        const anchor = {
          ...annotation,
          textSnippet: annotation.textSnippet ?? undefined,
          elementId: annotation.elementId ?? undefined,
        };
        const resolved = resolveAnnotation(anchor, annotation);
        if (!resolved) continue;
        const marker = this.createMarker(i + 1, feedback, resolved.rect);
        this.container.appendChild(marker);
        entry.elements.push(marker);
      }
      this.entries.push(entry);
    });
    this.resolveOverlaps();
  }

  addFeedback(feedback: FeedbackResponse, index: number): void {
    const entry: MarkerEntry = { feedback, elements: [] };
    for (const annotation of feedback.annotations) {
      const anchor = {
        ...annotation,
        textSnippet: annotation.textSnippet ?? undefined,
        elementId: annotation.elementId ?? undefined,
      };
      const resolved = resolveAnnotation(anchor, annotation);
      if (!resolved) continue;
      const marker = this.createMarker(index, feedback, resolved.rect);
      marker.style.animation = "sp-marker-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both";
      this.container.appendChild(marker);
      entry.elements.push(marker);
    }
    this.entries.push(entry);
    this.resolveOverlaps();
  }

  private createMarker(number: number, feedback: FeedbackResponse, rect: DOMRect): HTMLElement {
    const typeColor = getTypeColor(feedback.type, this.colors);
    const isResolved = feedback.status === "resolved";

    const marker = el("div", {
      style: `
        position:fixed;
        top:${rect.top - 12}px;
        left:${rect.right - 12}px;
        width:24px;height:24px;
        border-radius:50%;
        background:${isResolved ? "#f3f4f6" : "#fff"};
        border:2px solid ${isResolved ? "#9ca3af" : typeColor};
        display:flex;align-items:center;justify-content:center;
        font-family:system-ui,-apple-system,sans-serif;
        font-size:12px;font-weight:600;
        color:${isResolved ? "#9ca3af" : typeColor};
        cursor:pointer;pointer-events:auto;
        transition:transform 0.15s ease,box-shadow 0.15s ease;
        user-select:none;
      `,
    });
    marker.dataset.feedbackId = feedback.id;
    setText(marker, isResolved ? "\u2713" : String(number));

    marker.addEventListener("mouseenter", () => {
      marker.style.transform = "scale(1.17)";
      marker.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
      this.tooltip.show(feedback, marker.getBoundingClientRect());
    });

    marker.addEventListener("mouseleave", () => {
      marker.style.transform = "scale(1)";
      marker.style.boxShadow = "none";
      this.tooltip.scheduleHide();
    });

    marker.addEventListener("click", () => {
      this.bus.emit("panel:toggle", true);
      marker.dispatchEvent(
        new CustomEvent("sp-marker-click", {
          detail: { feedbackId: feedback.id },
          bubbles: true,
        }),
      );
    });

    return marker;
  }

  private resolveOverlaps(): void {
    const allMarkers = Array.from(
      this.container.querySelectorAll<HTMLElement>("[data-feedback-id]"),
    );
    for (let i = 1; i < allMarkers.length; i++) {
      const cr = allMarkers[i].getBoundingClientRect();
      const pr = allMarkers[i - 1].getBoundingClientRect();
      const distance = Math.sqrt((cr.left - pr.left) ** 2 + (cr.top - pr.top) ** 2);
      if (distance < 20) {
        const currentLeft = parseFloat(allMarkers[i].style.left);
        allMarkers[i].style.left = `${currentLeft + 28}px`;
      }
    }
  }

  highlight(feedbackId: string): void {
    for (const entry of this.entries) {
      if (entry.feedback.id === feedbackId) {
        for (const markerEl of entry.elements) {
          markerEl.style.animation = "sp-pulse-outline 0.6s ease-out";
          markerEl.addEventListener("animationend", () => { markerEl.style.animation = ""; }, { once: true });
        }
      }
    }
  }

  clear(): void {
    this.container.replaceChildren();
    this.entries = [];
  }

  destroy(): void {
    this.container.remove();
  }
}
