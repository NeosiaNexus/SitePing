// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { el, formatRelativeDate, parseSvg, setText } from "../../src/dom-utils.js";

// ---------------------------------------------------------------------------
// formatRelativeDate
// ---------------------------------------------------------------------------

describe("formatRelativeDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'now' equivalent for just now (fr)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const result = formatRelativeDate("2025-06-15T12:00:00Z", "fr");
    // Intl.RelativeTimeFormat with numeric: "auto" returns "maintenant" in French
    expect(result).toMatch(/maintenant/i);
  });

  it("returns 'now' equivalent for just now (en)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const result = formatRelativeDate("2025-06-15T12:00:00Z", "en");
    expect(result).toMatch(/now/i);
  });

  it("returns minutes for < 60min", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const d = new Date(Date.now() - 15 * 60_000).toISOString();
    const result = formatRelativeDate(d, "fr");
    expect(result).toContain("15");
  });

  it("returns hours for < 24h", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const d = new Date(Date.now() - 3 * 3600_000).toISOString();
    const result = formatRelativeDate(d, "fr");
    expect(result).toContain("3");
  });

  it("returns days for < 7d", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const d = new Date(Date.now() - 2 * 86400_000).toISOString();
    const result = formatRelativeDate(d, "fr");
    expect(result).toContain("2");
  });

  it("returns formatted date for > 7d", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    // 30 days before 2025-06-15 = 2025-05-16
    const d = new Date(Date.now() - 30 * 86400_000).toISOString();
    const result = formatRelativeDate(d, "fr");
    // toLocaleDateString("fr") returns something like "16/05/2025"
    expect(result).toContain("2025");
  });

  it("defaults to English locale when no locale is provided", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const result = formatRelativeDate("2025-06-15T12:00:00Z");
    expect(result).toMatch(/now/i);
  });

  it("respects English locale", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const d = new Date(Date.now() - 15 * 60_000).toISOString();
    const result = formatRelativeDate(d, "en");
    // English Intl.RelativeTimeFormat should return something with "15" and "min" or "ago"
    expect(result).toContain("15");
  });
});

// ---------------------------------------------------------------------------
// parseSvg
// ---------------------------------------------------------------------------

describe("parseSvg", () => {
  it("parses a valid SVG string into an SVGSVGElement", () => {
    const svgString =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="6"/></svg>';
    const result = parseSvg(svgString);
    expect(result).toBeInstanceOf(SVGSVGElement);
    expect(result.nodeName.toLowerCase()).toBe("svg");
  });

  it("preserves SVG attributes", () => {
    const svgString =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
    const result = parseSvg(svgString);
    expect(result.getAttribute("width")).toBe("24");
    expect(result.getAttribute("height")).toBe("24");
    expect(result.getAttribute("viewBox")).toBe("0 0 24 24");
  });

  it("preserves child elements", () => {
    const svgString =
      '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6"/><rect x="0" y="0" width="10" height="10"/></svg>';
    const result = parseSvg(svgString);
    expect(result.children.length).toBe(2);
  });

  it("throws for non-SVG content", () => {
    expect(() => parseSvg("<div>not svg</div>")).toThrow("[siteping] Invalid SVG string");
  });

  it("throws for empty string", () => {
    expect(() => parseSvg("")).toThrow();
  });

  it("strips on* event handler attributes from the root SVG element", () => {
    const svgString =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" onclick="alert(1)" onload="alert(2)"><circle cx="8" cy="8" r="6"/></svg>';
    const result = parseSvg(svgString);
    expect(result.hasAttribute("onclick")).toBe(false);
    expect(result.hasAttribute("onload")).toBe(false);
    // Non-on* attributes are preserved
    expect(result.getAttribute("width")).toBe("16");
  });

  it("strips on* event handler attributes from descendant elements", () => {
    const svgString =
      '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" onclick="alert(1)" onmouseover="alert(2)"/><rect onfocus="alert(3)"/></svg>';
    const result = parseSvg(svgString);
    const circle = result.querySelector("circle")!;
    const rect = result.querySelector("rect")!;
    expect(circle.hasAttribute("onclick")).toBe(false);
    expect(circle.hasAttribute("onmouseover")).toBe(false);
    expect(rect.hasAttribute("onfocus")).toBe(false);
    // Non-on* attributes are preserved
    expect(circle.getAttribute("cx")).toBe("8");
  });
});

// ---------------------------------------------------------------------------
// el
// ---------------------------------------------------------------------------

describe("el", () => {
  it("creates an element with the given tag", () => {
    const div = el("div");
    expect(div.tagName).toBe("DIV");
    expect(div).toBeInstanceOf(HTMLElement);
  });

  it("creates element without attrs", () => {
    const span = el("span");
    expect(span.tagName).toBe("SPAN");
    expect(span.className).toBe("");
    expect(span.style.cssText).toBe("");
  });

  it("sets class via attrs", () => {
    const div = el("div", { class: "sp-panel sp-active" });
    expect(div.className).toBe("sp-panel sp-active");
  });

  it("sets style via attrs", () => {
    const div = el("div", { style: "color: red; font-size: 14px" });
    expect(div.style.color).toBe("red");
    expect(div.style.fontSize).toBe("14px");
  });

  it("sets arbitrary attributes", () => {
    const btn = el("button", { type: "submit", "data-testid": "login", role: "button" });
    expect(btn.getAttribute("type")).toBe("submit");
    expect(btn.getAttribute("data-testid")).toBe("login");
    expect(btn.getAttribute("role")).toBe("button");
  });

  it("sets multiple attrs including class, style, and data", () => {
    const div = el("div", {
      class: "container",
      style: "display: flex",
      id: "main",
      "aria-label": "Main content",
    });
    expect(div.className).toBe("container");
    expect(div.style.display).toBe("flex");
    expect(div.id).toBe("main");
    expect(div.getAttribute("aria-label")).toBe("Main content");
  });
});

// ---------------------------------------------------------------------------
// setText
// ---------------------------------------------------------------------------

describe("setText", () => {
  it("sets text content on an HTMLElement", () => {
    const div = document.createElement("div");
    setText(div, "Hello, world!");
    expect(div.textContent).toBe("Hello, world!");
  });

  it("overwrites existing text content", () => {
    const div = document.createElement("div");
    div.textContent = "old text";
    setText(div, "new text");
    expect(div.textContent).toBe("new text");
  });

  it("removes child elements when setting text", () => {
    const div = document.createElement("div");
    div.appendChild(document.createElement("span"));
    setText(div, "plain text");
    expect(div.textContent).toBe("plain text");
    expect(div.children.length).toBe(0);
  });

  it("handles empty string", () => {
    const div = document.createElement("div");
    div.textContent = "something";
    setText(div, "");
    expect(div.textContent).toBe("");
  });

  it("escapes HTML entities (no injection)", () => {
    const div = document.createElement("div");
    setText(div, '<script>alert("xss")</script>');
    expect(div.textContent).toBe('<script>alert("xss")</script>');
    expect(div.innerHTML).not.toContain("<script>");
  });

  it("works with SVGElement", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "text");
    setText(svg, "SVG text content");
    expect(svg.textContent).toBe("SVG text content");
  });
});
