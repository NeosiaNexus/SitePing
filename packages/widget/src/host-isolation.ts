import {
  HOST_CAPTURE_ISOLATED_EVENTS,
  HOST_HIDING_ATTRIBUTES,
  HOST_OUTSIDE_INTERACTION_EVENTS,
} from "./constants/host-isolation.js";

/**
 * Keeps the widget usable on top of host modals (Radix / shadcn `Dialog`,
 * Headless UI, MUI, focus-trap libraries…) without depending on any of them.
 *
 * The widget's surfaces live outside the modal's subtree (the shadow host,
 * and the overlay, toolbar, popup, markers and marker tooltip as `<body>`
 * children), so a modal reads every interaction with them as "outside":
 *
 * - dismiss-on-outside-interaction layers close on `pointerdown` /
 *   `mousedown` / `click` / `focusin` observed at the document, closing the
 *   dialog the user is reporting on;
 * - focus traps pull focus back on `focusin` / `focusout`, so the comment
 *   textarea cannot keep focus;
 * - dismissable layers close on an Escape `keydown` observed at the document,
 *   so cancelling SitePing would also close the host dialog;
 * - keyboard focus traps (e.g. focus-trap) handle Tab `keydown` on the
 *   document in the capture phase, cancelling the native Tab navigation and
 *   moving focus back into the dialog, so the widget's controls could never
 *   be reached with the keyboard.
 *
 * Two layers of isolation, both scoped to the widget's own surfaces (never to
 * host elements that merely opt out of screenshots with `data-siteping-ignore`):
 *
 * 1. {@link isolateFromHost} stops every outside-interaction event at the
 *    surface in the bubble phase, hiding it from bubble-phase document
 *    listeners while the widget's own surface listeners still run.
 * 2. {@link installHostIsolationGuard} listens on `window` in the capture
 *    phase — ahead of capture-phase host listeners on `document` — and stops
 *    the events no widget listener consumes (`pointerdown`, `focusin`,
 *    `focusout`), marks an Escape `keydown` from a surface as handled
 *    (`preventDefault()`), which Radix, Headless UI and native `<dialog>`
 *    honour before dismissing, and withholds a Tab `keydown` from a surface
 *    from the host entirely, delivering it itself to the widget's keydown
 *    listeners registered through {@link addSurfaceKeydownListener}.
 *
 * Modals that make their outside siblings `inert` (Headless UI, inert-based
 * focus traps) would leave a surface mounted before the modal opened with no
 * pointer or focus events at all, and modals that also mark them
 * `aria-hidden="true"` (Radix's `hideOthers`, most sibling-inerting focus
 * traps) would drop it from the accessibility tree — focus would land on
 * content screen readers cannot see and live-region announcements would be
 * silenced. {@link isolateFromHost} therefore removes both attributes when
 * set on the surface itself (see {@link keepSurfaceExposed}).
 *
 * Known limits:
 *
 * - `mousedown`, `touchstart`, `click` and Escape `keydown` cannot be stopped
 *   in the capture phase, because the widget's own listeners (drawing on the
 *   overlay, buttons, the annotator's Escape handler on `document`) need them.
 *   A host capture-phase listener for those events that ignores
 *   `defaultPrevented` still observes them.
 * - A native `<dialog>` opened with `showModal()` makes everything outside it
 *   inert without any attribute, which no page script can undo: the widget
 *   stays unusable while such a dialog is open.
 */

/** Surfaces registered through {@link isolateFromHost}. Weak so removed surfaces are collected. */
const widgetSurfaces = new WeakSet<Node>();

/** Keydown listener of a widget element or shadow root that must also receive Tab. */
export type SurfaceKeydownListener = (event: KeyboardEvent) => void;

/**
 * Listeners registered through {@link addSurfaceKeydownListener}, by the node
 * they listen on, in registration order. Weak so removed nodes are collected.
 */
const surfaceKeydownListeners = new WeakMap<Node, Set<SurfaceKeydownListener>>();

/**
 * Shadow roots registered through {@link addSurfaceKeydownListener}, by their
 * host. The widget's shadow root is closed, so `host.shadowRoot` is `null` and
 * this is the only way the guard reaches the element focused inside it.
 */
const registeredShadowRootsByHost = new WeakMap<Element, ShadowRoot>();

/**
 * True when `node` is, or lives inside, a surface registered through
 * {@link isolateFromHost}. Crosses shadow boundaries so nodes inside the
 * widget's shadow root resolve to the shadow host.
 *
 * Deliberately narrower than `isWidgetChrome`: host elements carrying
 * `data-siteping-ignore="true"` (screenshot masking) are not widget surfaces.
 */
