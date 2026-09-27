// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installHostIsolationGuard, isolateFromHost, isWidgetSurface } from "../../src/host-isolation.js";

// Host modals listen on `document`; these tests register such listeners
// before the guard (the normal ordering when the widget is launched over an
// already-open modal) and assert what they observe.

type Cleanup = () => void;

describe("host isolation", () => {
  let cleanups: Cleanup[];
  let surface: HTMLElement;
  let surfaceButton: HTMLButtonElement;
  let hostInput: HTMLInputElement;

  /** Register a document listener for the test and remove it afterwards. */
  function listenOnDocument<K extends keyof DocumentEventMap>(
    type: K,
    listener: (event: DocumentEventMap[K]) => void,
    capture: boolean,
  ): void {
    document.addEventListener(type, listener, capture);
    cleanups.push(() => document.removeEventListener(type, listener, capture));
  }

  function installGuard(): void {
    cleanups.push(installHostIsolationGuard(document));
  }

  beforeEach(() => {
    cleanups = [];
    surface = document.createElement("div");
    surfaceButton = document.createElement("button");
    surface.appendChild(surfaceButton);
    hostInput = document.createElement("input");
    document.body.append(surface, hostInput);
    isolateFromHost(surface);
  });

  afterEach(() => {
    for (const cleanup of cleanups.reverse()) cleanup();
    document.body.innerHTML = "";
  });

  describe("widget surface predicate", () => {
    it("recognizes registered surfaces, their descendants and shadow content", () => {
      const shadowHost = document.createElement("div");
      const shadowRoot = shadowHost.attachShadow({ mode: "open" });
      const shadowButton = document.createElement("button");
      shadowRoot.appendChild(shadowButton);
      document.body.appendChild(shadowHost);
      isolateFromHost(shadowHost);

      expect(isWidgetSurface(surface)).toBe(true);
      expect(isWidgetSurface(surfaceButton)).toBe(true);
      expect(isWidgetSurface(shadowButton)).toBe(true);
      expect(isWidgetSurface(hostInput)).toBe(false);
    });

    it("does not treat host elements masked with data-siteping-ignore as widget surfaces", () => {
      const maskedInput = document.createElement("input");
      maskedInput.setAttribute("data-siteping-ignore", "true");
      document.body.appendChild(maskedInput);

      expect(isWidgetSurface(maskedInput)).toBe(false);
    });
  });

  describe("sibling-inerting modals", () => {
    /** Let pending MutationObserver callbacks run. */
    const flushMutationObservers = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

    it("removes inert from a widget surface every time a host modal sets it", async () => {
      surface.setAttribute("inert", "");
      await flushMutationObservers();

      expect(surface.hasAttribute("inert")).toBe(false);

      surface.setAttribute("inert", "");
      await flushMutationObservers();

      expect(surface.hasAttribute("inert")).toBe(false);
    });

    it("clears an inert attribute already present when the surface is registered", () => {
      const inertSurface = document.createElement("div");
      inertSurface.setAttribute("inert", "");
      document.body.appendChild(inertSurface);

      isolateFromHost(inertSurface);

      expect(inertSurface.hasAttribute("inert")).toBe(false);
    });

    it("leaves the modal's inerting of host elements in place", async () => {
      hostInput.setAttribute("inert", "");
      surface.setAttribute("inert", "");
      await flushMutationObservers();

      expect(hostInput.hasAttribute("inert")).toBe(true);
      expect(surface.hasAttribute("inert")).toBe(false);
    });

    it("removes aria-hidden from a widget surface every time a host modal sets it", async () => {
      surface.setAttribute("aria-hidden", "true");
      await flushMutationObservers();

      expect(surface.hasAttribute("aria-hidden")).toBe(false);

      surface.setAttribute("aria-hidden", "true");
      await flushMutationObservers();

      expect(surface.hasAttribute("aria-hidden")).toBe(false);
    });

    it("clears inert and aria-hidden already present when the surface is registered", () => {
      const hiddenSurface = document.createElement("div");
      hiddenSurface.setAttribute("inert", "");
      hiddenSurface.setAttribute("aria-hidden", "true");
      document.body.appendChild(hiddenSurface);

      isolateFromHost(hiddenSurface);

      expect(hiddenSurface.hasAttribute("inert")).toBe(false);
      expect(hiddenSurface.hasAttribute("aria-hidden")).toBe(false);
    });

    it("keeps decorative aria-hidden on the surface's descendants", async () => {
      const decorativeIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      decorativeIcon.setAttribute("aria-hidden", "true");
      surfaceButton.appendChild(decorativeIcon);
      await flushMutationObservers();

      decorativeIcon.setAttribute("aria-hidden", "true");
      await flushMutationObservers();

      expect(decorativeIcon.getAttribute("aria-hidden")).toBe("true");
    });

    it("leaves the modal's aria-hidden on host elements in place", async () => {
      hostInput.setAttribute("aria-hidden", "true");
      surface.setAttribute("aria-hidden", "true");
      await flushMutationObservers();

      expect(hostInput.getAttribute("aria-hidden")).toBe("true");
      expect(surface.hasAttribute("aria-hidden")).toBe(false);
    });
  });

  describe("focus guard", () => {
    it("keeps host focusout handlers running when focus moves into a masked host element", () => {
      installGuard();
      const maskedInput = document.createElement("input");
      maskedInput.setAttribute("data-siteping-ignore", "true");
      document.body.appendChild(maskedInput);
      const onHostInputBlur = vi.fn();
      hostInput.addEventListener("focusout", onHostInputBlur);

      hostInput.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: maskedInput }));

      expect(onHostInputBlur).toHaveBeenCalledTimes(1);
    });

    it("hides focus moving from the host page into the widget from capture-phase focus traps", () => {
      const onDocumentFocusOut = vi.fn();
      listenOnDocument("focusout", onDocumentFocusOut, true);
      installGuard();

      hostInput.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: surfaceButton }));

      expect(onDocumentFocusOut).not.toHaveBeenCalled();
    });

    it("hides focusin on a widget surface from capture-phase focus traps", () => {
      const onDocumentFocusIn = vi.fn();
      listenOnDocument("focusin", onDocumentFocusIn, true);
      installGuard();

      surfaceButton.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      hostInput.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

      expect(onDocumentFocusIn).toHaveBeenCalledTimes(1);
      expect(onDocumentFocusIn.mock.calls[0]?.[0].target).toBe(hostInput);
    });
  });

  describe("click-based outside dismissal", () => {
    it("hides clicks on a widget surface from bubble-phase document listeners", () => {
      const onDocumentClick = vi.fn();
      listenOnDocument("click", onDocumentClick, false);
      const onSurfaceButtonClick = vi.fn();
      surfaceButton.addEventListener("click", onSurfaceButtonClick);

      surfaceButton.click();
      hostInput.click();

      expect(onSurfaceButtonClick).toHaveBeenCalledTimes(1);
      expect(onDocumentClick).toHaveBeenCalledTimes(1);
      expect(onDocumentClick.mock.calls[0]?.[0].target).toBe(hostInput);
    });
  });

  describe("Escape containment", () => {
    it("marks an Escape keydown from a widget surface as handled before capture-phase host listeners run", () => {
      const escapeSeenAsHandled: boolean[] = [];
      listenOnDocument("keydown", (event) => escapeSeenAsHandled.push(event.defaultPrevented), true);
      installGuard();

      surfaceButton.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
      hostInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));

      expect(escapeSeenAsHandled).toEqual([true, false]);
    });

    it("still delivers Escape to the widget's own surface and document listeners", () => {
      installGuard();
      const onSurfaceKeyDown = vi.fn();
      surfaceButton.addEventListener("keydown", onSurfaceKeyDown);
      const onWidgetDocumentKeyDown = vi.fn();
      listenOnDocument("keydown", onWidgetDocumentKeyDown, false);

      surfaceButton.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));

      expect(onSurfaceKeyDown).toHaveBeenCalledTimes(1);
      expect(onWidgetDocumentKeyDown).toHaveBeenCalledTimes(1);
    });

    it("leaves other keys from a widget surface untouched", () => {
      installGuard();
      const keyDown = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });

      surfaceButton.dispatchEvent(keyDown);

      expect(keyDown.defaultPrevented).toBe(false);
    });
  });

  describe("capture-phase host listeners", () => {
    it("hides pointerdown on a widget surface from capture-phase outside-interaction listeners", () => {
      const onDocumentPointerDown = vi.fn();
      listenOnDocument("pointerdown", onDocumentPointerDown, true);
      installGuard();

      surfaceButton.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      hostInput.dispatchEvent(new Event("pointerdown", { bubbles: true }));

      expect(onDocumentPointerDown).toHaveBeenCalledTimes(1);
      expect(onDocumentPointerDown.mock.calls[0]?.[0].target).toBe(hostInput);
    });

    it("keeps delivering mousedown and click to the widget's own listeners", () => {
      installGuard();
      const onSurfaceMouseDown = vi.fn();
      const onSurfaceClick = vi.fn();
      surface.addEventListener("mousedown", onSurfaceMouseDown);
      surfaceButton.addEventListener("click", onSurfaceClick);

      surfaceButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      surfaceButton.click();

      expect(onSurfaceMouseDown).toHaveBeenCalledTimes(1);
      expect(onSurfaceClick).toHaveBeenCalledTimes(1);
    });

    it("stops isolating once the guard is removed", () => {
      const onDocumentPointerDown = vi.fn();
      listenOnDocument("pointerdown", onDocumentPointerDown, true);
      const removeGuard = installHostIsolationGuard(document);
      removeGuard();

      surfaceButton.dispatchEvent(new Event("pointerdown", { bubbles: true }));

      expect(onDocumentPointerDown).toHaveBeenCalledTimes(1);
    });
  });
});
