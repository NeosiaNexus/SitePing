/**
 * Element fingerprinting for robust DOM re-anchoring.
 *
 * Captures structural properties (child count, sibling index, stable attributes)
 * that survive CSS class changes and minor DOM reshuffling.
 * Inspired by Similo (academic state-of-the-art, 98.8% accuracy).
 */

const STABLE_ATTRS = ["role", "aria-label", "type", "name", "href", "src", "data-testid", "data-id"] as const;

/** Simple 32-bit hash (djb2). */
function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/**
 * Generate a compact structural fingerprint for a DOM element.
 *
 * Format: `"childCount:siblingIdx:attrHash"`
 * - `childCount` — number of direct child elements
 * - `siblingIdx` — position among same-tag siblings (0-based)
 * - `attrHash` — djb2 hash of stable attributes (role, aria-label, type, etc.)
 *
 * Tag name is NOT included — it's stored separately in `AnchorData.elementTag`.
 */
export function generateFingerprint(element: Element): string {
  const childCount = element.children.length;

  // Position among same-tag siblings
  let siblingIdx = 0;
  const parent = element.parentElement;
  if (parent) {
    for (const child of parent.children) {
      if (child === element) break;
      if (child.tagName === element.tagName) siblingIdx++;
    }
  }

  // Hash stable attributes
  const attrs: string[] = [];
  for (const attr of STABLE_ATTRS) {
    const val = element.getAttribute(attr);
    if (val) attrs.push(`${attr}=${val}`);
  }
  const attrHash = attrs.length > 0 ? djb2(attrs.join(",")) : "0";

  return `${childCount}:${siblingIdx}:${attrHash}`;
}

/**
 * Score how well a candidate element matches a stored fingerprint.
 * Returns 0–1.
 *
 * Weights:
 * - Child count match: 0.2  (tolerant — ±2 gets partial credit)
 * - Sibling index match: 0.4 (positional — most discriminating)
 * - Attribute hash match: 0.4 (identity — exact or nothing)
 */
export function scoreFingerprint(candidate: Element, storedFingerprint: string): number {
  const parts = storedFingerprint.split(":");
  if (parts.length !== 3) return 0;

  const [storedChildren, storedSibIdx, storedAttrHash] = parts;
  const storedChildCount = Number(storedChildren);
  const storedSibIndex = Number(storedSibIdx);
  if (Number.isNaN(storedChildCount) || Number.isNaN(storedSibIndex)) return 0;

  const candidateFp = generateFingerprint(candidate);
  const [candChildren, candSibIdx, candAttrHash] = candidateFp.split(":");

  let score = 0;

  // Child count (0.2)
  const childDiff = Math.abs(Number(candChildren) - storedChildCount);
  if (childDiff === 0) score += 0.2;
  else if (childDiff <= 2) score += 0.1;
  else if (childDiff <= 5) score += 0.03;

  // Sibling index (0.4)
  const sibDiff = Math.abs(Number(candSibIdx) - storedSibIndex);
  if (sibDiff === 0) score += 0.4;
  else if (sibDiff === 1) score += 0.2;
  else if (sibDiff <= 3) score += 0.08;

  // Attribute hash (0.4)
  if (candAttrHash === storedAttrHash) score += 0.4;

  return score;
}
