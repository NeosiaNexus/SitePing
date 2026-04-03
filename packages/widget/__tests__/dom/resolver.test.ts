// @vitest-environment jsdom

import type { AnchorData, RectData } from "@siteping/core";
import { afterEach, describe, expect, it } from "vitest";
import { generateFingerprint } from "../../src/dom/fingerprint";
import { resolveAnchor, resolveAnnotation } from "../../src/dom/resolver";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal AnchorData with sensible defaults. */
function makeAnchor(overrides: Partial<AnchorData> = {}): AnchorData {
  return {
    cssSelector: "div",
    xpath: "/html/body/div[1]",
    textSnippet: "",
    elementTag: "DIV",
    elementId: undefined,
    textPrefix: "",
    textSuffix: "",
    fingerprint: "",
    neighborText: "",
    ...overrides,
  };
}

/** Build a minimal RectData. */
function makeRect(overrides: Partial<RectData> = {}): RectData {
  return { xPct: 0.1, yPct: 0.2, wPct: 0.5, hPct: 0.3, ...overrides };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

// ---------------------------------------------------------------------------
// resolveAnchor — Level 1: getElementById
// ---------------------------------------------------------------------------
describe("resolveAnchor — Level 1: getElementById", () => {
  it("resolves by id with confidence 1.0 and strategy 'id'", () => {
    const div = document.createElement("div");
    div.id = "hero";
    document.body.appendChild(div);

    const anchor = makeAnchor({ elementId: "hero", elementTag: "DIV" });
    const result = resolveAnchor(anchor);

    expect(result).not.toBeNull();
    expect(result!.element).toBe(div);
    expect(result!.confidence).toBe(1.0);
    expect(result!.strategy).toBe("id");
  });

  it("fails id resolution when tag name does not match", () => {
    const span = document.createElement("span");
    span.id = "hero";
    document.body.appendChild(span);

    const anchor = makeAnchor({
      elementId: "hero",
      elementTag: "DIV",
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
    });
    // id exists but tag is SPAN, not DIV — should not resolve via id
    const result = resolveAnchor(anchor);
    expect(result?.strategy).not.toBe("id");
  });

  it("skips id resolution when elementId is undefined", () => {
    const div = document.createElement("div");
    div.id = "hero";
    document.body.appendChild(div);

    const anchor = makeAnchor({
      elementId: undefined,
      cssSelector: "#hero",
      elementTag: "DIV",
    });
    const result = resolveAnchor(anchor);
    // Should resolve via CSS, not id
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("css");
  });

  it("skips id resolution when element does not exist", () => {
    const anchor = makeAnchor({
      elementId: "nonexistent",
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "DIV",
    });
    const result = resolveAnchor(anchor);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveAnchor — Level 2: CSS selector
// ---------------------------------------------------------------------------
describe("resolveAnchor — Level 2: CSS selector", () => {
  it("resolves by CSS selector with confidence 0.95", () => {
    const section = document.createElement("section");
    section.classList.add("pricing");
    document.body.appendChild(section);

    const anchor = makeAnchor({
      cssSelector: "section.pricing",
      elementTag: "SECTION",
    });
    const result = resolveAnchor(anchor);

    expect(result).not.toBeNull();
    expect(result!.element).toBe(section);
    expect(result!.confidence).toBe(0.95);
    expect(result!.strategy).toBe("css");
  });

  it("fails CSS resolution when tag name does not match", () => {
    const div = document.createElement("div");
    div.classList.add("pricing");
    document.body.appendChild(div);

    const anchor = makeAnchor({
      cssSelector: "div.pricing",
      elementTag: "SECTION",
      xpath: "/nonexistent",
    });
    const result = resolveAnchor(anchor);
    expect(result?.strategy).not.toBe("css");
  });

  it("handles invalid CSS selector gracefully", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);

    const anchor = makeAnchor({
      cssSelector: "[[[invalid",
      xpath: "/nonexistent",
      elementTag: "DIV",
    });
    // Invalid selector should not throw — just skip
    const result = resolveAnchor(anchor);
    expect(result?.strategy).not.toBe("css");
  });
});

// ---------------------------------------------------------------------------
// resolveAnchor — Level 3: XPath
// ---------------------------------------------------------------------------
describe("resolveAnchor — Level 3: XPath", () => {
  it("resolves by XPath with confidence 0.9", () => {
    const div = document.createElement("div");
    const p = document.createElement("p");
    div.appendChild(p);
    document.body.appendChild(div);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/html/body/div[1]/p[1]",
      elementTag: "P",
    });
    const result = resolveAnchor(anchor);

    expect(result).not.toBeNull();
    expect(result!.element).toBe(p);
    expect(result!.confidence).toBe(0.9);
    expect(result!.strategy).toBe("xpath");
  });

  it("fails XPath resolution when tag name does not match", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/html/body/div[1]",
      elementTag: "SPAN",
    });
    const result = resolveAnchor(anchor);
    expect(result?.strategy).not.toBe("xpath");
  });

  it("handles invalid XPath gracefully", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "///[invalid xpath",
      elementTag: "DIV",
    });
    const result = resolveAnchor(anchor);
    expect(result?.strategy).not.toBe("xpath");
  });
});

