// @vitest-environment jsdom

import { ANCHOR_ELEMENT_ID_MAX, ANCHOR_ELEMENT_TAG_MAX } from "@siteping/core";
import { afterEach, describe, expect, it } from "vitest";
import { generateAnchor } from "../../src/dom/anchor.js";

// ---------------------------------------------------------------------------
// Polyfills — jsdom lacks CSS.escape
// ---------------------------------------------------------------------------

if (typeof CSS === "undefined") {
  (globalThis as Record<string, unknown>).CSS = { escape: (s: string) => s };
} else if (!CSS.escape) {
  CSS.escape = (s: string) => s;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateAnchor", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  // -------------------------------------------------------------------------
  // Return shape
  // -------------------------------------------------------------------------

  describe("return shape", () => {
    it("returns an AnchorData object with all expected fields", () => {
      const element = document.createElement("div");
      document.body.appendChild(element);

      const anchor = generateAnchor(element);

      expect(anchor).toHaveProperty("cssSelector");
      expect(anchor).toHaveProperty("xpath");
      expect(anchor).toHaveProperty("textSnippet");
      expect(anchor).toHaveProperty("elementTag");
      expect(anchor).toHaveProperty("textPrefix");
      expect(anchor).toHaveProperty("textSuffix");
      expect(anchor).toHaveProperty("fingerprint");
      expect(anchor).toHaveProperty("neighborText");
    });

    it("returns string values for all text fields", () => {
      const element = document.createElement("div");
      document.body.appendChild(element);

      const anchor = generateAnchor(element);

      expect(typeof anchor.cssSelector).toBe("string");
      expect(typeof anchor.xpath).toBe("string");
      expect(typeof anchor.textSnippet).toBe("string");
      expect(typeof anchor.elementTag).toBe("string");
      expect(typeof anchor.textPrefix).toBe("string");
      expect(typeof anchor.textSuffix).toBe("string");
      expect(typeof anchor.fingerprint).toBe("string");
      expect(typeof anchor.neighborText).toBe("string");
    });

    it("returns a non-empty cssSelector", () => {
      const element = document.createElement("div");
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(anchor.cssSelector.length).toBeGreaterThan(0);
    });

    it("returns a non-empty xpath", () => {
      const element = document.createElement("div");
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(anchor.xpath.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // elementTag
  // -------------------------------------------------------------------------

  describe("elementTag", () => {
    it("matches the element tag name for a DIV", () => {
      const element = document.createElement("div");
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(anchor.elementTag).toBe("DIV");
    });

    it("matches the element tag name for a SECTION", () => {
      const element = document.createElement("section");
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(anchor.elementTag).toBe("SECTION");
    });

    it("matches the element tag name for a BUTTON", () => {
      const element = document.createElement("button");
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(anchor.elementTag).toBe("BUTTON");
    });

    it("matches the element tag name for a SPAN", () => {
      const element = document.createElement("span");
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(anchor.elementTag).toBe("SPAN");
    });
  });

  // -------------------------------------------------------------------------
  // elementId
  // -------------------------------------------------------------------------

  describe("elementId", () => {
    it("is set when element has an id attribute", () => {
      const element = document.createElement("div");
      element.id = "my-element";
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(anchor.elementId).toBe("my-element");
    });

    it("is undefined when element has no id", () => {
      const element = document.createElement("div");
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(anchor.elementId).toBeUndefined();
    });

    it("is undefined when element has an empty id string", () => {
      const element = document.createElement("div");
      element.id = "";
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(anchor.elementId).toBeUndefined();
    });

    it("is omitted when longer than the server's cap (a truncated id is wrong data)", () => {
      const element = document.createElement("div");
      element.id = "a".repeat(ANCHOR_ELEMENT_ID_MAX + 1);
      document.body.appendChild(element);

      expect(generateAnchor(element).elementId).toBeUndefined();

      element.id = "a".repeat(ANCHOR_ELEMENT_ID_MAX);
      expect(generateAnchor(element).elementId).toBe("a".repeat(ANCHOR_ELEMENT_ID_MAX));
    });
  });

  describe("elementTag length", () => {
    it("is capped at the server's limit", () => {
      const element = document.createElement(`x-${"a".repeat(ANCHOR_ELEMENT_TAG_MAX)}`);
      document.body.appendChild(element);

      expect(generateAnchor(element).elementTag).toHaveLength(ANCHOR_ELEMENT_TAG_MAX);
    });
  });

  // -------------------------------------------------------------------------
  // textSnippet
  // -------------------------------------------------------------------------

  describe("textSnippet", () => {
    it("captures text content of the element", () => {
      const element = document.createElement("p");
      element.textContent = "Hello world";
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(anchor.textSnippet).toBe("Hello world");
    });

    it("is truncated to 120 characters for long text", () => {
      const element = document.createElement("p");
      element.textContent = "A".repeat(200);
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(anchor.textSnippet.length).toBe(120);
      expect(anchor.textSnippet).toBe("A".repeat(120));
    });

    it("is not truncated when text is exactly 120 characters", () => {
      const element = document.createElement("p");
      element.textContent = "B".repeat(120);
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(anchor.textSnippet.length).toBe(120);
    });

    it("is empty string when element has no text content", () => {
      const element = document.createElement("div");
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(anchor.textSnippet).toBe("");
    });

    it("trims whitespace from text content", () => {
      const element = document.createElement("p");
      element.textContent = "  Hello world  ";
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      // textContent is trimmed before slicing
      expect(anchor.textSnippet).toBe("Hello world");
    });
  });

  // -------------------------------------------------------------------------
  // Fingerprint and context
  // -------------------------------------------------------------------------

  describe("fingerprint and context", () => {
    it("returns a fingerprint string", () => {
      const element = document.createElement("div");
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(typeof anchor.fingerprint).toBe("string");
      expect(anchor.fingerprint.length).toBeGreaterThan(0);
    });

    it("returns textPrefix and textSuffix as strings", () => {
      const element = document.createElement("div");
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(typeof anchor.textPrefix).toBe("string");
      expect(typeof anchor.textSuffix).toBe("string");
    });

    it("returns neighborText as a string", () => {
      const element = document.createElement("div");
      document.body.appendChild(element);

      const anchor = generateAnchor(element);
      expect(typeof anchor.neighborText).toBe("string");
    });
  });
});
