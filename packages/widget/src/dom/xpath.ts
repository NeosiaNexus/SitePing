/**
 * Generate an optimized XPath for a DOM element.
 *
 * Strategy:
 * - If the element has a unique id → //tag[@id='value']
 * - Otherwise, walk up the tree building /tag[position] segments
 *   until we hit an ancestor with an id or reach <body>
 * - Cap depth at 6 levels to keep paths short — a path that does not reach
 *   <body> (truncated, or no parent left) is emitted relative (//tag[n]/…)
 * - Inside a shadow tree: a path rooted at its shadow root (see shadowXPath)
 */
export function generateXPath(element: Element): string {
  if (element.getRootNode() instanceof ShadowRoot) return shadowXPath(element);

  if (element.id) {
    return `//${element.localName}[@id=${xpathLiteral(element.id)}]`;
  }

  const segments: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body && segments.length < 6) {
    const tag = current.localName;
    const parent: Element | null = current.parentElement;

    if (current.id) {
      segments.unshift(`/${tag}[@id=${xpathLiteral(current.id)}]`);
      return "/" + segments.join("");
    }

    // Compute position among same-tag siblings
    let position = 1;
    if (parent) {
      for (const sibling of parent.children) {
        if (sibling === current) break;
        if (sibling.localName === tag) position++;
      }
    }

    segments.unshift(`/${tag}[${position}]`);
    current = parent;
  }

  // The walk stopped short of <body> — truncated by the depth cap, or out of
  // parents (<html> itself, a detached node): "/html/body" + the segments
  // would match nothing, or a shallower decoy with the same shape. The
  // relative form matches the element wherever it sits — possibly alongside
  // look-alikes, which the resolver gathers and verifies like CSS matches.
  // (Shadow-tree elements never get here: see shadowXPath.)
  if (current !== document.body) return "/" + segments.join("");
  return "/html/body" + segments.join("");
}

/**
 * XPath cannot enter shadow trees (Chromium even rejects a ShadowRoot context
 * node), so a shadow element's path is informational: the resolver never
 * evaluates it. It is walked all the way up to the shadow root, with no `//`
 * shortcut and no depth cap (`./section[1]/p[@id='x']`), because older
 * widgets evaluate every stored path against the document — where `./…` can
 * only reach `<html>`, so it never matches a light-DOM look-alike.
 */
function shadowXPath(element: Element): string {
  let path = "";
  for (let current: Element | null = element; current; current = current.parentElement) {
    const tag = current.localName;
    if (current.id) {
      path = `/${tag}[@id=${xpathLiteral(current.id)}]${path}`;
      continue;
    }
    // Siblings, not parent.children: a top-level element's parent is the
    // shadow root, which parentElement skips.
    let position = 1;
    for (let sibling = current.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
      if (sibling.localName === tag) position++;
    }
    path = `/${tag}[${position}]${path}`;
  }
  return `.${path}`;
}

/** An XPath string literal for `value` (`concat()` when it holds a quote). */
function xpathLiteral(value: string): string {
  return value.includes("'") ? `concat('${value.replace(/'/g, "',\"'\",'")}')` : `'${value}'`;
}
