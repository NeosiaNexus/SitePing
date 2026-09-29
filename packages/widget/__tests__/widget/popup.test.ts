// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POPUP_HIDE_TRANSITION_MS } from "../../src/constants.js";
import { createT, type TFunction, type Translations } from "../../src/i18n/index.js";
import { Popup } from "../../src/popup.js";
import { buildThemeColors } from "../../src/styles/theme.js";
import { mockMatchMedia, mockMediaQueries, mockVisualViewport, PHONE_MEDIA } from "../helpers.js";

// jsdom does not implement window.matchMedia — provide a stub
Object.defineProperty(window, "matchMedia", {
  writable: true,
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const colors = buildThemeColors();
const t = createT("fr");

function makeBounds(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    x: 100,
    y: 100,
    width: 200,
    height: 50,
    top: 100,
    right: 300,
    bottom: 150,
    left: 100,
    toJSON: () => {},
    ...overrides,
  } as DOMRect;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Popup", () => {
  let popup: Popup;

  beforeEach(() => {
    popup = new Popup(colors, t);
  });

  afterEach(() => {
    popup.destroy();
  });

  // -------------------------------------------------------------------------
  // Construction
  // -------------------------------------------------------------------------

  describe("construction", () => {
    it("creates a dialog element with role=dialog", () => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog).not.toBeNull();
    });

    it("sets aria-modal=true on dialog", () => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(dialog.getAttribute("aria-modal")).toBe("true");
    });

    it("sets correct aria-label on dialog", () => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(dialog.getAttribute("aria-label")).toBe(t("popup.ariaLabel"));
    });

    it("creates four type selection buttons", () => {
      const buttons = document.querySelectorAll<HTMLButtonElement>("[data-type]");
      expect(buttons.length).toBe(4);
    });

    it("type buttons have aria-pressed=false initially", () => {
      const buttons = document.querySelectorAll<HTMLButtonElement>("[data-type]");
      for (const btn of buttons) {
        expect(btn.getAttribute("aria-pressed")).toBe("false");
      }
    });

    it("creates type buttons for all four feedback types", () => {
      const buttons = document.querySelectorAll<HTMLButtonElement>("[data-type]");
      const types = Array.from(buttons).map((btn) => btn.dataset.type);
      expect(types).toEqual(["question", "change", "bug", "other"]);
    });

    it("creates a textarea with correct placeholder", () => {
      const textarea = document.querySelector<HTMLTextAreaElement>("textarea");
      expect(textarea).not.toBeNull();
      expect(textarea!.placeholder).toBe(t("popup.placeholder"));
    });

    it("creates a textarea with correct aria-label", () => {
      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      expect(textarea.getAttribute("aria-label")).toBe(t("popup.textareaAria"));
    });

    it("is appended to document.body on construction", () => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(dialog.parentElement).toBe(document.body);
    });

    it("has a submit button", () => {
      const buttons = document.querySelectorAll<HTMLButtonElement>("button");
      const submitBtn = Array.from(buttons).find((btn) => btn.textContent === t("popup.submit"));
      expect(submitBtn).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Show / Hide
  // -------------------------------------------------------------------------

  describe("show/hide", () => {
    it("shows the popup (display: block) after calling show()", () => {
      popup.show(makeBounds());

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(dialog.style.display).toBe("block");
    });

    it("positions the popup relative to the given bounds", () => {
      popup.show(makeBounds({ bottom: 200, left: 150 }));

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(dialog.style.top).toBe("208px"); // bottom + 8
      expect(dialog.style.left).toBe("150px");
    });

    it("flips up when not enough vertical space below", () => {
      // Simulate small viewport: bottom of rect is near the window bottom
      // window.innerHeight defaults to 768 in jsdom; jsdom has no layout, so
      // the popup is placed with its 280px fallback height
      popup.show(makeBounds({ top: 500, bottom: 600 }));

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      // Should flip up: top = rectTop - 280 - 8 = 500 - 288 = 212
      expect(dialog.style.top).toBe("212px");
    });

    it("clamps to viewport bottom when rect is too tall to fit popup above or below", () => {
      // Tall rect that spans most of the viewport (jsdom default 1024x768)
      // — neither below (rect.bottom + 8 + 280 > 768) nor above
      // (rect.top - 280 - 8 < 8) leaves room.
      popup.show(makeBounds({ top: 50, bottom: 750 }));

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      // top = innerHeight - popupH - 8 = 768 - 280 - 8 = 480
      expect(dialog.style.top).toBe("480px");
    });

    it("keeps clear of reserved viewport bands, such as the annotation toolbar", () => {
      // Above would be 300 - 8 - 280 = 12, under a 53px top toolbar
      popup.show(makeBounds({ top: 300, bottom: 700 }), undefined, { top: 53, bottom: 0 });

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      // Clamped inside the band instead: 768 - 8 - 280 = 480
      expect(dialog.style.top).toBe("480px");
    });

    it("caps its height and scrolls when taller than the usable band, then resets on the next show", () => {
      // jsdom is 768px tall; reserving 400px at the top and 200px at the
      // bottom leaves a 152px band, shorter than the 280px fallback popup.
      popup.show(makeBounds({ top: 450, bottom: 500 }), undefined, { top: 400, bottom: 200 });

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(dialog.style.top).toBe("408px");
      expect(dialog.style.overflowY).toBe("auto");
      // The 16px vertical padding and 1px borders are excluded from the content-box cap.
      expect(dialog.style.maxHeight).toBe(`${152 - 34}px`);

      popup.show(makeBounds({ bottom: 200 }));
      expect(dialog.style.maxHeight).toBe("");
      expect(dialog.style.overflowY).toBe("");
    });

    it("caps its whole box when the host page resets box-sizing to border-box", () => {
      const hostReset = document.head.appendChild(document.createElement("style"));
      hostReset.textContent = "* { box-sizing: border-box; }";
      try {
        popup.show(makeBounds({ top: 450, bottom: 500 }), undefined, { top: 400, bottom: 200 });

        const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
        // max-height already covers the padding and borders: the whole 152px band
        expect(dialog.style.maxHeight).toBe("152px");
      } finally {
        hostReset.remove();
      }
    });

    it("resolves to null when cancelled (via cancel button)", async () => {
      const promise = popup.show(makeBounds());

      // Find the cancel button (it has the cancel text)
      const buttons = document.querySelectorAll<HTMLButtonElement>("button");
      const cancelBtn = Array.from(buttons).find((btn) => btn.textContent === t("popup.cancel"));
      cancelBtn!.click();

      const result = await promise;
      expect(result).toBeNull();
    });

    it("resolves to null when Escape is pressed in textarea", async () => {
      const promise = popup.show(makeBounds());

      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      const result = await promise;
      expect(result).toBeNull();
    });

    it("resolves to null when Escape is pressed on a type button", async () => {
      const promise = popup.show(makeBounds());

      const typeBtn = document.querySelector<HTMLButtonElement>('[data-type="question"]')!;
      typeBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(popup.isOpen).toBe(false);
      expect(await promise).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Type selection
  // -------------------------------------------------------------------------

  describe("type selection", () => {
    it("sets aria-pressed=true on selected type button", () => {
      popup.show(makeBounds());

      const bugBtn = document.querySelector<HTMLButtonElement>('[data-type="bug"]')!;
      bugBtn.click();

      expect(bugBtn.getAttribute("aria-pressed")).toBe("true");
    });

    it("only one type button is active at a time", () => {
      popup.show(makeBounds());

      const bugBtn = document.querySelector<HTMLButtonElement>('[data-type="bug"]')!;
      bugBtn.click();

      const questionBtn = document.querySelector<HTMLButtonElement>('[data-type="question"]')!;
      questionBtn.click();

      expect(bugBtn.getAttribute("aria-pressed")).toBe("false");
      expect(questionBtn.getAttribute("aria-pressed")).toBe("true");
    });

    it("all other type buttons become inactive when one is selected", () => {
      popup.show(makeBounds());

      const changeBtn = document.querySelector<HTMLButtonElement>('[data-type="change"]')!;
      changeBtn.click();

      const allButtons = document.querySelectorAll<HTMLButtonElement>("[data-type]");
      for (const btn of allButtons) {
        if (btn.dataset.type === "change") {
          expect(btn.getAttribute("aria-pressed")).toBe("true");
        } else {
          expect(btn.getAttribute("aria-pressed")).toBe("false");
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // Submit validation
  // -------------------------------------------------------------------------

  describe("submit", () => {
    it("enables submit button when type and message are provided", () => {
      popup.show(makeBounds());

      const bugBtn = document.querySelector<HTMLButtonElement>('[data-type="bug"]')!;
      bugBtn.click();

      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      textarea.value = "This is a bug";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      const buttons = document.querySelectorAll<HTMLButtonElement>("button");
      const submitBtn = Array.from(buttons).find((btn) => btn.textContent === t("popup.submit"))!;
      expect(submitBtn.style.opacity).toBe("1");
      expect(submitBtn.style.pointerEvents).toBe("auto");
    });

    it("does not enable submit with only type selected (no message)", () => {
      popup.show(makeBounds());

      const bugBtn = document.querySelector<HTMLButtonElement>('[data-type="bug"]')!;
      bugBtn.click();

      const buttons = document.querySelectorAll<HTMLButtonElement>("button");
      const submitBtn = Array.from(buttons).find((btn) => btn.textContent === t("popup.submit"))!;
      expect(submitBtn.style.pointerEvents).toBe("none");
    });

    it("does not enable submit with only message (no type selected)", () => {
      popup.show(makeBounds());

      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      textarea.value = "Some message";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      const buttons = document.querySelectorAll<HTMLButtonElement>("button");
      const submitBtn = Array.from(buttons).find((btn) => btn.textContent === t("popup.submit"))!;
      expect(submitBtn.style.pointerEvents).toBe("none");
    });

    it("resolves with type and message on submit", async () => {
      const promise = popup.show(makeBounds());

      const bugBtn = document.querySelector<HTMLButtonElement>('[data-type="bug"]')!;
      bugBtn.click();

      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      textarea.value = "Found a bug";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      const buttons = document.querySelectorAll<HTMLButtonElement>("button");
      const submitBtn = Array.from(buttons).find((btn) => btn.textContent === t("popup.submit"))!;
      submitBtn.click();

      const result = await promise;
      expect(result).toEqual({ type: "bug", message: "Found a bug" });
    });

    it("trims message whitespace on submit", async () => {
      const promise = popup.show(makeBounds());

      const questionBtn = document.querySelector<HTMLButtonElement>('[data-type="question"]')!;
      questionBtn.click();

      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      textarea.value = "  How does this work?  ";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      const buttons = document.querySelectorAll<HTMLButtonElement>("button");
      const submitBtn = Array.from(buttons).find((btn) => btn.textContent === t("popup.submit"))!;
      submitBtn.click();

      const result = await promise;
      expect(result!.message).toBe("How does this work?");
    });

    it("supports Ctrl+Enter keyboard shortcut to submit", async () => {
      const promise = popup.show(makeBounds());

      const bugBtn = document.querySelector<HTMLButtonElement>('[data-type="bug"]')!;
      bugBtn.click();

      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      textarea.value = "A bug";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));

      const result = await promise;
      expect(result).toEqual({ type: "bug", message: "A bug" });
    });

    it("does not submit via Ctrl+Enter when form is incomplete", () => {
      popup.show(makeBounds());

      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      textarea.value = "A message without type";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      // This should not throw or resolve — the popup stays open
      textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));

      // Popup should still be visible
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(dialog.style.display).toBe("block");
    });
  });

  // -------------------------------------------------------------------------
  // Focus trap
  // -------------------------------------------------------------------------

  describe("focus trap", () => {
    it("installs keydown listener for Tab trapping when shown", () => {
      const spy = vi.spyOn(HTMLElement.prototype, "addEventListener");

      popup.show(makeBounds());

      const keydownCalls = spy.mock.calls.filter((call) => call[0] === "keydown");
      expect(keydownCalls.length).toBeGreaterThan(0);

      spy.mockRestore();
    });

    it("Tab wraps from last focusable to first focusable element", () => {
      popup.show(makeBounds());

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      const focusableEls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])',
        ),
      );
      expect(focusableEls.length).toBeGreaterThan(0);

      const lastEl = focusableEls[focusableEls.length - 1]!;
      lastEl.focus();

      const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
      const preventSpy = vi.spyOn(event, "preventDefault");
      dialog.dispatchEvent(event);

      expect(preventSpy).toHaveBeenCalled();
    });

    it("Shift+Tab wraps from first focusable to last focusable element", () => {
      popup.show(makeBounds());

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      const focusableEls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])',
        ),
      );

      const firstEl = focusableEls[0]!;
      firstEl.focus();

      const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true });
      const preventSpy = vi.spyOn(event, "preventDefault");
      dialog.dispatchEvent(event);

      expect(preventSpy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Reset state on re-show
  // -------------------------------------------------------------------------

  describe("reset on re-show", () => {
    it("clears textarea on each show()", async () => {
      const promise1 = popup.show(makeBounds());

      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      textarea.value = "Some text";

      // Cancel to complete the first show promise
      const buttons = document.querySelectorAll<HTMLButtonElement>("button");
      const cancelBtn = Array.from(buttons).find((btn) => btn.textContent === t("popup.cancel"))!;
      cancelBtn.click();
      await promise1;

      // Re-show
      popup.show(makeBounds());

      const textarea2 = document.querySelector<HTMLTextAreaElement>("textarea")!;
      expect(textarea2.value).toBe("");
    });

    it("resets type selection on each show()", async () => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      const promise1 = popup.show(makeBounds());

      const bugBtn = dialog.querySelector<HTMLButtonElement>('[data-type="bug"]')!;
      bugBtn.click();
      expect(bugBtn.getAttribute("aria-pressed")).toBe("true");

      // Cancel
      const cancelBtn = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button")).find(
        (btn) => btn.textContent === t("popup.cancel"),
      )!;
      cancelBtn.click();
      await promise1;

      // Re-show
      popup.show(makeBounds());

      // All type buttons should be reset
      const allTypeButtons = dialog.querySelectorAll<HTMLButtonElement>("[data-type]");
      for (const btn of allTypeButtons) {
        expect(btn.getAttribute("aria-pressed")).toBe("false");
      }
    });

    describe("pending close transition", () => {
      const findCancelButton = () =>
        Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find(
          (button) => button.textContent === t("popup.cancel"),
        )!;

      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("stays visible when re-shown before the previous close transition ends", async () => {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
        const firstSession = popup.show(makeBounds());
        findCancelButton().click();
        await firstSession;

        // Re-open inside the fade-out window of the dismissed session
        vi.advanceTimersByTime(100);
        popup.show(makeBounds());
        vi.advanceTimersByTime(1000);

        expect(dialog.style.display).toBe("block");
        expect(popup.isOpen).toBe(true);
      });

      it("stays visible when re-shown after Cancel was clicked twice during the fade-out", async () => {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
        const firstSession = popup.show(makeBounds());
        findCancelButton().click();
        await firstSession;

        // A double-click reaches the fading popup's Cancel again
        vi.advanceTimersByTime(50);
        findCancelButton().click();
        vi.advanceTimersByTime(50);
        popup.show(makeBounds());
        vi.advanceTimersByTime(1000);

        expect(dialog.style.display).toBe("block");
        expect(popup.isOpen).toBe(true);
      });

      it("a second Cancel during the fade-out does not postpone the hide", async () => {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
        const session = popup.show(makeBounds());
        findCancelButton().click();
        await session;

        vi.advanceTimersByTime(POPUP_HIDE_TRANSITION_MS - 50);
        findCancelButton().click();
        vi.advanceTimersByTime(50);

        expect(dialog.style.display).toBe("none");
      });

      it("still hides after the close transition when not re-shown", async () => {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
        const session = popup.show(makeBounds());
        popup.dismiss();
        await session;

        vi.advanceTimersByTime(POPUP_HIDE_TRANSITION_MS);

        expect(dialog.style.display).toBe("none");
      });

      it("drops a close transition still pending at teardown", async () => {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
        const session = popup.show(makeBounds());
        popup.dismiss();
        await session;

        popup.destroy();
        vi.advanceTimersByTime(1000);

        // The pending `display: none` never fires on the detached root
        expect(dialog.isConnected).toBe(false);
        expect(dialog.style.display).toBe("block");
      });
    });
  });

  // -------------------------------------------------------------------------
  // Open/close transition (#343)
  // -------------------------------------------------------------------------

  describe("open/close transition", () => {
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const findDialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
    const findCancelButton = () =>
      Array.from(findDialog().querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent === t("popup.cancel"),
      )!;

    it("keeps its transition after show(), so it still fades in and out", () => {
      const declared = findDialog().style.transition;
      expect(declared).toContain("opacity");

      popup.show(makeBounds());

      expect(findDialog().style.transition).toBe(declared);
    });

    it("is inert while it fades out, and interactive again on the next show()", () => {
      const dialog = findDialog();
      popup.show(makeBounds());
      expect(dialog.hasAttribute("inert")).toBe(false);

      findCancelButton().click();
      expect(dialog.hasAttribute("inert")).toBe(true);

      popup.show(makeBounds());
      expect(dialog.hasAttribute("inert")).toBe(false);
    });

    it("keeps its own fade-out inert, but drops a host modal's inert on the open popup", async () => {
      const flushMutationObservers = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
      const dialog = findDialog();
      popup.show(makeBounds());
      dialog.setAttribute("inert", ""); // a sibling-inerting host modal
      await flushMutationObservers();
      expect(dialog.hasAttribute("inert")).toBe(false);

      findCancelButton().click();
      await flushMutationObservers();

      expect(dialog.hasAttribute("inert")).toBe(true);
    });

    it("stays clickable when a host modal makes <body> click-through", () => {
      document.body.style.pointerEvents = "none";
      try {
        popup.show(makeBounds());

        expect(getComputedStyle(findDialog()).pointerEvents).toBe("auto");
      } finally {
        document.body.removeAttribute("style");
      }
    });

    it("stays closed when cancelled before show()'s first frame", async () => {
      const previous = document.body.appendChild(document.createElement("button"));
      try {
        previous.focus();
        popup.show(makeBounds());
        findCancelButton().click(); // Same task as show()

        await nextFrame();

        expect(findDialog().style.opacity).toBe("0");
        expect(document.activeElement).toBe(previous);
      } finally {
        previous.remove();
      }
    });

    it("stays transparent when destroyed before show()'s first frame", async () => {
      const dialog = findDialog();
      popup.show(makeBounds());
      popup.destroy();

      await nextFrame();

      expect(dialog.style.opacity).toBe("0");
    });

    it("hides at once under prefers-reduced-motion", () => {
      mockMatchMedia(true);
      try {
        const dialog = findDialog();
        popup.show(makeBounds());

        findCancelButton().click();

        expect(dialog.style.display).toBe("none");
      } finally {
        mockMatchMedia(false);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Destroy
  // -------------------------------------------------------------------------

  describe("destroy", () => {
    it("removes popup DOM element from document.body", () => {
      popup.destroy();

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // refreshLabels — re-localizes the popup after the locale dictionary lands
  // -------------------------------------------------------------------------

  describe("refreshLabels", () => {
    // Tests use a mutable mock `t` (rather than the real i18n loader) so the
    // LOCALES module state of other test files can't bleed into these
    // assertions. `refreshLabels()` is a pure DOM re-binding pass over
    // `this.t`, so the only contract worth testing is "calls t at refresh
    // time and writes the result into the DOM".
    function makeMutableT(prefix: { value: string }): TFunction {
      return ((key: keyof Translations): string => `${prefix.value}:${key}`) as TFunction;
    }

    it("re-reads `t` at refresh time for dialog, type buttons, textarea, hint, and CTAs", () => {
      const prefix = { value: "INIT" };
      const mutableT = makeMutableT(prefix);

      popup.destroy();
      popup = new Popup(colors, mutableT);

      // Initial state — labels reflect the first prefix.
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(dialog.getAttribute("aria-label")).toBe("INIT:popup.ariaLabel");

      // Swap the closure's return value, then refresh — DOM should track it.
      prefix.value = "SWAPPED";
      popup.refreshLabels();

      expect(dialog.getAttribute("aria-label")).toBe("SWAPPED:popup.ariaLabel");

      const questionBtn = document.querySelector<HTMLButtonElement>('[data-type="question"]')!;
      const changeBtn = document.querySelector<HTMLButtonElement>('[data-type="change"]')!;
      const bugBtn = document.querySelector<HTMLButtonElement>('[data-type="bug"]')!;
      const otherBtn = document.querySelector<HTMLButtonElement>('[data-type="other"]')!;
      expect(questionBtn.querySelector("span")?.textContent).toBe("SWAPPED:type.question");
      expect(changeBtn.querySelector("span")?.textContent).toBe("SWAPPED:type.change");
      expect(bugBtn.querySelector("span")?.textContent).toBe("SWAPPED:type.bug");
      expect(otherBtn.querySelector("span")?.textContent).toBe("SWAPPED:type.other");

      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      expect(textarea.placeholder).toBe("SWAPPED:popup.placeholder");
      expect(textarea.getAttribute("aria-label")).toBe("SWAPPED:popup.textareaAria");

      // Cancel + submit buttons — find by their data attributes, not text
      const allButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      const submitBtn = allButtons.find((b) => b.textContent === "SWAPPED:popup.submit");
      const cancelBtn = allButtons.find((b) => b.textContent === "SWAPPED:popup.cancel");
      expect(submitBtn).toBeDefined();
      expect(cancelBtn).toBeDefined();
    });

    it("is idempotent — calling twice with the same `t` is a no-op on values", () => {
      popup.destroy();
      popup = new Popup(colors, createT("en"));

      popup.refreshLabels();
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      const first = dialog.getAttribute("aria-label");
      popup.refreshLabels();
      const second = dialog.getAttribute("aria-label");

      expect(second).toBe(first);
    });
  });

  // -------------------------------------------------------------------------
  // Type button hover effects
  // -------------------------------------------------------------------------

  describe("type button hover effects", () => {
    it("mouseenter on type button changes background", () => {
      popup.show(makeBounds());

      const bugBtn = document.querySelector<HTMLButtonElement>('[data-type="bug"]')!;
      bugBtn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      // Background should change from default glassBg to a type-specific bg color
      expect(bugBtn.style.background).not.toBe(colors.glassBg);
    });

    it("mouseleave on type button restores background", () => {
      popup.show(makeBounds());

      const bugBtn = document.querySelector<HTMLButtonElement>('[data-type="bug"]')!;
      bugBtn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      const hoverBg = bugBtn.style.background;

      bugBtn.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
      // After mouseleave, background should differ from hover state
      expect(bugBtn.style.background).not.toBe(hoverBg);
    });
  });

  // -------------------------------------------------------------------------
  // Textarea focus/blur styles
  // -------------------------------------------------------------------------

  describe("textarea focus/blur styles", () => {
    it("focus on textarea changes border color to accent", () => {
      popup.show(makeBounds());

      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      const borderBefore = textarea.style.borderColor;

      textarea.dispatchEvent(new Event("focus", { bubbles: true }));

      // Border color should change on focus
      expect(textarea.style.borderColor).not.toBe(borderBefore);
    });

    it("blur on textarea restores border color", () => {
      popup.show(makeBounds());

      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      textarea.dispatchEvent(new Event("focus", { bubbles: true }));
      const focusBorder = textarea.style.borderColor;

      textarea.dispatchEvent(new Event("blur", { bubbles: true }));

      // Border color should revert from the focus state
      expect(textarea.style.borderColor).not.toBe(focusBorder);
    });
  });

  // -------------------------------------------------------------------------
  // Popup position collision — horizontal flip
  // -------------------------------------------------------------------------

  describe("horizontal collision", () => {
    it("popup flips left when not enough horizontal space (left + 300 > innerWidth)", () => {
      // innerWidth defaults to 1024 in jsdom — place rect near right edge
      popup.show(makeBounds({ left: 900, right: 950, bottom: 100, top: 50 }));

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      // Should flip: left = right - 300 = 950 - 300 = 650
      expect(Number.parseInt(dialog.style.left, 10)).toBeLessThan(900);
    });
  });

  // -------------------------------------------------------------------------
  // Reduced motion / focus trap edge cases
  // -------------------------------------------------------------------------

  describe("reduced motion + focus trap edge cases", () => {
    it("disables transitions when prefers-reduced-motion is reduce", () => {
      vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      popup.show(makeBounds());

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(dialog.style.transition).toBe("none");
    });

    it("keeps the popup visible when Tab is pressed but no focusable elements exist", () => {
      popup.show(makeBounds());

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      // Remove every focusable child so the trap returns early
      for (const focusable of dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])',
      )) {
        focusable.remove();
      }

      const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
      const preventSpy = vi.spyOn(event, "preventDefault");
      dialog.dispatchEvent(event);

      expect(preventSpy).not.toHaveBeenCalled();
    });

    it("Tab from outside the popup focuses the first focusable element", () => {
      popup.show(makeBounds());

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      // Move focus to the body so document.activeElement is not contained
      document.body.focus();

      const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
      const preventSpy = vi.spyOn(event, "preventDefault");
      dialog.dispatchEvent(event);

      expect(preventSpy).toHaveBeenCalled();
    });

    it("Shift+Tab from outside the popup focuses the last focusable element", () => {
      popup.show(makeBounds());

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      document.body.focus();

      const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true });
      const preventSpy = vi.spyOn(event, "preventDefault");
      dialog.dispatchEvent(event);

      expect(preventSpy).toHaveBeenCalled();
    });

    it("Shift+Tab from a middle element does not preventDefault", () => {
      popup.show(makeBounds());

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      const focusableEls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])',
        ),
      );
      // Focus a middle element (not the first, not outside the popup)
      const middle = focusableEls[Math.floor(focusableEls.length / 2)]!;
      middle.focus();

      const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true });
      const preventSpy = vi.spyOn(event, "preventDefault");
      dialog.dispatchEvent(event);

      expect(preventSpy).not.toHaveBeenCalled();
    });

    it("Tab forward from a middle element does not preventDefault", () => {
      popup.show(makeBounds());

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      const focusableEls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])',
        ),
      );
      const middle = focusableEls[Math.floor(focusableEls.length / 2)]!;
      middle.focus();

      const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
      const preventSpy = vi.spyOn(event, "preventDefault");
      dialog.dispatchEvent(event);

      expect(preventSpy).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Hover on already-selected type button (no-op branch)
  // -------------------------------------------------------------------------

  describe("type button hover with missing data-type attribute", () => {
    it("mouseenter falls back to empty type when data-type is removed", () => {
      popup.show(makeBounds());

      const bugBtn = document.querySelector<HTMLButtonElement>('[data-type="bug"]')!;
      delete bugBtn.dataset.type;

      // Should not throw; uses the empty-string fallback for getTypeBgColor/getTypeColor
      bugBtn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    });

    it("selectType handles a button whose data-type was removed", () => {
      popup.show(makeBounds());

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      const buttons = dialog.querySelectorAll<HTMLButtonElement>("[data-type]");
      // Strip data-type from one of the existing buttons before selectType iterates
      const target = buttons[0]!;
      delete target.dataset.type;

      // Click another button to trigger selectType which loops over all buttons
      buttons[2]!.click();

      // Should not throw — branch fallback `?? ""` is exercised
      expect(buttons[2]!.getAttribute("aria-pressed")).toBe("true");
    });
  });

  describe("hover on selected type button", () => {
    it("does not change background on mouseenter when the button is already selected", () => {
      popup.show(makeBounds());

      const bugBtn = document.querySelector<HTMLButtonElement>('[data-type="bug"]')!;
      bugBtn.click(); // make it selected
      const selectedBg = bugBtn.style.background;

      bugBtn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      expect(bugBtn.style.background).toBe(selectedBg);
    });

    it("does not restore background on mouseleave when the button is already selected", () => {
      popup.show(makeBounds());

      const bugBtn = document.querySelector<HTMLButtonElement>('[data-type="bug"]')!;
      bugBtn.click();
      const selectedBg = bugBtn.style.background;

      bugBtn.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

      expect(bugBtn.style.background).toBe(selectedBg);
    });
  });

  // -------------------------------------------------------------------------
  // Cancel button hover effects
  // -------------------------------------------------------------------------

  describe("cancel button hover effects", () => {
    function getCancelButton(): HTMLButtonElement {
      const buttons = document.querySelectorAll<HTMLButtonElement>("button");
      return Array.from(buttons).find((btn) => btn.textContent === t("popup.cancel"))!;
    }

    it("mouseenter on cancel button changes border and text color to accent", () => {
      popup.show(makeBounds());

      const cancelBtn = getCancelButton();
      const beforeBorder = cancelBtn.style.borderColor;
      const beforeColor = cancelBtn.style.color;

      cancelBtn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      expect(cancelBtn.style.borderColor).not.toBe(beforeBorder);
      expect(cancelBtn.style.color).not.toBe(beforeColor);
    });

    it("mouseleave on cancel button restores border and text color", () => {
      popup.show(makeBounds());

      const cancelBtn = getCancelButton();
      cancelBtn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      const hoverBorder = cancelBtn.style.borderColor;
      const hoverColor = cancelBtn.style.color;

      cancelBtn.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

      expect(cancelBtn.style.borderColor).not.toBe(hoverBorder);
      expect(cancelBtn.style.color).not.toBe(hoverColor);
    });
  });

  // -------------------------------------------------------------------------
  // Mac shortcut hint via navigator.userAgentData
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // Meta+Enter (Mac shortcut) submits the form
  // -------------------------------------------------------------------------

  describe("Meta+Enter shortcut", () => {
    it("Meta+Enter (Mac shortcut) submits the form", async () => {
      const promise = popup.show(makeBounds());

      const bugBtn = document.querySelector<HTMLButtonElement>('[data-type="bug"]')!;
      bugBtn.click();

      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      textarea.value = "Mac shortcut test";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true }));

      const result = await promise;
      expect(result).toEqual({ type: "bug", message: "Mac shortcut test" });
    });
  });

  // -------------------------------------------------------------------------
  // Destroy without prior show should not throw
  // -------------------------------------------------------------------------

  describe("destroy without show", () => {
    it("destroy works even when no keydown trap is installed", () => {
      // Construct, destroy without ever calling show — exercises the
      // hideElement path elsewhere too. Specifically we assert that
      // the locally-constructed popup is removed without throwing.
      const localPopup = new Popup(colors, t);
      const dialogsBefore = document.querySelectorAll<HTMLElement>('[role="dialog"]').length;
      localPopup.destroy();
      const dialogsAfter = document.querySelectorAll<HTMLElement>('[role="dialog"]').length;

      expect(dialogsAfter).toBe(dialogsBefore - 1);
    });
  });

  // -------------------------------------------------------------------------
  // Submitting state (onSubmit callback — spinner, disabled controls, retry)
  // -------------------------------------------------------------------------

  describe("submitting state", () => {
    function fillForm(): void {
      const bugBtn = document.querySelector<HTMLButtonElement>('[data-type="bug"]')!;
      bugBtn.click();
      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      textarea.value = "Found a bug";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function getSubmitButton(): HTMLButtonElement {
      const buttons = document.querySelectorAll<HTMLButtonElement>("button");
      // The submit button is the only one with `aria-busy` once submitting OR
      // contains the submit label otherwise. Match by initial label.
      return Array.from(buttons).find((btn) => btn.querySelector("span")?.textContent === t("popup.submit"))!;
    }

    function getCancelButton(): HTMLButtonElement {
      const buttons = document.querySelectorAll<HTMLButtonElement>("button");
      return Array.from(buttons).find((btn) => btn.textContent === t("popup.cancel"))!;
    }

    it("invokes the onSubmit callback with the form result when submit is clicked", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      popup.show(makeBounds(), onSubmit);
      fillForm();

      getSubmitButton().click();

      await vi.waitFor(() => {
        expect(onSubmit).toHaveBeenCalledOnce();
      });
      expect(onSubmit).toHaveBeenCalledWith({ type: "bug", message: "Found a bug" });
    });

    it("swaps the submit label for a spinner while onSubmit is pending", async () => {
      let resolveSubmit!: () => void;
      const onSubmit = vi.fn().mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
      );

      popup.show(makeBounds(), onSubmit);
      fillForm();

      const submitBtn = getSubmitButton();
      submitBtn.click();

      await vi.waitFor(() => {
        expect(submitBtn.getAttribute("aria-busy")).toBe("true");
        expect(submitBtn.querySelector('[data-role="sp-popup-spinner"]')).not.toBeNull();
      });

      resolveSubmit();
    });

    it("disables submit, cancel, textarea, and type buttons while onSubmit is pending", async () => {
      let resolveSubmit!: () => void;
      const onSubmit = vi.fn().mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
      );

      popup.show(makeBounds(), onSubmit);
      fillForm();

      const submitBtn = getSubmitButton();
      const cancelBtn = getCancelButton();
      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      const typeButtons = document.querySelectorAll<HTMLButtonElement>("[data-type]");

      submitBtn.click();

      await vi.waitFor(() => {
        expect(submitBtn.disabled).toBe(true);
        expect(cancelBtn.disabled).toBe(true);
        expect(textarea.disabled).toBe(true);
        for (const btn of typeButtons) expect(btn.disabled).toBe(true);
      });

      resolveSubmit();
    });

    it("closes the popup and resolves with the result on successful onSubmit", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      const promise = popup.show(makeBounds(), onSubmit);
      fillForm();

      getSubmitButton().click();

      const result = await promise;
      expect(result).toEqual({ type: "bug", message: "Found a bug" });
    });

    it("restores the form for retry when onSubmit rejects", async () => {
      const onSubmit = vi.fn().mockRejectedValueOnce(new Error("network down"));

      popup.show(makeBounds(), onSubmit);
      fillForm();

      const submitBtn = getSubmitButton();
      const cancelBtn = getCancelButton();
      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;

      submitBtn.click();

      // Wait for the rejection to propagate
      await vi.waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
      // One extra tick for the .catch() handler
      await Promise.resolve();
      await Promise.resolve();

      // Submitting state is gone: buttons re-enabled, spinner removed, form
      // contents preserved so the user can retry with one click.
      expect(submitBtn.disabled).toBe(false);
      expect(submitBtn.getAttribute("aria-busy")).toBeNull();
      expect(submitBtn.querySelector('[data-role="sp-popup-spinner"]')).toBeNull();
      expect(cancelBtn.disabled).toBe(false);
      expect(textarea.disabled).toBe(false);
      expect(textarea.value).toBe("Found a bug");
    });

    it("re-runs onSubmit on retry after rejection", async () => {
      const onSubmit = vi.fn().mockRejectedValueOnce(new Error("network down")).mockResolvedValueOnce(undefined);

      const promise = popup.show(makeBounds(), onSubmit);
      fillForm();

      const submitBtn = getSubmitButton();

      // First click — rejects
      submitBtn.click();
      await vi.waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
      // Allow the .catch() handler to restore the form
      await Promise.resolve();
      await Promise.resolve();

      // Second click — resolves
      submitBtn.click();

      const result = await promise;
      expect(result).toEqual({ type: "bug", message: "Found a bug" });
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    it("ignores Escape, cancel click, and Ctrl+Enter while onSubmit is pending", async () => {
      let resolveSubmit!: () => void;
      const onSubmit = vi.fn().mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
      );

      const promise = popup.show(makeBounds(), onSubmit);
      let settled = false;
      void promise.then(() => {
        settled = true;
      });

      fillForm();
      getSubmitButton().click();

      // Wait for submitting state to engage
      await vi.waitFor(() => {
        expect(getSubmitButton().getAttribute("aria-busy")).toBe("true");
      });

      // Try every dismissal channel
      const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
      textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
      getCancelButton().click();

      // None of these should have settled the show() promise
      await Promise.resolve();
      await Promise.resolve();
      expect(settled).toBe(false);

      // Releasing the submit promise should let everything close normally
      resolveSubmit();
      await promise;
    });

    it("falls back to legacy fire-and-forget behaviour when no onSubmit is provided", async () => {
      // Without onSubmit the show() promise resolves immediately on submit
      // and the popup hides — same as the original synchronous API.
      const promise = popup.show(makeBounds());
      fillForm();

      getSubmitButton().click();

      const result = await promise;
      expect(result).toEqual({ type: "bug", message: "Found a bug" });
    });

    it("destroy() while a submission is pending settles the show() promise and tears down", async () => {
      // onSubmit never resolves — the popup is stuck in the submitting state.
      const onSubmit = vi.fn().mockReturnValue(new Promise<void>(() => {}));

      const promise = popup.show(makeBounds(), onSubmit);
      fillForm();

      const submitBtn = getSubmitButton();
      submitBtn.click();

      // Confirm the popup actually entered the submitting state.
      await vi.waitFor(() => {
        expect(submitBtn.getAttribute("aria-busy")).toBe("true");
      });

      // destroy() must settle the pending show() promise (no hang) — it
      // resolves null, matching a cancellation — and remove the popup.
      popup.destroy();

      const result = await promise;
      expect(result).toBeNull();
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    });

    describe("isOpen (drawing-guard contract)", () => {
      it("is false at rest, true between show() and cancel", async () => {
        expect(popup.isOpen).toBe(false);
        const promise = popup.show(makeBounds());
        expect(popup.isOpen).toBe(true);
        getCancelButton().click();
        await promise;
        expect(popup.isOpen).toBe(false);
      });

      it("stays true while onSubmit is pending and after its rejection (retry window)", async () => {
        let rejectSubmit!: (e: Error) => void;
        const onSubmit = vi.fn().mockReturnValue(
          new Promise<void>((_resolve, reject) => {
            rejectSubmit = reject;
          }),
        );

        const promise = popup.show(makeBounds(), onSubmit);
        fillForm();
        getSubmitButton().click();
        await vi.waitFor(() => {
          expect(getSubmitButton().getAttribute("aria-busy")).toBe("true");
        });

        // The annotator's drawing guards read isOpen during exactly this
        // window — it must hold while the submission is in flight…
        expect(popup.isOpen).toBe(true);

        rejectSubmit(new Error("network down"));
        await Promise.resolve();
        await Promise.resolve();

        // …and through the retry window after a failed submit.
        expect(popup.isOpen).toBe(true);

        getCancelButton().click();
        expect(await promise).toBeNull();
        expect(popup.isOpen).toBe(false);
      });

      it("is false after a successful submit settles show()", async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        const promise = popup.show(makeBounds(), onSubmit);
        fillForm();
        getSubmitButton().click();
        await promise;
        expect(popup.isOpen).toBe(false);
      });

      it("is false after destroy()", () => {
        void popup.show(makeBounds());
        expect(popup.isOpen).toBe(true);
        popup.destroy();
        expect(popup.isOpen).toBe(false);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Platform detection (Mac vs other) for the keyboard hint
// ---------------------------------------------------------------------------

describe("Popup platform detection", () => {
  let originalUaData: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalUaData = Object.getOwnPropertyDescriptor(navigator, "userAgentData");
  });

  afterEach(() => {
    if (originalUaData) {
      Object.defineProperty(navigator, "userAgentData", originalUaData);
    } else {
      Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, "userAgentData");
    }
  });

  it("uses macOS hint when navigator.userAgentData reports macOS", () => {
    Object.defineProperty(navigator, "userAgentData", {
      configurable: true,
      value: { platform: "macOS" },
    });

    const localPopup = new Popup(colors, t);
    const hint = document.body.lastElementChild?.querySelectorAll("div") ?? [];
    const hintText = Array.from(hint)
      .map((el) => el.textContent ?? "")
      .join("\n");
    expect(hintText).toContain(t("popup.submitHintMac"));

    localPopup.destroy();
  });

  it("uses non-macOS hint when navigator.userAgentData reports Windows", () => {
    Object.defineProperty(navigator, "userAgentData", {
      configurable: true,
      value: { platform: "Windows" },
    });

    const localPopup = new Popup(colors, t);
    const hint = document.body.lastElementChild?.querySelectorAll("div") ?? [];
    const hintText = Array.from(hint)
      .map((el) => el.textContent ?? "")
      .join("\n");
    expect(hintText).toContain(t("popup.submitHintOther"));

    localPopup.destroy();
  });

  it("falls back to userAgent regex when both userAgentData and platform are missing", () => {
    // Remove both userAgentData and platform so the chain falls all the way
    // through to the regex test against navigator.userAgent
    Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, "userAgentData");
    const originalPlatform = Object.getOwnPropertyDescriptor(navigator, "platform");
    const originalUserAgent = Object.getOwnPropertyDescriptor(navigator, "userAgent");
    Object.defineProperty(navigator, "platform", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });

    try {
      const localPopup = new Popup(colors, t);
      const hint = document.body.lastElementChild?.querySelectorAll("div") ?? [];
      const hintText = Array.from(hint)
        .map((el) => el.textContent ?? "")
        .join("\n");
      expect(hintText).toContain(t("popup.submitHintMac"));
      localPopup.destroy();
    } finally {
      if (originalPlatform) Object.defineProperty(navigator, "platform", originalPlatform);
      if (originalUserAgent) Object.defineProperty(navigator, "userAgent", originalUserAgent);
    }
  });
});

