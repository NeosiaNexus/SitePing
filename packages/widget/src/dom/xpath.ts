/**
 * Generate an optimized XPath for a DOM element.
 *
 * Strategy:
 * - If the element has a unique id → //tag[@id='value']
 * - Otherwise, walk up the tree building /tag[position] segments
 *   until we hit an ancestor with an id or reach <body>
 * - Cap depth at 6 levels to keep paths short — a path that does not reach
 *   <body> (truncated, or no parent left) is emitted relative (//tag[n]/…)
 */
export function generateXPath(element: Element): string {
  if (element.id) {
    const safeId = element.id.includes("'") ? `concat('${element.id.replace(/'/g, "',\"'\",'")}')` : `'${element.id}'`;
    return `//${element.localName}[@id=${safeId}]`;
  }

  const segments: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body && segments.length < 6) {
    const tag = current.localName;
    const parent: Element | null = current.parentElement;

    if (current.id) {
      const safeId = current.id.includes("'")
        ? `concat('${current.id.replace(/'/g, "',\"'\",'")}')`
        : `'${current.id}'`;
      segments.unshift(`/${tag}[@id=${safeId}]`);
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
  // parents (<html> itself, a detached node, a shadow-root boundary):
  // "/html/body" + the segments would match nothing, or a shallower decoy
  // with the same shape. The relative form matches the element wherever it
  // sits — possibly alongside look-alikes, which the resolver gathers and
  // verifies like CSS matches.
  if (current !== document.body) return "/" + segments.join("");
  return "/html/body" + segments.join("");
}
