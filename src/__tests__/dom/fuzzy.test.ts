import { describe, expect, it } from "vitest";
import { editDistance, similarity, fuzzyIncludes } from "../../dom/fuzzy";

describe("editDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(editDistance("hello", "hello")).toBe(0);
  });

  it("returns 0 for both empty strings", () => {
    expect(editDistance("", "")).toBe(0);
  });

  it("returns length of the other when one is empty", () => {
    expect(editDistance("", "abc")).toBe(3);
    expect(editDistance("abcde", "")).toBe(5);
  });

  it("returns 1 for a single substitution", () => {
    expect(editDistance("cat", "bat")).toBe(1);
  });

  it("returns 1 for a single insertion", () => {
    expect(editDistance("cat", "cats")).toBe(1);
  });

  it("returns 1 for a single deletion", () => {
    expect(editDistance("cats", "cat")).toBe(1);
  });

  it("handles completely different strings of same length", () => {
    expect(editDistance("abc", "xyz")).toBe(3);
  });

  it("triggers swap optimization when a.length > b.length", () => {
    // "abcdef" (6) > "xy" (2) — a is longer, so it gets swapped internally
    const dist = editDistance("abcdef", "xy");
    // Result must be symmetric regardless of swap
    expect(dist).toBe(editDistance("xy", "abcdef"));
  });

  it('computes kitten → sitting = 3', () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
  });

  it('computes sunday → saturday = 3', () => {
    expect(editDistance("sunday", "saturday")).toBe(3);
  });
});

describe("similarity", () => {
  it("returns 1 for identical strings", () => {
    expect(similarity("hello", "hello")).toBe(1);
  });

  it("returns 1 for both empty strings", () => {
    expect(similarity("", "")).toBe(1);
  });

  it("returns 0 when one string is empty and the other is not", () => {
    expect(similarity("", "abc")).toBe(0);
    expect(similarity("xyz", "")).toBe(0);
  });

  it("returns correct ratio for completely different same-length strings", () => {
    // "abc" vs "xyz" → distance 3, maxLen 3 → 1 - 3/3 = 0
    expect(similarity("abc", "xyz")).toBe(0);
    // "ab" vs "cd" → distance 2, maxLen 2 → 1 - 2/2 = 0
    expect(similarity("ab", "cd")).toBe(0);
  });

  it("returns a value between 0 and 1 for partial matches", () => {
    // "kitten" vs "sitting" → distance 3, maxLen 7 → 1 - 3/7 ≈ 0.571
    const score = similarity("kitten", "sitting");
    expect(score).toBeCloseTo(1 - 3 / 7, 5);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe("fuzzyIncludes", () => {
  it("returns 1 for an exact substring", () => {
    expect(fuzzyIncludes("hello world", "world")).toBe(1);
  });

  it("returns 0 when match is below default threshold", () => {
    expect(fuzzyIncludes("abcdef", "zzzzz")).toBe(0);
  });

  it("returns a score > 0 for a fuzzy match above threshold", () => {
    // "wrld" is close to "world" — should produce a decent similarity
    const score = fuzzyIncludes("hello world", "worle");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("handles needle longer than haystack", () => {
    // Falls back to direct similarity comparison
    const score = fuzzyIncludes("hi", "hello world");
    // similarity("hi", "hello world") is very low → 0
    expect(score).toBe(0);
  });

  it("returns 0 for empty needle", () => {
    expect(fuzzyIncludes("hello", "")).toBe(0);
  });

  it("returns 0 for empty haystack", () => {
    expect(fuzzyIncludes("", "hello")).toBe(0);
  });

  it("respects a custom minScore parameter", () => {
    // With a very high threshold, even a close fuzzy match should be rejected
    expect(fuzzyIncludes("hello world", "worle", 0.99)).toBe(0);
    // With a very low threshold, a loose match should pass
    const score = fuzzyIncludes("abcdef", "abxdxf", 0.3);
    expect(score).toBeGreaterThan(0);
  });

  it("caps haystack at 500 chars so near-end matches are not found", () => {
    const padding = "x".repeat(500);
    // Use a fuzzy needle (not exact) so haystack.includes() does not short-circuit
    const haystack = padding + "secrat";
    // "secrat" is a fuzzy match for "secret" — but it sits beyond the 500-char cap
    expect(fuzzyIncludes(haystack, "secret")).toBe(0);
    // Verify the same fuzzy match DOES work when within the first 500 chars
    const shortHaystack = "secrat";
    expect(fuzzyIncludes(shortHaystack, "secret")).toBeGreaterThan(0);
  });
});
