/**
 * Host-defined panel actions (`config.panelActions`) — validation, inert
 * icon parsing, URL and feedback sanitising. Everything a host hands the
 * detail view goes through here before it touches the DOM.
 */

import type { FeedbackResponse, SitepingPanelAction } from "@siteping/core";

/** A validated action, its icon parsed once and cloned on every render. */
export interface PanelActionItem {
  readonly action: SitepingPanelAction;
  readonly icon: SVGSVGElement | null;
}

// Plain shapes plus paint/clip helpers. Everything else — script, style,
// foreignObject, animate/set, use, image, a — is dropped, so an icon can
// neither run code nor fetch anything.
const ICON_TAGS = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "rect",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
  "mask",
]);

function sanitizeIconNode(node: Element): void {
  for (const attr of [...node.attributes]) {
    const name = attr.name.toLowerCase();
    // Handlers, links (href / xlink:href), inline CSS, and url() references
    // to anything but a local fragment.
    if (name.startsWith("on") || name.endsWith("href") || name === "style" || /url\((?!\s*['"]?#)/i.test(attr.value)) {
      node.removeAttribute(attr.name);
    }
  }
  for (const child of [...node.children]) {
    if (ICON_TAGS.has(child.localName.toLowerCase())) sanitizeIconNode(child);
    else child.remove();
  }
}

/**
 * Parse host SVG markup without running any of it. A `DOMParser` document is
 * inert — no scripts, no resource loads, no event handlers — unlike
 * `parseSvg`'s `createContextualFragment`, where e.g. an `<img onerror>` that
 * the HTML parser hoists out of the `<svg>` still fires. Fine for our own
 * constants, never for host input. Returns `null` when the markup is not an
 * `<svg>` element.
 */
export function parseActionIcon(markup: string): SVGSVGElement | null {
  const root = new DOMParser().parseFromString(markup, "text/html").body.firstElementChild;
  if (root?.namespaceURI !== "http://www.w3.org/2000/svg" || root.localName !== "svg") return null;
  sanitizeIconNode(root);
  root.setAttribute("aria-hidden", "true");
  return document.importNode(root as SVGSVGElement, true);
}

/**
 * `href` resolved against the page, or `null` unless it is http(s) or
 * mailto — `javascript:`, `data:` and friends never reach an anchor. The
 * URL parser normalizes case, whitespace and control characters first.
 */
export function safeHref(href: string): string | null {
  try {
    const url = new URL(href, document.baseURI);
    return /^(https?|mailto):$/.test(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * A detached, deeply frozen copy of a feedback for host callbacks — they can
 * read everything but never mutate the records the panel renders.
 * `FeedbackResponse` is JSON by construction (`Serialized<FeedbackRecord>`),
 * so the round trip is lossless.
 */
export function snapshotFeedback(feedback: FeedbackResponse): Readonly<FeedbackResponse> {
  return JSON.parse(JSON.stringify(feedback), (_key, value: unknown) =>
    typeof value === "object" && value !== null ? Object.freeze(value) : value,
  );
}

const isButton = (a: Partial<SitepingPanelAction>) => typeof a.onAction === "function" && a.href === undefined;
const isLink = (a: Partial<SitepingPanelAction>) =>
  (typeof a.href === "string" || typeof a.href === "function") && a.onAction === undefined;

/**
 * Validate `config.panelActions` once. Entries without a non-empty string
 * `id` and `label`, without exactly one of an `onAction` function or an
 * `href` (string or function), with a static `href` that `safeHref` rejects,
 * or reusing an earlier id are skipped with a console warning. An icon that
 * is not SVG markup is dropped with a warning — the action keeps its label.
 */
export function normalizePanelActions(actions: readonly SitepingPanelAction[] | undefined): PanelActionItem[] {
  const items: PanelActionItem[] = [];
  if (!Array.isArray(actions)) return items;
  const ids = new Set<string>();
  actions.forEach((action: Partial<SitepingPanelAction> | null | undefined, index) => {
    const where = `[siteping] panelActions[${index}]`;
    const id = action?.id;
    if (typeof id !== "string" || !id || typeof action?.label !== "string" || !action.label) {
      console.warn(`${where} ignored: it needs a non-empty string \`id\` and \`label\`.`);
    } else if (!isButton(action) && !isLink(action)) {
      console.warn(`${where} ("${id}") ignored: it needs either an \`onAction\` function or an \`href\`, not both.`);
    } else if (typeof action.href === "string" && !safeHref(action.href)) {
      console.warn(`${where} ("${id}") ignored: \`href\` must be an http(s) or mailto URL.`);
    } else if (ids.has(id)) {
      console.warn(`${where} ignored: duplicate id "${id}".`);
    } else {
      ids.add(id);
      const icon = action.icon === undefined ? null : parseActionIcon(action.icon);
      if (action.icon !== undefined && !icon) {
        console.warn(`${where} ("${id}"): \`icon\` is not SVG markup — showing the label only.`);
      }
      items.push({ action: action as SitepingPanelAction, icon });
    }
  });
  return items;
}
