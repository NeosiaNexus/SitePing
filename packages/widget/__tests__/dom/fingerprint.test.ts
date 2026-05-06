// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { generateFingerprint, scoreFingerprint } from "../../src/dom/fingerprint";

// ---------------------------------------------------------------------------
// generateFingerprint
// ---------------------------------------------------------------------------
describe("generateFingerprint", () => {
  it("returns format childCount:siblingIdx:attrHash", () => {
    const el = document.createElement("div");
    const fp = generateFingerprint(el);
    const parts = fp.split(":");
    expect(parts).toHaveLength(3);
  });

  it("element with no children has childCount 0", () => {
    const el = document.createElement("div");
    const fp = generateFingerprint(el);
    expect(fp.split(":")[0]).toBe("0");
  });

  it("element with 3 children has childCount 3", () => {
    const el = document.createElement("div");
    el.appendChild(document.createElement("span"));
    el.appendChild(document.createElement("span"));
    el.appendChild(document.createElement("span"));
    const fp = generateFingerprint(el);
    expect(fp.split(":")[0]).toBe("3");
  });

  it("element with no parent has siblingIdx 0", () => {
    const el = document.createElement("div");
    const fp = generateFingerprint(el);
    expect(fp.split(":")[1]).toBe("0");
  });

  it("element as 2nd same-tag sibling has siblingIdx 1", () => {
    const parent = document.createElement("div");
    const first = document.createElement("span");
    const second = document.createElement("span");
    parent.appendChild(first);
    parent.appendChild(second);

    const fp = generateFingerprint(second);
    expect(fp.split(":")[1]).toBe("1");
  });

  it("same-tag sibling counting ignores different tags", () => {
    const parent = document.createElement("div");
    parent.appendChild(document.createElement("p"));
    parent.appendChild(document.createElement("span"));
    const target = document.createElement("span");
    parent.appendChild(target);

    // Only 1 preceding <span>, so siblingIdx = 1
    const fp = generateFingerprint(target);
    expect(fp.split(":")[1]).toBe("1");
  });

  it("element with no attributes has attrHash 0", () => {
    const el = document.createElement("div");
    const fp = generateFingerprint(el);
    expect(fp.split(":")[2]).toBe("0");
  });

  it("element with stable attributes has non-zero attrHash", () => {
    const el = document.createElement("div");
    el.setAttribute("role", "button");
    const fp = generateFingerprint(el);
    expect(fp.split(":")[2]).not.toBe("0");
  });

  it("different stable attributes produce different hashes", () => {
    const a = document.createElement("div");
    a.setAttribute("role", "button");
    const b = document.createElement("div");
    b.setAttribute("data-testid", "login");

    const hashA = generateFingerprint(a).split(":")[2];
    const hashB = generateFingerprint(b).split(":")[2];
    expect(hashA).not.toBe(hashB);
  });

  it("unstable attributes (class, style) do not affect attrHash", () => {
    const a = document.createElement("div");
    const b = document.createElement("div");
    b.setAttribute("class", "big red");
    b.setAttribute("style", "color:red");

    expect(generateFingerprint(a).split(":")[2]).toBe("0");
    expect(generateFingerprint(b).split(":")[2]).toBe("0");
  });
});