// ---------------------------------------------------------------------------
// resolveAnchor — Level 4: Smart scan
// ---------------------------------------------------------------------------
describe("resolveAnchor — Level 4: smart scan", () => {
  it("resolves via smart scan when higher levels fail", () => {
    const div = document.createElement("div");
    div.textContent = "Contact us today";
    document.body.appendChild(div);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "DIV",
      textSnippet: "Contact us today",
      fingerprint: generateFingerprint(div),
      neighborText: "",
    });
    const result = resolveAnchor(anchor);

    expect(result).not.toBeNull();
    expect(result!.element).toBe(div);
    expect(result!.strategy).toBe("scan");
  });

  it("caps confidence at 0.85 for smart scan", () => {
    const div = document.createElement("div");
    div.textContent = "Hello world";
    document.body.appendChild(div);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "DIV",
      textSnippet: "Hello world",
      fingerprint: generateFingerprint(div),
    });
    const result = resolveAnchor(anchor);

    expect(result).not.toBeNull();
    expect(result!.confidence).toBeLessThanOrEqual(0.85);
    expect(result!.strategy).toBe("scan");
  });

  it("returns null when no candidates match the tag", () => {
    const span = document.createElement("span");
    document.body.appendChild(span);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "ARTICLE",
      textSnippet: "anything",
    });
    const result = resolveAnchor(anchor);
    expect(result).toBeNull();
  });

  it("returns null when best score is below 0.4 threshold", () => {
    const div = document.createElement("div");
    div.textContent = "Completely unrelated content";
    document.body.appendChild(div);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "DIV",
      textSnippet: "ZZZZZZZZZZZZZ",
      fingerprint: "99:99:nope",
      textPrefix: "XXXXXXXXX",
      textSuffix: "YYYYYYYYY",
      neighborText: "QQQQQQQQQ",
    });
    const result = resolveAnchor(anchor);
    expect(result).toBeNull();
  });

  it("picks the best-scoring candidate among multiple", () => {
    const wrong = document.createElement("p");
    wrong.textContent = "Unrelated paragraph";
    document.body.appendChild(wrong);

    const correct = document.createElement("p");
    correct.textContent = "Pricing starts at 49 euros per month";
    document.body.appendChild(correct);

    const decoy = document.createElement("p");
    decoy.textContent = "Another decoy paragraph";
    document.body.appendChild(decoy);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "P",
      textSnippet: "Pricing starts at 49 euros per month",
      fingerprint: generateFingerprint(correct),
    });
    const result = resolveAnchor(anchor);

    expect(result).not.toBeNull();
    expect(result!.element).toBe(correct);
    expect(result!.strategy).toBe("scan");
  });
});

// ---------------------------------------------------------------------------
// Smart scan scoring — individual signals
// ---------------------------------------------------------------------------
describe("smart scan scoring — text snippet signal", () => {
  it("exact text snippet produces a high scan score", () => {
    const p = document.createElement("p");
    p.textContent = "Subscribe to our newsletter";
    document.body.appendChild(p);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "P",
      textSnippet: "Subscribe to our newsletter",
      // Only text signal active
      fingerprint: "",
      neighborText: "",
      textPrefix: "",
      textSuffix: "",
    });
    const result = resolveAnchor(anchor);

    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0.4);
    expect(result!.strategy).toBe("scan");
  });

  it("fuzzy text snippet still matches approximately", () => {
    const p = document.createElement("p");
    p.textContent = "Subscribe to our newsletter";
    document.body.appendChild(p);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "P",
      textSnippet: "Subscribee to oor newsletter",
      fingerprint: "",
      neighborText: "",
      textPrefix: "",
      textSuffix: "",
    });
    const result = resolveAnchor(anchor);
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("scan");
  });
});

describe("smart scan scoring — fingerprint signal", () => {
  it("matching fingerprint contributes to scan score", () => {
    const parent = document.createElement("div");
    const btn = document.createElement("button");
    btn.setAttribute("role", "button");
    btn.setAttribute("type", "submit");
    parent.appendChild(btn);
    document.body.appendChild(parent);

    const fp = generateFingerprint(btn);
    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "BUTTON",
      fingerprint: fp,
      // Only fingerprint signal active
      textSnippet: "",
      neighborText: "",
      textPrefix: "",
      textSuffix: "",
    });
    const result = resolveAnchor(anchor);

    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("scan");
  });
});

