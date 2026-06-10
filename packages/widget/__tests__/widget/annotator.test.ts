// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventBus, type WidgetEvents } from "../../src/events.js";
import { createT } from "../../src/i18n/index.js";
import { buildThemeColors } from "../../src/styles/theme.js";
import { mockMatchMedia } from "../helpers.js";

// ---------------------------------------------------------------------------
// Stubs — jsdom lacks matchMedia
// ---------------------------------------------------------------------------

mockMatchMedia(false);

// ---------------------------------------------------------------------------
// Mock Popup — avoid real popup DOM during annotation tests
// ---------------------------------------------------------------------------

const popupMocks = vi.hoisted(() => {
  return {
    nextResult: { type: "bug" as const, message: "Test message" } as {
      type: "bug" | "improvement" | "praise" | "question";
      message: string;
    } | null,
    /**
     * The promise returned by the last `onSubmit` (= `runSubmission`) call,
     * so tests can await its settlement (e.g. on destroy mid-submit).
     */
    lastSubmitPromise: null as Promise<void> | null,
    /**
     * When true the mock's `show()` stays pending (mirroring the real popup,
     * which only resolves once `runSubmission` settles). Tests that exercise
     * the still-open-popup window (serialization, destroy-mid-submit) set this.
     */
    keepShowPending: false,
    /** `destroy()` call count on the live popup mock. */
    destroyCount: 0,
  };
});

vi.mock(new URL("../../src/popup.js", import.meta.url).pathname, () => ({
  Popup: vi.fn().mockImplementation(() => ({
    show: vi
      .fn()
      .mockImplementation((_rect: DOMRect, onSubmit?: (r: { type: string; message: string }) => Promise<void>) => {
        // The real popup awaits its `onSubmit` callback before resolving so
        // the spinner stays visible until feedback:sent or feedback:error
        // arrives. Tests don't run a launcher, so we fire-and-forget the
        // callback (its settlement is captured on `lastSubmitPromise` so
        // tests can await it) and resolve show() with the same result the
        // real popup would have produced on success.
        if (popupMocks.nextResult && onSubmit) {
          const submit = onSubmit(popupMocks.nextResult);
          popupMocks.lastSubmitPromise = submit;
          void submit.catch(() => {});
        }
        // `keepShowPending` mirrors the real popup keeping `show()` unresolved
        // while `runSubmission` is in flight — the overlay therefore stays up,
        // which is exactly the window the serialization guard must cover.
        if (popupMocks.keepShowPending) return new Promise(() => {});
        return Promise.resolve(popupMocks.nextResult);
      }),
    destroy: vi.fn().mockImplementation(() => {
      popupMocks.destroyCount += 1;
    }),
  })),
}));

// Mock anchor helpers to avoid @medv/finder dependency in jsdom
vi.mock(new URL("../../src/dom/anchor.js", import.meta.url).pathname, () => ({
  findAnchorElement: vi.fn().mockReturnValue(document.body),
  generateAnchor: vi.fn().mockReturnValue({
    cssSelector: "body",
    xpath: "/html/body",
    textSnippet: "",
    elementTag: "BODY",
    elementId: undefined,
    textPrefix: "",
    textSuffix: "",
    fingerprint: "0:0:0",
    neighborText: "",
  }),
  rectToPercentages: vi.fn().mockReturnValue({ xPct: 0, yPct: 0, wPct: 1, hPct: 1 }),
}));

import { Annotator } from "../../src/annotator.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const colors = buildThemeColors();
const t = createT("fr");

function createAnnotator() {
  const bus = new EventBus<WidgetEvents>();
  const annotator = new Annotator(colors, bus, t);
  return { annotator, bus };
}

/**
 * Find the annotator overlay — the focusable (tabindex="0") screenshot-ignored
 * div appended to body (the toolbar carries data-siteping-ignore too, but no
 * tabindex).
 */
function findOverlay(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('div[data-siteping-ignore][tabindex="0"]');
}

