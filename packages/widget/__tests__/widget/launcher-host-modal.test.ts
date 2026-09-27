// @vitest-environment jsdom

import type { SitepingStore } from "@siteping/core";
import { afterEach, describe, expect, it } from "vitest";
import { launch } from "../../src/launcher.js";
import { mockMatchMedia } from "../helpers.js";

// jsdom does not implement window.matchMedia — provide a stub
mockMatchMedia(false);

// Real launcher, annotator and popup over a host page that behaves like a
// focus-trapping modal: it listens for focus changes on `document` in the
// capture phase and would react to any focus leaving for the widget.

/** Minimal in-memory store: the widget only needs empty reads here. */
const emptyStore = {
  createFeedback: async () => ({}),
  getFeedbacks: async () => ({ feedbacks: [], total: 0 }),
  getFeedback: async () => null,
  updateFeedback: async () => ({}),
  deleteFeedback: async () => undefined,
  deleteAllFeedbacks: async () => undefined,
} as unknown as SitepingStore;

/** Let the right-click annotation settle into its open comment popup. */
const waitForPopupOpen = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 100));

describe("launcher over a host modal", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps teardown focus moves out of the popup hidden from a capture-phase focus trap", async () => {
    const hostField = document.createElement("input");
    document.body.appendChild(hostField);
    hostField.focus();
    const instance = launch({
      store: emptyStore,
      projectName: "host-modal",
      forceShow: true,
      enableRightClickComment: true,
    });
    hostField.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: 10, clientY: 10 }),
    );
    await waitForPopupOpen();
    const popupTextarea = document.querySelector<HTMLTextAreaElement>('[role="dialog"][data-siteping-ignore] textarea');
    popupTextarea?.focus();
    expect(document.activeElement).toBe(popupTextarea);

    const focusLeavingTargets: EventTarget[] = [];
    const recordFocusOut = (event: FocusEvent): void => {
      if (event.target) focusLeavingTargets.push(event.target);
    };
    document.addEventListener("focusout", recordFocusOut, true);
    try {
      instance.destroy();
    } finally {
      document.removeEventListener("focusout", recordFocusOut, true);
    }

    // Teardown handed focus back to the host field, but the modal never saw
    // it leave the widget popup.
    expect(document.activeElement).toBe(hostField);
    expect(focusLeavingTargets).not.toContain(popupTextarea);
  });

  it("keeps the widget interactive when a modal opened later inerts its siblings", async () => {
    const instance = launch({ store: emptyStore, projectName: "host-modal", forceShow: true });
    const widgetHost = document.querySelector("siteping-widget");

    widgetHost?.setAttribute("inert", "");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(widgetHost?.hasAttribute("inert")).toBe(false);
    instance.destroy();
  });
});
