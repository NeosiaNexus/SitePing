/**
 * Tracks the last *page* element the user focused, so FAB-launched keyboard
 * annotation has a real target: opening the radial menu moves focus into the
 * shadow root, which retargets `document.activeElement` to the 0x0
 * `<siteping-widget>` host — by the time the annotator activates, the element
 * the user actually cares about is no longer the active one. See issue #162.
 */
export interface FocusTracker {
  getLastPageFocus(): HTMLElement | null;
  destroy(): void;
}

/**
 * True when `el` belongs to the widget's own chrome rather than the host
 * page: the shadow host, body-level annotation overlay / toolbar / drawing
 * rect / popup (all carry `data-siteping-ignore`), the markers container
 * (whose markers are focusable but carry no ignore attribute), or the
 * tooltip. Host-independent (tagName/closest checks only) so the annotator
 * can share it without holding a host reference — mirrors the screenshot
 * `ignoreElements` predicate.
 *
 * Host pages may put `data-siteping-ignore` on their own elements to mask
 * them from screenshots — those are deliberately excluded from keyboard
 * annotation targeting too: an element opted out of capture shouldn't become
 * an annotation target through the Enter path.
 */
export function isWidgetChrome(el: Element): boolean {
  return (
    el.tagName === "SITEPING-WIDGET" ||
    el.closest("siteping-widget") !== null ||
    el.closest('[data-siteping-ignore="true"]') !== null ||
    el.closest("#siteping-markers") !== null ||
    el.closest("#sp-tooltip") !== null
  );
}

export function createFocusTracker(host: HTMLElement): FocusTracker {
  let lastPageFocus: HTMLElement | null = null;

  const onFocusIn = (e: FocusEvent): void => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    // <body> / <html> receive focus as a side effect of blurs and overlay
    // teardown — never something the user chose to annotate.
    if (target === document.body || target === document.documentElement) return;
    if (target === host || isWidgetChrome(target)) return;
    lastPageFocus = target;
  };

  document.addEventListener("focusin", onFocusIn);

  return {
    getLastPageFocus(): HTMLElement | null {
      // Drop detached elements — annotating a node that left the DOM would
      // produce a dead anchor (and retaining it would leak the subtree).
      if (lastPageFocus && !lastPageFocus.isConnected) lastPageFocus = null;
      return lastPageFocus;
    },
    destroy(): void {
      // Both the listener and the reference must go: a retained document
      // listener would keep the tracked element alive past widget destroy.
      document.removeEventListener("focusin", onFocusIn);
      lastPageFocus = null;
    },
  };
}
