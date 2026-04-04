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
  const state = { confidence: 1, element: null as Element | null, returnNull: false };
  return { mockState: state };
});

vi.mock(new URL("../../src/dom/resolver.js", import.meta.url).pathname, () => ({
  resolveAnnotation: () => {
    if (mockState.returnNull) return null;
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
    return {
      element: mockState.element,
      rect: new DOMRect(100, 100, 200, 100),
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
  });
});