/** Count how many annotator overlays exist */
function countOverlays(): number {
  return document.body.querySelectorAll('div[data-siteping-ignore][tabindex="0"]').length;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Annotator", () => {
  let annotator: Annotator;
  let bus: EventBus<WidgetEvents>;

  beforeEach(() => {
    popupMocks.nextResult = { type: "bug", message: "Test message" };
    popupMocks.lastSubmitPromise = null;
    popupMocks.keepShowPending = false;
    popupMocks.destroyCount = 0;
    ({ annotator, bus } = createAnnotator());
  });

  afterEach(() => {
    annotator.destroy();
    // Remove any leftover overlay/toolbar DOM from async handlers that may not
    // have completed before the test ended (e.g. finishDrawing's await)
    for (const el of document.body.querySelectorAll('div[data-siteping-ignore][tabindex="0"]')) {
      el.remove();
    }
    for (const btn of document.body.querySelectorAll("button")) {
      if (btn.textContent === t("annotator.cancel")) {
        btn.parentElement?.remove();
      }
    }
  });

  // -------------------------------------------------------------------------
  // Activate / Deactivate
  // -------------------------------------------------------------------------

  describe("activate", () => {
    it("creates an overlay exposed to assistive tech on annotation:start", () => {
      bus.emit("annotation:start");

      const overlay = findOverlay();
      expect(overlay).not.toBeNull();
      // The overlay receives focus, so it must NOT be aria-hidden — a focused
      // aria-hidden element is invisible to screen readers (axe
      // "aria-hidden-focus"). It carries a role and an accessible name instead.
      expect(overlay!.hasAttribute("aria-hidden")).toBe(false);
      expect(overlay!.getAttribute("role")).toBe("application");
      expect(overlay!.getAttribute("aria-label")).toBe(t("annotator.instruction"));
    });

    it("focuses the overlay so the keyboard (Enter) annotation path receives keydown", () => {
      bus.emit("annotation:start");

      const overlay = findOverlay();
      expect(overlay).not.toBeNull();
      // onOverlayKeyDown only fires when the overlay itself is focused. Before
      // this fix, activeElement stayed on <body> and the Enter path was dead
      // (WCAG 2.1.1 Level A). The overlay carries tabindex=0.
      expect(document.activeElement).toBe(overlay);
    });

    it("restores focus to the pre-activation element on deactivate (WCAG 2.4.3)", () => {
      const target = document.createElement("button");
      document.body.appendChild(target);
      target.focus();

      try {
        bus.emit("annotation:start");
        expect(document.activeElement).toBe(findOverlay());

        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

        // Removing the focused overlay would strand focus on <body> without
        // the explicit restore in deactivate().
        expect(findOverlay()).toBeNull();
        expect(document.activeElement).toBe(target);
      } finally {
        target.remove();
      }
    });

    it("creates a toolbar element (button with cancel text) on activation", () => {
      bus.emit("annotation:start");

      // Toolbar contains a cancel button
      const buttons = document.body.querySelectorAll("button");
      const hasCancel = Array.from(buttons).some((btn) => btn.textContent === t("annotator.cancel"));
      expect(hasCancel).toBe(true);
    });

    it("registers an Escape keydown listener on the document", () => {
      const spy = vi.spyOn(document, "addEventListener");

      bus.emit("annotation:start");

      const keydownCalls = spy.mock.calls.filter((call) => call[0] === "keydown");
      expect(keydownCalls.length).toBeGreaterThan(0);

      spy.mockRestore();
    });

    it("locks page scroll by setting body overflow to hidden", () => {
      document.body.style.overflow = "auto";

      bus.emit("annotation:start");

      expect(document.body.style.overflow).toBe("hidden");
    });

    it("double activation is idempotent — no duplicate overlays", () => {
      bus.emit("annotation:start");
      bus.emit("annotation:start");

      expect(countOverlays()).toBe(1);
    });

    // Regression: issue #124 — the annotator's chrome lives on document.body
    // (outside the siteping-widget shadow host), so the screenshot predicate
    // can't reach it via the shadow-host check. Each piece must carry
    // `data-siteping-ignore="true"` or it gets baked into the JPEG.
    it("overlay carries data-siteping-ignore so it is excluded from screenshots", () => {
      bus.emit("annotation:start");

      const overlay = findOverlay()!;
      expect(overlay.getAttribute("data-siteping-ignore")).toBe("true");
    });

    it("toolbar carries data-siteping-ignore so it is excluded from screenshots", () => {
      bus.emit("annotation:start");

      // The toolbar is the sibling of the overlay — pick the one that hosts
      // the cancel button (the toolbar) rather than the overlay itself.
      const cancelBtn = Array.from(document.body.querySelectorAll("button")).find(
        (btn) => btn.textContent === t("annotator.cancel"),
      )!;
      const toolbar = cancelBtn.closest("div[data-siteping-ignore]");
      expect(toolbar).not.toBeNull();
      expect(toolbar!.getAttribute("data-siteping-ignore")).toBe("true");
    });

    it("drawing rect carries data-siteping-ignore so the selection border is excluded from screenshots", () => {
      bus.emit("annotation:start");

      const overlay = findOverlay()!;
      overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }));

      const drawingRect = overlay.querySelector<HTMLElement>("div")!;
      expect(drawingRect).not.toBeNull();
      expect(drawingRect.getAttribute("data-siteping-ignore")).toBe("true");
    });
  });

  describe("deactivate", () => {
    it("removes overlay and toolbar from DOM", () => {
      bus.emit("annotation:start");
      expect(findOverlay()).not.toBeNull();

      // Trigger deactivation via Escape key
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(findOverlay()).toBeNull();
    });

    it("restores original body overflow", () => {
      document.body.style.overflow = "scroll";

      bus.emit("annotation:start");
      expect(document.body.style.overflow).toBe("hidden");

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      expect(document.body.style.overflow).toBe("scroll");
    });

    it("emits annotation:end on deactivation", () => {
      const listener = vi.fn();
      bus.on("annotation:end", listener);

      bus.emit("annotation:start");
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(listener).toHaveBeenCalledOnce();
    });

    it("removes the document keydown listener", () => {
      const spy = vi.spyOn(document, "removeEventListener");

      bus.emit("annotation:start");
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      const keydownCalls = spy.mock.calls.filter((call) => call[0] === "keydown");
      expect(keydownCalls.length).toBeGreaterThan(0);

      spy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Escape key
  // -------------------------------------------------------------------------

  describe("keyboard: Escape", () => {
    it("triggers deactivation on Escape key press", () => {
      bus.emit("annotation:start");

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(findOverlay()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Mouse drag — drawing rectangle
  // -------------------------------------------------------------------------

  describe("mouse drag", () => {
    it("creates a drawing rectangle on mousedown", () => {
      bus.emit("annotation:start");

      const overlay = findOverlay()!;
      overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }));

      // drawingRect is appended inside the overlay
      const drawingRect = overlay.querySelector("div");
      expect(drawingRect).not.toBeNull();
    });

    it("updates drawing rectangle dimensions on mousemove via rAF", () => {
      bus.emit("annotation:start");

      const overlay = findOverlay()!;
      overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }));

      // Mock rAF to execute callback synchronously
      const origRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      };

      overlay.dispatchEvent(new MouseEvent("mousemove", { clientX: 200, clientY: 150, bubbles: true }));

      const drawingRect = overlay.querySelector<HTMLElement>("div")!;
      expect(drawingRect.style.width).toBe("150px"); // |200-50|
      expect(drawingRect.style.height).toBe("100px"); // |150-50|

      window.requestAnimationFrame = origRAF;
    });

    it("rejects mouse drag smaller than 10px in width", async () => {
      bus.emit("annotation:start");

      const listener = vi.fn();
      bus.on("annotation:complete", listener);

      const overlay = findOverlay()!;
      overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }));
      overlay.dispatchEvent(new MouseEvent("mouseup", { clientX: 55, clientY: 200, bubbles: true }));

      // Wait a tick for the async handler
      await vi.waitFor(() => {
        // annotation:complete should NOT have been emitted
        expect(listener).not.toHaveBeenCalled();
      });
    });

    it("rejects mouse drag smaller than 10px in height", async () => {
      bus.emit("annotation:start");

      const listener = vi.fn();
      bus.on("annotation:complete", listener);

      const overlay = findOverlay()!;
      overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }));
      overlay.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 55, bubbles: true }));

      await vi.waitFor(() => {
        expect(listener).not.toHaveBeenCalled();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Touch events
  // -------------------------------------------------------------------------

  describe("touch events", () => {
    it("starts drawing on touchstart", () => {
      bus.emit("annotation:start");

      const overlay = findOverlay()!;
      // jsdom does not have Touch constructor — create a minimal touch-like event
      const touchEvent = new Event("touchstart", { bubbles: true, cancelable: true });
      Object.defineProperty(touchEvent, "touches", {
        value: [{ clientX: 50, clientY: 50 }],
      });
      Object.defineProperty(touchEvent, "preventDefault", { value: vi.fn() });
      overlay.dispatchEvent(touchEvent);

      const drawingRect = overlay.querySelector("div");
      expect(drawingRect).not.toBeNull();
    });

    it("updates drawing rect on touchmove via rAF", () => {
      bus.emit("annotation:start");

      const overlay = findOverlay()!;

      // Simulate touchstart
      const startEvent = new Event("touchstart", { bubbles: true, cancelable: true });
      Object.defineProperty(startEvent, "touches", {
        value: [{ clientX: 50, clientY: 50 }],
      });
      Object.defineProperty(startEvent, "preventDefault", { value: vi.fn() });
      overlay.dispatchEvent(startEvent);

      const origRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      };

      // Simulate touchmove
      const moveEvent = new Event("touchmove", { bubbles: true, cancelable: true });
      Object.defineProperty(moveEvent, "preventDefault", { value: vi.fn() });
      Object.defineProperty(moveEvent, "touches", {
        value: [{ clientX: 200, clientY: 150 }],
      });
      overlay.dispatchEvent(moveEvent);

      const drawingRect = overlay.querySelector<HTMLElement>("div")!;
      expect(drawingRect.style.width).toBe("150px");
      expect(drawingRect.style.height).toBe("100px");

      window.requestAnimationFrame = origRAF;
    });
  });

  // -------------------------------------------------------------------------
  // rAF throttling
  // -------------------------------------------------------------------------

  describe("mousemove throttling via rAF", () => {
    it("coalesces multiple mousemove events into a single rAF callback", () => {
      bus.emit("annotation:start");

      const overlay = findOverlay()!;
      overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }));

      const rafSpy = vi.spyOn(window, "requestAnimationFrame");

      // Fire multiple moves — only one rAF should be requested
      overlay.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 100, bubbles: true }));
      overlay.dispatchEvent(new MouseEvent("mousemove", { clientX: 150, clientY: 150, bubbles: true }));
      overlay.dispatchEvent(new MouseEvent("mousemove", { clientX: 200, clientY: 200, bubbles: true }));

      // Only 1 rAF request should be pending (subsequent moves are coalesced)
      expect(rafSpy).toHaveBeenCalledTimes(1);

      rafSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Destroy
  // -------------------------------------------------------------------------

  describe("destroy", () => {
    it("deactivates and cleans up popup", () => {
      bus.emit("annotation:start");

      annotator.destroy();

      expect(findOverlay()).toBeNull();
    });

    it("can be called when not active without throwing", () => {
      expect(() => annotator.destroy()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Complete drawing flow (mouseup with valid rect)
  // -------------------------------------------------------------------------

  describe("complete drawing flow", () => {
    it("mouse drag with valid size triggers popup.show and emits annotation:complete", async () => {
      const completeListener = vi.fn();
      bus.on("annotation:complete", completeListener);

      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }));
      overlay.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 150, bubbles: true }));

      await vi.waitFor(() => {
        expect(completeListener).toHaveBeenCalledOnce();
      });

      const data = completeListener.mock.calls[0][0];
      expect(data.type).toBe("bug");
      expect(data.message).toBe("Test message");
      expect(data.annotation).toBeDefined();
    });

    it("after annotation:complete, overlay is removed (deactivated)", async () => {
      bus.emit("annotation:start");
      expect(findOverlay()).not.toBeNull();

      const overlay = findOverlay()!;
      overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }));
      overlay.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 150, bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 0));
      await vi.waitFor(() => {
        expect(findOverlay()).toBeNull();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Cancel button
  // -------------------------------------------------------------------------

  describe("cancel button", () => {
    it("clicking cancel button deactivates the annotator", () => {
      bus.emit("annotation:start");
      expect(findOverlay()).not.toBeNull();

      // The toolbar is the last div appended to body (after the overlay)
      // Find all buttons and check which one has the cancel text
      const allButtons = Array.from(document.body.querySelectorAll("button"));
      const cancelButtons = allButtons.filter((btn) => btn.textContent === t("annotator.cancel"));
      // There should be exactly one cancel button with this text
      expect(cancelButtons).toHaveLength(1);

      // The cancel button is the LAST one (most recently added by activate())
      const cancelBtn = cancelButtons[cancelButtons.length - 1];

      // Simulate clicking by dispatching the event on the button
      const endListener = vi.fn();
      bus.on("annotation:end", endListener);

      cancelBtn.click();

      expect(endListener).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard annotation (Enter key)
  // -------------------------------------------------------------------------

  describe("keyboard: Enter", () => {
    it("pressing Enter on overlay with a pre-focused element emits annotation:complete with full-bounds annotation", async () => {
      // Create a focusable element and focus it before activation
      const target = document.createElement("button");
      target.textContent = "Focus me";
      document.body.appendChild(target);
      // Mock getBoundingClientRect for the target
      vi.spyOn(target, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 100, 40));
      target.focus();

      const completeListener = vi.fn();
      bus.on("annotation:complete", completeListener);

      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

      await vi.waitFor(() => {
        expect(completeListener).toHaveBeenCalledOnce();
      });

      const data = completeListener.mock.calls[0][0];
      expect(data.annotation.rect).toEqual({ xPct: 0, yPct: 0, wPct: 1, hPct: 1 });

      target.remove();
    });

    it("Enter on overlay without pre-focused element does nothing", async () => {
      // Blur everything so there's no activeElement with bounds
      (document.activeElement as HTMLElement)?.blur?.();

      const completeListener = vi.fn();
      bus.on("annotation:complete", completeListener);

      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

      // Give async handler time to run
      await new Promise((r) => setTimeout(r, 50));
      expect(completeListener).not.toHaveBeenCalled();
    });

    it("Enter with element that has zero bounds does nothing", async () => {
      const target = document.createElement("span");
      document.body.appendChild(target);
      // Mock zero-size bounds
      vi.spyOn(target, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 0, 0));
      target.focus();

      const completeListener = vi.fn();
      bus.on("annotation:complete", completeListener);

      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

      await new Promise((r) => setTimeout(r, 50));
      expect(completeListener).not.toHaveBeenCalled();

      target.remove();
    });
  });

  // -------------------------------------------------------------------------
  // Touch end
  // -------------------------------------------------------------------------

  describe("touch end", () => {
    it("touchend with valid rectangle triggers popup and annotation:complete", async () => {
      const completeListener = vi.fn();
      bus.on("annotation:complete", completeListener);

      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      // touchstart
      const startEvent = new Event("touchstart", { bubbles: true, cancelable: true });
      Object.defineProperty(startEvent, "touches", { value: [{ clientX: 50, clientY: 50 }] });
      Object.defineProperty(startEvent, "preventDefault", { value: vi.fn() });
      overlay.dispatchEvent(startEvent);

      // touchend
      const endEvent = new Event("touchend", { bubbles: true });
      Object.defineProperty(endEvent, "changedTouches", { value: [{ clientX: 200, clientY: 150 }] });
      overlay.dispatchEvent(endEvent);

      await vi.waitFor(() => {
        expect(completeListener).toHaveBeenCalledOnce();
      });

      expect(completeListener.mock.calls[0][0].type).toBe("bug");
    });
  });

  // -------------------------------------------------------------------------
  // rAF cleanup on deactivate
  // -------------------------------------------------------------------------

  describe("rAF cleanup on deactivate", () => {
    it("deactivating during drawing cancels pending rAF", () => {
      const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");

      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      // Start drawing and trigger a mousemove to schedule rAF
      overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }));
      overlay.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 100, bubbles: true }));

      // Deactivate while rAF is pending
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(cancelSpy).toHaveBeenCalled();
      cancelSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Cancel button hover effects
  // -------------------------------------------------------------------------

  describe("cancel button hover effects", () => {
    it("mouseenter on cancel changes styles", () => {
      bus.emit("annotation:start");

      const buttons = document.body.querySelectorAll("button");
      const cancelBtn = Array.from(buttons).find((btn) => btn.textContent === t("annotator.cancel"))!;

      const borderBefore = cancelBtn.style.borderColor;
      const colorBefore = cancelBtn.style.color;

      cancelBtn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      // jsdom normalizes hex to rgb — just check the style changed
      expect(cancelBtn.style.borderColor).not.toBe(borderBefore);
      expect(cancelBtn.style.color).not.toBe(colorBefore);
    });

    it("mouseleave on cancel restores styles", () => {
      bus.emit("annotation:start");

      const buttons = document.body.querySelectorAll("button");
      const cancelBtn = Array.from(buttons).find((btn) => btn.textContent === t("annotator.cancel"))!;

      cancelBtn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      const hoverBorder = cancelBtn.style.borderColor;
      const hoverColor = cancelBtn.style.color;

      cancelBtn.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
      // After mouseleave, border and color should differ from hover state
      expect(cancelBtn.style.borderColor).not.toBe(hoverBorder);
      expect(cancelBtn.style.color).not.toBe(hoverColor);
    });
  });

  // -------------------------------------------------------------------------
  // Popup dismissal branches (lines 320-322)
  // -------------------------------------------------------------------------

  describe("popup dismissal during drawing", () => {
    it("mouse drag completed but popup returns null cleans up drawing rect without emitting", async () => {
      popupMocks.nextResult = null;

      const completeListener = vi.fn();
      bus.on("annotation:complete", completeListener);

      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }));
      overlay.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 150, bubbles: true }));

      // Wait for the async finishDrawing handler to complete
      await new Promise((r) => setTimeout(r, 50));

      expect(completeListener).not.toHaveBeenCalled();

      // Annotator should still be active (popup dismissal does not deactivate)
      expect(findOverlay()).not.toBeNull();
      // The drawing rect should have been removed
      const overlayAfter = findOverlay()!;
      const rectsInOverlay = overlayAfter.querySelectorAll("div");
      expect(rectsInOverlay.length).toBe(0);
    });

    it("touchend completed but popup returns null cleans up drawing rect without emitting", async () => {
      popupMocks.nextResult = null;

      const completeListener = vi.fn();
      bus.on("annotation:complete", completeListener);

      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      const startEvent = new Event("touchstart", { bubbles: true, cancelable: true });
      Object.defineProperty(startEvent, "touches", { value: [{ clientX: 50, clientY: 50 }] });
      Object.defineProperty(startEvent, "preventDefault", { value: vi.fn() });
      overlay.dispatchEvent(startEvent);

      const endEvent = new Event("touchend", { bubbles: true });
      Object.defineProperty(endEvent, "changedTouches", { value: [{ clientX: 200, clientY: 150 }] });
      overlay.dispatchEvent(endEvent);

      await new Promise((r) => setTimeout(r, 50));

      expect(completeListener).not.toHaveBeenCalled();
      expect(findOverlay()).not.toBeNull();
    });

    it("Enter keyboard with popup returning null does not emit annotation:complete", async () => {
      popupMocks.nextResult = null;

      const target = document.createElement("button");
      document.body.appendChild(target);
      vi.spyOn(target, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 100, 40));
      target.focus();

      const completeListener = vi.fn();
      bus.on("annotation:complete", completeListener);

      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

      await new Promise((r) => setTimeout(r, 50));
      expect(completeListener).not.toHaveBeenCalled();

      target.remove();
    });
  });

  // -------------------------------------------------------------------------
  // Defensive branches — early returns / missing inputs
  // -------------------------------------------------------------------------

  describe("defensive branches", () => {
    it("non-Enter keydown on overlay is ignored (early return)", async () => {
      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      const completeListener = vi.fn();
      bus.on("annotation:complete", completeListener);

      // Press a non-Enter key — handler returns immediately
      overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
      overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));

      await new Promise((r) => setTimeout(r, 10));
      expect(completeListener).not.toHaveBeenCalled();
    });

    it("Enter on overlay when activeElement is not an HTMLElement does nothing", async () => {
      // Force pre-active element to be null/non-HTMLElement
      // Blur first so activeElement is body, then mock document.activeElement
      (document.activeElement as HTMLElement)?.blur?.();

      // Make activeElement return a non-HTMLElement via querySelector trickery
      // Easier: blur all and let body be activeElement (which IS HTMLElement)
      // But we need a CASE where target is not an HTMLElement
      // Use a SVGElement as activeElement (NOT an HTMLElement)
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      // SVG can't be focused easily; instead spy on document.activeElement
      const focusableSvg = document.createElement("button"); // placeholder

      // Replace document.activeElement to be an SVGElement
      const restore = Object.getOwnPropertyDescriptor(Document.prototype, "activeElement");
      Object.defineProperty(document, "activeElement", {
        configurable: true,
        get: () => svg,
      });

      const completeListener = vi.fn();
      bus.on("annotation:complete", completeListener);

      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

      await new Promise((r) => setTimeout(r, 50));
      expect(completeListener).not.toHaveBeenCalled();

      // Restore activeElement getter
      if (restore) {
        Object.defineProperty(document, "activeElement", restore);
      } else {
        delete (document as unknown as { activeElement?: unknown }).activeElement;
      }
      focusableSvg.remove();
    });

    it("touchstart with no touches is ignored", () => {
      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      const touchEvent = new Event("touchstart", { bubbles: true, cancelable: true });
      Object.defineProperty(touchEvent, "touches", { value: [] });
      Object.defineProperty(touchEvent, "preventDefault", { value: vi.fn() });

      // Should not throw, no drawing rect created
      overlay.dispatchEvent(touchEvent);
      expect(overlay.querySelector("div")).toBeNull();
    });

    it("touchmove with no touches is ignored", () => {
      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      // Start drawing first
      const startEvent = new Event("touchstart", { bubbles: true, cancelable: true });
      Object.defineProperty(startEvent, "touches", { value: [{ clientX: 50, clientY: 50 }] });
      Object.defineProperty(startEvent, "preventDefault", { value: vi.fn() });
      overlay.dispatchEvent(startEvent);

      // touchmove with empty touches
      const moveEvent = new Event("touchmove", { bubbles: true, cancelable: true });
      Object.defineProperty(moveEvent, "touches", { value: [] });
      Object.defineProperty(moveEvent, "preventDefault", { value: vi.fn() });
      overlay.dispatchEvent(moveEvent);

      // No throw, no update applied
      const drawingRect = overlay.querySelector<HTMLElement>("div")!;
      // Width/height should not have been set since touchmove had no touches
      expect(drawingRect.style.width).toBe("");
    });

    it("touchend with no changedTouches is ignored", async () => {
      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      const completeListener = vi.fn();
      bus.on("annotation:complete", completeListener);

      const startEvent = new Event("touchstart", { bubbles: true, cancelable: true });
      Object.defineProperty(startEvent, "touches", { value: [{ clientX: 50, clientY: 50 }] });
      Object.defineProperty(startEvent, "preventDefault", { value: vi.fn() });
      overlay.dispatchEvent(startEvent);

      const endEvent = new Event("touchend", { bubbles: true });
      Object.defineProperty(endEvent, "changedTouches", { value: [] });
      overlay.dispatchEvent(endEvent);

      await new Promise((r) => setTimeout(r, 10));
      expect(completeListener).not.toHaveBeenCalled();
    });

    it("scheduleRectUpdate returns early when not currently drawing (mousemove before mousedown)", () => {
      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      const rafSpy = vi.spyOn(window, "requestAnimationFrame");

      // mousemove without prior mousedown — isDrawing is false
      overlay.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 100, bubbles: true }));

      // No rAF scheduled because the early-return branch fires
      expect(rafSpy).not.toHaveBeenCalled();
      rafSpy.mockRestore();
    });

    it("finishDrawing returns early when called without prior drawing (mouseup before mousedown)", async () => {
      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      const completeListener = vi.fn();
      bus.on("annotation:complete", completeListener);

      // mouseup without mousedown — isDrawing is false
      overlay.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 200, bubbles: true }));

      await new Promise((r) => setTimeout(r, 10));
      expect(completeListener).not.toHaveBeenCalled();
    });

    it("rAF callback returns early after deactivation (drawingRect is null)", () => {
      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      // Start drawing
      overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }));

      // Capture the rAF callback so we can invoke it AFTER deactivate (drawingRect=null)
      let capturedCallback: FrameRequestCallback | null = null;
      const origRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
        capturedCallback = cb;
        return 1;
      }) as typeof window.requestAnimationFrame;

      // Schedule rAF
      overlay.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 100, bubbles: true }));

      // Deactivate before rAF fires (this nullifies drawingRect)
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      // Now manually invoke captured callback — should hit the early return branch
      expect(() => {
        capturedCallback?.(0);
      }).not.toThrow();

      window.requestAnimationFrame = origRAF;
    });
  });

  // -------------------------------------------------------------------------
  // Submission lifecycle — serialization (Blocker A) + destroy mid-submit (B)
  // -------------------------------------------------------------------------

  describe("submission lifecycle", () => {
    it("does not start a second annotation while a submission is in flight", async () => {
      // The popup stays open (show() pending) while runSubmission awaits its
      // terminal event — exactly the window a second rectangle would orphan.
      popupMocks.keepShowPending = true;

      const completeListener = vi.fn();
      bus.on("annotation:complete", completeListener);

      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      // First annotation — opens the popup, runSubmission emits annotation:complete #1.
      overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }));
      overlay.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 150, bubbles: true }));

      await vi.waitFor(() => {
        expect(completeListener).toHaveBeenCalledOnce();
      });

      // The first rectangle intentionally stays visible while the popup is
      // open — capture the current count so we can prove no SECOND one is born.
      const rectsAfterFirst = overlay.querySelectorAll("div").length;

      // Second drag while the first submission is still pending — must be a
      // no-op: no new drawing rect, no second annotation:complete.
      overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 60, clientY: 60, bubbles: true }));
      expect(overlay.querySelectorAll("div").length).toBe(rectsAfterFirst);
      overlay.dispatchEvent(new MouseEvent("mouseup", { clientX: 260, clientY: 260, bubbles: true }));

      await new Promise((r) => setTimeout(r, 30));
      expect(completeListener).toHaveBeenCalledOnce();
    });

    it("ignores keyboard Enter annotation while a submission is in flight", async () => {
      popupMocks.keepShowPending = true;

      const target = document.createElement("button");
      document.body.appendChild(target);
      vi.spyOn(target, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 100, 40));
      target.focus();

      const completeListener = vi.fn();
      bus.on("annotation:complete", completeListener);

      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      // First Enter annotation — opens the popup, emits annotation:complete #1.
      overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await vi.waitFor(() => {
        expect(completeListener).toHaveBeenCalledOnce();
      });

      // Second Enter while the submission is pending — no-op.
      overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
      expect(completeListener).toHaveBeenCalledOnce();

      target.remove();
    });

    it("destroy() while a submission is pending settles the runSubmission promise (no hang)", async () => {
      popupMocks.keepShowPending = true;

      bus.emit("annotation:start");
      const overlay = findOverlay()!;

      overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }));
      overlay.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 150, bubbles: true }));

      // runSubmission is now pending — waiting on a terminal bus event.
      await vi.waitFor(() => {
        expect(popupMocks.lastSubmitPromise).not.toBeNull();
      });
      const submitPromise = popupMocks.lastSubmitPromise!;

      // Tear down mid-submit. The promise must settle (reject) rather than
      // outlive teardown and leak the closure that retains the screenshot.
      annotator.destroy();

      await expect(submitPromise).rejects.toThrow(/destroyed during submission/);
      // Popup was also torn down.
      expect(popupMocks.destroyCount).toBe(1);
    });

    it("a terminal event arriving after destroy() does not double-settle or throw", async () => {
      popupMocks.keepShowPending = true;

      bus.emit("annotation:start");
      const overlay = findOverlay()!;
      overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }));
      overlay.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 150, bubbles: true }));

      await vi.waitFor(() => {
        expect(popupMocks.lastSubmitPromise).not.toBeNull();
      });

      annotator.destroy();
      await expect(popupMocks.lastSubmitPromise!).rejects.toThrow();

      // The terminal-event listeners were unsubscribed on destroy — a late
      // terminal event must be inert (no second settle, no throw).
      expect(() => bus.emit("submission:cancelled")).not.toThrow();
    });
  });
});
