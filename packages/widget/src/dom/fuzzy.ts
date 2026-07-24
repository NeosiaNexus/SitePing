/**
 * Lightweight fuzzy text matching for DOM re-anchoring.
 * Zero dependencies — bundled into the widget.
 *
 * Approximate containment uses Sellers' algorithm (1980): a single O(n·m)
 * DP pass over the haystack whose first row is initialized to 0, yielding
 * the minimum edit distance between the needle and ANY substring. This
 * replaces a sliding fixed-length window (O(n·m²)) with identical-or-better
 * scores — a window match is one of the substrings Sellers considers.
 */

/** Below this needle length, approximate substring search over a LONG
 * haystack is statistically meaningless (a 4-char needle "matches" almost
 * anything within 1–2 edits somewhere in 500 chars) and was the worst-case
 * cost driver. Exact containment still applies at any length, and short
 * haystacks (≤ SHORT_NEEDLE_HAYSTACK_CAP) keep approximate matching — a
 * near-miss in a short label ("panier" vs "paniers") is meaningful. */
export const MIN_FUZZY_NEEDLE_LENGTH = 8;

/** See MIN_FUZZY_NEEDLE_LENGTH. */
const SHORT_NEEDLE_HAYSTACK_CAP = 64;

/** Max haystack length considered for approximate matching. */
const HAYSTACK_CAP = 500;

/**
 * Normalize text for comparison: Unicode NFC + collapse whitespace runs to a
 * single space + trim. Absorbs SSR/CSR hydration drift, prettified vs
 * minified markup, and re-indentation (formatting whitespace lives inside
 * `textContent` of nested elements). Applied at comparison time on both
 * sides — already-stored snippets stay valid. Deliberately NOT case-folding:
 * a case change is a real signal (CSS text-transform never affects
 * textContent, so case differences come from actual content edits).
 */
export function normalizeText(s: string): string {
  return s.normalize("NFC").replace(/\s+/g, " ").trim();
}

/**
 * Whitespace-only collapse — the cheap subset of `normalizeText` for the scan
 * prefilter, which runs on every same-tag candidate. NFC is a table-driven
 * full-Unicode pass and is deliberately skipped there: the prefilter only
 * RANKS, and mixed composition forms cost at worst a slight rank penalty on
 * accented text (full scoring of survivors re-normalizes both sides).
 */
