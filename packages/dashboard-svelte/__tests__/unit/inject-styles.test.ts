// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureStyles } from "../../src/inject-styles.js";
import { INBOX_CSS } from "../../src/styles.js";

const STYLE_ID = "siteping-inbox-styles";

afterEach(() => {
  // Restore any stubbed `document` before touching it for cleanup.
  vi.unstubAllGlobals();
  document.getElementById(STYLE_ID)?.remove();
});

describe("ensureStyles", () => {
  it("appends a single <style> tag with the inbox CSS to document.head", () => {
    ensureStyles();
    const style = document.getElementById(STYLE_ID);
    expect(style).not.toBeNull();
    expect(style?.tagName).toBe("STYLE");
    expect(style?.parentElement).toBe(document.head);
    expect(style?.textContent).toBe(INBOX_CSS);
    expect(INBOX_CSS.length).toBeGreaterThan(0);
  });

  it("is idempotent — a second call does not add another tag", () => {
    ensureStyles();
    ensureStyles();
    ensureStyles();
    expect(document.querySelectorAll(`#${STYLE_ID}`)).toHaveLength(1);
    expect(document.head.querySelectorAll("style")).toHaveLength(1);
  });

  it("no-ops (does not throw) when document is unavailable", () => {
    vi.stubGlobal("document", undefined);
    expect(() => ensureStyles()).not.toThrow();
  });
});
