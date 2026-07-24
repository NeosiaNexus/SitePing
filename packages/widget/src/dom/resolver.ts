import type { AnchorData, RectData } from "@siteping/core";
import { ANCHOR_KEY_ATTR } from "./anchor.js";
import { attrHash, scoreFingerprint } from "./fingerprint.js";
import {
  bigramCounts,
  diceAgainst,
  fuzzyIncludes,
  normalizeText,
  similarity,
  wordPairCounts,
  wordPairDiceAgainst,
} from "./fuzzy.js";
import { adjacentText, boundedText, neighborText } from "./text-context.js";
import { classifyVisibility, visibilityFactor } from "./visibility.js";

export type ResolutionStrategy = "anchorKey" | "id" | "css" | "xpath" | "scan";

export interface AnchorResolution {
  element: Element;
  confidence: number;
  strategy: ResolutionStrategy;
}

export interface ResolvedAnnotation {
  element: Element;
  rect: DOMRect;
  confidence: number;
  strategy: ResolutionStrategy;
}

/**
 * Confidence ceiling per strategy — same ladder as v1's cascade, now used as
 * a multiplicative prior in cross-strategy ranking. Multiplicative, not
 * additive: a prior can only amplify verification evidence, never substitute
 * for it, so a stale selector with poor verification cannot outrank a
 * well-verified scan hit.
 */
const STRATEGY_PRIORS: Record<ResolutionStrategy, number> = {
  anchorKey: 1.0,
  id: 1.0,
  css: 0.95,
  xpath: 0.9,
  scan: 0.85,
};

/** Max matches gathered per selector strategy (guards degenerate selectors). */
const MAX_PER_STRATEGY = 16;

/** Scan candidates that survive prefiltering and get full multi-signal scoring. */
const SCAN_TOP_K = 24;

/** Pathological-DOM guard for the prefilter sweep itself. */
const SCAN_HARD_CAP = 10_000;

/** Max candidate text considered for scoring (bounds fuzzy-match cost). */
const CANDIDATE_TEXT_CAP = 500;

/**
 * Acceptance floors on the verification score, carried over from v1:
 * selector strategies were gated by the lenient text check (0.3) — the
 * selector itself is corroborating evidence; scan has no selector evidence,
 * so it keeps its stricter 0.4.
 */
const ACCEPT_SELECTOR = 0.3;
const ACCEPT_SCAN = 0.4;

/**
 * Verification at or above this level earns the full strategy prior as
 * confidence; below it, confidence degrades proportionally (and crosses the
 * marker UI's 0.7 "approximate" threshold naturally).
 */
const STRONG_VERIFY = 0.8;

/**
 * Verification assigned to selector-strategy candidates when the stored
 * anchor carries no verifiable signal at all (no text, no fingerprint, no
 * context — only possible for hand-built or pre-fingerprint data; capture
 * always stores a fingerprint). The selector match is then the only
 * evidence: accept, but rank it below verified alternatives.
 */
const NEUTRAL_VERIFICATION = 0.6;

/** Score gap under which two candidates are considered equally plausible. */
const AMBIGUITY_EPSILON = 0.05;

/** Stored-anchor signals, normalized once per resolution. */
interface AnchorSignals {
  snippet: string;
  snippetBigrams: Map<number, number>;
  snippetBigramTotal: number;
  snippetWordPairs: Map<string, number>;
  snippetWordPairTotal: number;
  prefix: string;
  suffix: string;
  neighbor: string;
  fingerprint: string;
  tag: string;
}

interface ScoredCandidate {
  element: Element;
  strategy: ResolutionStrategy;
  verification: number;
  final: number;
  /** No verifiable signal was stored — verification is a neutral stand-in. */
  unverified?: boolean;
}

function buildSignals(anchor: AnchorData): AnchorSignals {
  const snippet = normalizeText(anchor.textSnippet ?? "");
  const snippetWordPairs = wordPairCounts(snippet);
  let snippetWordPairTotal = 0;
  for (const count of snippetWordPairs.values()) snippetWordPairTotal += count;
  return {
    snippet,
    snippetBigrams: bigramCounts(snippet),
    snippetBigramTotal: Math.max(0, snippet.length - 1),
    snippetWordPairs,
    snippetWordPairTotal,
    prefix: normalizeText(anchor.textPrefix ?? ""),
    suffix: normalizeText(anchor.textSuffix ?? ""),
    neighbor: normalizeText(anchor.neighborText ?? ""),
    fingerprint: anchor.fingerprint ?? "",
    tag: anchor.elementTag,
  };
}