export function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Levenshtein edit distance.
 * O(n*m) time, O(min(n,m)) space.
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure `a` is the shorter string for space optimization
  if (a.length > b.length) {
    const t = a;
    a = b;
    b = t;
  }

  const aLen = a.length;
  const bLen = b.length;
  let prev = new Array<number>(aLen + 1);
  for (let k = 0; k <= aLen; k++) prev[k] = k;
  let curr = new Array<number>(aLen + 1);

  for (let j = 1; j <= bLen; j++) {
    curr[0] = j;
    for (let i = 1; i <= aLen; i++) {
      // Indices are valid: i-1 in [0, aLen-1], j-1 in [0, bLen-1], loop bounds guarantee access
      const prevDiag = prev[i - 1] ?? 0;
      curr[i] = a[i - 1] === b[j - 1] ? prevDiag : 1 + Math.min(prevDiag, prev[i] ?? 0, curr[i - 1] ?? 0);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[aLen] ?? 0; // aLen is within bounds — prev has aLen+1 entries
}

/**
 * Normalized similarity score (0–1, where 1 = identical).
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - editDistance(a, b) / maxLen;
}

/**
 * Sellers 1980 — minimum edit distance between `needle` and any substring of
 * `haystack`. Row 0 of the DP is zero for every haystack position (a match
 * may start anywhere); the answer is the running minimum of the last row.
 * Distance is bounded by needle.length (deleting the whole needle), so the
 * needle-normalized score 1 - dist/needle.length always lands in [0, 1].
 */
function sellersDistance(haystack: string, needle: string): number {
  const n = needle.length;
  let prev = new Int32Array(n + 1);
  let curr = new Int32Array(n + 1);
  for (let i = 0; i <= n; i++) prev[i] = i;
  let best = n;

  for (let j = 1; j <= haystack.length; j++) {
    curr[0] = 0;
    const hc = haystack.charCodeAt(j - 1);
    for (let i = 1; i <= n; i++) {
      const sub = (prev[i - 1] ?? 0) + (needle.charCodeAt(i - 1) === hc ? 0 : 1);
      const del = (prev[i] ?? 0) + 1;
      const ins = (curr[i - 1] ?? 0) + 1;
      curr[i] = Math.min(sub, del, ins);
    }
    const last = curr[n] ?? n;
    if (last < best) best = last;
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return best;
}

/**
 * Fuzzy substring search — checks if `needle` approximately exists in `haystack`.
 * Returns the best needle-normalized similarity found, or 0 if below `minScore`.
 *
 * Pipeline (cheapest first): exact containment → direct comparison when the
 * needle is longer than the haystack → Sellers approximate substring search.
 * Short needles never enter approximate search over long haystacks (see
 * MIN_FUZZY_NEEDLE_LENGTH).
 *
 * Callers are expected to pass `normalizeText`-processed strings; this
 * function compares verbatim.
 */
export function fuzzyIncludes(haystack: string, needle: string, minScore = 0.6): number {
  if (!needle || !haystack) return 0;
  if (haystack.includes(needle)) return 1;

  const capped = haystack.length > HAYSTACK_CAP ? haystack.slice(0, HAYSTACK_CAP) : haystack;

  // Needle longer than haystack — direct comparison (no substring to find)
  if (needle.length > capped.length) {
    const score = similarity(capped, needle);
    return score >= minScore ? score : 0;
  }

  if (needle.length < MIN_FUZZY_NEEDLE_LENGTH && capped.length > SHORT_NEEDLE_HAYSTACK_CAP) {
    return 0;
  }

  const score = 1 - sellersDistance(capped, needle) / needle.length;
  return score >= minScore ? score : 0;
}

/**
 * Character-bigram multiset of a string, keyed by packed char-code pairs.
 * Built once per resolution for the stored snippet, then streamed against
 * every scan candidate via `diceAgainst` — no per-candidate copy.
 */
export function bigramCounts(s: string): Map<number, number> {
  const counts = new Map<number, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const key = (s.charCodeAt(i) << 16) | s.charCodeAt(i + 1);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Sørensen–Dice coefficient between a precomputed bigram multiset and a raw
 * string, in O(|text|). Multiset semantics (bigram occurrences are consumed,
 * not just membership-tested) — repeated-bigram strings like "aaaa" would
 * otherwise score against sets they barely overlap.
 *
 * Used exclusively as a RANKING signal for scan prefiltering (top-K keep),
 * never as an eliminating threshold — so an imperfect correlation with edit
 * distance can demote a candidate but never drop a true match outright.
 */
export function diceAgainst(needleCounts: Map<number, number>, needleBigramTotal: number, text: string): number {
  const textBigramTotal = text.length - 1;
  if (needleBigramTotal <= 0 || textBigramTotal <= 0) return 0;

  let matches = 0;
  const consumed = new Map<number, number>();
  for (let i = 0; i < text.length - 1; i++) {
    const key = (text.charCodeAt(i) << 16) | text.charCodeAt(i + 1);
    const available = needleCounts.get(key);
    if (available === undefined) continue;
    const used = consumed.get(key) ?? 0;
    if (used < available) {
      consumed.set(key, used + 1);
      matches++;
    }
  }

  return (2 * matches) / (needleBigramTotal + textBigramTotal);
}

/**
 * Word-pair shingle multiset ("quick brown", "brown fox", …) of a
 * whitespace-normalized string. Character bigrams are order-blind: on pages
 * where many elements share a vocabulary (card grids, list views), every
 * candidate looks alike to them, while word ORDER still discriminates —
 * a true match preserves most word pairs, shared vocabulary in a different
 * order preserves almost none. Scripts without spaces produce no pairs and
 * callers fall back to character bigrams alone.
 */
export function wordPairCounts(s: string): Map<string, number> {
  const counts = new Map<string, number>();
  const words = s.split(" ");
  for (let i = 0; i < words.length - 1; i++) {
    const key = `${words[i]} ${words[i + 1]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Sørensen–Dice over word-pair shingles, multiset semantics, O(|text|).
 * Same ranking-only contract as `diceAgainst`.
 */
export function wordPairDiceAgainst(needlePairs: Map<string, number>, needlePairTotal: number, text: string): number {
  if (needlePairTotal <= 0) return 0;
  const words = text.split(" ");
  const textPairTotal = words.length - 1;
  if (textPairTotal <= 0) return 0;

  let matches = 0;
  const consumed = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const key = `${words[i]} ${words[i + 1]}`;
    const available = needlePairs.get(key);
    if (available === undefined) continue;
    const used = consumed.get(key) ?? 0;
    if (used < available) {
      consumed.set(key, used + 1);
      matches++;
    }
  }

  return (2 * matches) / (needlePairTotal + textPairTotal);
}
