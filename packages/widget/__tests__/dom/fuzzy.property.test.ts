import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  bigramCounts,
  collapseWhitespace,
  diceAgainst,
  editDistance,
  fuzzyIncludes,
  normalizeText,
  similarity,
  wordPairCounts,
  wordPairDiceAgainst,
} from "../../src/dom/fuzzy";

/**
 * Property-based companion to `fuzzy.test.ts`.
 *
 * The example-based suite pins down behaviour on hand-picked strings. These
 * check the *algebra* the rest of the resolver relies on across generated
 * input — the invariants that are easy to state, easy to break with a
 * plausible optimization, and impossible to cover by enumeration:
 *
 *   - `editDistance` swaps its arguments internally to keep the DP row
 *     short, so symmetry is a live regression risk, not a triviality.
 *   - `sellersDistance` is documented as bounded by the needle length; if
 *     that ever stops holding, `fuzzyIncludes` silently returns a negative
 *     score and the caller ranks a non-match above a real one.
 *   - The Dice helpers are declared to use multiset semantics precisely so a
 *     string scores 1.0 against itself even when bigrams repeat ("aaaa").
 *
 * Text arbitraries stay short: these are O(n·m) DP passes and the point is
 * breadth of shapes, not length.
 */

/** Printable ASCII, short — the bulk of the shape exploration. */
const text = fc.string({ maxLength: 24 });

/** Non-empty variant for the properties that are only defined on real input. */
const nonEmptyText = fc.string({ minLength: 1, maxLength: 24 });

/**
 * Whitespace-dense text. `fc.string()` yields printable ASCII, which contains
 * spaces but never tabs, newlines or NBSP — the characters the normalizers
 * actually exist to fold.
 */
const whitespaceyText = fc
  .array(fc.constantFrom("a", "b", "é", " ", "  ", "\t", "\n", "\r\n", " ", "é"), { maxLength: 16 })
  .map((parts) => parts.join(""));

describe("editDistance — metric axioms", () => {
  it("is zero exactly on identical strings", () => {
    fc.assert(
      fc.property(text, (a) => {
        expect(editDistance(a, a)).toBe(0);
      }),
    );
  });

  it("is symmetric despite the internal shorter/longer swap", () => {
    fc.assert(
      fc.property(text, text, (a, b) => {
        expect(editDistance(a, b)).toBe(editDistance(b, a));
      }),
    );
  });

  it("is bounded below by the length difference and above by the longer length", () => {
    fc.assert(
      fc.property(text, text, (a, b) => {
        const d = editDistance(a, b);
        expect(d).toBeGreaterThanOrEqual(Math.abs(a.length - b.length));
        expect(d).toBeLessThanOrEqual(Math.max(a.length, b.length));
      }),
    );
  });

  it("satisfies the triangle inequality", () => {
    fc.assert(
      fc.property(text, text, text, (a, b, c) => {
        expect(editDistance(a, c)).toBeLessThanOrEqual(editDistance(a, b) + editDistance(b, c));
      }),
    );
  });

  it("charges exactly one edit for a single inserted character", () => {
    fc.assert(
      fc.property(text, fc.nat(), fc.string({ minLength: 1, maxLength: 1 }), (s, rawIndex, ch) => {
        const at = s.length === 0 ? 0 : rawIndex % (s.length + 1);
        expect(editDistance(s, s.slice(0, at) + ch + s.slice(at))).toBe(1);
      }),
    );
  });
});

describe("similarity — normalized score", () => {
  it("always lands in [0, 1]", () => {
    fc.assert(
      fc.property(text, text, (a, b) => {
        const s = similarity(a, b);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(1);
      }),
    );
  });

  it("scores 1 on identity and is symmetric", () => {
    fc.assert(
      fc.property(text, text, (a, b) => {
        expect(similarity(a, a)).toBe(1);
        expect(similarity(a, b)).toBe(similarity(b, a));
      }),
    );
  });
});