/**
 * Re-anchor an annotation: gather candidates from EVERY strategy, verify each
 * against all stored signals, rank across strategies, return the best.
 *
 * v1 was a first-match-wins cascade (anchorKey → id → css → xpath → scan)
 * where a wrong-but-text-passing selector hit won outright over a correct
 * element the scan would have found (#175), the first DOM match won even when
 * it was an invisible responsive twin (#171), and elements without text got
 * no verification at all (#172).
 *
 * v2 ranking: final = strategyPrior × verification × visibilityFactor
 * - verification: dynamic-weight blend of text / fingerprint / prefix-suffix /
 *   neighbor signals (only signals the stored anchor has contribute).
 * - visibility: tiering, never filtering — hidden duplicates are heavily
 *   penalized, but when ONLY hidden candidates exist the best one still
 *   resolves (an annotation on a currently-collapsed section survives the
 *   breakpoint flipping back).
 * - Confidence keeps the v1 scale: a perfectly verified anchorKey/id/css/
 *   xpath match yields exactly 1.0/1.0/0.95/0.9, scan stays capped at 0.85,
 *   and weak verification degrades confidence proportionally.
 *
 * The scan sweep is skipped when a selector candidate already scores above
 * anything the scan could produce (its prior caps its final at 0.85) — the
 * happy path costs a handful of querySelector calls, like v1.
 *
 * Returns null if no candidate verifies (annotation is orphaned).
 */
export function resolveAnchor(anchor: AnchorData): AnchorResolution | null {
  const signals = buildSignals(anchor);
  const pool = gatherSelectorCandidates(anchor);

  const scored: ScoredCandidate[] = [];
  for (const [element, strategy] of pool) {
    const candidate = scoreOne(element, strategy, signals);
    if (candidate) scored.push(candidate);
  }

  let bestFinal = 0;
  for (const c of scored) {
    if (c.final > bestFinal) bestFinal = c.final;
  }

  // Scan can never produce final > SCAN prior — skip the sweep entirely when
  // a selector candidate is already unbeatable (exact-first, fuzzy-fallback).
  if (bestFinal < STRATEGY_PRIORS.scan) {
    for (const element of sweepScanCandidates(signals, pool)) {
      const candidate = scoreOne(element, "scan", signals);
      if (candidate) scored.push(candidate);
    }
  }

  const accepted = scored.filter((c) =>
    c.strategy === "scan" ? c.verification >= ACCEPT_SCAN : c.verification >= ACCEPT_SELECTOR,
  );
  if (accepted.length === 0) return null;

  accepted.sort((a, b) => b.final - a.final);
  const winner = disambiguate(accepted);

  return {
    element: winner.element,
    confidence: confidenceOf(winner),
    strategy: winner.strategy,
  };
}

/**
 * Collect candidates from all selector strategies, ALL matches per strategy
 * (bounded), in priority order. An element found by several strategies keeps
 * the highest-priority one (first insertion wins).
 */
