/**
 * Keeps the widget usable on top of host modals (Radix / shadcn `Dialog`,
 * Headless UI, React Aria, focus-trap…) without depending on any of them.
 *
 * The widget's surfaces (the shadow host, and the overlay, toolbar, popup,
 * markers, tooltip and live region as `<body>` children) sit outside the
 * modal's subtree, so the modal reads every interaction with them as
 * "outside": it closes on pointer, click or focus there, pulls focus back
 * into the dialog, cancels wheel scrolling, closes on Escape, and hides its
 * siblings with `inert` / `aria-hidden`.
 *
 * - {@link isolateFromHost} stops those events at the surface in the bubble
 *   phase — document listeners never see the widget's own interactions, while
 *   the widget's listeners on the surface still run — and strips a host-set
 *   `inert` / `aria-hidden` from it.
 * - {@link installHostIsolationGuard} covers the host listeners that run
 *   before the surface: capture-phase ones on `document`, and the `focusout`
 *   fired on the host element that focus leaves for the widget. It acts only
 *   while a host modal is open, so a page without one keeps every event.
 *
 * Known limits: a native `<dialog>` opened with `showModal()` makes the rest
 * of the page inert with no attribute to undo, and capture-phase host
 * listeners for `mousedown`, `touchstart`, `click` or Tab still see the
 * widget's events (its own listeners need them).
 */

/** Events a host modal reads as an outside interaction, or cancels (wheel scroll locks). */
const OUTSIDE_INTERACTION_EVENTS = [
  "pointerdown",
  "mousedown",
  "touchstart",
  "touchend",
  "click",
  "focusin",
  "focusout",
  "wheel",
  "touchmove",
] as const;

/** What a sibling-hiding modal sets on the `<body>` children outside its dialog. */
const HOST_HIDING_ATTRIBUTES = ["inert", "aria-hidden"];

const surfaces = new WeakSet<Node>();
/** Surfaces whose `inert` is the widget's own (the closing popup), left in place. */
const ownInert = new WeakSet<Element>();
/** The widget's shadow root by host: at `window` a closed root hides the focused element. */
const shadowRoots = new WeakMap<Element, ShadowRoot>();
/** Open-state predicates of the widget layers that close on Escape, by the node they listen on. */
const escapeLayers = new WeakMap<Node, Set<() => boolean>>();

/** Parent of `node`, crossing from a shadow root to its host. */
const composedParent = (node: Node): Node | null => (node instanceof ShadowRoot ? node.host : node.parentNode);

/**
 * True when `node` is, or lives inside, a surface registered through
 * {@link isolateFromHost}. Narrower than `isWidgetChrome`: host elements
 * masked with `data-siteping-ignore` are not widget surfaces.
 */
export function isWidgetSurface(node: Node): boolean {
  for (let current: Node | null = node; current; current = composedParent(current)) {
    if (surfaces.has(current)) return true;
  }
  return false;
}

const isSurfaceTarget = (target: EventTarget | null): boolean => target instanceof Node && isWidgetSurface(target);

const stopAtSurface = (event: Event): void => event.stopPropagation();

/**
 * Register `surface` as widget UI: host document listeners stop seeing its
 * outside-interaction events, and host-set `inert` / `aria-hidden` on it is
 * removed now and whenever it comes back. Pass the shadow root when
 * `surface` hosts a closed one.
 */
export function isolateFromHost(surface: HTMLElement, shadowRoot?: ShadowRoot): void {
  surfaces.add(surface);
  if (shadowRoot) shadowRoots.set(surface, shadowRoot);
  for (const type of OUTSIDE_INTERACTION_EVENTS) {
    surface.addEventListener(type, stopAtSurface, { passive: true });
  }
  const unhide = (): void => {
    for (const name of HOST_HIDING_ATTRIBUTES) {
      if (name !== "inert" || !ownInert.has(surface)) surface.removeAttribute(name);
    }
  };
  unhide();
  // Collected with the surface, which holds the only reference to it.
  new MutationObserver(unhide).observe(surface, { attributeFilter: HOST_HIDING_ATTRIBUTES });
}

/** Set or clear a surface's own `inert`, which {@link isolateFromHost} then leaves alone. */
export function setSurfaceInert(surface: HTMLElement, inert: boolean): void {
  if (inert) ownInert.add(surface);
  else ownInert.delete(surface);
  surface.toggleAttribute("inert", inert);
}

