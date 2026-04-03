/**
 * Generate an optimized XPath for a DOM element.
 *
 * Strategy:
 * - If the element has a unique id → //tag[@id='value']
 * - Otherwise, walk up the tree building /tag[position] segments
 *   until we hit an ancestor with an id or reach <body>
 * - Cap depth at 6 levels to keep paths short
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

  return "/html/body" + segments.join("");
}
