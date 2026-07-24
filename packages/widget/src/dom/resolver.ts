import type { AnchorData, RectData } from "@siteping/core";
import { ANCHOR_KEY_ATTR } from "./anchor.js";
import { attrHash, scoreFingerprint } from "./fingerprint.js";
import {
  bigramCounts,
  collapseWhitespace,
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
 * Caller-provided allowance for full tag sweeps across a BATCH of
 * resolutions (marker init, reposition passes). A sweep is the one
 * unbounded-ish cost left in resolution; several drifted or hidden anchors
 * resolved back-to-back must not each pay one synchronously (the Hypothesis
 * issue-#3919 lesson: budget per pass, not per resolution). When the budget
 * is exhausted, resolution proceeds selector-only — the next pass gets a
 * fresh budget and heals the remainder.
 */
export interface ScanBudget {
  /** Remaining sweep allowance; decremented each time a sweep actually runs. */
  remaining: number;
  /** Set by the resolver when a sweep was wanted but the budget was empty —
   * callers must NOT cache such degraded results (a selector-only answer may
   * be worse than what the sweep would have found, and a cached wrong
   * element is never re-examined). */
  starved?: boolean;
}

export interface ResolveOptions {
  scanBudget?: ScanBudget;
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
 * Acceptance for selector strategies gates on the STRONGEST single signal,
 * never on the diluted blend — the blend is a RANKING device. A volatile
 * signal (fingerprints churn with every redesign) must not veto a stable
 * one: v1 resolved `#promo` + fuzzy-passing text regardless of what the
 * surrounding DOM did, and that must survive.
 * - text ≥ 0.5 (v1's effective bar — fuzzyIncludes' own minScore) accepts.
 * - No stored text at all: ALWAYS acceptable — v1 accepted textless selector
 *   hits unconditionally, and rejection here silently orphans legacy
 *   icon/image anchors whose id still matches (the sweep cannot rescue pool
 *   members). Ranking and confidence already penalize structural drift.
 * - Text present but REFUTED: strong structural corroboration required —
 *   the i18n case (text translated, fingerprint intact) passes, a weak
 *   fingerprint coincidence does not.
 * Scan has no selector evidence, so it keeps v1's 0.4 floor on the blend.
 */
const TEXT_FLOOR = 0.5;
const STRONG_STRUCT = 0.6;
const ACCEPT_SCAN = 0.4;

/** Hostile-stored-data guard: fields are sliced before any normalization
 * (NFC on a multi-megabyte string is itself a freeze) and again after. */
const RAW_FIELD_CAP = 2000;

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

/** Per-signal verification scores; a signal is absent when undefined. */
interface SignalScores {
  blend: number;
  strongest: number;
  text?: number;
  fingerprint?: number;
  context?: number;
  neighbor?: number;
}

interface ScoredCandidate {
  element: Element;
  strategy: ResolutionStrategy;
  verification: number;
  strongest: number;
  signals?: SignalScores;
  /** Visibility factor applied to `final` (1 = visible/unknown). */
  visibility: number;
  final: number;
  /** No verifiable signal was stored — verification is a neutral stand-in. */
  unverified?: boolean;
}

function boundedField(value: string | null | undefined, cap: number): string {
  return normalizeText((value ?? "").slice(0, RAW_FIELD_CAP)).slice(0, cap);
}

function buildSignals(anchor: AnchorData): AnchorSignals {
  // Capture stores ≤120-char snippets and ≤40-char context — larger values
  // only come from hostile or corrupted storage, and uncapped they turn
  // normalization/edit-distance into a main-thread freeze.
  const snippet = boundedField(anchor.textSnippet, CANDIDATE_TEXT_CAP);
  const snippetWordPairs = wordPairCounts(snippet);
  let snippetWordPairTotal = 0;
  for (const count of snippetWordPairs.values()) snippetWordPairTotal += count;
  return {
    snippet,
    snippetBigrams: bigramCounts(snippet),
    snippetBigramTotal: Math.max(0, snippet.length - 1),
    snippetWordPairs,
    snippetWordPairTotal,
    prefix: boundedField(anchor.textPrefix, 128),
    suffix: boundedField(anchor.textSuffix, 128),
    neighbor: boundedField(anchor.neighborText, 128),
    fingerprint: (anchor.fingerprint ?? "").slice(0, 64),
    tag: typeof anchor.elementTag === "string" ? anchor.elementTag : "",
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
export function resolveAnchor(anchor: AnchorData, options?: ResolveOptions): AnchorResolution | null {
  const signals = buildSignals(anchor);
  const pool = gatherSelectorCandidates(anchor);

  const scored: ScoredCandidate[] = [];
  for (const [element, strategy] of pool) {
    const candidate = scoreOne(element, strategy, signals);
    if (candidate) scored.push(candidate);
  }

  let bestFinal = 0;
  let strongVisibleMatch = false;
  for (const c of scored) {
    if (c.final > bestFinal) bestFinal = c.final;
    // Identity selectors (id, anchorKey — near-unique by contract, the ones
    // v1 trusted absolutely) with near-exact text on a visible element end
    // the search even when CONTEXT signals (neighbors, prefix/suffix)
    // drifted — but not when the element's own fingerprint contradicts:
    // a wrapper that took over the id contains the same text yet scores a
    // partial fingerprint, and only the sweep can surface the true inner
    // element. Fragile selectors (css/xpath) get no shortcut at all: an
    // element that merely CONTAINS the snippet verbatim plus coincidental
    // structure is exactly the #175 impostor — they suppress the sweep
    // solely through the unbeatable-final bound below.
    if (
      (c.strategy === "id" || c.strategy === "anchorKey") &&
      c.visibility === 1 &&
      (c.signals?.text ?? 0) >= STRONG_VERIFY &&
      (c.signals?.fingerprint === undefined || c.signals.fingerprint >= STRONG_VERIFY)
    ) {
      strongVisibleMatch = true;
    }
  }

  // The sweep only helps when something could beat the pool (scan's final is
  // capped by its prior) AND there is at least one stored signal to verify
  // scan candidates against — with none, every scan candidate is discarded
  // and the sweep is pure cost.
  const verifiable = !!(signals.snippet || signals.fingerprint || signals.prefix || signals.suffix || signals.neighbor);
  const budget = options?.scanBudget;
  if (verifiable && bestFinal < STRATEGY_PRIORS.scan && !strongVisibleMatch) {
    if (budget && budget.remaining <= 0) {
      budget.starved = true;
    } else {
      if (budget) budget.remaining--;
      for (const element of sweepScanCandidates(signals, pool)) {
        const candidate = scoreOne(element, "scan", signals);
        if (candidate) scored.push(candidate);
      }
    }
  }

  const accepted = scored.filter(isAcceptable);
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
  if (!tag) return [];
  let candidates: NodeListOf<Element>;
  try {
    candidates = document.querySelectorAll(tag);
  } catch {
    return [];
  }

  // Parse only well-formed 3-part fingerprints (mirrors scoreFingerprint).
  // `Number("")` is 0, not NaN — an empty fingerprint would otherwise grant a
  // phantom child-count-0 bonus that biases top-K toward childless decoys.
  const storedFp = signals.fingerprint.split(":");
  const storedChildCount = storedFp.length === 3 ? Number(storedFp[0]) : Number.NaN;
  const storedAttrHash = storedFp.length === 3 ? (storedFp[2] ?? "") : "";

  const limit = Math.min(candidates.length, SCAN_HARD_CAP);
  const ranked: { element: Element; cheap: number }[] = [];

  for (let i = 0; i < limit; i++) {
    const el = candidates[i];
    if (!el || pool.has(el)) continue; // already scored under a selector strategy

    let cheap = 0;
    if (signals.snippetBigramTotal > 0) {
      // collapseWhitespace, not full normalizeText: NFC on every candidate is
      // the prefilter's dominant hidden cost; survivors get re-normalized in
      // full scoring anyway.
      const text = collapseWhitespace(boundedText(el, CANDIDATE_TEXT_CAP));
      const charDice = diceAgainst(signals.snippetBigrams, signals.snippetBigramTotal, text);
      // Character bigrams are order-blind: on shared-vocabulary pages (card
      // grids) every candidate scores alike. Word-pair shingles restore order
      // sensitivity; when the snippet has no pairs (single word, no-space
      // scripts) the whole weight stays on character bigrams. A shared word
      // pair implies shared bigrams, so charDice 0 makes the word pass moot.
      if (signals.snippetWordPairTotal > 0) {
        const wordDice =
          charDice > 0 ? wordPairDiceAgainst(signals.snippetWordPairs, signals.snippetWordPairTotal, text) : 0;
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
  const scores = verificationScore(element, signals);
  const visibility = visibilityFactor(classifyVisibility(element));
  if (scores === null) {
    // No verifiable signal stored: the selector match is the only evidence.
    // A scan candidate with nothing to verify against is meaningless, though.
    if (strategy === "scan") return null;
    return {
      element,
      strategy,
      verification: NEUTRAL_VERIFICATION,
      strongest: NEUTRAL_VERIFICATION,
      visibility,
      final: STRATEGY_PRIORS[strategy] * NEUTRAL_VERIFICATION * visibility,
      unverified: true,
    };
  }

  return {
    element,
    strategy,
    verification: scores.blend,
    strongest: scores.strongest,
    signals: scores,
    visibility,
    final: STRATEGY_PRIORS[strategy] * scores.blend * visibility,
  };
}

/**
 * Whether a candidate has enough corroboration to be returned at all.
 * Selector strategies accept on the strongest SINGLE signal clearing its
 * floor — a drifted fingerprint must not veto an exact text match (or vice
 * versa: an icon button's intact fingerprint carries it when there is no
 * text). Scan keeps its blend floor: without selector evidence, agreement
 * across signals is the whole case for the match.
 */
function isAcceptable(c: ScoredCandidate): boolean {
  if (c.strategy === "scan") return c.verification >= ACCEPT_SCAN;
  if (c.unverified || !c.signals) return true;
  const s = c.signals;
  // No stored text: ranking-only (see constant doc — v1 parity for legacy
  // textless anchors; drift shows up as low confidence, not orphaning).
  if (s.text === undefined) return true;
  if (s.text >= TEXT_FLOOR) return true;
  // Text present but refuted — accept only on strong structural agreement.
  return (
    (s.fingerprint ?? 0) >= STRONG_STRUCT || (s.context ?? 0) >= STRONG_STRUCT || (s.neighbor ?? 0) >= STRONG_STRUCT
  );
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
function verificationScore(candidate: Element, s: AnchorSignals): SignalScores | null {
  let score = 0;
  let totalWeight = 0;
  const out: SignalScores = { blend: 0, strongest: 0 };

  // --- Text snippet (weight 40 — most reliable under reordering) ---
  if (s.snippet) {
    totalWeight += 40;
    const candidateText = normalizeText(boundedText(candidate, CANDIDATE_TEXT_CAP));
    out.text = fuzzyIncludes(candidateText, s.snippet, 0.5);
    score += out.text * 40;
  }

  // --- Fingerprint (weight 20) ---
  if (s.fingerprint) {
    totalWeight += 20;
    out.fingerprint = scoreFingerprint(candidate, s.fingerprint);
    score += out.fingerprint * 20;
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
      out.context = contextScore / contextParts;
      score += out.context * 20;
    }
  }

  // --- Neighbor text (weight 20) ---
  if (s.neighbor) {
    totalWeight += 20;
    const candidateNeighbor = normalizeText(neighborText(candidate));
    out.neighbor = candidateNeighbor ? similarity(candidateNeighbor, s.neighbor) : 0;
    score += out.neighbor * 20;
  }

  if (totalWeight === 0) return null;
  out.blend = score / totalWeight;
  out.strongest = Math.max(out.text ?? 0, out.fingerprint ?? 0, out.context ?? 0, out.neighbor ?? 0);
  return out;
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
  // Confidence follows the STRONGEST corroborating signal, not the blend:
  // `<h2 id="pricing">Pricing</h2>` moved into a new wrapper still carries an
  // exact text match — the drifted fingerprint/neighbors around it must not
  // dash-flag a perfectly anchored marker. Absence of a signal stays neutral;
  // a present-but-refuted one still drags `strongest` down when it is all
  // there is. Full prior at STRONG_VERIFY keeps v1's exact values.
  return STRATEGY_PRIORS[c.strategy] * Math.min(1, c.strongest / STRONG_VERIFY);
}

/**
 * Resolve an annotation's position on the page.
 * Converts stored percentage-based rect back to absolute coordinates
 * using the current bounding box of the resolved anchor element.
 */
export function resolveAnnotation(
  anchor: AnchorData,
  rect: RectData,
  options?: ResolveOptions,
): ResolvedAnnotation | null {
  const resolution = resolveAnchor(anchor, options);

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
