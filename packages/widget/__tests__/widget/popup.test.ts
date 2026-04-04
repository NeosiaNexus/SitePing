// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createT } from "../../src/i18n/index.js";
import { Popup } from "../../src/popup.js";
import { buildThemeColors } from "../../src/styles/theme.js";

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
      // window.innerHeight defaults to 768 in jsdom
      popup.show(makeBounds({ top: 500, bottom: 600 }));

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      // Should flip up: top = rectTop - 220 - 8 = 500 - 228 = 272
      expect(dialog.style.top).toBe("272px");
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

      const lastEl = focusableEls[focusableEls.length - 1];
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

      const firstEl = focusableEls[0];
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
});
