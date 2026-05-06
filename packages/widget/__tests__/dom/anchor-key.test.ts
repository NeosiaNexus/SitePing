// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { generateAnchor } from "../../src/dom/anchor.js";
import { resolveAnchor } from "../../src/dom/resolver.js";

// ---------------------------------------------------------------------------
// Polyfills — jsdom lacks CSS.escape
// ---------------------------------------------------------------------------

if (typeof CSS === "undefined") {
  (globalThis as Record<string, unknown>).CSS = { escape: (s: string) => s };
} else if (!CSS.escape) {
  CSS.escape = (s: string) => s;
}

// ---------------------------------------------------------------------------
// Tests for the semantic anchor (data-feedback-anchor) extension
// ---------------------------------------------------------------------------

describe("generateAnchor — data-feedback-anchor", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("captures anchorKey from the closest ancestor", () => {
    const section = document.createElement("section");
    section.setAttribute("data-feedback-anchor", "order-card.services");
    const inner = document.createElement("button");
    inner.textContent = "Add service";
    section.appendChild(inner);
    document.body.appendChild(section);

    const anchor = generateAnchor(inner);

    expect(anchor.anchorKey).toBe("order-card.services");
  });

  it("captures anchorKey when the element itself has the attribute", () => {
    const el = document.createElement("div");
    el.setAttribute("data-feedback-anchor", "layout.sidebar");
    document.body.appendChild(el);

    const anchor = generateAnchor(el);

    expect(anchor.anchorKey).toBe("layout.sidebar");
  });

  it("returns null anchorKey when no ancestor has the attribute", () => {
    const el = document.createElement("p");
    el.textContent = "Plain";
    document.body.appendChild(el);

    const anchor = generateAnchor(el);

    expect(anchor.anchorKey).toBeNull();
  });

  it("uses the nearest ancestor when nested anchors exist", () => {
    const outer = document.createElement("section");
    outer.setAttribute("data-feedback-anchor", "page.root");
    const inner = document.createElement("div");
    inner.setAttribute("data-feedback-anchor", "page.toolbar");
    const button = document.createElement("button");
    button.textContent = "Save";
    inner.appendChild(button);
    outer.appendChild(inner);
    document.body.appendChild(outer);

    const anchor = generateAnchor(button);

    expect(anchor.anchorKey).toBe("page.toolbar");
  });
});

describe("resolveAnchor — anchorKey strategy", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("resolves via anchorKey at confidence 1.0 — strategy 'anchorKey'", () => {
    const section = document.createElement("section");
    section.setAttribute("data-feedback-anchor", "order-card.services");
    section.textContent = "Services panel";
    document.body.appendChild(section);

    const resolution = resolveAnchor({
      cssSelector: "section",
      xpath: "/html/body/section",
      textSnippet: "Services panel",
      elementTag: "SECTION",
      textPrefix: "",
      textSuffix: "",
      fingerprint: "",
      neighborText: "",
      anchorKey: "order-card.services",
    });

    expect(resolution).not.toBeNull();
    expect(resolution!.strategy).toBe("anchorKey");
    expect(resolution!.confidence).toBe(1.0);
    expect(resolution!.element).toBe(section);
  });

  it("does not require tag-name match for anchorKey resolution", () => {
    // Host refactored from <section> to <div> — semantic key still wins.
    const div = document.createElement("div");
    div.setAttribute("data-feedback-anchor", "order-card.services");
    div.textContent = "Services panel";
    document.body.appendChild(div);

    const resolution = resolveAnchor({
      cssSelector: "section",
      xpath: "/html/body/section",
      textSnippet: "Services panel",
      elementTag: "SECTION", // intentional mismatch
      textPrefix: "",
      textSuffix: "",
      fingerprint: "",
      neighborText: "",
      anchorKey: "order-card.services",
    });

    expect(resolution).not.toBeNull();
    expect(resolution!.strategy).toBe("anchorKey");
    expect(resolution!.element).toBe(div);
  });

  it("falls back to the next strategy when anchorKey is not in the DOM", () => {
    const el = document.createElement("section");
    el.id = "the-section";
    el.textContent = "Hello";
    document.body.appendChild(el);

    const resolution = resolveAnchor({
      cssSelector: "#the-section",
      xpath: "/html/body/section",
      textSnippet: "Hello",
      elementTag: "SECTION",
      elementId: "the-section",
      textPrefix: "",
      textSuffix: "",
      fingerprint: "",
      neighborText: "",
      anchorKey: "missing.key",
    });

    expect(resolution).not.toBeNull();
    expect(resolution!.strategy).toBe("id");
  });

  it("safely escapes special characters in anchorKey", () => {
    const el = document.createElement("div");
    el.setAttribute("data-feedback-anchor", 'tricky"key');
    el.textContent = "ok";
    document.body.appendChild(el);

    const resolution = resolveAnchor({
      cssSelector: "div",
      xpath: "/html/body/div",
      textSnippet: "ok",
      elementTag: "DIV",
      textPrefix: "",
      textSuffix: "",
      fingerprint: "",
      neighborText: "",
      anchorKey: 'tricky"key',
    });

    expect(resolution).not.toBeNull();
    expect(resolution!.strategy).toBe("anchorKey");
  });
});