describe("fuzzyIncludes — approximate containment", () => {
  it("never returns a score outside {0} ∪ [minScore, 1]", () => {
    fc.assert(
      fc.property(text, text, fc.double({ min: 0, max: 1, noNaN: true }), (haystack, needle, minScore) => {
        const score = fuzzyIncludes(haystack, needle, minScore);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
        if (score > 0) expect(score).toBeGreaterThanOrEqual(minScore);
      }),
    );
  });

  it("scores exactly 1 whenever the needle is literally present", () => {
    fc.assert(
      fc.property(text, nonEmptyText, text, (prefix, needle, suffix) => {
        expect(fuzzyIncludes(prefix + needle + suffix, needle)).toBe(1);
      }),
    );
  });

  it("uses minScore only as a gate, never as an input to the score", () => {
    fc.assert(
      fc.property(text, text, fc.double({ min: 0, max: 1, noNaN: true }), (haystack, needle, minScore) => {
        const strict = fuzzyIncludes(haystack, needle, minScore);
        // Anything that clears the stricter gate must survive the loosest one
        // with an identical value — the threshold filters, it does not scale.
        if (strict > 0) expect(fuzzyIncludes(haystack, needle, 0)).toBe(strict);
      }),
    );
  });

  it("returns 0 when either side is empty", () => {
    fc.assert(
      fc.property(text, (s) => {
        expect(fuzzyIncludes(s, "")).toBe(0);
        expect(fuzzyIncludes("", s)).toBe(0);
      }),
    );
  });
});

describe("Dice coefficients — multiset semantics", () => {
  it("scores a string against itself as 1, repeated bigrams included", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 2, maxLength: 24 }), (s) => {
        expect(diceAgainst(bigramCounts(s), s.length - 1, s)).toBeCloseTo(1, 10);
      }),
    );
  });

  it("stays within [0, 1] for unrelated strings", () => {
    fc.assert(
      fc.property(text, text, (needle, candidate) => {
        const score = diceAgainst(bigramCounts(needle), needle.length - 1, candidate);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }),
    );
  });

  it("scores word-pair shingles of a string against itself as 1", () => {
    fc.assert(
      fc.property(fc.array(fc.stringMatching(/^[a-z]{1,6}$/), { minLength: 2, maxLength: 8 }), (words) => {
        const s = words.join(" ");
        const pairs = wordPairCounts(s);
        expect(wordPairDiceAgainst(pairs, words.length - 1, s)).toBeCloseTo(1, 10);
      }),
    );
  });

  it("keeps word-pair scores within [0, 1] across unrelated text", () => {
    fc.assert(
      fc.property(whitespaceyText, whitespaceyText, (a, b) => {
        const na = collapseWhitespace(a);
        const pairs = wordPairCounts(na);
        const total = na.split(" ").length - 1;
        const score = wordPairDiceAgainst(pairs, total, collapseWhitespace(b));
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }),
    );
  });
});

describe("normalizers — idempotence", () => {
  it("normalizeText is idempotent and leaves no collapsible whitespace", () => {
    fc.assert(
      fc.property(whitespaceyText, (s) => {
        const once = normalizeText(s);
        expect(normalizeText(once)).toBe(once);
        expect(once).toBe(once.trim());
        expect(once).not.toMatch(/\s\s/);
      }),
    );
  });

  it("collapseWhitespace is idempotent", () => {
    fc.assert(
      fc.property(whitespaceyText, (s) => {
        const once = collapseWhitespace(s);
        expect(collapseWhitespace(once)).toBe(once);
      }),
    );
  });

  it("normalizeText folds composed and decomposed accents together", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom("é", "é", " ", "a"), { maxLength: 12 }), (parts) => {
        const decomposed = parts.join("");
        const composed = decomposed.normalize("NFC");
        expect(normalizeText(decomposed)).toBe(normalizeText(composed));
      }),
    );
  });
});
