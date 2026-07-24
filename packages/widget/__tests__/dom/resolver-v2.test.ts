// @vitest-environment jsdom

// Scenario tests for the v2 cross-strategy scored resolver:
// #171 hidden responsive duplicates · #172 text-less verification
// #173 whitespace normalization · #174 scan cost/fairness · #175 inversion

import type { AnchorData } from "@siteping/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateFingerprint } from "../../src/dom/fingerprint";
import { resolveAnchor } from "../../src/dom/resolver";

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

type Stubbable = Element & { checkVisibility?: (options?: object) => boolean };

const stubVisible = (el: Element) => {
  (el as Stubbable).checkVisibility = () => true;
};
/** display:none-like — both strict and base calls fail. */
const stubHidden = (el: Element) => {
  (el as Stubbable).checkVisibility = () => false;
};
/** visibility:hidden/opacity:0-like — strict fails, base passes. */
const stubSoftHidden = (el: Element) => {
  (el as Stubbable).checkVisibility = (options?: object) => !options;
};

afterEach(() => {
  vi.restoreAllMocks();
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

// ---------------------------------------------------------------------------
// #171 — hidden responsive duplicates
// ---------------------------------------------------------------------------
describe("#171 — visibility-aware duplicate disambiguation", () => {
  function twinSetup(): { hidden: HTMLElement; visible: HTMLElement } {
    // Tailwind-style `hidden md:block` pattern: same component rendered twice.
    const hidden = document.createElement("div");
    hidden.className = "cta";
    hidden.textContent = "Buy now with free shipping";
    const visible = document.createElement("div");
    visible.className = "cta";
    visible.textContent = "Buy now with free shipping";
    document.body.append(hidden, visible);
    stubHidden(hidden);
    stubVisible(visible);
    return { hidden, visible };
  }

  it("prefers the visible twin over an earlier hidden one (CSS strategy)", () => {
    const { visible } = twinSetup();
    const result = resolveAnchor(
      makeAnchor({ cssSelector: ".cta", textSnippet: "Buy now with free shipping" }),
    );
    expect(result).not.toBeNull();
    expect(result!.element).toBe(visible);
    expect(result!.strategy).toBe("css");
    expect(result!.confidence).toBe(0.95);
  });

  it("prefers the visible copy for duplicated anchor keys", () => {
    const first = document.createElement("section");
    first.setAttribute("data-feedback-anchor", "pricing");
    first.textContent = "Pricing plans overview";
    const second = document.createElement("section");
    second.setAttribute("data-feedback-anchor", "pricing");
    second.textContent = "Pricing plans overview";
    document.body.append(first, second);
    stubHidden(first);
    stubVisible(second);

    const result = resolveAnchor(
      makeAnchor({
        anchorKey: "pricing",
        elementTag: "SECTION",
        cssSelector: "__nomatch__",
        textSnippet: "Pricing plans overview",
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.element).toBe(second);
    expect(result!.strategy).toBe("anchorKey");
  });

  it("still resolves (never orphans) when every candidate is hidden", () => {
    const { hidden } = twinSetup();
    stubHidden(hidden.nextElementSibling as Element); // hide the twin too

    const result = resolveAnchor(
      makeAnchor({ cssSelector: ".cta", textSnippet: "Buy now with free shipping" }),
    );
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("css");
    // Confidence reflects match certainty, not paint state — the best hidden
    // candidate is still confidently the right element.
    expect(result!.confidence).toBe(0.95);
  });

  it("ranks soft-hidden (visibility:hidden) above hidden (display:none)", () => {
    const { hidden, visible } = twinSetup();
    stubSoftHidden(visible); // downgrade the "visible" twin to soft-hidden
    void hidden;

    const result = resolveAnchor(
      makeAnchor({ cssSelector: ".cta", textSnippet: "Buy now with free shipping" }),
    );
    expect(result).not.toBeNull();
    expect(result!.element).toBe(document.querySelectorAll(".cta")[1]);
  });

  it("keeps v1 document-order behavior when visibility is unknowable (layout-less env)", () => {
    // No stubs: jsdom natively classifies everything "unknown" → factor 1.
    const first = document.createElement("div");
    first.className = "cta";
    first.textContent = "Buy now with free shipping";
    const second = document.createElement("div");
    second.className = "cta";
    second.textContent = "Buy now with free shipping";
    document.body.append(first, second);

    const result = resolveAnchor(
      makeAnchor({ cssSelector: ".cta", textSnippet: "Buy now with free shipping" }),
    );
    expect(result).not.toBeNull();
    expect(result!.element).toBe(first);
  });
});

// ---------------------------------------------------------------------------
// #172 — verification for elements without text
// ---------------------------------------------------------------------------
describe("#172 — structural verification for text-less elements", () => {
  it("rejects a stale selector pointing at the wrong icon button and rescues via scan", () => {
    // Session 1: capture an icon button (no text) inside a toolbar.
    const toolbar = document.createElement("nav");
    const menuBtn = document.createElement("button");
    menuBtn.setAttribute("aria-label", "Menu");
    menuBtn.setAttribute("type", "button");
    const closeBtn = document.createElement("button");
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.setAttribute("type", "button");
    toolbar.append(menuBtn, closeBtn);
    document.body.appendChild(toolbar);
    const storedFingerprint = generateFingerprint(closeBtn);

    // Session 2: the page refactored — the stored selector now matches the
    // WRONG button (different aria-label, different sibling position).
    const result = resolveAnchor(
      makeAnchor({
        cssSelector: "nav > button:first-child", // stale — hits menuBtn
        elementTag: "BUTTON",
        textSnippet: "", // icon button: nothing to verify by text
        fingerprint: storedFingerprint,
      }),
    );

    // v1 accepted menuBtn blindly at 0.95 (empty snippet → textMatches true).
    expect(result).not.toBeNull();
    expect(result!.element).toBe(closeBtn);
    expect(result!.strategy).toBe("scan");
  });

  it("accepts a selector match whose structure verifies", () => {
    const toolbar = document.createElement("nav");
    const closeBtn = document.createElement("button");
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.setAttribute("type", "button");
    toolbar.append(closeBtn);
    document.body.appendChild(toolbar);

    const result = resolveAnchor(
      makeAnchor({
        cssSelector: "nav > button",
        elementTag: "BUTTON",
        textSnippet: "",
        fingerprint: generateFingerprint(closeBtn),
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.element).toBe(closeBtn);
    expect(result!.strategy).toBe("css");
    expect(result!.confidence).toBe(0.95);
  });
});

// ---------------------------------------------------------------------------
// #173 — whitespace normalization at comparison time
// ---------------------------------------------------------------------------
describe("#173 — SSR/CSR whitespace drift", () => {
  it("scores re-indented nested markup as a perfect text match", () => {
    // Snippet captured from minified SSR output…
    const snippet = "Start your free trial today no credit card required";
    // …DOM now rendered from prettified CSR markup: formatting whitespace
    // lives in text nodes between the nested elements.
    const div = document.createElement("div");
    div.className = "hero";
    const strong = document.createElement("strong");
    strong.append("\n      Start your free trial\n    ");
    const em = document.createElement("em");
    em.append("no credit card required");
    div.append("\n    ", strong, "\n    today\n    ", em, "\n  ");
    document.body.appendChild(div);

    const result = resolveAnchor(makeAnchor({ cssSelector: ".hero", textSnippet: snippet }));
    expect(result).not.toBeNull();
    expect(result!.element).toBe(div);
    // Exact 0.95 requires verification 1.0 — fails if normalization is removed
    // (raw comparison leaves ~10 whitespace edits → verification ≈ 0.56).
    expect(result!.confidence).toBe(0.95);
  });

  it("matches non-breaking-space variants", () => {
    const div = document.createElement("div");
    div.className = "price";
    div.textContent = "Total : 49 € per month billed annually";
    document.body.appendChild(div);

    const result = resolveAnchor(
      makeAnchor({ cssSelector: ".price", textSnippet: "Total : 49 € per month billed annually" }),
    );
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(0.95);
  });
});

// ---------------------------------------------------------------------------
// #174 — principled scan bounds
// ---------------------------------------------------------------------------
describe("#174 — scan cost and fairness", () => {
  it("finds the correct element beyond v1's positional 300-candidate cap", () => {
    const list = document.createElement("ul");
    document.body.appendChild(list);
    let target: HTMLElement | null = null;
    for (let i = 0; i < 400; i++) {
      const li = document.createElement("li");
      li.textContent = i === 350 ? "Exclusive lifetime deal for early adopters" : `Item number ${i} in the catalog`;
      if (i === 350) target = li;
      list.appendChild(li);
    }

    const result = resolveAnchor(
      makeAnchor({
        cssSelector: "__nomatch__",
        xpath: "/nonexistent",
        elementTag: "LI",
        textSnippet: "Exclusive lifetime deal for early adopters",
      }),
    );
    // v1 scanned the first 300 LIs in document order and gave up.
    expect(result).not.toBeNull();
    expect(result!.element).toBe(target);
    expect(result!.strategy).toBe("scan");
  });

  it("skips the tag sweep entirely when a selector candidate is unbeatable", () => {
    const div = document.createElement("div");
    div.className = "target";
    div.textContent = "Perfectly matching stored snippet";
    document.body.appendChild(div);

    const spy = vi.spyOn(document, "querySelectorAll");
    const result = resolveAnchor(
      makeAnchor({ cssSelector: ".target", textSnippet: "Perfectly matching stored snippet" }),
    );
    expect(result!.strategy).toBe("css");
    // The sweep would query the bare tag name — it must not have run.
    expect(spy.mock.calls.map((c) => c[0])).not.toContain("div");
  });

  it("runs the sweep when selector verification is weak", () => {
    const div = document.createElement("div");
    div.className = "target";
    div.textContent = "Completely different words now shown";
    document.body.appendChild(div);

    const spy = vi.spyOn(document, "querySelectorAll");
    resolveAnchor(makeAnchor({ cssSelector: ".target", textSnippet: "Original snippet text stored here" }));
    expect(spy.mock.calls.map((c) => c[0])).toContain("div");
  });
});

// ---------------------------------------------------------------------------
// #175 — cross-strategy scoring beats first-match-wins
// ---------------------------------------------------------------------------
describe("#175 — cross-strategy candidate ranking", () => {
  it("THE inversion: a well-verified scan hit beats a wrong-but-text-passing selector hit", () => {
    // Session 1 captured `.promo` on an element with neighbors.
    const before = document.createElement("p");
    before.textContent = "Limited time only";
    const original = document.createElement("div");
    original.textContent = "Special offer today";
    const after = document.createElement("p");
    after.textContent = "Terms and conditions apply";
    document.body.append(before, original, after);
    const storedFingerprint = generateFingerprint(original);
    const storedPrefix = "Limited time only";
    const storedSuffix = "Terms and conditions apply";

    // Session 2: `.promo` migrated to an unrelated element whose text merely
    // RESEMBLES the snippet (passes v1's lenient 0.3 gate), in a different
    // neighborhood. The original element lost the class but kept everything else.
    const impostor = document.createElement("div");
    impostor.className = "promo";
    impostor.textContent = "Special offer today only click here to save big";
    document.body.appendChild(impostor);

    const result = resolveAnchor(
      makeAnchor({
        cssSelector: ".promo",
        xpath: "/nonexistent",
        textSnippet: "Special offer today",
        fingerprint: storedFingerprint,
        textPrefix: storedPrefix,
        textSuffix: storedSuffix,
        neighborText: "Limited time only | Terms and conditions apply",
      }),
    );

    // v1 stopped at the css level: impostor at confidence 0.95.
    expect(result).not.toBeNull();
    expect(result!.element).toBe(original);
    expect(result!.strategy).toBe("scan");
  });

  it("degrades confidence honestly for a weakly verified selector match", () => {
    const div = document.createElement("div");
    div.className = "banner";
    div.textContent = "Winter sale starts Friday at midnight";
    document.body.appendChild(div);

    const result = resolveAnchor(
      // Same element, but the text drifted substantially since capture.
      makeAnchor({ cssSelector: ".banner", textSnippet: "Summer sale starts Monday at noon" }),
    );
    expect(result).not.toBeNull();
    expect(result!.element).toBe(div);
    expect(result!.strategy).toBe("css");
    expect(result!.confidence).toBeGreaterThan(0);
    expect(result!.confidence).toBeLessThan(0.95);
  });

  it("prefers the innermost of nested same-score candidates (ancestor-decoy dedup)", () => {
    // A wrapper's textContent contains its child's text — near-identical
    // scores, but anchoring to the wrapper corrupts the %-based rect.
    const wrapper = document.createElement("div");
    wrapper.className = "dup";
    const inner = document.createElement("div");
    inner.className = "dup";
    inner.textContent = "Read the documentation";
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);

    const result = resolveAnchor(
      makeAnchor({ cssSelector: ".dup", textSnippet: "Read the documentation" }),
    );
    expect(result).not.toBeNull();
    // v1 returned the wrapper (first match in document order).
    expect(result!.element).toBe(inner);
  });

  it("gathers ALL matches of a duplicated id instead of first-match-wins", () => {
    const first = document.createElement("div");
    first.id = "cta";
    first.textContent = "Sign up for the beta program";
    const second = document.createElement("div");
    second.id = "cta"; // invalid HTML, common in the wild
    second.textContent = "Sign up for the beta program";
    document.body.append(first, second);
    stubHidden(first);
    stubVisible(second);

    const result = resolveAnchor(
      makeAnchor({
        elementId: "cta",
        cssSelector: "__nomatch__",
        textSnippet: "Sign up for the beta program",
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.element).toBe(second);
    expect(result!.strategy).toBe("id");
    expect(result!.confidence).toBe(1.0);
  });
});
