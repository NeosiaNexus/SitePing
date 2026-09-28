// @vitest-environment jsdom
// The real launcher, annotator, popup, markers and tooltip over a host page
// with a modal open the way Radix / shadcn open one: `<body>` goes
// click-through. Only the DOM anchor helpers are mocked (jsdom has no
// layout), as in submit-unbounded-wait.test.ts.

import type { SitepingStore } from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { launch } from "../../src/launcher.js";
import { mockMatchMedia } from "../helpers.js";

mockMatchMedia(false);

vi.mock(new URL("../../src/dom/anchor.js", import.meta.url).pathname, () => ({
  findAnchorElement: vi.fn(() => document.body),
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

const store = {
  createFeedback: vi.fn(),
  getFeedbacks: vi.fn(async () => ({ feedbacks: [], total: 0 })),
  findByClientId: vi.fn(async () => null),
  updateFeedback: vi.fn(),
  deleteFeedback: vi.fn(),
  deleteAllFeedbacks: vi.fn(),
} satisfies SitepingStore;

const flush = () => new Promise((resolve) => setTimeout(resolve, 30));
const widgetHost = () => document.querySelector<HTMLElement>("siteping-widget")!;
// NODE_ENV=test → the shadow root is open
const shadowRoot = () => widgetHost().shadowRoot!;
const popupRoot = () => document.querySelector<HTMLElement>('[role="dialog"][data-siteping-ignore]')!;
const liveRegion = () => document.querySelector<HTMLElement>('body > [role="status"][aria-live="polite"]')!;

function pressEscape(target: HTMLElement): KeyboardEvent {
  const escapeKeyDown = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  target.dispatchEvent(escapeKeyDown);
  return escapeKeyDown;
}

async function startAnnotationFromFab(): Promise<HTMLElement> {
  shadowRoot().querySelector<HTMLButtonElement>('[data-item-id="annotate"]')!.click();
  await flush();
  return document.querySelector<HTMLElement>('div[role="application"]')!;
}

/** Right-click `target` and wait for the comment popup to focus its textarea. */
async function openPopupByRightClick(target: HTMLElement): Promise<HTMLTextAreaElement> {
  target.dispatchEvent(
    new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: 10, clientY: 10 }),
  );
  await flush();
  const textarea = popupRoot().querySelector("textarea")!;
  expect(document.activeElement).toBe(textarea);
  return textarea;
}

describe("launcher over a host modal", () => {
  let instance: ReturnType<typeof launch> | undefined;

  beforeEach(() => {
    document.body.style.pointerEvents = "none";
  });

  afterEach(() => {
    instance?.destroy();
    instance = undefined;
    document.body.innerHTML = "";
    document.body.removeAttribute("style");
  });

  it("keeps every body-level widget surface clickable", async () => {
    instance = launch({ store, projectName: "host-modal", forceShow: true });
    await flush();
    const overlay = await startAnnotationFromFab();
    const toolbar = document.querySelector<HTMLElement>('div[data-siteping-ignore="true"]:not([role])')!;

    for (const surface of [widgetHost(), overlay, toolbar, popupRoot(), document.getElementById("sp-tooltip")!]) {
      expect(getComputedStyle(surface).pointerEvents).toBe("auto");
    }
  });

  it("keeps the widget exposed when a modal opened later hides its siblings", async () => {
    instance = launch({ store, projectName: "host-modal", forceShow: true });
    const surfaces = [
      widgetHost(),
      liveRegion(),
      popupRoot(),
      document.getElementById("siteping-markers")!,
      document.getElementById("sp-tooltip")!,
    ];

    for (const surface of surfaces) {
      surface.setAttribute("inert", "");
      surface.setAttribute("aria-hidden", "true");
    }
    await flush();

    for (const surface of surfaces) {
      expect(surface.hasAttribute("inert")).toBe(false);
      expect(surface.hasAttribute("aria-hidden")).toBe(false);
    }
  });

  it("keeps a click in a marker tooltip away from the modal's outside-dismiss listeners", () => {
    instance = launch({ store, projectName: "host-modal", forceShow: true });
    const outsideInteractions: string[] = [];
    const recordOutsideInteraction = (event: Event): void => {
      outsideInteractions.push(event.type);
    };
    // Capture phase on document, like a dismissable layer registered before the widget.
    document.addEventListener("pointerdown", recordOutsideInteraction, true);
    document.addEventListener("click", recordOutsideInteraction);
    const tooltip = document.getElementById("sp-tooltip")!;

    try {
      tooltip.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      tooltip.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    } finally {
      document.removeEventListener("pointerdown", recordOutsideInteraction, true);
      document.removeEventListener("click", recordOutsideInteraction);
    }

    expect(outsideInteractions).toEqual([]);
  });

  it("hides the Escape that ends an annotation session, not one on an idle FAB", async () => {
    instance = launch({ store, projectName: "host-modal", forceShow: true });
    await flush();
    const fab = shadowRoot().querySelector<HTMLButtonElement>(".sp-fab")!;
    fab.focus();
    expect(pressEscape(fab).defaultPrevented).toBe(false);

    const overlay = await startAnnotationFromFab();
    expect(document.activeElement).toBe(overlay);

    expect(pressEscape(overlay).defaultPrevented).toBe(true);
    expect(overlay.isConnected).toBe(false);
  });

  it("hides the Escape that closes the comment popup", async () => {
    instance = launch({ store, projectName: "host-modal", forceShow: true, enableRightClickComment: true });
    const hostField = document.body.appendChild(document.createElement("input"));
    hostField.focus();
    const textarea = await openPopupByRightClick(hostField);

    expect(pressEscape(textarea).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(hostField);
  });

  it("keeps teardown focus moves out of the popup hidden from a capture-phase focus trap", async () => {
    instance = launch({ store, projectName: "host-modal", forceShow: true, enableRightClickComment: true });
    const hostField = document.body.appendChild(document.createElement("input"));
    hostField.focus();
    const textarea = await openPopupByRightClick(hostField);
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
    expect(focusLeavingTargets).not.toContain(textarea);
  });
});
