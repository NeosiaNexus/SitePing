// @vitest-environment jsdom
import type { FeedbackResponse } from "@siteping/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBus, type WidgetEvents } from "../../src/events.js";
import { createT } from "../../src/i18n/index.js";
import { buildThemeColors } from "../../src/styles/theme.js";
import { mockMatchMedia } from "../helpers.js";

mockMatchMedia(false);

// Only the anchor helpers are mocked — the REAL Popup is used: these tests
// exist precisely because the mocked-popup suite cannot pin this behavior.
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

const flush = () => new Promise((r) => setTimeout(r, 20));

function findOverlay(): HTMLElement {
  return document.body.querySelector<HTMLElement>('div[data-siteping-ignore][tabindex="0"]')!;
}

function drag(overlay: HTMLElement, x1: number, y1: number, x2: number, y2: number) {
  overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: x1, clientY: y1, bubbles: true }));
  overlay.dispatchEvent(new MouseEvent("mouseup", { clientX: x2, clientY: y2, bubbles: true }));
}

describe("draw flow — popup re-entry guards (#196, real Popup)", () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    // A failed assertion skips in-test teardown — scrub leaked DOM so one
    // failure can't cascade into the next test.
    document.body.innerHTML = "";
  });

  it("drawing a second rectangle while the popup is open pre-Send must not reset the draft", async () => {
    const bus = new EventBus<WidgetEvents>();
    const annotator = new Annotator(buildThemeColors(), bus, createT("en"));
    cleanup = () => annotator.destroy();

    bus.emit("annotation:start");
    const overlay = findOverlay();

    // First rectangle → popup opens, show() promise pending (nobody clicked Send)
    drag(overlay, 100, 100, 200, 200);
    await flush();
    const textarea = document.body.querySelector("textarea")!;
    textarea.value = "my precious draft";

    // User instinctively redraws next to the open popup
    drag(overlay, 300, 300, 400, 400);
    await flush();

    expect(textarea.value).toBe("my precious draft");
  });

  it("after cancel (show() resolved null), drawing a new rectangle still works", async () => {
    const bus = new EventBus<WidgetEvents>();
    const annotator = new Annotator(buildThemeColors(), bus, createT("en"));
    cleanup = () => annotator.destroy();

    bus.emit("annotation:start");
    const overlay = findOverlay();

    drag(overlay, 100, 100, 200, 200);
    await flush();

    const cancelBtn = Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === "Cancel")!;
    expect(cancelBtn).toBeDefined();
    cancelBtn.click();
    await flush();

    // Redraw must open a fresh popup session
    drag(overlay, 300, 300, 400, 400);
    await flush();
    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.style.display).toBe("block");
  });

  it("second drag while the submission is in flight post-Send is inert", async () => {
    const bus = new EventBus<WidgetEvents>();
    const annotator = new Annotator(buildThemeColors(), bus, createT("en"));
    cleanup = () => annotator.destroy();
    const completeListener = vi.fn();
    bus.on("annotation:complete", completeListener);

    bus.emit("annotation:start");
    const overlay = findOverlay();

    drag(overlay, 100, 100, 200, 200);
    await flush();

    // Fill the form and click Send — runSubmission now hangs on its terminal
    // bus event, the popup is in the submitting state.
    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    dialog.querySelector<HTMLButtonElement>('button[data-type="bug"]')!.click();
    const textarea = dialog.querySelector("textarea")!;
    textarea.value = "submitted message";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    Array.from(dialog.querySelectorAll("button"))
      .find((b) => b.textContent?.includes("Send"))!
      .click();
    await flush();

    expect(completeListener).toHaveBeenCalledOnce();
    expect(textarea.disabled).toBe(true);

    // Second drag during the in-flight submission — must be a no-op. A second
    // popup.show() would reset the form: submittingState=false, textarea
    // enabled and cleared.
    drag(overlay, 300, 300, 400, 400);
    await flush();

    expect(textarea.disabled).toBe(true);
    expect(textarea.value).toBe("submitted message");
    expect(completeListener).toHaveBeenCalledOnce();

    // Complete the submission — exactly one feedback sent.
    bus.emit("feedback:sent", { id: "f1" } as FeedbackResponse);
    await flush();
    expect(completeListener).toHaveBeenCalledOnce();
  });

  describe("ending the session from outside the popup closes the comment form", () => {
    function openPopup() {
      const bus = new EventBus<WidgetEvents>();
      const annotator = new Annotator(buildThemeColors(), bus, createT("en"));
      cleanup = () => annotator.destroy();
      const endListener = vi.fn();
      bus.on("annotation:end", endListener);

      bus.emit("annotation:start");
      drag(findOverlay(), 100, 100, 200, 200);
      return { bus, annotator, endListener };
    }

    /** Fill the open popup and click Send — the submission then waits on a terminal bus event. */
    function sendFeedback(message: string) {
      const dialog = findDialog();
      dialog.querySelector<HTMLButtonElement>('button[data-type="bug"]')!.click();
      const textarea = dialog.querySelector("textarea")!;
      textarea.value = message;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      Array.from(dialog.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Send"))!
        .click();
      return { dialog, textarea };
    }

    const findDialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    const findToolbarCancel = () =>
      Array.from(document.body.querySelectorAll("button")).find(
        (button) => button.textContent === "Cancel" && !button.closest('[role="dialog"]'),
      )!;

    it("toolbar Cancel dismisses the open popup", async () => {
      const { endListener } = openPopup();
      await flush();
      expect(findDialog().style.display).toBe("block");

      findToolbarCancel().click();
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(endListener).toHaveBeenCalledOnce();
      expect(findDialog().style.display).toBe("none");
    });

    it("Escape outside the textarea dismisses the open popup", async () => {
      const { endListener } = openPopup();
      await flush();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(endListener).toHaveBeenCalledOnce();
      expect(findDialog().style.display).toBe("none");
    });

    it("keeps the popup and its in-flight submission when the toolbar Cancel is hit mid-send", async () => {
      const { bus } = openPopup();
      await flush();
      const dialog = findDialog();
      dialog.querySelector<HTMLButtonElement>('button[data-type="bug"]')!.click();
      const textarea = dialog.querySelector("textarea")!;
      textarea.value = "sending";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      Array.from(dialog.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Send"))!
        .click();
      await flush();

      findToolbarCancel().click();
      await flush();

      expect(dialog.style.display).toBe("block");
      expect(textarea.disabled).toBe(true);

      bus.emit("feedback:sent", { id: "f1" } as FeedbackResponse);
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(dialog.style.display).toBe("none");
    });

    it.each([
      ["toolbar Cancel", () => findToolbarCancel().click()],
      ["Escape", () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))],
    ])("keeps the session active when %s is used mid-send, ending it once feedback is sent", async (_label, endSession) => {
      const { bus, annotator, endListener } = openPopup();
      await flush();
      sendFeedback("sending");
      await flush();

      endSession();
      await flush();

      expect(annotator.isBusy).toBe(true);
      expect(endListener).not.toHaveBeenCalled();
      expect(findOverlay()).not.toBeNull();

      bus.emit("feedback:sent", { id: "f1" } as FeedbackResponse);
      await flush();

      expect(annotator.isBusy).toBe(false);
      expect(endListener).toHaveBeenCalledOnce();
      expect(findOverlay()).toBeNull();
    });

    it("blocks a new instant annotation while a cancelled-mid-send submission is pending", async () => {
      const { bus, annotator, endListener } = openPopup();
      const startListener = vi.fn();
      bus.on("annotation:start", startListener);
      const completeListener = vi.fn();
      bus.on("annotation:complete", completeListener);
      await flush();
      const { textarea } = sendFeedback("first submission");
      await flush();

      findToolbarCancel().click();
      await annotator.startInstantAnnotation(50, 50);
      await flush();

      // The pending popup keeps its form and submission — no second session started.
      expect(startListener).not.toHaveBeenCalled();
      expect(textarea.disabled).toBe(true);
      expect(textarea.value).toBe("first submission");

      bus.emit("feedback:sent", { id: "f1" } as FeedbackResponse);
      await flush();

      expect(completeListener).toHaveBeenCalledOnce();
      expect(endListener).toHaveBeenCalledOnce();
      expect(annotator.isBusy).toBe(false);
    });
  });
});