export function isWidgetSurface(node: Node): boolean {
  let current: Node | null = node;
  while (current) {
    if (widgetSurfaces.has(current)) return true;
    current = current instanceof ShadowRoot ? current.host : current.parentNode;
  }
  return false;
}

const isWidgetSurfaceTarget = (target: EventTarget | null): boolean =>
  target instanceof Node && isWidgetSurface(target);

const stopAtWidgetSurface = (event: Event): void => {
  event.stopPropagation();
};

/**
 * Keep `surface` interactive and exposed to assistive technology when a host
 * modal hides it. The widget never sets `inert` or `aria-hidden` on a
 * registered surface root (only on descendants, e.g. decorative icons, and on
 * shadow-DOM panels, which are not registered), so any
 * {@link HOST_HIDING_ATTRIBUTES} attribute on one comes from the host and is
 * removed — immediately and whenever it is set again. Modals that restore
 * their saved state on close restore "absent", which is what the surface
 * already has.
 *
 * Only the surface's own attributes are watched: descendants keep their
 * `aria-hidden`, and widget surfaces are `<body>` children, while
 * sibling-inerting modals mark the siblings of the dialog's ancestor chain,
 * never `<body>` or `<html>` themselves.
 *
 * The observer is never disconnected on purpose: the surface holds the only
 * reference to it, so both are collected together once the surface is gone.
 */
function keepSurfaceExposed(surface: HTMLElement): void {
  const removeHostHiding = (): void => {
    for (const attributeName of HOST_HIDING_ATTRIBUTES) {
      if (surface.hasAttribute(attributeName)) surface.removeAttribute(attributeName);
    }
  };
  removeHostHiding();
  new MutationObserver(removeHostHiding).observe(surface, {
    attributes: true,
    attributeFilter: [...HOST_HIDING_ATTRIBUTES],
  });
}

/**
 * Register `surface` as widget UI: stop its outside-interaction events in the
 * bubble phase so host modals never see them, and keep sibling-inerting
 * modals from making it `inert` or `aria-hidden`. Listeners registered on `surface` itself
 * (and its descendants) are unaffected.
 */
export function isolateFromHost(surface: HTMLElement): void {
  widgetSurfaces.add(surface);
  for (const type of HOST_OUTSIDE_INTERACTION_EVENTS) {
    surface.addEventListener(type, stopAtWidgetSurface);
  }
  keepSurfaceExposed(surface);
}

/**
 * Add a `keydown` listener to a widget element (or the widget's shadow root)
 * that keeps receiving Tab while {@link installHostIsolationGuard} withholds
 * Tab from the host page. The guard stops a Tab `keydown` from a widget
 * surface at `window`, before it reaches any other listener, and then calls
 * the listeners registered here for the focused element and its ancestors
 * itself, innermost first — the order the event would have bubbled in. Every
 * other key, and Tab without the guard, reaches `listener` through the
 * regular DOM listener, so it runs exactly once per event either way.
 *
 * Use it for every widget listener that handles Tab (focus traps); a plain
 * `addEventListener("keydown", …)` never sees Tab while the guard is installed.
 *
 * @param scope - Widget element or shadow root the listener is attached to.
 * @param listener - Keydown handler; may call `preventDefault()` to cancel
 * the native Tab navigation.
 */
export function addSurfaceKeydownListener(scope: HTMLElement | ShadowRoot, listener: SurfaceKeydownListener): void {
  scope.addEventListener("keydown", listener as EventListener);
  let listeners = surfaceKeydownListeners.get(scope);
  if (!listeners) {
    listeners = new Set();
    surfaceKeydownListeners.set(scope, listeners);
  }
  listeners.add(listener);
  if (scope instanceof ShadowRoot) registeredShadowRootsByHost.set(scope.host, scope);
}

/** Remove a listener added with {@link addSurfaceKeydownListener}. */
export function removeSurfaceKeydownListener(scope: HTMLElement | ShadowRoot, listener: SurfaceKeydownListener): void {
  scope.removeEventListener("keydown", listener as EventListener);
  surfaceKeydownListeners.get(scope)?.delete(listener);
}

/**
 * Innermost target of a keyboard event observed at `window`. Events from a
 * closed shadow tree are retargeted to its host there, and keyboard events
 * target the focused element, so descend through each shadow root's
 * `activeElement` (open, or registered through
 * {@link addSurfaceKeydownListener}).
 */