describe("smart scan scoring — prefix/suffix context", () => {
  it("matching prefix and suffix text boosts scan score", () => {
    const before = document.createElement("p");
    before.textContent = "Our premium plans";
    document.body.appendChild(before);

    const target = document.createElement("p");
    target.textContent = "Starting at 29 euros";
    document.body.appendChild(target);

    const after = document.createElement("p");
    after.textContent = "Cancel anytime";
    document.body.appendChild(after);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "P",
      textSnippet: "Starting at 29 euros",
      textPrefix: "Our premium plans",
      textSuffix: "Cancel anytime",
      fingerprint: generateFingerprint(target),
      neighborText: "Our premium plans | Cancel anytime",
    });
    const result = resolveAnchor(anchor);

    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0.4);
    expect(result!.strategy).toBe("scan");
  });

  it("only prefix contributes when suffix is empty", () => {
    const before = document.createElement("div");
    before.textContent = "Header navigation";
    document.body.appendChild(before);

    const target = document.createElement("div");
    target.textContent = "Main content";
    document.body.appendChild(target);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "DIV",
      textSnippet: "Main content",
      textPrefix: "Header navigation",
      textSuffix: "",
      fingerprint: "",
      neighborText: "",
    });
    const result = resolveAnchor(anchor);
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("scan");
  });
});

describe("smart scan scoring — neighbor text signal", () => {
  it("matching neighbor text contributes to scan score", () => {
    const prev = document.createElement("li");
    prev.textContent = "Home";
    document.body.appendChild(prev);

    const target = document.createElement("li");
    target.textContent = "About";
    document.body.appendChild(target);

    const next = document.createElement("li");
    next.textContent = "Contact";
    document.body.appendChild(next);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "LI",
      textSnippet: "About",
      neighborText: "Home | Contact",
      fingerprint: "",
      textPrefix: "",
      textSuffix: "",
    });
    const result = resolveAnchor(anchor);

    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("scan");
  });
});

// ---------------------------------------------------------------------------
// resolveAnchor — fallback order
// ---------------------------------------------------------------------------
describe("resolveAnchor — fallback order", () => {
  it("prefers id over CSS, XPath, and scan", () => {
    const div = document.createElement("div");
    div.id = "target";
    div.classList.add("target-class");
    div.textContent = "Target text";
    document.body.appendChild(div);

    const anchor = makeAnchor({
      elementId: "target",
      cssSelector: ".target-class",
      xpath: "/html/body/div[1]",
      elementTag: "DIV",
      textSnippet: "Target text",
    });
    const result = resolveAnchor(anchor);

    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("id");
    expect(result!.confidence).toBe(1.0);
  });

  it("falls back from id to CSS when id tag mismatches", () => {
    // ID element exists but with wrong tag
    const span = document.createElement("span");
    span.id = "target";
    document.body.appendChild(span);

    // CSS target has the correct tag
    const div = document.createElement("div");
    div.classList.add("correct");
    document.body.appendChild(div);

    const anchor = makeAnchor({
      elementId: "target",
      cssSelector: "div.correct",
      elementTag: "DIV",
    });
    const result = resolveAnchor(anchor);

    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("css");
    expect(result!.confidence).toBe(0.95);
  });

  it("falls back from CSS to XPath when CSS fails", () => {
    const p = document.createElement("p");
    document.body.appendChild(p);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/html/body/p[1]",
      elementTag: "P",
    });
    const result = resolveAnchor(anchor);

    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("xpath");
    expect(result!.confidence).toBe(0.9);
  });

  it("falls back from XPath to smart scan when XPath fails", () => {
    const h2 = document.createElement("h2");
    h2.textContent = "Features section heading";
    document.body.appendChild(h2);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "H2",
      textSnippet: "Features section heading",
      fingerprint: generateFingerprint(h2),
    });
    const result = resolveAnchor(anchor);

    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("scan");
  });
});

