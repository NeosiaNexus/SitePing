/**
 * Lightweight fuzzy text matching for DOM re-anchoring.
 * Zero dependencies — bundled into the widget.
 * Uses Levenshtein distance, optimized for short strings (~50 chars).
 */

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
      curr[i] = a[i - 1] === b[j - 1] ? prev[i - 1] : 1 + Math.min(prev[i - 1], prev[i], curr[i - 1]);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[aLen];
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
 * Fuzzy substring search — checks if `needle` approximately exists in `haystack`.
 * Slides a window of `needle.length` over the haystack and returns the best
 * similarity score found. Returns 0 if below `minScore`.
 */
export function fuzzyIncludes(haystack: string, needle: string, minScore = 0.6): number {
  if (!needle || !haystack) return 0;
  if (haystack.includes(needle)) return 1;

  const nLen = needle.length;

  // If needle is longer than haystack, compare directly
  if (nLen > haystack.length) {
    const score = similarity(haystack, needle);
    return score >= minScore ? score : 0;
  }

  let best = 0;

  // Cap haystack to avoid O(n²) on huge text nodes
  const capped = haystack.length > 500 ? haystack.slice(0, 500) : haystack;
  const limit = capped.length - nLen;

  for (let i = 0; i <= limit; i++) {
    const window = capped.slice(i, i + nLen);
    const score = similarity(window, needle);
    if (score > best) best = score;
    if (best >= 0.95) break;
  }

  return best >= minScore ? best : 0;
}