// ---------------------------------------------------------------------------
// Phone layout — bottom sheet
// ---------------------------------------------------------------------------

describe("Popup on phones", () => {
  let popup: Popup;
  const dialog = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label]')!;
  const byText = (text: string) =>
    Array.from(dialog().querySelectorAll<HTMLElement>("div, button")).find((el) => el.textContent === text)!;

  beforeEach(() => {
    mockMediaQueries(PHONE_MEDIA);
    popup = new Popup(colors, t);
  });

  afterEach(() => {
    popup.destroy();
    mockMediaQueries([]);
  });

  it("docks to the bottom edge as a full-width sheet, with no grab handle it could not honour", () => {
    void popup.show(makeBounds({ top: 500, bottom: 550 }));
    const el = dialog();
    expect(el.style.top).toBe("auto");
    expect(el.style.left).toBe("0px");
    expect(el.style.right).toBe("0px");
    expect(el.style.bottom).toBe("0px");
    expect(el.style.width).toBe("auto");
    expect(el.style.borderRadius).toBe("20px 20px 0 0");
    expect(el.style.background).toBe("rgb(255, 255, 255)"); // solid colors.bg, not glass
    // Only the panel sheet can be swiped away — no handle promising a drag here
    expect(el.firstElementChild!.querySelector("button[data-type]")).not.toBeNull();
    // jsdom has no layout: the sheet reports its top as the viewport bottom
    expect(popup.sheetTop).toBe(window.innerHeight);
  });

  it("sizes controls for fingers and drops the keyboard-shortcut hint", () => {
    void popup.show(makeBounds());
    const cancel = byText(t("popup.cancel"));
    const submit = cancel.nextElementSibling as HTMLElement;
    expect(cancel.style.height).toBe("48px");
    expect(submit.style.height).toBe("48px");
    expect(cancel.style.flexGrow).toBe("1");
    expect(submit.style.flexGrow).toBe("2");
    const textarea = dialog().querySelector("textarea")!;
    // iOS zooms the page into any field under 16px on focus
    expect(textarea.style.fontSize).toBe("16px");
    // The ⌘/Ctrl+Enter hint sits right under the textarea
    expect((textarea.nextElementSibling as HTMLElement).style.display).toBe("none");
  });

  it("focuses the first type button, keeping the keyboard down until the user picks a field", async () => {
    void popup.show(makeBounds());
    const firstType = dialog().querySelector<HTMLButtonElement>("button[data-type]")!;
    await vi.waitFor(() => expect(document.activeElement).toBe(firstType));
  });

  it("rides above the on-screen keyboard, and stops tracking it once closed", () => {
    const vv = mockVisualViewport();
    try {
      void popup.show(makeBounds());
      vv.keyboard(300);
      expect(dialog().style.bottom).toBe("300px");
      expect(dialog().style.maxHeight).toBe(`${window.innerHeight - 308}px`);
      // The keyboard covers the home indicator — no safe-area gap above it
      expect(dialog().style.padding).toBe("16px");

      popup.dismiss();
      expect(dialog().style.transform).toBe("translateY(100%)");
      vv.keyboard(120);
      expect(dialog().style.bottom).toBe("300px");
    } finally {
      vv.restore();
    }
  });

  it("stops tracking the keyboard on destroy", () => {
    const vv = mockVisualViewport();
    try {
      void popup.show(makeBounds());
      const el = dialog();
      popup.destroy();
      vv.keyboard(200);
      expect(el.style.bottom).toBe("0px");
    } finally {
      vv.restore();
    }
  });

  it("goes back to the anchored card when the viewport is no longer compact", () => {
    void popup.show(makeBounds());
    popup.dismiss();
    mockMediaQueries(["(pointer: coarse)"]); // a tablet: touch, but wide
    void popup.show(makeBounds());
    const el = dialog();
    expect(el.style.width).toBe("300px");
    expect(el.style.right).toBe("");
    expect(el.style.bottom).toBe("");
    expect(el.style.top).toBe("158px");
    expect(el.style.padding).toBe("16px");
    expect(popup.sheetTop).toBeNull();
    // Still a touch screen: finger-sized actions and 16px text
    expect(byText(t("popup.cancel")).style.height).toBe("44px");
    expect(el.querySelector("textarea")!.style.fontSize).toBe("16px");
  });

  it("reports no sheet while closed", () => {
    expect(popup.sheetTop).toBeNull();
  });
});

describe("Popup placement", () => {
  let popup: Popup;

  beforeEach(() => {
    popup = new Popup(colors, t);
  });

  afterEach(() => {
    popup.destroy();
  });

  it("places the card from its measured size, not a fixed estimate", () => {
    const el = document.querySelector<HTMLElement>('[role="dialog"][aria-label]')!;
    // Touch sizing makes the card taller than the no-layout fallback size
    Object.defineProperty(el, "offsetWidth", { value: 334, configurable: true });
    Object.defineProperty(el, "offsetHeight", { value: 300, configurable: true });
    // Below: 558 + 300 > 768 - 8 → flips above: 500 - 8 - 300
    void popup.show(makeBounds({ top: 500, bottom: 550 }));
    expect(el.style.top).toBe("192px");
    // It fits the viewport, so no height cap
    expect(el.style.maxHeight).toBe("");
  });
});