// ---------------------------------------------------------------------------
// resolveAnchor — orphaned annotation (all levels fail)
// ---------------------------------------------------------------------------
describe("resolveAnchor — orphaned annotation", () => {
  it("returns null when all strategies fail", () => {
    const anchor = makeAnchor({
      elementId: "nonexistent",
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "SECTION",
      textSnippet: "This content does not exist",
      fingerprint: "99:99:nope",
      neighborText: "nothing",
    });
    const result = resolveAnchor(anchor);
    expect(result).toBeNull();
  });

  it("returns null when DOM is empty", () => {
    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "DIV",
      textSnippet: "something",
    });
    const result = resolveAnchor(anchor);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveAnnotation — percentage rect to absolute coordinates
// ---------------------------------------------------------------------------
describe("resolveAnnotation", () => {
  it("converts percentage rect to absolute coordinates", () => {
    const div = document.createElement("div");
    div.id = "box";
    document.body.appendChild(div);

    // jsdom getBoundingClientRect returns zeros — stub it
    div.getBoundingClientRect = () => new DOMRect(100, 200, 400, 300);

    const anchor = makeAnchor({ elementId: "box", elementTag: "DIV" });
    const rect = makeRect({ xPct: 0.25, yPct: 0.5, wPct: 0.1, hPct: 0.2 });

    const result = resolveAnnotation(anchor, rect);

    expect(result).not.toBeNull();
    expect(result!.element).toBe(div);
    expect(result!.confidence).toBe(1.0);
    expect(result!.strategy).toBe("id");

    // Absolute rect: x = 100 + 0.25*400 = 200, y = 200 + 0.5*300 = 350
    // w = 0.1*400 = 40, h = 0.2*300 = 60
    expect(result!.rect.x).toBeCloseTo(200);
    expect(result!.rect.y).toBeCloseTo(350);
    expect(result!.rect.width).toBeCloseTo(40);
    expect(result!.rect.height).toBeCloseTo(60);
  });

  it("returns null when anchor cannot be resolved", () => {
    const anchor = makeAnchor({
      elementId: "nonexistent",
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "DIV",
    });
    const rect = makeRect();

    const result = resolveAnnotation(anchor, rect);
    expect(result).toBeNull();
  });

  it("preserves strategy and confidence from anchor resolution", () => {
    const p = document.createElement("p");
    p.classList.add("note");
    document.body.appendChild(p);
    p.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100);

    const anchor = makeAnchor({
      cssSelector: "p.note",
      elementTag: "P",
    });
    const rect = makeRect({ xPct: 0, yPct: 0, wPct: 1, hPct: 1 });

    const result = resolveAnnotation(anchor, rect);

    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("css");
    expect(result!.confidence).toBe(0.95);
  });

  it("handles zero-size anchor element", () => {
    const div = document.createElement("div");
    div.id = "zero";
    document.body.appendChild(div);
    div.getBoundingClientRect = () => new DOMRect(50, 50, 0, 0);

    const anchor = makeAnchor({ elementId: "zero", elementTag: "DIV" });
    const rect = makeRect({ xPct: 0.5, yPct: 0.5, wPct: 0.5, hPct: 0.5 });

    const result = resolveAnnotation(anchor, rect);

    expect(result).not.toBeNull();
    // With zero-size bounds: x = 50 + 0.5*0 = 50, y = 50 + 0.5*0 = 50
    expect(result!.rect.x).toBeCloseTo(50);
    expect(result!.rect.y).toBeCloseTo(50);
    expect(result!.rect.width).toBeCloseTo(0);
    expect(result!.rect.height).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// resolveAnchor — tag name validation across all levels
// ---------------------------------------------------------------------------
describe("resolveAnchor — tag name validation", () => {
  it("rejects id match with wrong tag", () => {
    const span = document.createElement("span");
    span.id = "cta";
    document.body.appendChild(span);

    const anchor = makeAnchor({
      elementId: "cta",
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "BUTTON",
    });
    const result = resolveAnchor(anchor);
    // SPAN exists with id but tag is BUTTON — all levels should fail
    expect(result).toBeNull();
  });

  it("rejects CSS match with wrong tag", () => {
    const div = document.createElement("div");
    div.classList.add("hero");
    document.body.appendChild(div);

    const anchor = makeAnchor({
      cssSelector: ".hero",
      xpath: "/nonexistent",
      elementTag: "SECTION",
    });
    const result = resolveAnchor(anchor);
    expect(result?.strategy).not.toBe("css");
  });

  it("rejects XPath match with wrong tag", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);

    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/html/body/div[1]",
      elementTag: "ARTICLE",
    });
    const result = resolveAnchor(anchor);
    expect(result?.strategy).not.toBe("xpath");
  });

  it("smart scan only considers elements with matching tag", () => {
    const span = document.createElement("span");
    span.textContent = "Click here to sign up";
    document.body.appendChild(span);

    // Anchor says BUTTON but only SPAN exists with that text
    const anchor = makeAnchor({
      cssSelector: "__invalid__",
      xpath: "/nonexistent",
      elementTag: "BUTTON",
      textSnippet: "Click here to sign up",
    });
    const result = resolveAnchor(anchor);
    expect(result).toBeNull();
  });
});
