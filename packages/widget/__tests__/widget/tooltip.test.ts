// @vitest-environment jsdom

import type { FeedbackResponse } from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildThemeColors } from "../../src/styles/theme.js";
import { makeDOMRect, mockMatchMedia } from "../helpers.js";

// jsdom does not implement window.matchMedia — provide a stub
mockMatchMedia(false);

import { Tooltip } from "../../src/tooltip.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const colors = buildThemeColors();

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
    annotations: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Tooltip", () => {
  let tooltip: Tooltip;

  beforeEach(() => {
    vi.useFakeTimers();
    tooltip = new Tooltip(colors, "fr");
  });

  afterEach(() => {
    tooltip.destroy();
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Construction
  // -------------------------------------------------------------------------

  describe("construction", () => {
    it("creates a root element with role=tooltip", () => {
      const el = document.getElementById("sp-tooltip");
      expect(el).not.toBeNull();
      expect(el!.getAttribute("role")).toBe("tooltip");
    });

    it("sets the tooltip id to sp-tooltip", () => {
      expect(tooltip.tooltipId).toBe("sp-tooltip");
    });

    it("appends tooltip to document.body", () => {
      const el = document.getElementById("sp-tooltip")!;
      expect(el.parentElement).toBe(document.body);
    });

    it("starts not visible (opacity 0 or visibility hidden)", () => {
      const el = document.getElementById("sp-tooltip")!;
      // After construction the tooltip is invisible.
      // The show() method later sets visibility=visible and opacity=1.
      // Verify the tooltip is not yet visible by checking it hasn't been shown.
      expect(el.style.visibility).not.toBe("visible");
      expect(el.style.opacity).not.toBe("1");
    });
  });

  // -------------------------------------------------------------------------
  // Show
  // -------------------------------------------------------------------------

  describe("show", () => {
    it("renders feedback type badge after show delay", () => {
      const feedback = makeFeedback({ type: "bug" });
      tooltip.show(feedback, makeDOMRect(100, 200, 26, 26));

      vi.advanceTimersByTime(200); // SHOW_DELAY = 120ms

      const el = document.getElementById("sp-tooltip")!;
      const badge = el.querySelector("span");
      expect(badge).not.toBeNull();
      // French locale: "Bug"
      expect(badge!.textContent).toContain("Bug");
    });

    it("renders message preview", () => {
      const feedback = makeFeedback({ message: "This is a test message" });
      tooltip.show(feedback, makeDOMRect(100, 200, 26, 26));

      vi.advanceTimersByTime(200);

      const el = document.getElementById("sp-tooltip")!;
      expect(el.textContent).toContain("This is a test message");
    });

    it("renders date information", () => {
      const feedback = makeFeedback({ createdAt: new Date().toISOString() });
      tooltip.show(feedback, makeDOMRect(100, 200, 26, 26));

      vi.advanceTimersByTime(200);

      const el = document.getElementById("sp-tooltip")!;
      // The date element should be present (content varies by locale)
      const spans = el.querySelectorAll("span");
      // badge + date = at least 2 spans in header
      expect(spans.length).toBeGreaterThanOrEqual(2);
    });

    it("sets visibility to visible after show delay", () => {
      tooltip.show(makeFeedback(), makeDOMRect(100, 200, 26, 26));

      vi.advanceTimersByTime(200);

      const el = document.getElementById("sp-tooltip")!;
      expect(el.style.visibility).toBe("visible");
      expect(el.style.opacity).toBe("1");
    });

    it("positions tooltip above marker by default (when space allows)", () => {
      // Place marker at y=400, enough space above
      tooltip.show(makeFeedback(), makeDOMRect(100, 400, 26, 26));

      vi.advanceTimersByTime(200);

      const el = document.getElementById("sp-tooltip")!;
      const top = Number.parseFloat(el.style.top);
      // Tooltip should be above the marker (top < 400)
      expect(top).toBeLessThan(400);
    });

    it("positions tooltip below marker when not enough space above", () => {
      // Place marker near top of viewport (y=5)
      tooltip.show(makeFeedback(), makeDOMRect(100, 5, 26, 26));

      vi.advanceTimersByTime(200);

      const el = document.getElementById("sp-tooltip")!;
      const top = Number.parseFloat(el.style.top);
      // Tooltip should be below the marker (top > anchorRect.bottom + gap = 31 + 10)
      expect(top).toBeGreaterThan(5);
    });

    it("does not re-render for same feedback id", () => {
      const feedback = makeFeedback({ id: "fb-same" });
      tooltip.show(feedback, makeDOMRect(100, 200, 26, 26));

      vi.advanceTimersByTime(200);

      const el = document.getElementById("sp-tooltip")!;
      const childrenBefore = el.children.length;

      // Show same feedback again — should be a no-op
      tooltip.show(feedback, makeDOMRect(100, 200, 26, 26));
      vi.advanceTimersByTime(200);

      expect(el.children.length).toBe(childrenBefore);
    });
  });

  // -------------------------------------------------------------------------
  // scheduleHide / cancelHide
  // -------------------------------------------------------------------------

  describe("scheduleHide", () => {
    it("hides tooltip after delay", () => {
      tooltip.show(makeFeedback(), makeDOMRect(100, 200, 26, 26));
      vi.advanceTimersByTime(200);

      tooltip.scheduleHide();
      vi.advanceTimersByTime(200); // HIDE_DELAY = 80ms + some buffer

      const el = document.getElementById("sp-tooltip")!;
      expect(el.style.opacity).toBe("0");
    });
  });

  describe("cancelHide", () => {
    it("prevents scheduled hide from executing", () => {
      tooltip.show(makeFeedback(), makeDOMRect(100, 200, 26, 26));
      vi.advanceTimersByTime(200);

      tooltip.scheduleHide();
      tooltip.cancelHide();
      vi.advanceTimersByTime(200);

      const el = document.getElementById("sp-tooltip")!;
      expect(el.style.opacity).toBe("1");
    });
  });

  // -------------------------------------------------------------------------
  // contains
  // -------------------------------------------------------------------------

  describe("contains", () => {
    it("returns true for tooltip own DOM nodes", () => {
      const el = document.getElementById("sp-tooltip")!;
      expect(tooltip.contains(el)).toBe(true);
    });

    it("returns true for child nodes of the tooltip", () => {
      tooltip.show(makeFeedback(), makeDOMRect(100, 200, 26, 26));
      vi.advanceTimersByTime(200);

      const el = document.getElementById("sp-tooltip")!;
      const child = el.querySelector("div");
      if (child) {
        expect(tooltip.contains(child)).toBe(true);
      }
    });

    it("returns false for unrelated DOM nodes", () => {
      const unrelated = document.createElement("div");
      document.body.appendChild(unrelated);

      expect(tooltip.contains(unrelated)).toBe(false);

      unrelated.remove();
    });
  });

  // -------------------------------------------------------------------------
  // Destroy
  // -------------------------------------------------------------------------

  describe("destroy", () => {
    it("removes tooltip element from DOM", () => {
      tooltip.destroy();

      const el = document.getElementById("sp-tooltip");
      expect(el).toBeNull();
    });

    it("clears show timer on destroy", () => {
      // Start showing but don't wait for delay
      tooltip.show(makeFeedback(), makeDOMRect(100, 200, 26, 26));

      tooltip.destroy();

      // Advancing timers should not throw (timer cleared)
      vi.advanceTimersByTime(500);
    });

    it("clears hide timer on destroy", () => {
      tooltip.show(makeFeedback(), makeDOMRect(100, 200, 26, 26));
      vi.advanceTimersByTime(200);
      tooltip.scheduleHide();

      tooltip.destroy();

      // Advancing timers should not throw (timer cleared)
      vi.advanceTimersByTime(500);
    });
  });

  // -------------------------------------------------------------------------
  // hide
  // -------------------------------------------------------------------------

  describe("hide", () => {
    it("sets visibility to hidden after 200ms post-fade-out", () => {
      tooltip.show(makeFeedback(), makeDOMRect(100, 200, 26, 26));
      vi.advanceTimersByTime(200);

      const el = document.getElementById("sp-tooltip")!;
      expect(el.style.visibility).toBe("visible");

      // Trigger immediate hide() — currentFeedbackId is reset to null synchronously
      tooltip.hide();

      // The visibility flip happens after the 200ms transition timeout
      vi.advanceTimersByTime(250);

      expect(el.style.visibility).toBe("hidden");
      expect(el.style.opacity).toBe("0");
    });

    it("keeps visibility visible if a new feedback is shown before the 200ms timeout completes", () => {
      tooltip.show(makeFeedback({ id: "fb-a" }), makeDOMRect(100, 200, 26, 26));
      vi.advanceTimersByTime(200);

      // Hide initiates a 200ms timer that flips visibility -> hidden
      tooltip.hide();

      // Show a different feedback BEFORE the 200ms hide-timeout fires.
      // The render() inside show() runs after SHOW_DELAY=120ms — once that
      // runs, currentFeedbackId is set, so the pending hide-timeout's
      // `if (!this.currentFeedbackId)` check is false → visibility stays visible.
      tooltip.show(makeFeedback({ id: "fb-b" }), makeDOMRect(100, 200, 26, 26));
      vi.advanceTimersByTime(150); // run SHOW_DELAY (120ms) → render fires

      // Now flush the residual 200ms hide timer
      vi.advanceTimersByTime(100);

      const el = document.getElementById("sp-tooltip")!;
      expect(el.style.visibility).toBe("visible");
    });
  });

  // -------------------------------------------------------------------------
  // Default locale + reduced-motion
  // -------------------------------------------------------------------------

  describe("default locale + reduced-motion", () => {
    it("constructs without locale arg (defaults to en)", () => {
      // Destroy the beforeEach tooltip first so id collisions don't shadow
      // the second instance.
      tooltip.destroy();

      const t = new Tooltip(colors);
      try {
        t.show(makeFeedback({ type: "bug" }), makeDOMRect(100, 200, 26, 26));
        vi.advanceTimersByTime(200);

        const el = document.getElementById("sp-tooltip")!;
        const badge = el.querySelector("span");
        expect(badge).not.toBeNull();
        // English locale label for "bug"
        expect(badge!.textContent).toContain("Bug");
      } finally {
        t.destroy();
        // Re-create to satisfy afterEach destroy
        tooltip = new Tooltip(colors, "fr");
      }
    });

    it("disables transition when prefers-reduced-motion: reduce matches", () => {
      // Re-mock matchMedia BEFORE constructing the tooltip we need to call show()
      // on. The check happens live inside show().
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query.includes("prefers-reduced-motion"),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      tooltip.show(makeFeedback(), makeDOMRect(100, 200, 26, 26));
      vi.advanceTimersByTime(200);

      const el = document.getElementById("sp-tooltip")!;
      // The reduced-motion branch sets transition to "none"
      expect(el.style.transition).toBe("none");

      // Restore matchMedia to non-matching for other tests
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    });
  });

  // -------------------------------------------------------------------------
  // Tooltip root mouse handlers (cancelHide / scheduleHide)
  // -------------------------------------------------------------------------

  describe("root mouse handlers", () => {
    it("mouseenter on tooltip cancels a pending hide", () => {
      tooltip.show(makeFeedback(), makeDOMRect(100, 200, 26, 26));
      vi.advanceTimersByTime(200);

      // Schedule a hide — opacity will drop to 0 after HIDE_DELAY=80ms
      tooltip.scheduleHide();

      // Mouseenter on root cancels the hide timer
      const el = document.getElementById("sp-tooltip")!;
      el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      // Advance past the original hide delay — visibility should remain
      vi.advanceTimersByTime(200);
      expect(el.style.opacity).toBe("1");
    });

    it("mouseleave on tooltip schedules a hide", () => {
      tooltip.show(makeFeedback(), makeDOMRect(100, 200, 26, 26));
      vi.advanceTimersByTime(200);

      const el = document.getElementById("sp-tooltip")!;
      el.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

      // After HIDE_DELAY (80ms) the hide() runs → opacity drops to 0
      vi.advanceTimersByTime(150);
      expect(el.style.opacity).toBe("0");
    });
  });

  // -------------------------------------------------------------------------
  // Re-render preserves arrow element (covers `child !== this.arrow` else)
  // -------------------------------------------------------------------------

  describe("render", () => {
    it("preserves the arrow element when re-rendering different feedback", () => {
      // First render
      tooltip.show(makeFeedback({ id: "fb-1", message: "first" }), makeDOMRect(100, 200, 26, 26));
      vi.advanceTimersByTime(200);

      const el = document.getElementById("sp-tooltip")!;
      // Hide so currentFeedbackId resets and we can re-render with another id
      tooltip.hide();
      vi.advanceTimersByTime(250);

      // Show different feedback — render runs again, iterating children including the arrow
      tooltip.show(makeFeedback({ id: "fb-2", message: "second" }), makeDOMRect(100, 200, 26, 26));
      vi.advanceTimersByTime(200);

      // Arrow element should still be inside the tooltip (the else branch
      // skipped removal of the arrow during the second render)
      expect(el.children.length).toBeGreaterThanOrEqual(3); // header + body + arrow
      // Body should now reflect the new message
      expect(el.textContent).toContain("second");
    });
  });
});
