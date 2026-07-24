/**
 * Shared text-context helpers for DOM anchoring.
 * Used by both anchor generation (anchor.ts) and resolution (resolver.ts).
 */

/** Raw-char budget for sibling reads that only keep 32–40 chars — generous
 * headroom for leading/trailing whitespace that trimming discards. */
const SIBLING_READ_CAP = 256;

/**
 * Extract ~32 chars of text from the nearest sibling with content.
 * Walks up to 3 siblings in the given direction.
 *
 * Sibling text is read through the bounded walkers, never `textContent` —
 * a sibling can be an arbitrarily large subtree (a whole `<section>`), and
 * serializing it wholesale to keep 32 chars is the dominant hidden cost of
 * candidate verification on big pages.
 */
export function adjacentText(element: Element, direction: "before" | "after"): string {
  const prop = direction === "before" ? "previousElementSibling" : "nextElementSibling";
  let sibling: Element | null = element[prop];
  let attempts = 3;

  while (sibling && attempts > 0) {
    const text =
      direction === "before"
        ? boundedTextEnd(sibling, SIBLING_READ_CAP).trim()
        : boundedText(sibling, SIBLING_READ_CAP).trim();
    if (text) {
      return direction === "before" ? text.slice(-32) : text.slice(0, 32);
    }
    sibling = sibling[prop];
    attempts--;
  }

  return "";
}

/** Collect text from immediate siblings for disambiguation context. */
export function neighborText(element: Element): string {
  const prevSibling = element.previousElementSibling;
  const nextSibling = element.nextElementSibling;
  const prev = prevSibling ? boundedText(prevSibling, SIBLING_READ_CAP).trim().slice(0, 40) : "";
  const next = nextSibling ? boundedText(nextSibling, SIBLING_READ_CAP).trim().slice(0, 40) : "";
  return [prev, next].filter(Boolean).join(" | ");
}

/**
 * First `cap` characters of an element's text, without serializing the whole
 * subtree. `textContent.slice(0, cap)` still pays for full subtree
 * serialization first — on a wrapper near the root that is the entire page
 * text, and repeated across scan candidates it degenerates to O(page²).
 * A TreeWalker yields the same text nodes in the same (tree) order and stops
 * as soon as the budget is reached.
 */
export function boundedText(element: Element, cap: number): string {
  let out = "";

  // Leaf fast path — the majority of scan candidates have no element
  // children; their text is the concatenation of their child text nodes,
  // no tree traversal machinery needed.
  if (element.firstElementChild === null) {
    for (const node of element.childNodes) {
      if (node.nodeType === 3) {
        out += (node as Text).data;
        if (out.length >= cap) break;
      }
    }
    return out.length > cap ? out.slice(0, cap) : out;
  }

  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  while (out.length < cap) {
    const node = walker.nextNode();
    if (!node) break;
    out += (node as Text).data;
  }
  return out.length > cap ? out.slice(0, cap) : out;
}

/**
 * Last `cap` characters of an element's text — the reverse-direction
 * counterpart of `boundedText` (TreeWalker only walks forward). Visits text
 * nodes in reverse tree order and stops once the budget is filled.
 */
export function boundedTextEnd(element: Element, cap: number): string {
  let out = "";
  const walk = (node: Node): boolean => {
    for (let child: Node | null = node.lastChild; child; child = child.previousSibling) {
      if (child.nodeType === 3) {
        out = (child as Text).data + out;
        if (out.length >= cap) return true;
      } else if (child.nodeType === 1 && walk(child)) {
        return true;
      }
    }
    return false;
  };
  walk(element);
  return out.length > cap ? out.slice(-cap) : out;
}
