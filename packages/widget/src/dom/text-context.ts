/**
 * Shared text-context helpers for DOM anchoring.
 * Used by both anchor generation (anchor.ts) and resolution (resolver.ts).
 */

/**
 * Extract ~32 chars of text from the nearest sibling with content.
 * Walks up to 3 siblings in the given direction.
 */
export function adjacentText(element: Element, direction: "before" | "after"): string {
  const prop = direction === "before" ? "previousElementSibling" : "nextElementSibling";
  let sibling: Element | null = element[prop];
  let attempts = 3;

  while (sibling && attempts > 0) {
    const text = sibling.textContent?.trim();
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
  const prev = element.previousElementSibling?.textContent?.trim().slice(0, 40) ?? "";
  const next = element.nextElementSibling?.textContent?.trim().slice(0, 40) ?? "";
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
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let out = "";
  while (out.length < cap) {
    const node = walker.nextNode();
    if (!node) break;
    out += (node as Text).data;
  }
  return out.length > cap ? out.slice(0, cap) : out;
}
