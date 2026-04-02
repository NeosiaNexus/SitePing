/**
 * Safe DOM creation utilities.
 * All user content is set via textContent (never innerHTML).
 * SVG icons use a DOMParser for trusted static strings.
 */

let _parser: DOMParser | null = null;

/** Lazy-init DOMParser — safe for SSR (never called on server) */
function getParser(): DOMParser {
  if (!_parser) _parser = new DOMParser();
  return _parser;
}

/**
 * Parse a trusted SVG string into an SVGElement.
 * Only use with hardcoded icon constants — never with user input.
 */
export function parseSvg(svgString: string): SVGSVGElement {
  const doc = getParser().parseFromString(svgString, "image/svg+xml");
  const root = doc.documentElement;
  // Validate we actually got an SVG (malformed input returns an HTML error doc)
  if (root.nodeName !== "svg") {
    throw new Error("[siteping] Invalid SVG string");
  }
  return root as unknown as SVGSVGElement;
}

/** Create an element with optional class and style */
export function el(
  tag: string,
  attrs?: Record<string, string>,
): HTMLElement {
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

/** Format a relative date string in French */
export function formatRelativeDate(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "maintenant";
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(isoString).toLocaleDateString("fr-FR");
}