/**
 * Declare a widget layer that closes on Escape, so the guard marks that
 * Escape as handled for host modals only while `isOpen()` says the layer will
 * consume it. `scope` is the node its Escape handler listens on — an element,
 * the shadow root, or `document` for session-wide handlers.
 *
 * @returns Cleanup unregistering the layer.
 */
export function registerEscapeLayer(scope: Node, isOpen: () => boolean): () => void {
  let layers = escapeLayers.get(scope);
  if (!layers) {
    layers = new Set();
    escapeLayers.set(scope, layers);
  }
  layers.add(isOpen);
  return () => {
    layers.delete(isOpen);
  };
}

/**
 * A host modal is open: an `aria-modal="true"` element is rendered and visible
 * outside the widget, or `<body>` is click-through (how Radix / shadcn modals
 * disable the rest of the page). A `visibility: hidden` element still has
 * boxes, hence the separate check for closed dialogs kept mounted that way.
 */
function isHostModalOpen(): boolean {
  if (getComputedStyle(document.body).pointerEvents === "none") return true;
  for (const dialog of document.querySelectorAll('[aria-modal="true"]')) {
    if (
      dialog.getClientRects().length > 0 &&
      getComputedStyle(dialog).visibility === "visible" &&
      !isWidgetSurface(dialog)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * The element a keyboard event comes from. At `window` a closed shadow tree
 * is retargeted to its host, so descend through the focused element of each
 * shadow root (open, or registered through {@link isolateFromHost}).
 */
function focusedTarget(event: KeyboardEvent): Node | null {
  let target = event.composedPath()[0];
  while (target instanceof Element) {
    const focused = (target.shadowRoot ?? shadowRoots.get(target))?.activeElement;
    if (!focused) break;
    target = focused;
  }
  return target instanceof Node ? target : null;
}

/** Whether an open layer on the Escape's path (up to `document`) will consume it. */
function willWidgetConsumeEscape(event: KeyboardEvent): boolean {
  for (let node = focusedTarget(event); node; node = composedParent(node)) {
    for (const isOpen of escapeLayers.get(node) ?? []) {
      if (isOpen()) return true;
    }
  }
  return false;
}

/**
 * Hide the widget from a host modal's listeners that run before its surfaces,
 * from `window` in the capture phase — ahead of any listener on `document`.
 * Each check runs at event time and only while a host modal is open:
 *
 * - `pointerdown` / `focusin` on a surface are stopped (no widget listener
 *   consumes them): dismiss-on-outside and focus-trap listeners skip them.
 * - `focusout` is stopped when focus leaves a surface or moves from the page
 *   into one, so a focus trap does not pull it back into the dialog. The
 *   page element being left misses its own `focusout` (React `onBlur`) for
 *   that one move — never while no modal is open.
 * - An Escape from a surface is marked handled (`preventDefault()`) when an
 *   open widget layer will consume it ({@link registerEscapeLayer}): the
 *   widget still closes that layer, and modals that respect
 *   `defaultPrevented` (Radix, Headless UI) stay open. With nothing open in
 *   the widget, Escape still closes the modal.
 *
 * @returns Cleanup removing the guard.
 */
export function installHostIsolationGuard(): () => void {
  const hideFromHost = (event: Event): void => {
    if (isSurfaceTarget(event.target) && isHostModalOpen()) event.stopImmediatePropagation();
  };
  const onFocusOut = (event: FocusEvent): void => {
    if ((isSurfaceTarget(event.target) || isSurfaceTarget(event.relatedTarget)) && isHostModalOpen()) {
      event.stopImmediatePropagation();
    }
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (
      event.key === "Escape" &&
      isSurfaceTarget(event.target) &&
      isHostModalOpen() &&
      willWidgetConsumeEscape(event)
    ) {
      event.preventDefault();
    }
  };
  const listeners = [
    ["pointerdown", hideFromHost],
    ["focusin", hideFromHost],
    ["focusout", onFocusOut],
    ["keydown", onKeyDown],
  ] as const;
  for (const [type, listener] of listeners) window.addEventListener(type, listener as EventListener, true);
  return () => {
    for (const [type, listener] of listeners) window.removeEventListener(type, listener as EventListener, true);
  };
}
