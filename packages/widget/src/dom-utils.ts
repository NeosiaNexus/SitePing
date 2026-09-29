/**
 * Safe DOM creation utilities.
 * All user content is set via textContent (never innerHTML).
 * SVG icons use a DOMParser for trusted static strings.
 */

/**
 * Parse a trusted SVG string into an SVGElement.
 * Only use with hardcoded icon constants — never with user input.
 * Uses createContextualFragment for native document-context parsing
 * (DOMParser creates nodes in a foreign document that don't render in Shadow DOM).
 */
export function parseSvg(svgString: string): SVGSVGElement {
  const range = document.createRange();
  const fragment = range.createContextualFragment(svgString);
  const svg = fragment.firstElementChild;
  if (svg?.nodeName.toLowerCase() !== "svg") {
    throw new Error("[siteping] Invalid SVG string");
  }
  // Safety: strip any event handlers in case of accidental misuse
  for (const attr of [...svg.attributes]) {
    if (attr.name.startsWith("on")) svg.removeAttribute(attr.name);
  }
  // Also strip from all descendants
  for (const el of svg.querySelectorAll("*")) {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
    }
  }
  return svg as SVGSVGElement;
}

/** Create an element with optional class and style */
export function el(tag: string, attrs?: Record<string, string>): HTMLElement {
  const element = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "class") {
        element.className = value;
      } else if (key === "style") {
        element.style.cssText = value;
      } else {
        element.setAttribute(key, value);
      }
    }
  }
  return element;
}

/** Set text content safely (no HTML injection possible) */
export function setText(element: HTMLElement | SVGElement, text: string): void {
  element.textContent = text;
}

/**
 * Call `onOutside` for every click outside `container` until the returned
 * disposer runs. Arm it once `container` sits in its shadow tree.
 *
 * A document listener alone cannot tell: it sees a click inside the widget's
 * shadow tree retargeted to the host, and composedPath() hides a closed
 * tree's nodes from it. So the tree's own root judges clicks inside it (the
 * target is the real element there) and the document handles the rest of
 * the page.
 */
export function onClickOutside(container: HTMLElement, onOutside: () => void): () => void {
  const root = container.getRootNode();
  const host = root instanceof ShadowRoot ? root.host : null;
  const inTree = (e: Event) => {
    if (!container.contains(e.target as Node)) onOutside();
  };
  const onPage = (e: Event) => {
    if (e.target !== host) onOutside();
  };
  root.addEventListener("click", inTree, true);
  if (host) document.addEventListener("click", onPage, true);
  return () => {
    root.removeEventListener("click", inTree, true);
    if (host) document.removeEventListener("click", onPage, true);
  };
}

/**
 * Hide or show an element. `hidden` alone loses to a class that sets
 * `display`, and the panel's focus trap reads `style.display`.
 */
export function setHidden(element: HTMLElement, hidden: boolean): void {
  element.hidden = hidden;
  element.style.display = hidden ? "none" : "";
}

/**
 * Replace a button's children with a small spinner and disable it.
 * Returns a `restore` callback that swaps the original content back and
 * re-enables the button. Used by every async button (delete, resolve, …)
 * to surface in-flight state without owning per-button state itself.
 *
 * Lives in dom-utils rather than panel-internal because both Panel and
 * BulkActions need identical behaviour.
 */
export function setButtonLoading(btn: HTMLButtonElement): () => void {
  const snapshot = Array.from(btn.childNodes).map((n) => n.cloneNode(true));
  btn.disabled = true;
  btn.replaceChildren(el("div", { class: "sp-spinner sp-spinner--sm" }));
  return () => {
    btn.replaceChildren(...snapshot);
    btn.disabled = false;
  };
}

/**
 * Detect whether the host platform uses ⌘+Enter (macOS) vs Ctrl+Enter — the
 * send shortcut hinted by the popup and the thread's composer. Resolved at
 * call time so the popup can recompute its hint when the locale dictionary
 * lands.
 */
export function isMacPlatform(): boolean {
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  return uaData
    ? uaData.platform === "macOS"
    : (navigator.platform?.includes("Mac") ?? /Macintosh|Mac OS X/i.test(navigator.userAgent));
}

/** Format a relative date string using Intl.RelativeTimeFormat for locale support */
export function formatRelativeDate(isoString: string, locale = "en"): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "second");
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "narrow" });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, "minute");

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");

  const days = Math.floor(hours / 24);
  if (days < 7) return rtf.format(-days, "day");

  return new Date(isoString).toLocaleDateString(locale);
}
