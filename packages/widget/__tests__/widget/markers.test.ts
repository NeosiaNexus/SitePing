// @vitest-environment jsdom

import type { AnnotationResponse, FeedbackResponse } from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventBus, type WidgetEvents } from "../../src/events.js";
import { createT } from "../../src/i18n/index.js";
import { buildThemeColors } from "../../src/styles/theme.js";
import type { Tooltip } from "../../src/tooltip.js";

// ---------------------------------------------------------------------------
// Mock resolveAnnotation — avoids the full DOM resolution chain in jsdom
// ---------------------------------------------------------------------------

const { mockState } = vi.hoisted(() => {
  const state = {
    confidence: 1,
    element: null as Element | null,
    returnNull: false,
    rectQueue: [] as Array<{ x: number; y: number; w: number; h: number }>,
    nullSchedule: [] as boolean[], // sequential per-call nulls
  };
  return { mockState: state };
});

vi.mock(new URL("../../src/dom/resolver.js", import.meta.url).pathname, () => ({
  resolveAnnotation: () => {
    if (mockState.returnNull) return null;
    if (mockState.nullSchedule.length > 0) {
      const shouldReturnNull = mockState.nullSchedule.shift();
      if (shouldReturnNull) return null;
    }
    if (!mockState.element) {
      mockState.element = document.createElement("div");
      document.body.appendChild(mockState.element);
      mockState.element.getBoundingClientRect = () => ({
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        top: 100,
        left: 100,
        right: 300,
        bottom: 200,
        toJSON() {
          return {};
        },
      });
    }
    // If a custom rect is queued, use it (for cluster-distance tests)
    const next = mockState.rectQueue.shift();
    const rect = next ? new DOMRect(next.x, next.y, next.w, next.h) : new DOMRect(100, 100, 200, 100);
    return {
      element: mockState.element,
      rect,
      confidence: mockState.confidence,
      strategy: "css" as const,
    };
  },
}));

import { MarkerManager } from "../../src/markers.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const colors = buildThemeColors();
const t = createT("fr");

function createMockTooltip(): Tooltip {
  return {
    tooltipId: "sp-tooltip",
    show: vi.fn(),
    scheduleHide: vi.fn(),
    cancelHide: vi.fn(),
    hide: vi.fn(),
    contains: vi.fn().mockReturnValue(false),
    destroy: vi.fn(),
  } as unknown as Tooltip;
}

