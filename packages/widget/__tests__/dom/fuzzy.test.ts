import { describe, expect, it } from "vitest";
import {
  bigramCounts,
  diceAgainst,
  editDistance,
  fuzzyIncludes,
  MIN_FUZZY_NEEDLE_LENGTH,
  normalizeText,
  similarity,
} from "../../src/dom/fuzzy";

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

  it("computes kitten → sitting = 3", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
  });

  it("computes sunday → saturday = 3", () => {
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

  it("handles needle longer than haystack with a high similarity score", () => {
    // Hits the `score >= minScore` true branch when needle.length > haystack.length.
    // similarity("hell", "hello") = 1 - 1/5 = 0.8 ≥ 0.6 default minScore → returns 0.8
    const score = fuzzyIncludes("hell", "hello");
    expect(score).toBeCloseTo(0.8, 5);
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

  it("breaks early when window similarity reaches 0.95+", () => {
    // Construct a haystack with a near-perfect (but not exact) window match.
    // Needle is 20 chars; window with 1 char swap → similarity 19/20 = 0.95 → break.
    // haystack.includes(needle) must be false so we enter the loop.
    const needle = "abcdefghijklmnopqrst";
    const haystack = "zzz" + "abcdefghijklmnopqrsX" + "more text after";
    const score = fuzzyIncludes(haystack, needle);
    // The near-perfect window triggers the early break and returns its score.
    expect(score).toBeGreaterThanOrEqual(0.95);
    expect(score).toBeLessThan(1);
  });

  it("editDistance is symmetric across many string pairs", () => {
    // Hits both branches of the i/j loops over a variety of inputs
    const pairs: Array<[string, string]> = [
      ["a", "b"],
      ["abc", "abd"],
      ["flaw", "lawn"],
      ["intention", "execution"],
      ["aaaa", "aaab"],
    ];
    for (const [x, y] of pairs) {
      expect(editDistance(x, y)).toBe(editDistance(y, x));
    }
  });

  it("similarity returns ratio when only one character differs", () => {
    // Hits the non-zero, non-one path of similarity
    expect(similarity("hello", "hellp")).toBeCloseTo(0.8, 5);
  });
});

// ---------------------------------------------------------------------------
// v2 additions — normalizeText, bigram Dice, Sellers approximate matching
// ---------------------------------------------------------------------------

describe("normalizeText", () => {
  it("collapses whitespace runs to a single space and trims", () => {
    expect(normalizeText("  Hello \n\t  world  ")).toBe("Hello world");
  });

  it("normalizes non-breaking spaces and mixed whitespace", () => {
    expect(normalizeText("Hello  world")).toBe("Hello world");
  });

  it("applies Unicode NFC composition", () => {
    // "é" as e + combining acute accent → single composed codepoint
    expect(normalizeText("café")).toBe("café");
  });

  it("preserves case — case changes are a real signal", () => {
    expect(normalizeText("Hello World")).toBe("Hello World");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(normalizeText(" \n\t ")).toBe("");
  });
});

describe("bigramCounts / diceAgainst", () => {
  it("counts repeated bigrams as a multiset", () => {
    // "aaa" → bigrams ["aa", "aa"] — multiset keeps both occurrences
    const counts = bigramCounts("aaa");
    expect(counts.size).toBe(1);
    expect([...counts.values()]).toEqual([2]);
  });

  it("scores identical strings at 1", () => {
    const s = "hello world";
    expect(diceAgainst(bigramCounts(s), s.length - 1, s)).toBe(1);
  });

  it("scores disjoint strings at 0", () => {
    expect(diceAgainst(bigramCounts("abcd"), 3, "xyzw")).toBe(0);
  });

  it("uses multiset semantics — repeated bigrams cannot be double-counted", () => {
    // needle "aa" has ONE "aa" bigram; text "aaaa" has three. Set semantics
    // would score 2*1/(1+3)=0.5 anyway here, but reversed: needle "aaaa"
    // (three "aa") vs text "aa" (one) must only match once.
    const score = diceAgainst(bigramCounts("aaaa"), 3, "aa");
    expect(score).toBeCloseTo((2 * 1) / (3 + 1), 5);
  });

  it("returns 0 for degenerate lengths (empty or single-char)", () => {
    expect(diceAgainst(bigramCounts(""), 0, "hello")).toBe(0);
    expect(diceAgainst(bigramCounts("hello"), 4, "x")).toBe(0);
  });

  it("correlates with similarity — closer strings score higher", () => {
    const needle = "ajouter au panier";
    const counts = bigramCounts(needle);
    const total = needle.length - 1;
    const close = diceAgainst(counts, total, "ajouter au paniers");
    const far = diceAgainst(counts, total, "supprimer le compte");
    expect(close).toBeGreaterThan(far);
  });
});

describe("fuzzyIncludes v2 — Sellers substring matching", () => {
  /** Reference: naive minimum edit distance over ALL substrings. */
  function bruteMinSubstringDistance(haystack: string, needle: string): number {
    let best = needle.length; // empty substring
    for (let i = 0; i < haystack.length; i++) {
      for (let j = i + 1; j <= haystack.length; j++) {
        const d = editDistance(haystack.slice(i, j), needle);
        if (d < best) best = d;
      }
    }
    return best;
  }

  /** Reference: v1's fixed-length sliding-window best similarity. */
  function slidingWindowScore(haystack: string, needle: string): number {
    if (haystack.includes(needle)) return 1;
    if (needle.length > haystack.length) return similarity(haystack, needle);
    let best = 0;
    for (let i = 0; i <= haystack.length - needle.length; i++) {
      const s = similarity(haystack.slice(i, i + needle.length), needle);
      if (s > best) best = s;
    }
    return best;
  }

  /** Deterministic PRNG so the corpus is reproducible. */
  function mulberry32(seed: number): () => number {
    let s = seed;
    return () => {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomWords(rand: () => number, count: number): string {
    const WORDS = ["valider", "panier", "commande", "livraison", "profil", "submit", "cancel", "delete", "account"];
    const out: string[] = [];
    for (let i = 0; i < count; i++) out.push(WORDS[Math.floor(rand() * WORDS.length)] as string);
    return out.join(" ");
  }

  function mutate(rand: () => number, s: string, rate: number): string {
    let out = "";
    for (const ch of s) {
      if (rand() < rate) {
        const op = rand();
        if (op < 0.34) out += String.fromCharCode(97 + Math.floor(rand() * 26));
        else if (op < 0.67) {
          /* deletion */
        } else out += ch + String.fromCharCode(97 + Math.floor(rand() * 26));
      } else out += ch;
    }
    return out;
  }

  it("equals the brute-force minimum substring distance (exactness, seeded corpus)", () => {
    const rand = mulberry32(0xc0ffee);
    for (let t = 0; t < 60; t++) {
      const haystack = randomWords(rand, 2 + Math.floor(rand() * 3)).slice(0, 40);
      const needle = mutate(rand, randomWords(rand, 2).slice(0, 12), rand() * 0.3);
      if (needle.length < MIN_FUZZY_NEEDLE_LENGTH) continue;
      const expected = 1 - bruteMinSubstringDistance(haystack, needle) / needle.length;
      const actual = fuzzyIncludes(haystack, needle, 0);
      expect(actual, `haystack=${JSON.stringify(haystack)} needle=${JSON.stringify(needle)}`).toBeCloseTo(
        Math.max(expected, 0),
        10,
      );
    }
  });

  it("never scores below the v1 sliding window (no new false negatives, seeded corpus)", () => {
    const rand = mulberry32(0xbadf00d);
    for (let t = 0; t < 120; t++) {
      const haystack = randomWords(rand, 4 + Math.floor(rand() * 8));
      const start = Math.floor(rand() * Math.max(1, haystack.length - 30));
      const needle = mutate(rand, haystack.slice(start, start + 10 + Math.floor(rand() * 20)), rand() * 0.25);
      if (needle.length < MIN_FUZZY_NEEDLE_LENGTH) continue;
      const v1 = slidingWindowScore(haystack, needle);
      const v2 = fuzzyIncludes(haystack, needle, 0);
      expect(v2, `haystack=${JSON.stringify(haystack)} needle=${JSON.stringify(needle)}`).toBeGreaterThanOrEqual(
        v1 - 1e-9,
      );
    }
  });

  it("finds indel-shifted matches the fixed window under-scores", () => {
    // A deletion inside the occurrence shifts every subsequent window; the
    // any-length substring match absorbs it as a single edit.
    const needle = "ajouter au panier maintenant";
    const haystack = "cliquez pour ajoutr au panier maintenant et continuer";
    const v1 = slidingWindowScore(haystack, needle);
    const v2 = fuzzyIncludes(haystack, needle, 0);
    expect(v2).toBeGreaterThanOrEqual(v1);
    expect(v2).toBeCloseTo(1 - 1 / needle.length, 10);
  });

  it("refuses approximate matching for short needles over long haystacks", () => {
    const longHaystack = "lorem ipsum dolor sit amet ".repeat(5);
    expect(fuzzyIncludes(longHaystack, "dolro", 0.1)).toBe(0);
    // …but exact containment still works at any needle length
    expect(fuzzyIncludes(longHaystack, "dolor", 0.1)).toBe(1);
  });

  it("keeps approximate matching for short needles in short haystacks", () => {
    // Near-miss in a short label is meaningful ("panier" vs "paniers")
    const score = fuzzyIncludes("Ajouter au paniers", "panier", 0.5);
    expect(score).toBe(1); // exact containment
    const fuzzy = fuzzyIncludes("Voir le paniet", "panier", 0.5);
    expect(fuzzy).toBeCloseTo(1 - 1 / 6, 10);
  });

  it("score is bounded in [0, 1] even for unrelated strings", () => {
    const score = fuzzyIncludes("zzzzzzzzzzzz", "abcdefghij", 0);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
