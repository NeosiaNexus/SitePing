// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addSurfaceKeydownListener,
  installHostIsolationGuard,
  isolateFromHost,
  isWidgetSurface,
  registerEscapeLayer,
  removeSurfaceKeydownListener,
} from "../../src/host-isolation.js";

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

  /**
   * Mount a widget surface host with an empty closed shadow root (the
   * production widget's layout), without registering the root with the guard.
   */
  function mountClosedShadowSurface(): { shadowRoot: ShadowRoot; shadowHost: HTMLElement } {
    const shadowHost = document.createElement("div");
    const shadowRoot = shadowHost.attachShadow({ mode: "closed" });
    document.body.appendChild(shadowHost);
    isolateFromHost(shadowHost);
    return { shadowRoot, shadowHost };
  }

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

    /** Register an Escape layer for the test and unregister it afterwards. */
    function registerLayer(scope: Node, isOpen: () => boolean): void {
      cleanups.push(registerEscapeLayer(scope, isOpen));
    }

    it("marks an Escape keydown from a widget surface with an open layer as handled before capture-phase host listeners run", () => {
      const escapeSeenAsHandled: boolean[] = [];
      listenOnDocument("keydown", (event) => escapeSeenAsHandled.push(event.defaultPrevented), true);
      installGuard();
      registerLayer(surface, () => true);

      pressEscape(surfaceButton);
      pressEscape(hostInput);

      expect(escapeSeenAsHandled).toEqual([true, false]);
    });

    it("lets Escape from an idle widget surface reach host modals unhandled", () => {
      const escapeSeenAsHandled: boolean[] = [];
      listenOnDocument("keydown", (event) => escapeSeenAsHandled.push(event.defaultPrevented), true);
      installGuard();
      registerLayer(surface, () => false);

      pressEscape(surfaceButton);

      expect(escapeSeenAsHandled).toEqual([false]);
    });

    it("stops handling Escape once the layer closes, so the next Escape reaches the host", () => {
      installGuard();
      let isLayerOpen = true;
      registerLayer(surface, () => isLayerOpen);
      surfaceButton.addEventListener("keydown", (event) => {
        if (event.key === "Escape") isLayerOpen = false;
      });

      const closingEscape = pressEscape(surfaceButton);
      const nextEscape = pressEscape(surfaceButton);

      expect(closingEscape.defaultPrevented).toBe(true);
      expect(nextEscape.defaultPrevented).toBe(false);
    });

    it("ignores open layers that are not on the Escape's path", () => {
      installGuard();
      const otherSurface = document.createElement("div");
      document.body.appendChild(otherSurface);
      isolateFromHost(otherSurface);
      registerLayer(otherSurface, () => true);

      expect(pressEscape(surfaceButton).defaultPrevented).toBe(false);
    });

    it("honours document-wide layers for Escape from any widget surface, never from host elements", () => {
      installGuard();
      registerLayer(document, () => true);

      expect(pressEscape(surfaceButton).defaultPrevented).toBe(true);
      expect(pressEscape(hostInput).defaultPrevented).toBe(false);
    });

    it("finds layers registered inside a closed shadow root", () => {
      installGuard();
      const shadowHost = document.createElement("div");
      const shadowRoot = shadowHost.attachShadow({ mode: "closed" });
      const shadowButton = document.createElement("button");
      shadowRoot.appendChild(shadowButton);
      document.body.appendChild(shadowHost);
      isolateFromHost(shadowHost);
      registerLayer(shadowRoot, () => true);
      shadowButton.focus();

      expect(pressEscape(shadowButton).defaultPrevented).toBe(true);
    });

    it("finds layers registered on an element inside a closed shadow root", () => {
      installGuard();
      const { shadowRoot } = mountClosedShadowSurface();
      const layerElement = document.createElement("button");
      shadowRoot.appendChild(layerElement);
      registerLayer(layerElement, () => true);
      layerElement.focus();

      expect(pressEscape(layerElement).defaultPrevented).toBe(true);
    });

    it("finds layers registered on an element before it is appended to a closed shadow root", () => {
      installGuard();
      const { shadowRoot } = mountClosedShadowSurface();
      const dialog = document.createElement("div");
      const dialogButton = document.createElement("button");
      dialog.appendChild(dialogButton);
      registerLayer(dialog, () => true);
      shadowRoot.appendChild(dialog);
      dialogButton.focus();

      expect(pressEscape(dialogButton).defaultPrevented).toBe(true);
    });

    it("stops handling Escape for a layer once it is unregistered", () => {
      installGuard();
      const unregister = registerEscapeLayer(surface, () => true);
      unregister();

      expect(pressEscape(surfaceButton).defaultPrevented).toBe(false);
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

  describe("Tab containment", () => {
    const pressTab = (target: Element): KeyboardEvent => {
      const tabKeyDown = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true, composed: true });
      target.dispatchEvent(tabKeyDown);
      return tabKeyDown;
    };

    it("hides Tab from a widget surface from capture-phase host focus traps", () => {
      const onDocumentKeyDown = vi.fn();
      listenOnDocument("keydown", onDocumentKeyDown, true);
      installGuard();

      pressTab(surfaceButton);
      pressTab(hostInput);

      expect(onDocumentKeyDown).toHaveBeenCalledTimes(1);
      expect(onDocumentKeyDown.mock.calls[0]?.[0].target).toBe(hostInput);
    });

    it("delivers Tab once to the widget's surface keydown listeners, innermost first, with the original event", () => {
      installGuard();
      const deliveryOrder: string[] = [];
      const surfaceButtonListener = (event: KeyboardEvent): void => {
        deliveryOrder.push("button");
        event.preventDefault();
      };
      addSurfaceKeydownListener(surfaceButton, surfaceButtonListener);
      addSurfaceKeydownListener(surface, () => deliveryOrder.push("surface"));
      surfaceButton.focus();

      const tabKeyDown = pressTab(surfaceButton);

      expect(deliveryOrder).toEqual(["button", "surface"]);
      expect(tabKeyDown.defaultPrevented).toBe(true);
    });

    it("reaches keydown listeners on elements inside a closed shadow root", () => {
      const onDocumentKeyDown = vi.fn();
      listenOnDocument("keydown", onDocumentKeyDown, true);
      installGuard();
      const shadowHost = document.createElement("div");
      const shadowRoot = shadowHost.attachShadow({ mode: "closed" });
      const shadowButton = document.createElement("button");
      shadowRoot.appendChild(shadowButton);
      document.body.appendChild(shadowHost);
      isolateFromHost(shadowHost);
      const onShadowRootKeyDown = vi.fn();
      addSurfaceKeydownListener(shadowRoot, onShadowRootKeyDown);
      shadowButton.focus();

      pressTab(shadowButton);

      expect(onShadowRootKeyDown).toHaveBeenCalledTimes(1);
      expect(onDocumentKeyDown).not.toHaveBeenCalled();
    });

    it("reaches keydown listeners registered on an element inside a closed shadow root", () => {
      const onDocumentKeyDown = vi.fn();
      listenOnDocument("keydown", onDocumentKeyDown, true);
      installGuard();
      const { shadowRoot } = mountClosedShadowSurface();
      const trapElement = document.createElement("div");
      const trapButton = document.createElement("button");
      trapElement.appendChild(trapButton);
      shadowRoot.appendChild(trapElement);
      const onTrapKeyDown = vi.fn();
      addSurfaceKeydownListener(trapElement, onTrapKeyDown);
      trapButton.focus();

      pressTab(trapButton);

      expect(onTrapKeyDown).toHaveBeenCalledTimes(1);
      expect(onDocumentKeyDown).not.toHaveBeenCalled();
    });

    it("reaches keydown listeners registered on an element before it is appended to a closed shadow root", () => {
      installGuard();
      const { shadowRoot } = mountClosedShadowSurface();
      const dialog = document.createElement("div");
      const dialogButton = document.createElement("button");
      dialog.appendChild(dialogButton);
      const onDialogKeyDown = vi.fn((event: KeyboardEvent) => event.preventDefault());
      addSurfaceKeydownListener(dialog, onDialogKeyDown);
      shadowRoot.appendChild(dialog);
      dialogButton.focus();

      const tabKeyDown = pressTab(dialogButton);

      expect(onDialogKeyDown).toHaveBeenCalledTimes(1);
      expect(tabKeyDown.defaultPrevented).toBe(true);
    });

    it("keeps delivering other keys and unguarded Tab through the regular listener, once", () => {
      const onSurfaceKeyDown = vi.fn();
      addSurfaceKeydownListener(surface, onSurfaceKeyDown);
      surfaceButton.focus();

      pressTab(surfaceButton);
      installGuard();
      surfaceButton.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));

      expect(onSurfaceKeyDown.mock.calls.map(([event]) => event.key)).toEqual(["Tab", "Escape"]);
    });

    it("stops delivering Tab to a listener once it is removed", () => {
      installGuard();
      const onSurfaceKeyDown = vi.fn();
      addSurfaceKeydownListener(surface, onSurfaceKeyDown);
      removeSurfaceKeydownListener(surface, onSurfaceKeyDown);
      surfaceButton.focus();

      pressTab(surfaceButton);

      expect(onSurfaceKeyDown).not.toHaveBeenCalled();
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