function gatherSelectorCandidates(anchor: AnchorData): Map<Element, ResolutionStrategy> {
  const pool = new Map<Element, ResolutionStrategy>();

  const add = (el: Element | null, strategy: ResolutionStrategy, enforceTag: boolean) => {
    if (!el || pool.has(el)) return;
    if (enforceTag && el.tagName !== anchor.elementTag) return;
    pool.set(el, strategy);
  };

  // anchorKey — host-controlled semantic key. Tag NOT enforced: hosts may
  // legitimately refactor the wrapper element while keeping the key stable.
  if (anchor.anchorKey) {
    const escaped = anchor.anchorKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    try {
      const matches = document.querySelectorAll(`[${ANCHOR_KEY_ATTR}="${escaped}"]`);
      for (let i = 0; i < Math.min(matches.length, MAX_PER_STRATEGY); i++) {
        add(matches[i] ?? null, "anchorKey", false);
      }
    } catch {
      // Invalid attribute value — skip strategy
    }
  }

  // id — duplicate ids are invalid HTML but common in the wild; gather all so
  // a hidden duplicate can lose to the visible one instead of shadowing it.
  // Attribute selector instead of `#…` to avoid needing CSS.escape (absent in
  // some embedders and in jsdom) — matching semantics are identical.
  if (anchor.elementId) {
    const escaped = anchor.elementId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    try {
      const matches = document.querySelectorAll(`[id="${escaped}"]`);
      for (let i = 0; i < Math.min(matches.length, MAX_PER_STRATEGY); i++) {
        add(matches[i] ?? null, "id", true);
      }
    } catch {
      add(document.getElementById(anchor.elementId), "id", true);
    }
  }

  // CSS selector
  try {
    const matches = document.querySelectorAll(anchor.cssSelector);
    for (let i = 0; i < Math.min(matches.length, MAX_PER_STRATEGY); i++) {
      add(matches[i] ?? null, "css", true);
    }
  } catch {
    // Invalid selector — skip strategy
  }

  // XPath — snapshot (not FIRST_ORDERED_NODE) so later duplicates compete too
  try {
    const result = document.evaluate(anchor.xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const count = Math.min(result.snapshotLength, MAX_PER_STRATEGY);
    for (let i = 0; i < count; i++) {
      const node = result.snapshotItem(i);
      if (node instanceof Element) add(node, "xpath", true);
    }
  } catch {
    // Invalid XPath — skip strategy
  }

  return pool;
}

/**
 * Same-tag sweep, prefiltered. Every same-tag element is considered (v1
 * stopped dead at the 300th in document order — a correct element past the
 * cap was unreachable), but full scoring only runs on the TOP_K best by a
 * cheap O(text-budget) prefilter: bigram-Dice text overlap plus O(1)
 * structural hints (stable-attribute hash, child count). The prefilter only
 * RANKS — it never eliminates on a threshold, so an imperfect cheap score
 * demotes a candidate but cannot drop the true match on its own.
 */
function sweepScanCandidates(signals: AnchorSignals, pool: Map<Element, ResolutionStrategy>): Element[] {
  const tag = signals.tag.toLowerCase();
  let candidates: NodeListOf<Element>;
  try {
    candidates = document.querySelectorAll(tag);
  } catch {
    return [];
  }

  const storedFp = signals.fingerprint.split(":");
  const storedChildCount = Number(storedFp[0]);
  const storedAttrHash = storedFp[2] ?? "";

  const limit = Math.min(candidates.length, SCAN_HARD_CAP);
  const ranked: { element: Element; cheap: number }[] = [];

  for (let i = 0; i < limit; i++) {
    const el = candidates[i];
    if (!el || pool.has(el)) continue; // already scored under a selector strategy

    let cheap = 0;
    if (signals.snippetBigramTotal > 0) {
      const text = normalizeText(boundedText(el, CANDIDATE_TEXT_CAP));
      const charDice = diceAgainst(signals.snippetBigrams, signals.snippetBigramTotal, text);
      // Character bigrams are order-blind: on shared-vocabulary pages (card
      // grids) every candidate scores alike. Word-pair shingles restore order
      // sensitivity; when the snippet has no pairs (single word, no-space
      // scripts) the whole weight stays on character bigrams.
      if (signals.snippetWordPairTotal > 0) {
        const wordDice = wordPairDiceAgainst(signals.snippetWordPairs, signals.snippetWordPairTotal, text);
        cheap += 0.6 * (0.5 * charDice + 0.5 * wordDice);
      } else {
        cheap += 0.6 * charDice;
      }
    }
    if (storedAttrHash && attrHash(el) === storedAttrHash) cheap += 0.25;
    if (!Number.isNaN(storedChildCount)) {
      const diff = Math.abs(el.children.length - storedChildCount);
      if (diff === 0) cheap += 0.15;
      else if (diff <= 2) cheap += 0.07;
    }

    ranked.push({ element: el, cheap });
  }

  // Stable sort: ties keep document order, mirroring v1's document-order bias.
  ranked.sort((a, b) => b.cheap - a.cheap);
  return ranked.slice(0, SCAN_TOP_K).map((r) => r.element);
}

function scoreOne(element: Element, strategy: ResolutionStrategy, signals: AnchorSignals): ScoredCandidate | null {
  const verification = verificationScore(element, signals);
  if (verification === null) {
    // No verifiable signal stored: the selector match is the only evidence.
    // A scan candidate with nothing to verify against is meaningless, though.
    if (strategy === "scan") return null;
    const final = STRATEGY_PRIORS[strategy] * NEUTRAL_VERIFICATION * visibilityFactor(classifyVisibility(element));
    return { element, strategy, verification: NEUTRAL_VERIFICATION, final, unverified: true };
  }

  const final = STRATEGY_PRIORS[strategy] * verification * visibilityFactor(classifyVisibility(element));
  return { element, strategy, verification, final };
}

/**
 * Multi-signal verification, 0–1. Dynamic weighting: only signals the stored
 * anchor actually has contribute, then the sum is normalized — anchors
 * captured with fewer signals compete on the signals they do have.
 * Returns null when the anchor stores no verifiable signal at all.
 *
 * All text comparisons run on `normalizeText`-processed strings on BOTH
 * sides, so SSR/CSR whitespace drift and re-indented markup no longer
 * penalize otherwise-identical text (#173) — stored snippets are untouched
 * and stay backward compatible.
 */
function verificationScore(candidate: Element, s: AnchorSignals): number | null {
  let score = 0;
  let totalWeight = 0;

  // --- Text snippet (weight 40 — most reliable under reordering) ---
  if (s.snippet) {
    totalWeight += 40;
    const candidateText = normalizeText(boundedText(candidate, CANDIDATE_TEXT_CAP));
    score += fuzzyIncludes(candidateText, s.snippet, 0.5) * 40;
  }

  // --- Fingerprint (weight 20) ---
  if (s.fingerprint) {
    totalWeight += 20;
    score += scoreFingerprint(candidate, s.fingerprint) * 20;
  }

  // --- Prefix/suffix context (weight 20) ---
  if (s.prefix || s.suffix) {
    totalWeight += 20;
    let contextScore = 0;
    let contextParts = 0;

    if (s.prefix) {
      const prevText = normalizeText(adjacentText(candidate, "before"));
      contextScore += prevText ? similarity(prevText, s.prefix) : 0;
      contextParts++;
    }

    if (s.suffix) {
      const nextText = normalizeText(adjacentText(candidate, "after"));
      contextScore += nextText ? similarity(nextText, s.suffix) : 0;
      contextParts++;
    }

    if (contextParts > 0) {
      score += (contextScore / contextParts) * 20;
    }
  }

  // --- Neighbor text (weight 20) ---
  if (s.neighbor) {
    totalWeight += 20;
    const candidateNeighbor = normalizeText(neighborText(candidate));
    score += candidateNeighbor ? similarity(candidateNeighbor, s.neighbor) * 20 : 0;
  }

  return totalWeight > 0 ? score / totalWeight : null;
}

/**
 * Ancestor-decoy tie-break: a wrapper's text contains its child's text, so it
 * scores nearly as well — but anchoring to the wrapper corrupts the
 * percentage-based rect. Among candidates within AMBIGUITY_EPSILON of the
 * best that sit on the best's own descendant chain, prefer the innermost.
 * Unrelated near-ties keep the plain argmax (strategy priors already encode
 * the preference order there).
 */
function disambiguate(sortedAccepted: ScoredCandidate[]): ScoredCandidate {
  const best = sortedAccepted[0] as ScoredCandidate; // non-empty by caller contract
  const contenders = sortedAccepted.filter(
    (c) => best.final - c.final <= AMBIGUITY_EPSILON && (c === best || best.element.contains(c.element)),
  );
  // Innermost = contained by every other contender that contains anything
  let winner = best;
  for (const c of contenders) {
    if (c !== winner && winner.element.contains(c.element)) winner = c;
  }
  return winner;
}

function confidenceOf(c: ScoredCandidate): number {
  if (c.strategy === "scan") {
    // v1 semantics: the scan's confidence IS its verification, hard-capped —
    // a scan is never fully certain.
    return Math.min(c.verification, STRATEGY_PRIORS.scan);
  }
  // Nothing was verifiable → the selector is all the evidence there is;
  // v1 semantics: trust it at full prior rather than inventing doubt.
  if (c.unverified) return STRATEGY_PRIORS[c.strategy];
  // Full prior for strongly verified matches (v1-exact values), proportional
  // degradation below that.
  return STRATEGY_PRIORS[c.strategy] * Math.min(1, c.verification / STRONG_VERIFY);
}

/**
 * Resolve an annotation's position on the page.
 * Converts stored percentage-based rect back to absolute coordinates
 * using the current bounding box of the resolved anchor element.
 */
export function resolveAnnotation(anchor: AnchorData, rect: RectData): ResolvedAnnotation | null {
  const resolution = resolveAnchor(anchor);

  if (!resolution) return null;

  const bounds = resolution.element.getBoundingClientRect();
  const absoluteRect = new DOMRect(
    bounds.x + rect.xPct * bounds.width,
    bounds.y + rect.yPct * bounds.height,
    rect.wPct * bounds.width,
    rect.hPct * bounds.height,
  );

  return {
    element: resolution.element,
    rect: absoluteRect,
    confidence: resolution.confidence,
    strategy: resolution.strategy,
  };
}
