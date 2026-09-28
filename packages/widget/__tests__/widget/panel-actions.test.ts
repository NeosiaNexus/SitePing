// @vitest-environment jsdom

import type { SitepingPanelAction } from "@siteping/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizePanelActions, parseActionIcon } from "../../src/panel-actions.js";

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

  it("returns null for anything that is not an <svg> root", () => {
    expect(parseActionIcon("<img src=x onerror=alert(1)>")).toBeNull();
    expect(parseActionIcon("<b>bold</b>")).toBeNull();
    expect(parseActionIcon("plain text")).toBeNull();
    expect(parseActionIcon("")).toBeNull();
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
      { id: "ticket", label: "Duplicate", onAction },
      { id: "agent", label: "Send to agent", onAction },
    ]);

    expect(items.map((i) => i.action.id)).toEqual(["ticket", "agent"]);
    expect(items[0]?.action).toBe(valid);
    expect(warn.mock.calls.map(([message]) => message)).toEqual([
      "[siteping] panelActions[1] ignored: it needs a non-empty string `id` and `label`.",
      "[siteping] panelActions[2] ignored: it needs a non-empty string `id` and `label`.",
      "[siteping] panelActions[3] ignored: it needs a non-empty string `id` and `label`.",
      '[siteping] panelActions[4] ("no-handler") ignored: `onAction` must be a function.',
      '[siteping] panelActions[5] ignored: duplicate id "ticket".',
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
