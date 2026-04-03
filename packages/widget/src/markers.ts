import type { AnchorData, FeedbackResponse, RectData } from "@siteping/core";
import { resolveAnnotation } from "./dom/resolver.js";
import { el, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import { getTypeColor, type ThemeColors } from "./styles/theme.js";
import type { Tooltip } from "./tooltip.js";

type Annotation = FeedbackResponse["annotations"][number];

function toAnchorData(a: Annotation): AnchorData {
  return {
    cssSelector: a.cssSelector,
    xpath: a.xpath,
    textSnippet: a.textSnippet,
    elementTag: a.elementTag,
    elementId: a.elementId ?? undefined,
    textPrefix: a.textPrefix,
    textSuffix: a.textSuffix,
    fingerprint: a.fingerprint,
    neighborText: a.neighborText,
  };
}

function toRectData(a: Annotation): RectData {
  return { xPct: a.xPct, yPct: a.yPct, wPct: a.wPct, hPct: a.hPct };
}

/** Half of the 26px marker diameter — used for centering on anchor corner. */
const MARKER_OFFSET = 13;

/** Convert a resolved rect to document-absolute marker position. */
function markerPosition(rect: DOMRect): { top: number; left: number } {
  return {
    top: rect.top + window.scrollY - MARKER_OFFSET,
    left: rect.right + window.scrollX - MARKER_OFFSET,
  };
}

interface MarkerEntry {
  feedback: FeedbackResponse;
  elements: HTMLElement[];
  baseTop: number;
  baseLeft: number;
}

interface Cluster {
  entries: MarkerEntry[];
  elementIndices: number[];
  expanded: boolean;
}

/** Get the i-th marker element from a cluster. */
function clusterMarker(cluster: Cluster, i: number): HTMLElement | undefined {
  return cluster.entries[i].elements[cluster.elementIndices[i]];
}

const HIGHLIGHT_FADE = 300;
const REPOSITION_DEBOUNCE = 200;
const LOW_CONFIDENCE_THRESHOLD = 0.7;
const CLUSTER_DISTANCE = 28;
const FAN_SPACING = 32;

/**
 * Numbered markers on the page for each feedback annotation.
 *
 * Cluster system: click-to-expand (same pattern as Google Maps / Spiderfier).
 * Hover is only used for tooltip/scale on individual markers — never for expansion.
 */
export class MarkerManager {
  private container: HTMLElement;
  private entries: MarkerEntry[] = [];
  private highlightElements: HTMLElement[] = [];
  private pinnedFeedback: FeedbackResponse | null = null;
  private onDocumentClick: ((e: MouseEvent) => void) | null = null;
  private repositionTimer: ReturnType<typeof setTimeout> | null = null;
  private mutationObserver: MutationObserver | null = null;
  private resizeHandler: (() => void) | null = null;
  private clusters: Cluster[] = [];
  private onDocumentClickForClusters: ((e: MouseEvent) => void) | null = null;

  get count(): number {
    return this.entries.length;
  }

  constructor(
    private readonly colors: ThemeColors,
    private readonly tooltip: Tooltip,
    private readonly bus: EventBus<WidgetEvents>,
  ) {
    this.container = el("div", {
      style: "position:absolute;top:0;left:0;pointer-events:none;z-index:2147483646;",
    });
    this.container.id = "siteping-markers";
    document.body.appendChild(this.container);

    this.bus.on("annotations:toggle", (visible) => {
      this.container.style.display = visible ? "block" : "none";
    });

    this.resizeHandler = () => this.scheduleReposition();
    window.addEventListener("resize", this.resizeHandler, { passive: true });

    // Re-resolve after DOM changes (SPA, lazy-load).
    // Filter out mutations from our own container and the tooltip to avoid feedback loops.
    this.mutationObserver = new MutationObserver((mutations) => {
      const isWidgetMutation = mutations.every(
        (m) => this.container.contains(m.target) || this.tooltip.contains(m.target),
      );
      if (!isWidgetMutation) this.scheduleReposition();
    });
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });

    this.onDocumentClickForClusters = (e: MouseEvent) => {
      if (this.container.contains(e.target as Node)) return;
      this.collapseAllClusters();
    };
    document.addEventListener("click", this.onDocumentClickForClusters);
  }

  private scheduleReposition(): void {
    if (this.repositionTimer) return;
    this.repositionTimer = setTimeout(() => {
      this.repositionTimer = null;
      this.repositionAll();
    }, REPOSITION_DEBOUNCE);
  }

  private repositionAll(): void {
    for (const entry of this.entries) {
      for (let i = 0; i < entry.feedback.annotations.length; i++) {
        const markerEl = entry.elements[i];
        if (!markerEl) continue;

        const annotation = entry.feedback.annotations[i];
        const resolved = resolveAnnotation(toAnchorData(annotation), toRectData(annotation));
        if (!resolved) {
          markerEl.style.display = "none";
          continue;
        }

        const pos = markerPosition(resolved.rect);
        entry.baseTop = pos.top;
        entry.baseLeft = pos.left;
        markerEl.style.display = "flex";
        this.applyConfidenceStyle(markerEl, resolved.confidence, entry.feedback);
      }
    }
    this.applyClusterPositions();
  }

  private applyClusterPositions(): void {
    for (const cluster of this.clusters) {
      if (cluster.expanded) {
        this.applyFanPositions(cluster);
      } else {
        this.applyStackPositions(cluster);
      }
    }
  }

  render(feedbacks: FeedbackResponse[]): void {
    this.clear();
    feedbacks.forEach((feedback, i) => {
      const entry = this.buildEntry(feedback, i + 1);
      this.entries.push(entry);
    });
    this.buildClusters();
  }

  addFeedback(feedback: FeedbackResponse, index: number): void {
    const entry = this.buildEntry(feedback, index);
    for (const m of entry.elements) {
      m.style.animation = "sp-marker-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both";
    }
    this.entries.push(entry);
    this.buildClusters();
  }

  private buildEntry(feedback: FeedbackResponse, index: number): MarkerEntry {
    const entry: MarkerEntry = { feedback, elements: [], baseTop: 0, baseLeft: 0 };
    for (const annotation of feedback.annotations) {
      const resolved = resolveAnnotation(toAnchorData(annotation), toRectData(annotation));
      if (!resolved) continue;
      const pos = markerPosition(resolved.rect);
      entry.baseTop = pos.top;
      entry.baseLeft = pos.left;
      const marker = this.createMarker(index, feedback, pos);
      this.applyConfidenceStyle(marker, resolved.confidence, feedback);
      this.container.appendChild(marker);
      entry.elements.push(marker);
    }
    return entry;
  }

  private buildClusters(): void {
    for (const badge of this.container.querySelectorAll<HTMLElement>(".sp-cluster-badge")) {
      badge.remove();
    }

    const allItems: { entry: MarkerEntry; elIdx: number }[] = [];
    for (const entry of this.entries) {
      for (let i = 0; i < entry.elements.length; i++) {
        allItems.push({ entry, elIdx: i });
      }
    }

    const used = new Set<number>();
    this.clusters = [];

    for (let i = 0; i < allItems.length; i++) {
      if (used.has(i)) continue;
      const cluster: Cluster = {
        entries: [allItems[i].entry],
        elementIndices: [allItems[i].elIdx],
        expanded: false,
      };
      used.add(i);

      for (let j = i + 1; j < allItems.length; j++) {
        if (used.has(j)) continue;
        const a = allItems[i].entry;
        const b = allItems[j].entry;
        const dist = Math.sqrt((a.baseLeft - b.baseLeft) ** 2 + (a.baseTop - b.baseTop) ** 2);
        if (dist < CLUSTER_DISTANCE) {
          cluster.entries.push(b);
          cluster.elementIndices.push(allItems[j].elIdx);
          used.add(j);
        }
      }

      this.clusters.push(cluster);
    }

    for (const cluster of this.clusters) {
      if (cluster.entries.length <= 1) continue;
      this.applyStackPositions(cluster);
      this.addClusterBadge(cluster);
    }
  }

  private applyStackPositions(cluster: Cluster): void {
    const { baseTop, baseLeft } = cluster.entries[0];
    const isSolo = cluster.entries.length <= 1;
    for (let i = 0; i < cluster.entries.length; i++) {
      const m = clusterMarker(cluster, i);
      if (!m) continue;
      m.style.top = `${baseTop + (isSolo ? 0 : i * 3)}px`;
      m.style.left = `${baseLeft + (isSolo ? 0 : i * 3)}px`;
      m.style.zIndex = String(i + 1);
    }
  }

  private applyFanPositions(cluster: Cluster): void {
    const { baseTop, baseLeft } = cluster.entries[0];
    const count = cluster.entries.length;
    const totalWidth = (count - 1) * FAN_SPACING;
    const startLeft = baseLeft - totalWidth / 2;

    for (let i = 0; i < count; i++) {
      const m = clusterMarker(cluster, i);
      if (!m) continue;
      m.style.top = `${baseTop}px`;
      m.style.left = `${startLeft + i * FAN_SPACING}px`;
      m.style.zIndex = String(10 + i);
    }
  }

  private addClusterBadge(cluster: Cluster): void {
    const topMarker = clusterMarker(cluster, cluster.entries.length - 1);
    if (!topMarker) return;
    const badge = el("div", {
      class: "sp-cluster-badge",
      style: `
        position:absolute;top:-6px;right:-6px;
        min-width:16px;height:16px;padding:0 4px;
        border-radius:9999px;
        background:${this.colors.accent};color:#fff;
        font-size:10px;font-weight:700;
        display:flex;align-items:center;justify-content:center;
        border:1.5px solid #fff;
        pointer-events:none;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        line-height:1;
      `,
    });
    setText(badge, String(cluster.entries.length));
    topMarker.appendChild(badge);
  }

  private setBadgesVisible(cluster: Cluster, visible: boolean): void {
    for (let i = 0; i < cluster.entries.length; i++) {
      const badge = clusterMarker(cluster, i)?.querySelector(".sp-cluster-badge") as HTMLElement | null;
      if (badge) badge.style.display = visible ? "flex" : "none";
    }
  }

  private findCluster(marker: HTMLElement): Cluster | null {
    for (const cluster of this.clusters) {
      if (cluster.entries.length <= 1) continue;
      for (let i = 0; i < cluster.entries.length; i++) {
        if (clusterMarker(cluster, i) === marker) return cluster;
      }
    }
    return null;
  }

  private handleClusterClick(marker: HTMLElement, e: MouseEvent): boolean {
    const cluster = this.findCluster(marker);
    if (!cluster) return false;
    if (!cluster.expanded) {
      e.stopPropagation();
      this.collapseAllClusters();
      cluster.expanded = true;
      this.applyFanPositions(cluster);
      this.setBadgesVisible(cluster, false);
      return true;
    }
    return false;
  }

  private collapseCluster(cluster: Cluster): void {
    if (!cluster.expanded) return;
    cluster.expanded = false;
    this.applyStackPositions(cluster);
    this.setBadgesVisible(cluster, true);
  }

  private collapseAllClusters(): void {
    for (const cluster of this.clusters) {
      this.collapseCluster(cluster);
    }
  }

  private applyConfidenceStyle(marker: HTMLElement, confidence: number, feedback: FeedbackResponse): void {
    const isResolved = feedback.status === "resolved";
    if (confidence < LOW_CONFIDENCE_THRESHOLD && !isResolved) {
      marker.style.borderStyle = "dashed";
      marker.style.opacity = "0.7";
      marker.title = `Position approximative (confiance : ${Math.round(confidence * 100)}%)`;
    } else {
      marker.style.borderStyle = "solid";
      marker.style.opacity = "1";
      marker.title = "";
    }
  }

  private createMarker(number: number, feedback: FeedbackResponse, pos: { top: number; left: number }): HTMLElement {
    const typeColor = getTypeColor(feedback.type, this.colors);
    const isResolved = feedback.status === "resolved";

    const marker = el("div", {
      style: `
        position:absolute;
        top:${pos.top}px;
        left:${pos.left}px;
        width:26px;height:26px;
        border-radius:50%;
        background:${isResolved ? "rgba(241,245,249,0.9)" : "rgba(255,255,255,0.92)"};
        backdrop-filter:blur(12px);
        -webkit-backdrop-filter:blur(12px);
        border:2px solid ${isResolved ? "#cbd5e1" : typeColor};
        display:flex;align-items:center;justify-content:center;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:11px;font-weight:700;
        color:${isResolved ? "#94a3b8" : typeColor};
        cursor:pointer;pointer-events:auto;
        box-shadow:${isResolved ? "0 2px 8px rgba(0,0,0,0.06)" : `0 2px 12px ${typeColor}25, 0 2px 6px rgba(0,0,0,0.06)`};
        transition:top 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.15s ease, box-shadow 0.15s ease;
        user-select:none;
        -webkit-font-smoothing:antialiased;
      `,
    });
    marker.dataset.feedbackId = feedback.id;
    marker.setAttribute("tabindex", "0");
    marker.setAttribute("role", "button");
    marker.setAttribute(
      "aria-label",
      `Feedback #${number}: ${feedback.type} — ${feedback.message.slice(0, 60)}${feedback.message.length > 60 ? "..." : ""}`,
    );
    marker.setAttribute("aria-describedby", this.tooltip.tooltipId);
    setText(marker, isResolved ? "\u2713" : String(number));

    marker.addEventListener("mouseenter", () => {
      marker.style.transform = "scale(1.2)";
      marker.style.boxShadow = isResolved
        ? "0 4px 16px rgba(0,0,0,0.1)"
        : `0 4px 20px ${typeColor}35, 0 4px 12px rgba(0,0,0,0.08)`;
      this.tooltip.show(feedback, marker.getBoundingClientRect());
      if (!this.pinnedFeedback) this.showHighlight(feedback);
    });

    marker.addEventListener("mouseleave", () => {
      marker.style.transform = "scale(1)";
      marker.style.boxShadow = isResolved
        ? "0 2px 8px rgba(0,0,0,0.06)"
        : `0 2px 12px ${typeColor}25, 0 2px 6px rgba(0,0,0,0.06)`;
      this.tooltip.scheduleHide();
      if (!this.pinnedFeedback) this.clearHighlight();
    });

    const activateMarker = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof MouseEvent && this.handleClusterClick(marker, e)) return;
      this.pinHighlight(feedback);
      this.bus.emit("panel:toggle", true);
      marker.dispatchEvent(
        new CustomEvent("sp-marker-click", {
          detail: { feedbackId: feedback.id },
          bubbles: true,
        }),
      );
    };

    marker.addEventListener("click", (e) => activateMarker(e));
    marker.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activateMarker(e);
      }
    });

    return marker;
  }

  highlight(feedbackId: string): void {
    for (const entry of this.entries) {
      if (entry.feedback.id === feedbackId) {
        for (const markerEl of entry.elements) {
          markerEl.style.animation = "sp-pulse-ring 0.7s ease-out";
          markerEl.addEventListener(
            "animationend",
            () => {
              markerEl.style.animation = "";
            },
            { once: true },
          );
        }
      }
    }
  }

  showHighlight(feedback: FeedbackResponse): void {
    this.removeHighlightElements();
    for (const annotation of feedback.annotations) {
      const resolved = resolveAnnotation(toAnchorData(annotation), toRectData(annotation));
      if (!resolved) continue;

      const typeColor = getTypeColor(feedback.type, this.colors);
      const rect = resolved.rect;
      const highlight = el("div", {
        style: `
          position:absolute;
          top:${rect.top + window.scrollY}px;
          left:${rect.left + window.scrollX}px;
          width:${rect.width}px;height:${rect.height}px;
          border:2px solid ${typeColor};
          background:${typeColor}0c;
          border-radius:8px;
          pointer-events:none;z-index:-1;
          opacity:0;
          box-shadow:0 0 16px ${typeColor}20;
          transition:opacity ${HIGHLIGHT_FADE}ms ease;
        `,
      });
      this.container.appendChild(highlight);
      this.highlightElements.push(highlight);
      highlight.offsetHeight;
      highlight.style.opacity = "1";
    }
  }

  pinHighlight(feedback: FeedbackResponse): void {
    this.unpinHighlight();
    this.showHighlight(feedback);
    this.pinnedFeedback = feedback;
    this.onDocumentClick = (e: MouseEvent) => {
      if (this.container.contains(e.target as Node)) return;
      this.unpinHighlight();
    };
    document.addEventListener("click", this.onDocumentClick, { capture: true });
  }

  private unpinHighlight(): void {
    if (this.onDocumentClick) {
      document.removeEventListener("click", this.onDocumentClick, { capture: true });
      this.onDocumentClick = null;
    }
    this.pinnedFeedback = null;
    this.clearHighlight();
  }

  private clearHighlight(): void {
    for (const h of this.highlightElements) {
      h.style.opacity = "0";
      setTimeout(() => h.remove(), HIGHLIGHT_FADE);
    }
    this.highlightElements = [];
  }

  private removeHighlightElements(): void {
    for (const h of this.highlightElements) h.remove();
    this.highlightElements = [];
  }

  clear(): void {
    this.unpinHighlight();
    this.container.replaceChildren();
    this.entries = [];
    this.clusters = [];
  }

  destroy(): void {
    this.unpinHighlight();
    if (this.repositionTimer) clearTimeout(this.repositionTimer);
    if (this.resizeHandler) window.removeEventListener("resize", this.resizeHandler);
    if (this.onDocumentClickForClusters) document.removeEventListener("click", this.onDocumentClickForClusters);
    this.mutationObserver?.disconnect();
    this.container.remove();
  }
}
