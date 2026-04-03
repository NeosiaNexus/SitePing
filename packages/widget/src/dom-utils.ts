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
  if (!svg || svg.nodeName.toLowerCase() !== "svg") {
    throw new Error("[siteping] Invalid SVG string");
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

/** Format a relative date string using Intl.RelativeTimeFormat for locale support */
export function formatRelativeDate(isoString: string, locale = "fr"): string {
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
