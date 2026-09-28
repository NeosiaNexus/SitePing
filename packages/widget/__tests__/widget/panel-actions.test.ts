// @vitest-environment jsdom

import type { SitepingPanelAction } from "@siteping/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizePanelActions, parseActionIcon, safeHref } from "../../src/panel-actions.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseActionIcon", () => {
  it("returns an svg adopted into the page document, hidden from assistive tech", () => {
    const icon = parseActionIcon('<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>');
    expect(icon?.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(icon?.ownerDocument).toBe(document);
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(icon?.querySelector("circle")?.getAttribute("r")).toBe("4");
  });

  it("drops every element that can run code, fetch, or restyle the panel", () => {
    const icon = parseActionIcon(
      "<svg>" +
        "<script>alert(1)</script>" +
        "<style>* { display: none }</style>" +
        "<foreignObject><iframe src='javascript:alert(1)'></iframe></foreignObject>" +
        "<a href='javascript:alert(1)'><path d='M1 1'/></a>" +
        "<image href='https://tracker.example/pixel.png'/>" +
        "<use href='https://evil.example/sprite.svg#x'/>" +
        "<animate attributeName='href' to='javascript:alert(1)'/>" +
        "<set attributeName='onclick' to='alert(1)'/>" +
        "<g><path d='M2 2'/></g>" +
        "</svg>",
    );
    expect(icon?.innerHTML).toBe('<g><path d="M2 2"></path></g>');
  });

  it("strips handlers, links, inline styles and external url() references, keeping local ones", () => {
    const icon = parseActionIcon(
      '<svg onload="alert(1)" style="background:url(https://t.example/x)">' +
        '<path d="M0 0" fill="url(https://t.example/p.svg#g)" stroke="url(#local)" onclick="alert(1)" href="javascript:alert(1)" xlink:href="javascript:alert(1)"/>' +
        "</svg>",
    );
    expect(icon?.outerHTML).toBe('<svg aria-hidden="true"><path d="M0 0" stroke="url(#local)"></path></svg>');
  });

  it("drops CSS escapes, CSS-parsed values that could still fetch, and attributes outside the allowlist", () => {
    const icon = parseActionIcon(
      '<svg class="x" data-x="1" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="4" height="4" fill="\\75 rl(https://t.example/f.svg#p)" mask="image-set(\'https://t.example/m.png\' 1x)"/>' +
        '<circle r="2" clip-path="src(https://t.example/c.svg)" cursor="url(https://t.example/c.cur), auto"/>' +
        '<path d="M1 1" stroke="rgb(var(--x))" color="\\72 ed" filter="url(#f)" marker-start="url(#m)"/>' +
        "</svg>",
    );
    expect(icon?.outerHTML).toBe(
      '<svg aria-hidden="true"><rect width="4" height="4"></rect><circle r="2"></circle><path d="M1 1"></path></svg>',
    );
  });

  it("keeps colors, transforms and local references", () => {
    const attrs =
      'fill="url(#g) none" stroke="rgba(0, 0, 0, 0.5)" transform="translate(1 2) rotate(45)" ' +
      'fill-rule="evenodd" stroke-linecap="round" mask="url(\'#m\')" color="currentColor"';
    const icon = parseActionIcon(
      `<svg viewBox="0 0 24 24"><defs><linearGradient id="g" gradientTransform="scale(2)"><stop offset="0" stop-color="#fff"/></linearGradient></defs><path d="M0 0" ${attrs}/></svg>`,
    );
    expect(icon?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(icon?.querySelector("linearGradient")?.getAttribute("gradientTransform")).toBe("scale(2)");
    expect(icon?.querySelector("stop")?.getAttribute("stop-color")).toBe("#fff");
    expect(icon?.querySelector("path")?.outerHTML).toBe(`<path d="M0 0" ${attrs}></path>`);
  });

  it("returns null for anything that is not an <svg> root", () => {
    expect(parseActionIcon("<img src=x onerror=alert(1)>")).toBeNull();
    expect(parseActionIcon("<b>bold</b>")).toBeNull();
    expect(parseActionIcon("plain text")).toBeNull();
    expect(parseActionIcon("")).toBeNull();
  });
});

describe("safeHref", () => {
  it("keeps http(s) and mailto URLs, resolving relative ones against the page", () => {
    expect(safeHref("https://tracker.example/new?x=1")).toBe("https://tracker.example/new?x=1");
    expect(safeHref("http://intranet.local/ticket")).toBe("http://intranet.local/ticket");
    expect(safeHref("mailto:dev@example.com?subject=Bug")).toBe("mailto:dev@example.com?subject=Bug");
    expect(safeHref("/admin/feedback/1")).toBe(`${location.origin}/admin/feedback/1`);
  });

  it("rejects every other scheme, however it is disguised", () => {
    for (const href of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "  javascript:alert(1)",
      "java\tscript:alert(1)",
      "java\nscript:alert(1)",
      "\u0001javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "blob:https://example.com/uuid",
      "http://[",
    ]) {
      expect(safeHref(href), href).toBeNull();
    }
  });
});

describe("normalizePanelActions", () => {
  const onAction = () => {};

  it("returns no items when the option is absent or not an array", () => {
    expect(normalizePanelActions(undefined)).toEqual([]);
    expect(normalizePanelActions("nope" as never)).toEqual([]);
  });

  it("keeps valid actions in order and skips invalid ones with a warning each", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const valid: SitepingPanelAction = { id: "ticket", label: "Create ticket", onAction };
    const items = normalizePanelActions([
      valid,
      null as never,
      { id: "", label: "No id", onAction },
      { id: "no-label", label: "", onAction },
      { id: "no-handler", label: "Nothing to run" } as never,
      { id: "both", label: "Both", onAction, href: "https://x.example" } as never,
      { id: "js", label: "Script link", href: "javascript:alert(1)" },
      { id: "ticket", label: "Duplicate", onAction },
      { id: "agent", label: "Send to agent", onAction },
      { id: "tracker", label: "Open in tracker", href: (fb) => `https://x.example/${fb.id}` },
    ]);

    expect(items.map((i) => i.action.id)).toEqual(["ticket", "agent", "tracker"]);
    expect(items[0]?.action).toBe(valid);
    expect(warn.mock.calls.map(([message]) => message)).toEqual([
      "[siteping] panelActions[1] ignored: it needs a non-empty string `id` and `label`.",
      "[siteping] panelActions[2] ignored: it needs a non-empty string `id` and `label`.",
      "[siteping] panelActions[3] ignored: it needs a non-empty string `id` and `label`.",
      '[siteping] panelActions[4] ("no-handler") ignored: it needs either an `onAction` function or an `href`, not both.',
      '[siteping] panelActions[5] ("both") ignored: it needs either an `onAction` function or an `href`, not both.',
      '[siteping] panelActions[6] ("js") ignored: `href` must be an http(s) or mailto URL.',
      '[siteping] panelActions[7] ignored: duplicate id "ticket".',
    ]);
  });

  it("parses each icon once and drops a non-SVG icon without dropping the action", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const [withIcon, badIcon] = normalizePanelActions([
      { id: "a", label: "A", onAction, icon: '<svg><path d="M0 0"/></svg>' },
      { id: "b", label: "B", onAction, icon: "<img src=x>" },
    ]);

    expect(withIcon?.icon?.localName).toBe("svg");
    expect(badIcon?.action.id).toBe("b");
    expect(badIcon?.icon).toBeNull();
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      '[siteping] panelActions[1] ("b"): `icon` is not SVG markup — showing the label only.',
    );
  });
});
