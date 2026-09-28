// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  installHostIsolationGuard,
  isolateFromHost,
  isWidgetSurface,
  registerEscapeLayer,
  setSurfaceInert,
} from "../../src/host-isolation.js";

// Host modals listen on `document`. These tests register such listeners
// before the guard (the widget launched over an already-open modal) and
// assert what they observe. A modal is "open" the way Radix / shadcn open
// one: `<body>` goes click-through.

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
    cleanups.push(installHostIsolationGuard());
  }

  function openHostModal(): void {
    document.body.style.pointerEvents = "none";
  }

  /** Register an Escape layer for the test and unregister it afterwards. */
  function registerLayer(scope: Node, isOpen: () => boolean): void {
    cleanups.push(registerEscapeLayer(scope, isOpen));
  }

  const pressEscape = (target: Element): KeyboardEvent => {
    const escapeKeyDown = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    target.dispatchEvent(escapeKeyDown);
    return escapeKeyDown;
  };

  /** Mount a widget surface hosting a closed shadow root (the production widget's layout). */
  function mountClosedShadowSurface(registerRoot: boolean): {
    shadowRoot: ShadowRoot;
    shadowButton: HTMLButtonElement;
  } {
    const shadowHost = document.createElement("div");
    const shadowRoot = shadowHost.attachShadow({ mode: "closed" });
    const shadowButton = document.createElement("button");
    shadowRoot.appendChild(shadowButton);
    document.body.appendChild(shadowHost);
    if (registerRoot) isolateFromHost(shadowHost, shadowRoot);
    else isolateFromHost(shadowHost);
    return { shadowRoot, shadowButton };
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
    document.body.removeAttribute("style");
  });

  describe("widget surface predicate", () => {
    it("recognizes registered surfaces, their descendants and shadow content", () => {
      const shadowHost = document.createElement("div");
      const shadowButton = document.createElement("button");
      shadowHost.attachShadow({ mode: "open" }).appendChild(shadowButton);
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

  describe("bubble-phase isolation", () => {
    it.each([
      ["pointerdown", () => new PointerEvent("pointerdown", { bubbles: true })],
      ["mousedown", () => new MouseEvent("mousedown", { bubbles: true })],
      ["touchstart", () => new Event("touchstart", { bubbles: true })],
      ["touchend", () => new Event("touchend", { bubbles: true })],
      ["click", () => new MouseEvent("click", { bubbles: true })],
      ["focusin", () => new FocusEvent("focusin", { bubbles: true })],
      ["focusout", () => new FocusEvent("focusout", { bubbles: true })],
      ["wheel", () => new WheelEvent("wheel", { bubbles: true, cancelable: true })],
      ["touchmove", () => new Event("touchmove", { bubbles: true, cancelable: true })],
    ] as const)("hides %s on a surface from document listeners, never the surface's own", (type, createEvent) => {
      const onDocument = vi.fn();
      listenOnDocument(type, onDocument, false);
      const onSurfaceButton = vi.fn();
      surfaceButton.addEventListener(type, onSurfaceButton);

      surfaceButton.dispatchEvent(createEvent());
      hostInput.dispatchEvent(createEvent());

      expect(onSurfaceButton).toHaveBeenCalledTimes(1);
      expect(onDocument).toHaveBeenCalledTimes(1);
      expect(onDocument.mock.calls[0]?.[0].target).toBe(hostInput);
    });

    it("keeps a scroll lock's document wheel listener from cancelling scrolling on a surface", () => {
      listenOnDocument("wheel", (event) => event.preventDefault(), false);

      const wheel = new WheelEvent("wheel", { bubbles: true, cancelable: true });
      surfaceButton.dispatchEvent(wheel);

      expect(wheel.defaultPrevented).toBe(false);
    });
  });

  describe("sibling-hiding modals", () => {
    /** Let pending MutationObserver callbacks run. */
    const flushMutationObservers = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

    it.each(["inert", "aria-hidden"])("removes %s from a surface every time a host modal sets it", async (name) => {
      surface.setAttribute(name, "true");
      await flushMutationObservers();

      expect(surface.hasAttribute(name)).toBe(false);

      surface.setAttribute(name, "true");
      await flushMutationObservers();

      expect(surface.hasAttribute(name)).toBe(false);
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

    it("leaves the modal's attributes on host elements and the surface's descendants", async () => {
      hostInput.setAttribute("inert", "");
      hostInput.setAttribute("aria-hidden", "true");
      const decorativeIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      decorativeIcon.setAttribute("aria-hidden", "true");
      surfaceButton.appendChild(decorativeIcon);
      await flushMutationObservers();

      expect(hostInput.hasAttribute("inert")).toBe(true);
      expect(hostInput.getAttribute("aria-hidden")).toBe("true");
      expect(decorativeIcon.getAttribute("aria-hidden")).toBe("true");
    });

    it("keeps the surface's own inert, and drops a host inert once the surface clears its own", async () => {
      setSurfaceInert(surface, true);
      await flushMutationObservers();

      expect(surface.hasAttribute("inert")).toBe(true);

      setSurfaceInert(surface, false);
      surface.setAttribute("inert", "");
      await flushMutationObservers();

      expect(surface.hasAttribute("inert")).toBe(false);
    });
  });

  describe("capture-phase guard, no host modal open", () => {
    it("keeps a host field's focusout (React onBlur) when focus moves into the widget", () => {
      installGuard();
      const onHostFieldBlur = vi.fn();
      hostInput.addEventListener("focusout", onHostFieldBlur);
      const onDocumentFocusOut = vi.fn();
      listenOnDocument("focusout", onDocumentFocusOut, true);
      hostInput.focus();

      surfaceButton.focus();

      expect(document.activeElement).toBe(surfaceButton);
      expect(onHostFieldBlur).toHaveBeenCalledTimes(1);
      expect(onDocumentFocusOut).toHaveBeenCalledTimes(1);
    });

    it("lets capture-phase host listeners see pointerdown and focusin on a surface", () => {
      installGuard();
      const onDocumentPointerDown = vi.fn();
      const onDocumentFocusIn = vi.fn();
      listenOnDocument("pointerdown", onDocumentPointerDown, true);
      listenOnDocument("focusin", onDocumentFocusIn, true);

      surfaceButton.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      surfaceButton.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

      expect(onDocumentPointerDown).toHaveBeenCalledTimes(1);
      expect(onDocumentFocusIn).toHaveBeenCalledTimes(1);
    });

    it("leaves Escape unhandled even with an open widget layer", () => {
      installGuard();
      registerLayer(surface, () => true);

      expect(pressEscape(surfaceButton).defaultPrevented).toBe(false);
    });
  });

  describe("capture-phase guard, host modal open", () => {
    let removeGuard: Cleanup;

    beforeEach(() => {
      removeGuard = installHostIsolationGuard();
      cleanups.push(removeGuard);
      openHostModal();
    });

    it("hides pointerdown and focusin on a surface from capture-phase host listeners", () => {
      const onDocumentPointerDown = vi.fn();
      const onDocumentFocusIn = vi.fn();
      listenOnDocument("pointerdown", onDocumentPointerDown, true);
      listenOnDocument("focusin", onDocumentFocusIn, true);

      surfaceButton.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      surfaceButton.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      hostInput.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      hostInput.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

      expect(onDocumentPointerDown.mock.calls.map(([event]) => event.target)).toEqual([hostInput]);
      expect(onDocumentFocusIn.mock.calls.map(([event]) => event.target)).toEqual([hostInput]);
    });

    it("keeps delivering mousedown and click to the widget's own listeners", () => {
      const onSurfaceMouseDown = vi.fn();
      const onSurfaceClick = vi.fn();
      surface.addEventListener("mousedown", onSurfaceMouseDown);
      surfaceButton.addEventListener("click", onSurfaceClick);

      surfaceButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      surfaceButton.click();

      expect(onSurfaceMouseDown).toHaveBeenCalledTimes(1);
      expect(onSurfaceClick).toHaveBeenCalledTimes(1);
    });

    it("hides focus moving from the page into the widget, and leaving it, from focus traps", () => {
      const onDocumentFocusOut = vi.fn();
      listenOnDocument("focusout", onDocumentFocusOut, true);
      hostInput.focus();

      surfaceButton.focus();
      hostInput.focus();

      expect(document.activeElement).toBe(hostInput);
      expect(onDocumentFocusOut).not.toHaveBeenCalled();
    });

    it("hides only the host field's focusout, not its native blur, when focus moves into the widget", () => {
      const onHostFieldFocusOut = vi.fn();
      const onHostFieldBlur = vi.fn();
      hostInput.addEventListener("focusout", onHostFieldFocusOut);
      hostInput.addEventListener("blur", onHostFieldBlur);
      hostInput.focus();

      surfaceButton.focus();

      expect(onHostFieldFocusOut).not.toHaveBeenCalled();
      expect(onHostFieldBlur).toHaveBeenCalledTimes(1);
    });

    it("keeps focusout when focus moves to a host element masked with data-siteping-ignore", () => {
      const maskedInput = document.createElement("input");
      maskedInput.setAttribute("data-siteping-ignore", "true");
      document.body.appendChild(maskedInput);
      const onHostFieldBlur = vi.fn();
      hostInput.addEventListener("focusout", onHostFieldBlur);
      hostInput.focus();

      maskedInput.focus();

      expect(onHostFieldBlur).toHaveBeenCalledTimes(1);
    });

    it("marks an Escape consumed by an open layer as handled before capture-phase host listeners run", () => {
      const escapeSeenAsHandled: boolean[] = [];
      listenOnDocument("keydown", (event) => escapeSeenAsHandled.push(event.defaultPrevented), true);
      registerLayer(surface, () => true);

      pressEscape(surfaceButton);
      pressEscape(hostInput);

      expect(escapeSeenAsHandled).toEqual([true, false]);
    });

    it("lets Escape through once the layer has closed, so the next one closes the modal", () => {
      let isLayerOpen = true;
      registerLayer(surface, () => isLayerOpen);
      surfaceButton.addEventListener("keydown", (event) => {
        if (event.key === "Escape") isLayerOpen = false;
      });

      expect(pressEscape(surfaceButton).defaultPrevented).toBe(true);
      expect(pressEscape(surfaceButton).defaultPrevented).toBe(false);
    });

    it("ignores open layers that are not on the Escape's path, and unregistered ones", () => {
      const otherSurface = document.createElement("div");
      document.body.appendChild(otherSurface);
      isolateFromHost(otherSurface);
      registerLayer(otherSurface, () => true);
      registerEscapeLayer(surface, () => true)();

      expect(pressEscape(surfaceButton).defaultPrevented).toBe(false);
    });

    it("honours document-wide layers for Escape from any surface, never from host elements", () => {
      registerLayer(document, () => true);

      expect(pressEscape(surfaceButton).defaultPrevented).toBe(true);
      expect(pressEscape(hostInput).defaultPrevented).toBe(false);
    });

    it("finds layers inside a closed shadow root registered with its host", () => {
      const { shadowRoot, shadowButton } = mountClosedShadowSurface(true);
      registerLayer(shadowRoot, () => true);
      shadowButton.focus();

      expect(pressEscape(shadowButton).defaultPrevented).toBe(true);
    });

    it("cannot see into a closed shadow root registered without it", () => {
      const { shadowRoot, shadowButton } = mountClosedShadowSurface(false);
      registerLayer(shadowRoot, () => true);
      shadowButton.focus();

      expect(pressEscape(shadowButton).defaultPrevented).toBe(false);
    });

    it("still delivers Escape to the widget's surface and document listeners, and leaves other keys alone", () => {
      registerLayer(surface, () => true);
      const onSurfaceKeyDown = vi.fn();
      surfaceButton.addEventListener("keydown", onSurfaceKeyDown);
      const onDocumentKeyDown = vi.fn();
      listenOnDocument("keydown", onDocumentKeyDown, false);
      const enter = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });

      pressEscape(surfaceButton);
      surfaceButton.dispatchEvent(enter);

      expect(onSurfaceKeyDown).toHaveBeenCalledTimes(2);
      expect(onDocumentKeyDown).toHaveBeenCalledTimes(2);
      expect(enter.defaultPrevented).toBe(false);
    });

    it("stops isolating once the guard is removed", () => {
      const onDocumentPointerDown = vi.fn();
      listenOnDocument("pointerdown", onDocumentPointerDown, true);
      removeGuard();

      surfaceButton.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(onDocumentPointerDown).toHaveBeenCalledTimes(1);
    });
  });

  describe("host modal detection", () => {
    const pointerDownReachesCapturePhase = (): boolean => {
      const onDocumentPointerDown = vi.fn();
      document.addEventListener("pointerdown", onDocumentPointerDown, true);
      surfaceButton.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
      return onDocumentPointerDown.mock.calls.length > 0;
    };

    /** An `aria-modal` dialog; jsdom has no layout, so "rendered" is stubbed. */
    function mountAriaModal(parent: HTMLElement, rendered: boolean): HTMLElement {
      const dialog = document.createElement("div");
      dialog.setAttribute("aria-modal", "true");
      vi.spyOn(dialog, "getClientRects").mockReturnValue({ length: rendered ? 1 : 0 } as DOMRectList);
      parent.appendChild(dialog);
      return dialog;
    }

    beforeEach(() => {
      installGuard();
    });

    it("treats a rendered aria-modal dialog of the page as an open modal", () => {
      mountAriaModal(document.body, true);

      expect(pointerDownReachesCapturePhase()).toBe(false);
    });

    it("ignores an aria-modal dialog that is not rendered", () => {
      mountAriaModal(document.body, false);

      expect(pointerDownReachesCapturePhase()).toBe(true);
    });

    it("ignores a closed dialog kept rendered under visibility: hidden", () => {
      const closedDrawer = document.createElement("div");
      closedDrawer.style.visibility = "hidden";
      document.body.appendChild(closedDrawer);
      mountAriaModal(closedDrawer, true);

      expect(pointerDownReachesCapturePhase()).toBe(true);
    });

    it("ignores the widget's own aria-modal surfaces (the comment popup)", () => {
      mountAriaModal(surface, true);

      expect(pointerDownReachesCapturePhase()).toBe(true);
    });
  });
});