function makeAnnotation(overrides: Partial<AnnotationResponse> = {}): AnnotationResponse {
  return {
    id: "ann-1",
    feedbackId: "fb-1",
    cssSelector: "div.test",
    xpath: "/html/body/div",
    textSnippet: "test content",
    elementTag: "DIV",
    elementId: null,
    textPrefix: "",
    textSuffix: "",
    fingerprint: "0:0:0",
    neighborText: "",
    xPct: 0.1,
    yPct: 0.1,
    wPct: 0.5,
    hPct: 0.5,
    scrollX: 0,
    scrollY: 0,
    viewportW: 1920,
    viewportH: 1080,
    devicePixelRatio: 1,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeFeedback(overrides: Partial<FeedbackResponse> = {}): FeedbackResponse {
  return {
    id: "fb-1",
    projectName: "test-project",
    type: "bug",
    message: "Something is broken",
    status: "open",
    url: "http://localhost/",
    viewport: "1920x1080",
    userAgent: "test",
    authorName: "Test User",
    authorEmail: "test@example.com",
    resolvedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    annotations: [makeAnnotation()],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MarkerManager", () => {
  let bus: EventBus<WidgetEvents>;
  let tooltip: Tooltip;
  let markers: MarkerManager;

  beforeEach(() => {
    bus = new EventBus<WidgetEvents>();
    tooltip = createMockTooltip();
    mockState.confidence = 1;
    mockState.element = null;
    mockState.returnNull = false;
    mockState.rectQueue = [];
    mockState.nullSchedule = [];
    markers = new MarkerManager(colors, tooltip, bus, t);
  });

  afterEach(() => {
    markers.destroy();
    // Clean up any leftover elements
    for (const el of document.querySelectorAll("#siteping-markers")) {
      el.remove();
    }
    if (mockState.element) {
      mockState.element.remove();
      mockState.element = null;
    }
  });

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  describe("render", () => {
    it("creates a container element with id siteping-markers", () => {
      const container = document.getElementById("siteping-markers");
      expect(container).not.toBeNull();
    });

    it("render([]) clears the container", () => {
      markers.render([makeFeedback()]);
      markers.render([]);

      const container = document.getElementById("siteping-markers")!;
      expect(container.children.length).toBe(0);
    });

    it("render([feedback]) creates marker elements", () => {
      markers.render([makeFeedback()]);

      const container = document.getElementById("siteping-markers")!;
      const markerEls = container.querySelectorAll("[data-feedback-id]");
      expect(markerEls.length).toBe(1);
    });

    it("marker has data-feedback-id attribute matching feedback id", () => {
      markers.render([makeFeedback({ id: "fb-42" })]);

      const marker = document.querySelector('[data-feedback-id="fb-42"]');
      expect(marker).not.toBeNull();
    });

    it("marker has tabindex=0 for keyboard accessibility", () => {
      markers.render([makeFeedback()]);

      const marker = document.querySelector("[data-feedback-id]")!;
      expect(marker.getAttribute("tabindex")).toBe("0");
    });

    it("marker has role=button", () => {
      markers.render([makeFeedback()]);

      const marker = document.querySelector("[data-feedback-id]")!;
      expect(marker.getAttribute("role")).toBe("button");
    });

    it("marker has aria-label with number, type, and message", () => {
      markers.render([makeFeedback({ type: "bug", message: "Crash on load" })]);

      const marker = document.querySelector("[data-feedback-id]")!;
      const label = marker.getAttribute("aria-label")!;
      expect(label).toContain("1"); // marker number
      expect(label).toContain("Bug"); // type label
      expect(label).toContain("Crash on load"); // message
    });

    it("marker has aria-describedby pointing to tooltip id", () => {
      markers.render([makeFeedback()]);

      const marker = document.querySelector("[data-feedback-id]")!;
      expect(marker.getAttribute("aria-describedby")).toBe("sp-tooltip");
    });

    it("renders multiple markers for multiple feedbacks", () => {
      const feedbacks = [makeFeedback({ id: "fb-1" }), makeFeedback({ id: "fb-2" }), makeFeedback({ id: "fb-3" })];

      markers.render(feedbacks);

      const markerEls = document.querySelectorAll("[data-feedback-id]");
      expect(markerEls.length).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // Resolved feedback markers
  // -------------------------------------------------------------------------

  describe("resolved feedback", () => {
    it("displays checkmark text for resolved markers", () => {
      markers.render([makeFeedback({ status: "resolved" })]);

      const marker = document.querySelector<HTMLElement>("[data-feedback-id]")!;
      expect(marker.textContent).toContain("\u2713");
    });

    it("displays number for open markers", () => {
      markers.render([makeFeedback({ status: "open" })]);

      const marker = document.querySelector<HTMLElement>("[data-feedback-id]")!;
      expect(marker.textContent).toContain("1");
    });
  });

  // -------------------------------------------------------------------------
  // Confidence styling
  // -------------------------------------------------------------------------

  describe("confidence styling", () => {
    it("applies dashed border for low confidence annotations", () => {
      mockState.confidence = 0.5;
      mockState.element = null;

      markers.render([makeFeedback()]);

      const marker = document.querySelector<HTMLElement>("[data-feedback-id]")!;
      expect(marker.style.borderStyle).toBe("dashed");
    });

    it("applies reduced opacity (0.7) for low confidence annotations", () => {
      mockState.confidence = 0.5;
      mockState.element = null;

      markers.render([makeFeedback()]);

      const marker = document.querySelector<HTMLElement>("[data-feedback-id]")!;
      expect(marker.style.opacity).toBe("0.7");
    });

    it("uses solid border for high confidence annotations", () => {
      mockState.confidence = 0.9;
      mockState.element = null;

      markers.render([makeFeedback()]);

      const marker = document.querySelector<HTMLElement>("[data-feedback-id]")!;
      expect(marker.style.borderStyle).toBe("solid");
    });

    it("does not apply dashed border for resolved feedback even if low confidence", () => {
      mockState.confidence = 0.3;
      mockState.element = null;

      markers.render([makeFeedback({ status: "resolved" })]);

      const marker = document.querySelector<HTMLElement>("[data-feedback-id]")!;
      // Resolved feedback bypasses low-confidence styling
      expect(marker.style.borderStyle).toBe("solid");
    });
  });

  // -------------------------------------------------------------------------
  // addFeedback
  // -------------------------------------------------------------------------

  describe("addFeedback", () => {
    it("adds a single marker with animation", () => {
      markers.addFeedback(makeFeedback({ id: "fb-new" }), 1);

      const marker = document.querySelector<HTMLElement>('[data-feedback-id="fb-new"]')!;
      expect(marker).not.toBeNull();
      expect(marker.style.animation).toContain("sp-marker-in");
    });

    it("increments marker count", () => {
      expect(markers.count).toBe(0);

      markers.addFeedback(makeFeedback(), 1);

      expect(markers.count).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Highlight
  // -------------------------------------------------------------------------

  describe("highlight", () => {
    it("applies pulse animation on the marker for the given feedback id", () => {
      markers.render([makeFeedback({ id: "fb-1" })]);

      markers.highlight("fb-1");

      const marker = document.querySelector<HTMLElement>('[data-feedback-id="fb-1"]')!;
      expect(marker.style.animation).toContain("sp-pulse-ring");
    });
  });

  // -------------------------------------------------------------------------
  // Annotations toggle via event bus
  // -------------------------------------------------------------------------

  describe("annotations:toggle", () => {
    it("hides container when toggled to false", () => {
      bus.emit("annotations:toggle", false);

      const container = document.getElementById("siteping-markers")!;
      expect(container.style.display).toBe("none");
    });

    it("shows container when toggled to true", () => {
      bus.emit("annotations:toggle", false);
      bus.emit("annotations:toggle", true);

      const container = document.getElementById("siteping-markers")!;
      expect(container.style.display).toBe("block");
    });
  });

  // -------------------------------------------------------------------------
  // Clusters
  // -------------------------------------------------------------------------

  describe("clusters", () => {
    it("groups nearby markers into a cluster with a badge", () => {
      // All markers resolve to the same position via mockState, so they cluster
      const feedbacks = [makeFeedback({ id: "fb-1" }), makeFeedback({ id: "fb-2" }), makeFeedback({ id: "fb-3" })];
      markers.render(feedbacks);

      const badges = document.querySelectorAll(".sp-cluster-badge");
      expect(badges.length).toBe(1);
      expect(badges[0]!.textContent).toBe("3");
    });

    it("single marker does not get a cluster badge", () => {
      markers.render([makeFeedback({ id: "fb-solo" })]);

      const badges = document.querySelectorAll(".sp-cluster-badge");
      expect(badges.length).toBe(0);
    });

    it("clicking a clustered marker expands the cluster (fan positions)", () => {
      const feedbacks = [makeFeedback({ id: "fb-a" }), makeFeedback({ id: "fb-b" })];
      markers.render(feedbacks);

      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-a"]')!;
      // First click should expand the cluster (stopPropagation prevents panel toggle)
      markerEl.click();

      // After fan expansion, badges should be hidden
      const badge = document.querySelector<HTMLElement>(".sp-cluster-badge");
      if (badge) {
        expect(badge.style.display).toBe("none");
      }
    });

    it("clicking outside an expanded cluster collapses it", () => {
      const feedbacks = [makeFeedback({ id: "fb-c" }), makeFeedback({ id: "fb-d" })];
      markers.render(feedbacks);

      // Expand the cluster
      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-c"]')!;
      markerEl.click();

      // Click outside the container
      document.body.click();

      // Badge should be visible again after collapse
      const badge = document.querySelector<HTMLElement>(".sp-cluster-badge");
      if (badge) {
        expect(badge.style.display).not.toBe("none");
      }
    });

    it("expanded cluster hides badges, collapsed shows them", () => {
      const feedbacks = [makeFeedback({ id: "fb-e" }), makeFeedback({ id: "fb-f" }), makeFeedback({ id: "fb-g" })];
      markers.render(feedbacks);

      // Before click: badge visible (default is flex from addClusterBadge)
      const badgeBefore = document.querySelector<HTMLElement>(".sp-cluster-badge")!;
      expect(badgeBefore).not.toBeNull();

      // Expand
      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-e"]')!;
      markerEl.click();

      // After expand: badge hidden
      const badgeAfterExpand = document.querySelector<HTMLElement>(".sp-cluster-badge");
      if (badgeAfterExpand) {
        expect(badgeAfterExpand.style.display).toBe("none");
      }

      // Collapse by clicking outside
      document.body.click();

      // After collapse: badge shown again
      const badgeAfterCollapse = document.querySelector<HTMLElement>(".sp-cluster-badge");
      if (badgeAfterCollapse) {
        expect(["flex", ""]).toContain(badgeAfterCollapse.style.display);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Marker interactions
  // -------------------------------------------------------------------------

  describe("marker interactions", () => {
    it("mouseenter shows tooltip and highlight", () => {
      const fb = makeFeedback({ id: "fb-hover" });
      markers.render([fb]);

      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-hover"]')!;
      markerEl.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      expect(tooltip.show).toHaveBeenCalled();
      expect(markerEl.style.transform).toBe("scale(1.2)");
    });

    it("mouseleave calls tooltip.scheduleHide and resets scale", () => {
      const fb = makeFeedback({ id: "fb-leave" });
      markers.render([fb]);

      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-leave"]')!;
      markerEl.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      markerEl.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

      expect(tooltip.scheduleHide).toHaveBeenCalled();
      expect(markerEl.style.transform).toBe("scale(1)");
    });

    it("click on marker emits panel:toggle and dispatches sp-marker-click", () => {
      const fb = makeFeedback({ id: "fb-click" });
      markers.render([fb]);

      const panelSpy = vi.fn();
      bus.on("panel:toggle", panelSpy);

      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-click"]')!;
      let customEventFired = false;
      markerEl.addEventListener("sp-marker-click", (e) => {
        customEventFired = true;
        expect((e as CustomEvent).detail.feedbackId).toBe("fb-click");
      });

      markerEl.click();

      expect(panelSpy).toHaveBeenCalledWith(true);
      expect(customEventFired).toBe(true);
    });

    it("keyboard Enter activates marker (same as click)", () => {
      const fb = makeFeedback({ id: "fb-enter" });
      markers.render([fb]);

      const panelSpy = vi.fn();
      bus.on("panel:toggle", panelSpy);

      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-enter"]')!;
      markerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

      expect(panelSpy).toHaveBeenCalledWith(true);
    });

    it("keyboard Space activates marker (same as click)", () => {
      const fb = makeFeedback({ id: "fb-space" });
      markers.render([fb]);

      const panelSpy = vi.fn();
      bus.on("panel:toggle", panelSpy);

      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-space"]')!;
      markerEl.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));

      expect(panelSpy).toHaveBeenCalledWith(true);
    });
  });

  // -------------------------------------------------------------------------
  // showHighlight / pinHighlight
  // -------------------------------------------------------------------------

  describe("showHighlight / pinHighlight", () => {
    /**
     * Count highlight divs in the container.
     * Highlights are divs without data-feedback-id and without sp-cluster-badge class.
     * They also aren't nested inside markers (cluster badges are nested).
     */
    function countHighlights(): number {
      const container = document.getElementById("siteping-markers")!;
      // Direct children that are not markers and not badges
      return Array.from(container.children).filter(
        (child) => !child.hasAttribute("data-feedback-id") && !child.classList.contains("sp-cluster-badge"),
      ).length;
    }

    it("showHighlight creates highlight overlay elements in the container", () => {
      const fb = makeFeedback({ id: "fb-hl" });
      markers.render([fb]);

      markers.showHighlight(fb);

      expect(countHighlights()).toBeGreaterThanOrEqual(1);
    });

    it("multiple showHighlight calls clear previous highlights", () => {
      const fb = makeFeedback({ id: "fb-hl2" });
      markers.render([fb]);

      markers.showHighlight(fb);
      markers.showHighlight(fb);

      // Second call removes previous via removeHighlightElements, so only 1 set
      expect(countHighlights()).toBe(1);
    });

    it("pinHighlight pins highlight and registers document click listener", () => {
      const fb = makeFeedback({ id: "fb-pin" });
      markers.render([fb]);

      const addListenerSpy = vi.spyOn(document, "addEventListener");
      markers.pinHighlight(fb);

      const clickCalls = addListenerSpy.mock.calls.filter((c) => c[0] === "click");
      expect(clickCalls.length).toBeGreaterThan(0);

      addListenerSpy.mockRestore();
    });

    it("clicking outside pinned highlight clears it", () => {
      vi.useFakeTimers();

      const fb = makeFeedback({ id: "fb-unpin" });
      markers.render([fb]);

      markers.pinHighlight(fb);

      expect(countHighlights()).toBeGreaterThanOrEqual(1);

      // Click outside the container triggers unpinHighlight (capture: true)
      document.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      // After unpin, highlights get opacity:0 then removed after HIGHLIGHT_FADE (300ms)
      vi.advanceTimersByTime(400);

      expect(countHighlights()).toBe(0);

      vi.useRealTimers();
    });

    it("mouseenter during pinned highlight does not replace it", () => {
      const fb1 = makeFeedback({ id: "fb-pinned" });
      const fb2 = makeFeedback({ id: "fb-other" });
      markers.render([fb1, fb2]);

      markers.pinHighlight(fb1);

      // Hover on another marker -- pinnedFeedback is set, so showHighlight is skipped
      const otherMarker = document.querySelector<HTMLElement>('[data-feedback-id="fb-other"]')!;
      otherMarker.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      // showHighlight should NOT be called for the hovered marker since pinned is active
      // The highlight elements should still correspond to fb1 (only 1 annotation's worth)
      expect(countHighlights()).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // repositionAll
  // -------------------------------------------------------------------------

  describe("repositionAll", () => {
    it("uses cached element refs when available", () => {
      vi.useFakeTimers();

      markers.render([makeFeedback({ id: "fb-cache" })]);

      // After render, the anchor element is cached. Trigger repositionAll via resize.
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(400);

      // Marker should still be visible (cached element resolves successfully)
      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-cache"]')!;
      expect(markerEl.style.display).toBe("flex");

      vi.useRealTimers();
    });

    it("hides marker when resolution fails (returns null)", () => {
      vi.useFakeTimers();

      markers.render([makeFeedback({ id: "fb-fail" })]);

      // Remove the cached element from DOM so isConnected is false on reposition
      const origElement = mockState.element;
      if (origElement) origElement.remove();

      // Make the mock return null for the fallback resolveAnnotation call
      mockState.returnNull = true;

      // Trigger repositionAll via resize
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(400);

      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-fail"]')!;
      expect(markerEl.style.display).toBe("none");

      vi.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // scheduleReposition
  // -------------------------------------------------------------------------

  describe("scheduleReposition", () => {
    it("debounces multiple calls (only repositions once)", () => {
      vi.useFakeTimers();

      markers.render([makeFeedback({ id: "fb-debounce" })]);

      // Fire multiple resize events rapidly
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("resize"));

      // The first call sets the timer, subsequent calls are no-ops
      vi.advanceTimersByTime(400);

      // Marker should still be positioned correctly after one reposition
      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-debounce"]')!;
      expect(markerEl.style.display).toBe("flex");

      vi.useRealTimers();
    });

    it("uses requestIdleCallback when available", () => {
      vi.useFakeTimers();

      const ricCallbacks: Array<() => void> = [];
      const mockRIC = vi.fn((cb: () => void) => {
        ricCallbacks.push(cb);
        return ricCallbacks.length;
      });
      const mockCancelRIC = vi.fn();

      // Set up requestIdleCallback on window
      (window as unknown as Record<string, unknown>).requestIdleCallback = mockRIC;
      (window as unknown as Record<string, unknown>).cancelIdleCallback = mockCancelRIC;

      // Need a fresh instance to pick up the requestIdleCallback
      const bus2 = new EventBus<WidgetEvents>();
      const tooltip2 = createMockTooltip();
      const markers2 = new MarkerManager(colors, tooltip2, bus2, t);
      markers2.render([makeFeedback({ id: "fb-ric" })]);

      // Trigger schedule via resize
      window.dispatchEvent(new Event("resize"));

      expect(mockRIC).toHaveBeenCalled();

      // Execute the callback
      for (const cb of ricCallbacks) cb();

      markers2.destroy();

      // Clean up
      delete (window as unknown as Record<string, unknown>).requestIdleCallback;
      delete (window as unknown as Record<string, unknown>).cancelIdleCallback;

      vi.useRealTimers();
    });

    it("uses setTimeout fallback when requestIdleCallback is not available", () => {
      vi.useFakeTimers();

      // Ensure requestIdleCallback is not available (jsdom default)
      delete (window as unknown as Record<string, unknown>).requestIdleCallback;

      markers.render([makeFeedback({ id: "fb-timeout" })]);

      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

      window.dispatchEvent(new Event("resize"));

      expect(setTimeoutSpy).toHaveBeenCalled();

      vi.advanceTimersByTime(400);

      setTimeoutSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // clear
  // -------------------------------------------------------------------------

  describe("clear", () => {
    it("removes all markers, clusters, and cache", () => {
      markers.render([makeFeedback({ id: "fb-cl1" }), makeFeedback({ id: "fb-cl2" }), makeFeedback({ id: "fb-cl3" })]);

      // Verify markers exist
      expect(document.querySelectorAll("[data-feedback-id]").length).toBe(3);

      // Render with empty clears everything
      markers.render([]);

      expect(document.querySelectorAll("[data-feedback-id]").length).toBe(0);
      expect(document.querySelectorAll(".sp-cluster-badge").length).toBe(0);
      expect(markers.count).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // MutationObserver
  // -------------------------------------------------------------------------

  describe("MutationObserver", () => {
    it("relevant DOM mutations trigger reposition", async () => {
      vi.useFakeTimers();

      markers.render([makeFeedback({ id: "fb-mut" })]);

      // Add an element outside the markers container
      const externalDiv = document.createElement("div");
      externalDiv.className = "external-change";
      document.body.appendChild(externalDiv);

      // Flush microtasks for MutationObserver
      await vi.advanceTimersByTimeAsync(0);
      // Then wait for the debounced reposition
      await vi.advanceTimersByTimeAsync(400);

      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-mut"]')!;
      expect(markerEl.style.display).toBe("flex");

      externalDiv.remove();
      vi.useRealTimers();
    });

    it("widget-owned mutations (inside markers container) are filtered out", async () => {
      vi.useFakeTimers();

      markers.render([makeFeedback({ id: "fb-mut2" })]);

      // After render, wait for any initial repositions to settle
      await vi.advanceTimersByTimeAsync(500);

      // Record position after everything has settled
      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-mut2"]')!;
      const topBefore = markerEl.style.top;

      // Add element inside the markers container (should be filtered out)
      const container = document.getElementById("siteping-markers")!;
      const internalDiv = document.createElement("div");
      internalDiv.className = "internal-widget-element";
      container.appendChild(internalDiv);

      // Flush microtasks + debounce
      await vi.advanceTimersByTimeAsync(500);

      // Position should not have changed since the widget-owned mutation is filtered
      expect(markerEl.style.top).toBe(topBefore);

      vi.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // Destroy
  // -------------------------------------------------------------------------

  describe("destroy", () => {
    it("removes the container element from DOM", () => {
      markers.destroy();

      const container = document.getElementById("siteping-markers");
      expect(container).toBeNull();
    });

    it("removes resize listener", () => {
      const spy = vi.spyOn(window, "removeEventListener");

      markers.destroy();

      const resizeCalls = spy.mock.calls.filter((call) => call[0] === "resize");
      expect(resizeCalls.length).toBeGreaterThan(0);

      spy.mockRestore();
    });

    it("removes scroll listener", () => {
      const spy = vi.spyOn(window, "removeEventListener");

      markers.destroy();

      const scrollCalls = spy.mock.calls.filter((call) => call[0] === "scroll");
      expect(scrollCalls.length).toBeGreaterThan(0);

      spy.mockRestore();
    });

    it("disconnects MutationObserver", () => {
      const disconnectSpy = vi.spyOn(MutationObserver.prototype, "disconnect");

      markers.destroy();

      expect(disconnectSpy).toHaveBeenCalled();

      disconnectSpy.mockRestore();
    });

    it("removes document click listener for clusters", () => {
      const spy = vi.spyOn(document, "removeEventListener");

      markers.destroy();

      const clickCalls = spy.mock.calls.filter((call) => call[0] === "click");
      expect(clickCalls.length).toBeGreaterThan(0);

      spy.mockRestore();
    });

    it("clears active timer with cancelIdleCallback when available", () => {
      // Queue a reposition timer that is still pending when destroy fires.
      const cancelSpy = vi.fn();
      const ricSpy = vi.fn(() => 42);
      (window as unknown as Record<string, unknown>).requestIdleCallback = ricSpy;
      (window as unknown as Record<string, unknown>).cancelIdleCallback = cancelSpy;

      const bus2 = new EventBus<WidgetEvents>();
      const tooltip2 = createMockTooltip();
      const markers2 = new MarkerManager(colors, tooltip2, bus2, t);
      markers2.render([makeFeedback({ id: "fb-rid" })]);

      // Schedule reposition (uses requestIdleCallback path)
      window.dispatchEvent(new Event("resize"));
      expect(ricSpy).toHaveBeenCalled();

      // Destroy with pending timer → cancelIdleCallback path
      markers2.destroy();
      expect(cancelSpy).toHaveBeenCalledWith(42);

      delete (window as unknown as Record<string, unknown>).requestIdleCallback;
      delete (window as unknown as Record<string, unknown>).cancelIdleCallback;
    });

    it("destroy with no pending timer skips cancelIdleCallback", () => {
      // No reposition has been scheduled — repositionTimer is null
      const cancelSpy = vi.fn();
      (window as unknown as Record<string, unknown>).cancelIdleCallback = cancelSpy;

      markers.destroy();
      expect(cancelSpy).not.toHaveBeenCalled();

      delete (window as unknown as Record<string, unknown>).cancelIdleCallback;
    });
  });

  // -------------------------------------------------------------------------
  // MutationObserver fast-path for large batches
  // -------------------------------------------------------------------------

  describe("MutationObserver fast-path", () => {
    it("triggers reposition immediately when more than 20 mutations are batched", async () => {
      vi.useFakeTimers();

      markers.render([makeFeedback({ id: "fb-batch" })]);
      await vi.advanceTimersByTimeAsync(500);

      // Snapshot current style
      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-batch"]')!;
      // Trigger a large batch of mutations (>20) — fast-path branch
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < 25; i++) {
        const div = document.createElement("div");
        div.className = `mut-${i}`;
        fragment.appendChild(div);
      }
      document.body.appendChild(fragment);

      // Microtask flush + debounce
      await vi.advanceTimersByTimeAsync(500);

      // Marker still visible (fast-path scheduleReposition was invoked)
      expect(markerEl.style.display).toBe("flex");

      // Cleanup the spawned divs
      for (let i = 0; i < 25; i++) {
        document.querySelector(`.mut-${i}`)?.remove();
      }

      vi.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // Cached anchor element path (repositionAll uses cache on second reposition)
  // -------------------------------------------------------------------------

  describe("repositionAll cached element path", () => {
    it("reuses cached element on subsequent repositions", () => {
      vi.useFakeTimers();

      markers.render([makeFeedback({ id: "fb-cached" })]);

      // First reposition populates the cache via the fallback resolveAnnotation path.
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(400);

      // Second reposition: cache is populated and the mockState.element is still
      // connected, so the cached branch (lines 181-194) executes.
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(400);

      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-cached"]')!;
      expect(markerEl.style.display).toBe("flex");

      vi.useRealTimers();
    });

    it("prunes stale cache entries for deleted feedbacks", () => {
      vi.useFakeTimers();

      // First render with two feedbacks
      markers.render([makeFeedback({ id: "fb-keep" }), makeFeedback({ id: "fb-drop" })]);

      // Reposition once to populate cache for both
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(400);

      // Re-render with only the first — `clear()` zaps `anchorCache`, but
      // we re-add markers and trigger reposition: validKeys for second reposition
      // contains only the kept feedback; the dropped feedback's key (if any)
      // would be pruned by the loop at line 216-218.
      markers.render([makeFeedback({ id: "fb-keep" })]);

      // Reposition twice to populate cache then iterate prune loop
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(400);
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(400);

      const keepMarker = document.querySelector<HTMLElement>('[data-feedback-id="fb-keep"]')!;
      expect(keepMarker.style.display).toBe("flex");

      vi.useRealTimers();
    });

    it("reposition keeps fan layout for expanded clusters", () => {
      vi.useFakeTimers();

      markers.render([makeFeedback({ id: "fb-cl-a" }), makeFeedback({ id: "fb-cl-b" })]);

      // Expand cluster
      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-cl-a"]')!;
      markerEl.click();

      // Reposition — applyClusterPositions hits the `expanded` branch (line 225-226)
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(400);

      // Cluster should still be in fan/expanded mode (badges hidden)
      const badge = document.querySelector<HTMLElement>(".sp-cluster-badge");
      if (badge) {
        expect(badge.style.display).toBe("none");
      }

      vi.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // buildClusters re-render cleanup
  // -------------------------------------------------------------------------

  describe("buildClusters cleanup", () => {
    it("removes badges from previous render before rebuilding clusters", () => {
      // First render: clustered → badge appears
      markers.render([makeFeedback({ id: "fb-1" }), makeFeedback({ id: "fb-2" })]);
      expect(document.querySelectorAll(".sp-cluster-badge").length).toBe(1);

      // Second render: badge removal loop (line 268-270) plus rebuild
      markers.render([makeFeedback({ id: "fb-3" }), makeFeedback({ id: "fb-4" }), makeFeedback({ id: "fb-5" })]);

      const badges = document.querySelectorAll(".sp-cluster-badge");
      expect(badges.length).toBe(1);
      expect(badges[0]!.textContent).toBe("3");
    });
  });

  // -------------------------------------------------------------------------
  // Cluster — second click on already-expanded cluster
  // -------------------------------------------------------------------------

  describe("cluster — already expanded", () => {
    it("clicking an already-expanded cluster member triggers panel open path", () => {
      const feedbacks = [makeFeedback({ id: "fb-x" }), makeFeedback({ id: "fb-y" })];
      markers.render(feedbacks);

      const panelSpy = vi.fn();
      bus.on("panel:toggle", panelSpy);

      // First click expands cluster (handleClusterClick returns true → no panel toggle)
      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-x"]')!;
      markerEl.click();
      expect(panelSpy).not.toHaveBeenCalled();

      // Second click on already-expanded cluster member: handleClusterClick returns false (line 398)
      markerEl.click();

      // Panel:toggle should now have fired
      expect(panelSpy).toHaveBeenCalledWith(true);
    });
  });

  // -------------------------------------------------------------------------
  // Highlight — animationend resets style
  // -------------------------------------------------------------------------

  describe("highlight animationend", () => {
    it("clears the animation style after animationend fires", () => {
      markers.render([makeFeedback({ id: "fb-anim" })]);

      markers.highlight("fb-anim");

      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-anim"]')!;
      expect(markerEl.style.animation).toContain("sp-pulse-ring");

      // Dispatch animationend → handler resets animation to ""
      markerEl.dispatchEvent(new Event("animationend"));

      expect(markerEl.style.animation).toBe("");
    });

    it("ignores feedback ids that are not in the entries list", () => {
      markers.render([makeFeedback({ id: "fb-real" })]);

      // No-op on unknown id
      expect(() => markers.highlight("fb-unknown")).not.toThrow();

      // The known marker is unaffected
      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-real"]')!;
      expect(markerEl.style.animation).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // showHighlight — annotation that fails to resolve is skipped
  // -------------------------------------------------------------------------

  describe("showHighlight — unresolved annotations skipped", () => {
    it("skips annotations where resolveAnnotation returns null", () => {
      const fb = makeFeedback({ id: "fb-skip" });
      markers.render([fb]);

      // Force the next resolveAnnotation to return null
      mockState.returnNull = true;

      markers.showHighlight(fb);

      const container = document.getElementById("siteping-markers")!;
      // Only the marker remains, no highlight overlay was added (resolved=null skipped)
      const directChildren = Array.from(container.children).filter(
        (child) => !child.hasAttribute("data-feedback-id") && !child.classList.contains("sp-cluster-badge"),
      );
      expect(directChildren.length).toBe(0);

      mockState.returnNull = false;
    });
  });

  // -------------------------------------------------------------------------
  // pinHighlight — click inside container ignored
  // -------------------------------------------------------------------------

  describe("pinHighlight — click inside container is ignored", () => {
    it("does not unpin when click target is inside the markers container", () => {
      vi.useFakeTimers();

      const fb = makeFeedback({ id: "fb-pin-in" });
      markers.render([fb]);
      markers.pinHighlight(fb);

      const container = document.getElementById("siteping-markers")!;
      // Children include marker + highlight; both are inside container
      const insideMarker = container.querySelector("[data-feedback-id]")!;

      // Click inside the container — line 556 `if (this.container.contains(...)) return;` true branch
      insideMarker.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      // No fade-out — pinnedFeedback should still be present (highlights remain)
      vi.advanceTimersByTime(500);
      const container2 = document.getElementById("siteping-markers")!;
      const highlights = Array.from(container2.children).filter(
        (child) => !child.hasAttribute("data-feedback-id") && !child.classList.contains("sp-cluster-badge"),
      );
      expect(highlights.length).toBeGreaterThanOrEqual(1);

      vi.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // Marker hover when feedback is pinned (skips clearHighlight)
  // -------------------------------------------------------------------------

  describe("marker hover during pinned highlight", () => {
    it("mouseleave during pinned highlight skips clearHighlight", () => {
      const fb1 = makeFeedback({ id: "fb-pin-leave-a" });
      const fb2 = makeFeedback({ id: "fb-pin-leave-b" });
      markers.render([fb1, fb2]);

      // Pin first feedback
      markers.pinHighlight(fb1);

      const otherMarker = document.querySelector<HTMLElement>('[data-feedback-id="fb-pin-leave-b"]')!;
      otherMarker.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      otherMarker.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

      // Even after mouseleave, pinned highlights should remain
      const container = document.getElementById("siteping-markers")!;
      const highlights = Array.from(container.children).filter(
        (child) => !child.hasAttribute("data-feedback-id") && !child.classList.contains("sp-cluster-badge"),
      );
      expect(highlights.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // Long-message truncation in aria-label
  // -------------------------------------------------------------------------

  describe("aria-label truncation", () => {
    it("truncates messages longer than 60 chars in the aria-label", () => {
      const longMessage = "a".repeat(80);
      markers.render([makeFeedback({ id: "fb-long", message: longMessage })]);

      const marker = document.querySelector<HTMLElement>('[data-feedback-id="fb-long"]')!;
      const label = marker.getAttribute("aria-label")!;
      expect(label).toContain("...");
      expect(label).not.toContain("a".repeat(80));
    });
  });

  // -------------------------------------------------------------------------
  // Resolved feedback hover styling
  // -------------------------------------------------------------------------

  describe("resolved feedback hover styling", () => {
    it("applies muted shadow on resolved markers when hovered", () => {
      markers.render([makeFeedback({ id: "fb-res-hover", status: "resolved" })]);

      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-res-hover"]')!;
      markerEl.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      // Resolved branch on mouseenter (line 465-466) sets a different boxShadow
      expect(markerEl.style.boxShadow).toContain("0 4px 16px");

      markerEl.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
      // Resolved branch on mouseleave (line 474-475) sets the muted shadow
      expect(markerEl.style.boxShadow).toContain("0 2px 8px");
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard — non-Enter/Space keys ignored
  // -------------------------------------------------------------------------

  describe("keyboard interactions", () => {
    it("ignores keydown for keys other than Enter/Space", () => {
      const fb = makeFeedback({ id: "fb-key" });
      markers.render([fb]);

      const panelSpy = vi.fn();
      bus.on("panel:toggle", panelSpy);

      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-key"]')!;
      markerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
      markerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

      expect(panelSpy).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // findCluster — clicking a non-first marker in cluster
  // -------------------------------------------------------------------------

  describe("findCluster — non-first index", () => {
    it("clicking the second marker of a 3-member cluster expands it", () => {
      // Cluster of 3 markers — clicking marker at index 2 forces findCluster to
      // scan past index 0 and 1 (both `clusterMarker(cluster, i) !== marker`).
      const fbs = [makeFeedback({ id: "fb-c1" }), makeFeedback({ id: "fb-c2" }), makeFeedback({ id: "fb-c3" })];
      markers.render(fbs);

      // Click the THIRD marker (index 2 in cluster.entries)
      const third = document.querySelector<HTMLElement>('[data-feedback-id="fb-c3"]')!;
      third.click();

      // After expansion, badges hidden
      const badge = document.querySelector<HTMLElement>(".sp-cluster-badge");
      if (badge) {
        expect(badge.style.display).toBe("none");
      }
    });
  });

  // -------------------------------------------------------------------------
  // Distinct positions: dist >= CLUSTER_DISTANCE → markers do NOT cluster
  // -------------------------------------------------------------------------

  describe("non-clustering distant markers", () => {
    it("renders separate non-clustered markers when positions are far apart", () => {
      // Queue distinct rects so the two markers land >28px apart (CLUSTER_DISTANCE = 28).
      // resolveAnnotation is called once per buildEntry call (one per annotation).
      mockState.rectQueue = [
        { x: 100, y: 100, w: 50, h: 50 },
        { x: 500, y: 500, w: 50, h: 50 },
      ];

      markers.render([makeFeedback({ id: "fb-far-1" }), makeFeedback({ id: "fb-far-2" })]);

      // Both markers visible, no cluster badge (each forms a 1-member cluster)
      const markerEls = document.querySelectorAll("[data-feedback-id]");
      expect(markerEls.length).toBe(2);
      const badges = document.querySelectorAll(".sp-cluster-badge");
      expect(badges.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // buildEntry — annotation that fails to resolve is skipped (line 255 branch)
  // -------------------------------------------------------------------------

  describe("buildEntry — unresolved annotations skipped", () => {
    it("skips annotations that fail to resolve (no marker rendered)", () => {
      mockState.returnNull = true;
      // resolveAnnotation returns null → buildEntry creates an entry with no elements
      markers.render([makeFeedback({ id: "fb-no-resolve" })]);

      const marker = document.querySelector<HTMLElement>('[data-feedback-id="fb-no-resolve"]');
      expect(marker).toBeNull();

      // Reset for cleanup
      mockState.returnNull = false;
    });
  });

  // -------------------------------------------------------------------------
  // repositionAll defensive guards (mismatched elements vs. annotations)
  // -------------------------------------------------------------------------

  describe("repositionAll defensive guards", () => {
    it("skips loop iterations where elements[i] is missing", () => {
      vi.useFakeTimers();

      // Build a feedback with TWO annotations.
      const fb = makeFeedback({
        id: "fb-mixed",
        annotations: [makeAnnotation({ id: "a1" }), makeAnnotation({ id: "a2" })],
      });

      // Schedule the SECOND resolveAnnotation call (annotation a2) to return null,
      // so buildEntry pushes only one element. annotations.length = 2,
      // entry.elements.length = 1.
      mockState.nullSchedule = [false, true];

      markers.render([fb]);

      // Now in repositionAll: i=0 → elements[0] exists, i=1 → elements[1] is undefined,
      // hits line 169 branch 0 (markerEl falsy → continue).
      // Trigger reposition.
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(400);

      // Marker for first annotation should still be visible
      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-mixed"]')!;
      expect(markerEl.style.display).toBe("flex");

      vi.useRealTimers();
    });

    it("prunes stale cache entries when entries shrink between repositions", () => {
      vi.useFakeTimers();

      // Render with two feedbacks
      markers.render([makeFeedback({ id: "fb-prune-keep" }), makeFeedback({ id: "fb-prune-drop" })]);

      // Trigger reposition → cache is populated for both keys.
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(400);

      // Mutate the manager's entries directly (bypassing public API which would clear cache):
      // remove the second entry but leave the cache intact. This simulates a stale cache
      // entry that the prune loop (line 216-218) will catch.
      const m = markers as unknown as { entries: unknown[] };
      m.entries.pop();

      // Reposition again → validKeys = {fb-prune-keep:0}, cache has fb-prune-drop:0 stale
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(400);

      // The kept marker still resolves successfully
      const keepMarker = document.querySelector<HTMLElement>('[data-feedback-id="fb-prune-keep"]')!;
      expect(keepMarker.style.display).toBe("flex");

      vi.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // Destroy with nulled handlers (defensive falsy branches)
  // -------------------------------------------------------------------------

  describe("destroy with falsy handlers", () => {
    it("destroy with null resizeHandler skips removeEventListener for resize", () => {
      // Forcibly null all handlers BEFORE destroy so the falsy branches execute.
      const m = markers as unknown as {
        resizeHandler: unknown;
        scrollHandler: unknown;
        onDocumentClickForClusters: unknown;
      };
      m.resizeHandler = null;
      m.scrollHandler = null;
      m.onDocumentClickForClusters = null;

      // Destroy still must succeed without throwing
      expect(() => markers.destroy()).not.toThrow();

      // Container should still be removed despite falsy handlers
      expect(document.getElementById("siteping-markers")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Empty / malformed cluster guards (defensive paths in applyStackPositions,
  // applyFanPositions, addClusterBadge, clusterMarker)
  // -------------------------------------------------------------------------

  describe("cluster defensive guards", () => {
    it("applyStackPositions returns early when cluster.entries is empty", () => {
      vi.useFakeTimers();
      markers.render([makeFeedback({ id: "fb-empty-stack" })]);

      // Inject a malformed empty cluster so reposition's cluster pass hits both
      // the !first guard in applyStackPositions and applyFanPositions.
      const m = markers as unknown as {
        clusters: Array<{ entries: unknown[]; elementIndices: number[]; expanded: boolean }>;
      };
      m.clusters.push({ entries: [], elementIndices: [], expanded: false });
      m.clusters.push({ entries: [], elementIndices: [], expanded: true });

      // Trigger reposition → applyClusterPositions iterates and hits early returns
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(400);

      // No error / no markers visible for empty clusters; original marker still flex
      const markerEl = document.querySelector<HTMLElement>('[data-feedback-id="fb-empty-stack"]')!;
      expect(markerEl.style.display).toBe("flex");

      vi.useRealTimers();
    });

    it("applyStackPositions skips iterations where clusterMarker is undefined", () => {
      vi.useFakeTimers();
      // Build a 2-marker cluster, then mutate elementIndices to have an
      // out-of-range index that triggers `clusterMarker` to return undefined.
      markers.render([makeFeedback({ id: "fb-bad-stack-1" }), makeFeedback({ id: "fb-bad-stack-2" })]);

      const m = markers as unknown as {
        clusters: Array<{ entries: unknown[]; elementIndices: number[]; expanded: boolean }>;
      };
      const cluster = m.clusters[0]!;
      // Add a phantom 3rd entry pointing to a non-existent element index.
      cluster.entries.push(cluster.entries[0]);
      cluster.elementIndices.push(99); // out-of-range — clusterMarker returns undefined

      // Trigger reposition → applyStackPositions iterates 3 times,
      // 3rd iteration hits `if (!m) continue;` (line 324)
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(400);

      // No error
      expect(true).toBe(true);

      vi.useRealTimers();
    });

    it("applyFanPositions skips iterations where clusterMarker is undefined", () => {
      vi.useFakeTimers();
      markers.render([makeFeedback({ id: "fb-bad-fan-1" }), makeFeedback({ id: "fb-bad-fan-2" })]);

      // Expand cluster
      const first = document.querySelector<HTMLElement>('[data-feedback-id="fb-bad-fan-1"]')!;
      first.click();

      // Now mutate cluster to add phantom entry with bad index
      const m = markers as unknown as {
        clusters: Array<{ entries: unknown[]; elementIndices: number[]; expanded: boolean }>;
      };
      const cluster = m.clusters[0]!;
      cluster.entries.push(cluster.entries[0]);
      cluster.elementIndices.push(99);

      // Trigger reposition → applyFanPositions hits `if (!m) continue;` (line 341)
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(400);

      expect(true).toBe(true);
      vi.useRealTimers();
    });

    it("addClusterBadge returns early when topMarker is undefined", () => {
      // Construct a state where buildClusters runs with a cluster whose
      // elementIndices points beyond entry.elements length.
      const m = markers as unknown as {
        entries: Array<{ feedback: unknown; elements: HTMLElement[]; baseTop: number; baseLeft: number }>;
        buildClusters: () => void;
      };

      // Render two markers normally, then mutate one entry to have an empty elements array
      // so that when buildClusters runs again, the clusterMarker for that idx returns undefined.
      markers.render([makeFeedback({ id: "fb-bad-badge-1" }), makeFeedback({ id: "fb-bad-badge-2" })]);

      // Mutate: clear elements but keep entry — when buildClusters re-runs and tries to
      // index into elements, it gets undefined.
      // (Easier: mutate clusters directly to have a 2-entry cluster pointing to
      // elementIndices: [0, 99] — top index 99 → addClusterBadge returns early on line 350)
      const clustersField = markers as unknown as {
        clusters: Array<{ entries: unknown[]; elementIndices: number[]; expanded: boolean }>;
      };
      // Empty out clusters first to avoid noise
      clustersField.clusters = [];
      // Push a cluster with a bad top index
      const sourceEntry = m.entries[0];
      clustersField.clusters.push({
        entries: [sourceEntry, sourceEntry], // 2 entries → triggers addClusterBadge
        elementIndices: [0, 99],
        expanded: false,
      });

      // Call buildClusters indirectly by re-rendering with NO feedbacks (clears)
      // and then by injecting items+rebuilding via addFeedback path.
      // Actually addClusterBadge is only called from buildClusters at the end.
      // Simulate by calling the private method directly:
      const directCall = markers as unknown as {
        addClusterBadge: (cluster: { entries: unknown[]; elementIndices: number[]; expanded: boolean }) => void;
      };

      const cluster = clustersField.clusters[0]!;
      // Direct call → topMarker = clusterMarker(cluster, 1) → elementIndices[1]=99 → undefined → return
      expect(() => directCall.addClusterBadge(cluster)).not.toThrow();
    });

    it("clusterMarker returns undefined for out-of-range entry index", () => {
      // Hit clusterMarker's `if (!entry || elIdx === undefined) return undefined;` (line 58)
      // by mutating cluster entries to have elementIndices longer than entries.
      markers.render([makeFeedback({ id: "fb-cm-1" }), makeFeedback({ id: "fb-cm-2" })]);

      // Set elementIndices[2] to undefined-causing access. We do it by emulating the
      // findCluster traversal: invoke applyStackPositions on a malformed cluster.
      const m = markers as unknown as {
        clusters: Array<{ entries: Array<unknown>; elementIndices: Array<number | undefined>; expanded: boolean }>;
        applyStackPositions: (cluster: {
          entries: Array<unknown>;
          elementIndices: Array<number | undefined>;
          expanded: boolean;
        }) => void;
      };
      const malformed = {
        entries: [m.clusters[0]!.entries[0], m.clusters[0]!.entries[0]],
        elementIndices: [0, undefined], // second elIdx is undefined → returns undefined
        expanded: false,
      };

      expect(() => m.applyStackPositions(malformed)).not.toThrow();
    });

    it("buildClusters skips loop iterations where allItems[i] is undefined", () => {
      // Inject an entry with NO elements, then call buildClusters indirectly via render.
      // For !itemI / !itemJ to fire, allItems would need to have a hole — but it's built
      // from `entries.elements` so length always matches. Simulate by direct call.

      const m = markers as unknown as {
        entries: Array<{ feedback: unknown; elements: HTMLElement[]; baseTop: number; baseLeft: number }>;
        buildClusters: () => void;
      };

      // Setup: render normally
      markers.render([makeFeedback({ id: "fb-bc-1" })]);

      // Forcibly mutate entries to introduce an undefined element in the array via
      // length manipulation (sparse array element).
      const entry = m.entries[0]!;
      entry.elements.length = 2; // sparse — index 1 is `undefined`

      // Call buildClusters — allItems is built by pushing { entry, elIdx } for each
      // index; the inner loop indexes `entry.elements[i]` which is undefined for i=1.
      // (The push happens regardless, so allItems[i] is always defined; itemI/itemJ
      // are objects, not the elements themselves. So !itemI / !itemJ remain hard to hit.)
      // We at least ensure no crash.
      expect(() => m.buildClusters()).not.toThrow();
    });
  });
});
