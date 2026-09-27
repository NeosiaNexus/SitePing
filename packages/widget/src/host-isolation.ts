import { isWidgetChrome } from "./focus-tracker.js";

/**
 * Keeps the widget usable on top of host modals (Radix / shadcn `Dialog`,
 * Headless UI, MUI, focus-trap libraries…) without depending on any of them.
 *
 * The widget's surfaces live outside the modal's subtree (the shadow host,
 * and the overlay, toolbar, popup and markers as `<body>` children), so a
 * modal reads every interaction with them as "outside":
 *
 * - dismiss-on-outside-interaction layers close on `pointerdown` / `focusin`
 *   observed at the document, closing the dialog the user is reporting on;
 * - focus traps pull focus back on `focusin` / `focusout`, so the comment
 *   textarea cannot keep focus.
 *
 * Those host listeners sit on the document in the bubble phase. Stopping the
 * widget's own events at its surfaces keeps them from ever reaching the host,
 * while the widget's own listeners — on the surfaces themselves — still run.
 */

/** Events host modals observe at the document to detect outside interactions. */
const HOST_OUTSIDE_INTERACTION_EVENTS = ["pointerdown", "mousedown", "touchstart", "focusin", "focusout"] as const;

const stopAtWidgetSurface = (event: Event): void => {
  event.stopPropagation();
};

/**
 * Stop the widget's pointer and focus events at `surface` so host modals
 * never see them. Listeners registered on `surface` itself are unaffected.
 */
export function isolateFromHost(surface: HTMLElement): void {
  for (const type of HOST_OUTSIDE_INTERACTION_EVENTS) {
    surface.addEventListener(type, stopAtWidgetSurface);
  }
}

/**
 * Focus leaving a host element fires `focusout` on that element — outside
 * the widget, so `isolateFromHost` cannot stop it — and a trapping modal
 * answers it by pulling focus back into the dialog. Intercept it in the
 * capture phase only when focus is moving into the widget, before any
 * bubble-phase document listener runs. The element keeps the focus it
 * already received natively; only the host's reaction is suppressed.
 *
 * Trade-off: host `focusout`/`blur`-style listeners on the element being left
 * (e.g. React `onBlur`) do not fire for that one transition.
 *
 * @returns Cleanup removing the listener.
 */
export function installHostFocusTrapGuard(ownerDocument: Document = document): () => void {
  const onFocusOut = (event: FocusEvent): void => {
    const incomingFocus = event.relatedTarget;
    if (incomingFocus instanceof Element && isWidgetChrome(incomingFocus)) {
      event.stopImmediatePropagation();
    }
  };
  ownerDocument.addEventListener("focusout", onFocusOut, true);
  return () => ownerDocument.removeEventListener("focusout", onFocusOut, true);
}