// ---------------------------------------------------------------------------
// scoreFingerprint
// ---------------------------------------------------------------------------
describe("scoreFingerprint", () => {
  it("exact match returns 1.0", () => {
    const el = document.createElement("div");
    el.setAttribute("role", "banner");
    const parent = document.createElement("section");
    parent.appendChild(el);

    const fp = generateFingerprint(el);
    expect(scoreFingerprint(el, fp)).toBe(1.0);
  });

  it("returns 0 for empty string fingerprint", () => {
    const el = document.createElement("div");
    // split(":") on "" gives [""] which has length 1, not 3 → should return 0
    expect(scoreFingerprint(el, "")).toBe(0);
  });

  it("malformed fingerprint (not 3 parts) returns 0", () => {
    const el = document.createElement("div");
    expect(scoreFingerprint(el, "bad")).toBe(0);
    expect(scoreFingerprint(el, "1:2")).toBe(0);
    expect(scoreFingerprint(el, "1:2:3:4")).toBe(0);
  });

  it("NaN in fingerprint returns 0", () => {
    const el = document.createElement("div");
    expect(scoreFingerprint(el, "abc:def:xyz")).toBe(0);
    expect(scoreFingerprint(el, "abc:0:0")).toBe(0);
    expect(scoreFingerprint(el, "0:def:0")).toBe(0);
  });

  it("same structure, different attrs yields 0.6", () => {
    const parent = document.createElement("div");
    const el = document.createElement("span");
    parent.appendChild(el);

    // Stored fingerprint: 0 children, siblingIdx 0, some attrHash
    const fp = "0:0:somehash";
    // Candidate has childCount=0 (0.2) + sibIdx=0 (0.4) but attrHash differs
    expect(scoreFingerprint(el, fp)).toBeCloseTo(0.6);
  });

  it("same tag, different sibling position scores lower", () => {
    const parent = document.createElement("div");
    const a = document.createElement("span");
    const b = document.createElement("span");
    parent.appendChild(a);
    parent.appendChild(b);

    const fpAtIdx0 = generateFingerprint(a); // sibIdx=0
    // b is at sibIdx=1, so sibling diff = 1 -> 0.2 instead of 0.4
    const score = scoreFingerprint(b, fpAtIdx0);
    expect(score).toBeLessThan(1.0);
  });

  // --- childCount tolerance ---
  describe("child count tolerance", () => {
    it("diff 0 yields 0.2 contribution", () => {
      const el = document.createElement("div");
      // fp: 0 children, sibIdx 0, attrHash "0"
      const fp = generateFingerprint(el);
      // candidate is el itself => childDiff=0 => full 0.2
      expect(scoreFingerprint(el, fp)).toBe(1.0); // 0.2 + 0.4 + 0.4
    });

    it("diff 1 yields 0.1 contribution", () => {
      const parent = document.createElement("div");
      const el = document.createElement("span");
      parent.appendChild(el);
      el.appendChild(document.createElement("i")); // 1 child

      // Stored says 0 children, so diff=1
      const fp = "0:0:0";
      const score = scoreFingerprint(el, fp);
      // childCount: diff 1 => 0.1, sibIdx: diff 0 => 0.4, attrHash "0"="0" => 0.4
      expect(score).toBeCloseTo(0.9);
    });

    it("diff 6+ yields 0 contribution", () => {
      const parent = document.createElement("div");
      const el = document.createElement("span");
      parent.appendChild(el);
      for (let i = 0; i < 7; i++) el.appendChild(document.createElement("i"));

      // Stored says 0 children, actual is 7, diff = 7
      const fp = "0:0:0";
      const score = scoreFingerprint(el, fp);
      // childCount: 0, sibIdx: 0.4, attrHash: 0.4
      expect(score).toBeCloseTo(0.8);
    });

    it("diff 3 (in (2, 5] range) yields 0.03 contribution", () => {
      const parent = document.createElement("div");
      const el = document.createElement("span");
      parent.appendChild(el);
      for (let i = 0; i < 3; i++) el.appendChild(document.createElement("i"));

      // Stored says 0 children, actual is 3, diff = 3 → falls into (childDiff <= 5) branch
      const fp = "0:0:0";
      const score = scoreFingerprint(el, fp);
      // childCount: 0.03, sibIdx: 0.4, attrHash: 0.4 = 0.83
      expect(score).toBeCloseTo(0.83);
    });

    it("diff 5 (boundary of (2, 5] range) yields 0.03 contribution", () => {
      const parent = document.createElement("div");
      const el = document.createElement("span");
      parent.appendChild(el);
      for (let i = 0; i < 5; i++) el.appendChild(document.createElement("i"));

      // diff = 5 → exactly on the upper boundary
      const fp = "0:0:0";
      const score = scoreFingerprint(el, fp);
      expect(score).toBeCloseTo(0.83);
    });
  });

  // --- sibling index tolerance ---
  describe("sibling index tolerance", () => {
    it("diff 0 yields 0.4 contribution", () => {
      const parent = document.createElement("div");
      const el = document.createElement("span");
      parent.appendChild(el);

      const fp = "0:0:0";
      const score = scoreFingerprint(el, fp);
      // childCount: 0.2, sibIdx: 0.4, attr: 0.4
      expect(score).toBeCloseTo(1.0);
    });

    it("diff 1 yields 0.2 contribution", () => {
      const parent = document.createElement("div");
      parent.appendChild(document.createElement("span"));
      const el = document.createElement("span");
      parent.appendChild(el);

      // el is at sibIdx=1, stored says sibIdx=0 => diff=1
      const fp = "0:0:0";
      const score = scoreFingerprint(el, fp);
      // childCount: 0.2, sibIdx: 0.2, attr: 0.4
      expect(score).toBeCloseTo(0.8);
    });

    it("diff 4+ yields 0 contribution", () => {
      const parent = document.createElement("div");
      for (let i = 0; i < 4; i++) {
        parent.appendChild(document.createElement("span"));
      }
      const el = document.createElement("span");
      parent.appendChild(el);

      // el is at sibIdx=4, stored says sibIdx=0 => diff=4
      const fp = "0:0:0";
      const score = scoreFingerprint(el, fp);
      // childCount: 0.2, sibIdx: 0, attr: 0.4
      expect(score).toBeCloseTo(0.6);
    });

    it("diff 2 (in (1, 3] range) yields 0.08 contribution", () => {
      const parent = document.createElement("div");
      parent.appendChild(document.createElement("span"));
      parent.appendChild(document.createElement("span"));
      const el = document.createElement("span");
      parent.appendChild(el);

      // el is at sibIdx=2, stored says sibIdx=0 => diff=2 → falls into (sibDiff <= 3) branch
      const fp = "0:0:0";
      const score = scoreFingerprint(el, fp);
      // childCount: 0.2, sibIdx: 0.08, attr: 0.4
      expect(score).toBeCloseTo(0.68);
    });

    it("diff 3 (boundary of (1, 3] range) yields 0.08 contribution", () => {
      const parent = document.createElement("div");
      for (let i = 0; i < 3; i++) {
        parent.appendChild(document.createElement("span"));
      }
      const el = document.createElement("span");
      parent.appendChild(el);

      // el is at sibIdx=3, stored says sibIdx=0 => diff=3 → on the upper boundary
      const fp = "0:0:0";
      const score = scoreFingerprint(el, fp);
      expect(score).toBeCloseTo(0.68);
    });
  });

  // --- attribute hash ---
  it("matching attribute hash contributes 0.4", () => {
    const el = document.createElement("div");
    el.setAttribute("role", "navigation");

    const fp = generateFingerprint(el);
    // Exact match => 0.2 + 0.4 + 0.4 = 1.0
    expect(scoreFingerprint(el, fp)).toBe(1.0);

    // Now change attrHash only
    const parts = fp.split(":");
    const altFp = `${parts[0]}:${parts[1]}:wronghash`;
    // attrHash miss => 0.2 + 0.4 + 0 = 0.6
    expect(scoreFingerprint(el, altFp)).toBeCloseTo(0.6);
  });
});