function innermostKeyboardTarget(event: KeyboardEvent): Node | null {
  const [outermostVisibleTarget] = event.composedPath();
  let target: Node | null = outermostVisibleTarget instanceof Node ? outermostVisibleTarget : null;
  while (target instanceof Element) {
    const shadowRoot = target.shadowRoot ?? registeredShadowRootsByHost.get(target);
    const focusedInShadowRoot = shadowRoot?.activeElement;
    if (!focusedInShadowRoot) break;
    target = focusedInShadowRoot;
  }
  return target;
}

/**
 * Call the {@link addSurfaceKeydownListener} listeners of the event's
 * innermost target and its ancestors (crossing shadow boundaries), innermost
 * first, with the original event: its `preventDefault()` still cancels the
 * native Tab navigation, which otherwise happens as usual after dispatch.
 */
function deliverToSurfaceKeydownListeners(event: KeyboardEvent): void {
  let current = innermostKeyboardTarget(event);
  while (current) {
    const listeners = surfaceKeydownListeners.get(current);
    if (listeners) {
      for (const listener of [...listeners]) listener(event);
    }
    current = current instanceof ShadowRoot ? current.host : current.parentNode;
  }
}

/**
 * Capture-phase guard on `window`, which runs before any `document` listener
 * (capture or bubble) the host registered:
 *
 * - `pointerdown` / `focusin` targeting a widget surface are stopped — no
 *   widget listener consumes them, so only host reactions are suppressed.
 * - `focusout` is stopped when focus leaves a widget surface or moves from
 *   the host page into one. The element keeps the focus it received
 *   natively; only the trapping modal's "pull focus back" reaction is
 *   suppressed. Trade-off: host `focusout`-based listeners on the element
 *   being left (e.g. React `onBlur`) do not fire for that one transition —
 *   which is why the check uses the strict widget-surface predicate, so
 *   moving between host elements (masked or not) never loses them.
 * - An Escape `keydown` from a widget surface is marked handled with
 *   `preventDefault()`: the widget's own Escape handlers still run, while
 *   dismissable layers that respect `defaultPrevented` keep the modal open.
 * - A Tab `keydown` from a widget surface is stopped, so capture-phase focus
 *   traps on `document` cannot cancel the navigation and pull focus back into
 *   the host dialog. Stopping it at `window` would also starve the widget's
 *   own focus traps (they listen on its elements, which run after `document`),
 *   so the guard delivers the event to the listeners registered through
 *   {@link addSurfaceKeydownListener} itself. Re-dispatching a copy instead
 *   would not work: the copy would cross the host's `document` listeners
 *   again, and an untrusted event never performs the native navigation.
 *   Trade-off: host keydown listeners (e.g. keyboard-modality detection) do
 *   not observe Tab pressed inside the widget.
 *
 * @param ownerDocument - Document whose `window` receives the guard; falls
 * back to the document itself when it has no browsing context.
 * @returns Cleanup removing every guard listener.
 */
export function installHostIsolationGuard(ownerDocument: Document = document): () => void {
  const guardTarget: EventTarget = ownerDocument.defaultView ?? ownerDocument;

  const onIsolatedInteraction = (event: Event): void => {
    if (isWidgetSurfaceTarget(event.target)) event.stopImmediatePropagation();
  };
  const onFocusOut = (event: FocusEvent): void => {
    if (isWidgetSurfaceTarget(event.target) || isWidgetSurfaceTarget(event.relatedTarget)) {
      event.stopImmediatePropagation();
    }
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (!isWidgetSurfaceTarget(event.target)) return;
    if (event.key === "Escape") {
      event.preventDefault();
    } else if (event.key === "Tab") {
      event.stopImmediatePropagation();
      deliverToSurfaceKeydownListeners(event);
    }
  };

  for (const type of HOST_CAPTURE_ISOLATED_EVENTS) {
    guardTarget.addEventListener(type, onIsolatedInteraction, true);
  }
  guardTarget.addEventListener("focusout", onFocusOut as EventListener, true);
  guardTarget.addEventListener("keydown", onKeyDown as EventListener, true);

  return () => {
    for (const type of HOST_CAPTURE_ISOLATED_EVENTS) {
      guardTarget.removeEventListener(type, onIsolatedInteraction, true);
    }
    guardTarget.removeEventListener("focusout", onFocusOut as EventListener, true);
    guardTarget.removeEventListener("keydown", onKeyDown as EventListener, true);
  };
}
