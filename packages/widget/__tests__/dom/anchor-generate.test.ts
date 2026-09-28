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

  // -------------------------------------------------------------------------
  // Shadow DOM support (#177)
  // -------------------------------------------------------------------------

  describe("Shadow DOM support", () => {
    it("builds a shadow-piercing cssSelector path using >>>", () => {
      const host = document.createElement("div");
      host.id = "host1";
      document.body.appendChild(host);

      const shadow = host.attachShadow({ mode: "open" });
      const target = document.createElement("span");
      target.id = "target1";
      shadow.appendChild(target);

      const anchor = generateAnchor(target);
      expect(anchor.cssSelector).toBe("#host1 >>> #target1");
    });

    it("builds a multi-level shadow-piercing cssSelector path", () => {
      const host1 = document.createElement("div");
      host1.id = "host1";
      document.body.appendChild(host1);

      const shadow1 = host1.attachShadow({ mode: "open" });
      const host2 = document.createElement("section");
      host2.className = "inner-host";
      shadow1.appendChild(host2);

      const shadow2 = host2.attachShadow({ mode: "open" });
      const target = document.createElement("button");
      target.id = "deep-target";
      shadow2.appendChild(target);

      const anchor = generateAnchor(target);
      expect(anchor.cssSelector).toBe("#host1 >>> .inner-host >>> #deep-target");
    });

    it("scopes each segment's uniqueness to its own tree", () => {
      // A light-DOM <em> must not force a longer inner selector, and the inner
      // tree's twin <em> must be told apart within that tree.
      document.body.appendChild(document.createElement("em"));
      const host = document.createElement("div");
      host.id = "card";
      document.body.appendChild(host);
      const shadow = host.attachShadow({ mode: "open" });
      shadow.append(document.createElement("em"), document.createElement("em"));

      const anchor = generateAnchor(shadow.lastElementChild as Element);
      const [hostSelector, innerSelector] = anchor.cssSelector.split(" >>> ");
      expect(hostSelector).toBe("#card");
      expect(shadow.querySelectorAll(innerSelector as string)).toHaveLength(1);
      expect(shadow.querySelector(innerSelector as string)).toBe(shadow.lastElementChild);
    });

    it("captures semantic anchorKey across a shadow boundary", () => {
      const host = document.createElement("div");
      host.setAttribute("data-feedback-anchor", "global-section");
      document.body.appendChild(host);

      const shadow = host.attachShadow({ mode: "open" });
      const target = document.createElement("p");
      shadow.appendChild(target);

      const anchor = generateAnchor(target);
      expect(anchor.anchorKey).toBe("global-section");
    });

    it("prefers the nearest anchorKey inside the shadow tree over the host's", () => {
      const host = document.createElement("div");
      host.setAttribute("data-feedback-anchor", "page.section");
      document.body.appendChild(host);
      const shadow = host.attachShadow({ mode: "open" });
      const card = document.createElement("article");
      card.setAttribute("data-feedback-anchor", "card.body");
      const target = document.createElement("p");
      card.appendChild(target);
      shadow.appendChild(card);

      expect(generateAnchor(target).anchorKey).toBe("card.body");
    });

    it("anchors a closed shadow root's host as plain light DOM", () => {
      const host = document.createElement("div");
      host.id = "closed-host";
      document.body.appendChild(host);
      host.attachShadow({ mode: "closed" }).appendChild(document.createElement("p"));

      const anchor = generateAnchor(host);
      expect(anchor.cssSelector).toBe("#closed-host");
      expect(anchor.xpath).toBe("//div[@id='closed-host']");
    });

    it("leaves light-DOM output untouched when shadow hosts share the page", () => {
      const section = document.createElement("section");
      section.className = "pricing";
      section.innerHTML = "<p>Plans</p><p>Free</p><p>Pro</p>";
      document.body.appendChild(section);
      document.body.appendChild(document.createElement("div")).attachShadow({ mode: "open" }).innerHTML = "<p>Pro</p>";

      const anchor = generateAnchor(section.children[2] as Element);
      expect(anchor.cssSelector).toBe("p:nth-of-type(3)");
      expect(anchor.xpath).toBe("/html/body/section[1]/p[3]");
    });
  });
});
