// @vitest-environment jsdom
// TEMP REPRO — delete after review. Sweep-skip vs disambiguate epsilon window.

import type { AnchorData } from "@siteping/core";
import { afterEach, describe, expect, it } from "vitest";
import { generateFingerprint } from "../../src/dom/fingerprint";
import { resolveAnchor } from "../../src/dom/resolver";

function makeAnchor(overrides: Partial<AnchorData> = {}): AnchorData {
  return {
    cssSelector: "__nomatch__",
    xpath: "/nonexistent",
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

afterEach(() => {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
});

describe("sweep-skip vs disambiguate epsilon band", () => {
  it("Case A: wrapper id-match at final ~0.867 skips the sweep and hides the perfect inner scan candidate", () => {
    // Capture-time: annotation sat on the inner div (aria-label, 1 child span).
    // Redeploy: a wrapper DIV took over id="target"; inner kept everything.
    const wrapper = document.createElement("div");
    wrapper.id = "target";
    const inner = document.createElement("div");
    inner.setAttribute("aria-label", "stats");
    const child = document.createElement("span");
    child.textContent = "Monthly recurring revenue trending upward";
    inner.appendChild(child);
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);

    // Stored signals are the INNER element's (unchanged since capture):
    const storedFp = generateFingerprint(inner); // "1:0:<hash(aria-label=stats)>"
    const anchor = makeAnchor({
      elementId: "target",
      textSnippet: "Monthly recurring revenue trending upward",
      fingerprint: storedFp,
    });

    // wrapper verification = (40*1 [snippet containment] + 20*0.6 [fp: child✓ sib✓ attr✗]) / 60 = 0.867
    // → final = 1.0 * 0.867 = 0.867 ≥ 0.85 → sweep skipped.
    // inner verification would be exactly 1.0 → scan final 0.85, gap 0.017 ≤ ε(0.05),
    // and wrapper.contains(inner) → disambiguate would pick inner. It never gets the chance.
    const result = resolveAnchor(anchor);
    expect(result).not.toBeNull();
    // Documents the current (buggy) outcome:
    expect(result!.element).toBe(wrapper);
    expect(result!.strategy).toBe("id");
    expect(result!.confidence).toBe(1.0); // reported fully-confident on the wrong element
  });

  it("Case B: slightly WORSE wrapper verification (0.833 < 0.85) lets the sweep run and the inner wins", () => {
    const wrapper = document.createElement("div");
    wrapper.id = "target";
    const inner = document.createElement("div");
    inner.setAttribute("aria-label", "stats");
    const child = document.createElement("span");
    child.textContent = "Monthly recurring revenue trending upward";
    inner.appendChild(child);
    wrapper.appendChild(inner);
    // Extra wrapper child → wrapper childCount 2 vs stored 1 → fp 0.5 → v = 50/60 = 0.833
    const extra = document.createElement("span");
    extra.textContent = "";
    wrapper.appendChild(extra);
    document.body.appendChild(wrapper);

    const storedFp = generateFingerprint(inner);
    const anchor = makeAnchor({
      elementId: "target",
      textSnippet: "Monthly recurring revenue trending upward",
      fingerprint: storedFp,
    });

    const result = resolveAnchor(anchor);
    expect(result).not.toBeNull();
    expect(result!.element).toBe(inner);
    expect(result!.strategy).toBe("scan");
  });
});
