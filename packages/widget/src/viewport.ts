import { COMPACT_MAX_WIDTH } from "./constants.js";

function matches(query: string): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

/**
 * Phone-sized viewport — the widget swaps floating surfaces for bottom sheets.
 * Elements inside the Shadow DOM use the equivalent `@media` block; this is
 * for the ones that live on `document.body` with inline styles.
 */
export function isCompactViewport(): boolean {
  return matches(`(max-width: ${COMPACT_MAX_WIDTH}px)`);
}

/** Primary input is a finger: no hover, and usually no hardware keyboard. */
export function isCoarsePointer(): boolean {
  return matches("(pointer: coarse)");
}

/**
 * Report how much of the layout viewport the on-screen keyboard covers.
 *
 * Opening the keyboard shrinks only the *visual* viewport (always on iOS,
 * by default on Chrome Android), so a `position: fixed; bottom: 0` sheet ends
 * up behind it. Callers lift the sheet by `inset` and cap its height to
 * `visibleHeight`. Calls `onChange` once immediately; returns an unsubscribe.
 */
export function trackKeyboardInset(onChange: (inset: number, visibleHeight: number) => void): () => void {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  const update = () => onChange(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)), vv.height);
  update();
  vv.addEventListener("resize", update);
  vv.addEventListener("scroll", update);
  return () => {
    vv.removeEventListener("resize", update);
    vv.removeEventListener("scroll", update);
  };
}
