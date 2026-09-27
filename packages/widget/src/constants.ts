/** Maximum z-index value — ensures the widget renders above all page content. */
export const Z_INDEX_MAX = 2147483647;

/** Minimum viewport width (px) below which the widget is hidden (mobile). */
export const MOBILE_BREAKPOINT = 768;

/** Default number of feedbacks to fetch per page. */
export const PAGE_SIZE = 20;

/**
 * Size in CSS pixels of the point-rect created by the instant (right-click)
 * annotation flow. Large enough for `findAnchorElement` to resolve the target
 * but small enough to feel like a point click rather than an area selection.
 */
export const INSTANT_ANNOTATION_SIZE = 20;

/**
 * Events host modals observe to detect "outside" interactions (dismiss on
 * pointer/mouse/touch down or click, focus traps on focus changes). Every
 * widget surface stops them in the bubble phase so bubble-phase document
 * listeners never see the widget's own interactions.
 */
export const HOST_OUTSIDE_INTERACTION_EVENTS = [
  "pointerdown",
  "mousedown",
  "touchstart",
  "click",
  "focusin",
  "focusout",
] as const satisfies readonly (keyof DocumentEventMap)[];

/**
 * Subset of {@link HOST_OUTSIDE_INTERACTION_EVENTS} that no widget listener
 * consumes, so it can be stopped at `window` in the capture phase — before
 * capture-phase host listeners on `document` run — without starving the
 * widget itself. `focusout` is handled separately (it also covers focus
 * moving from the host page into the widget).
 */
export const HOST_CAPTURE_ISOLATED_EVENTS = [
  "pointerdown",
  "focusin",
] as const satisfies readonly (keyof DocumentEventMap)[];

/**
 * Attributes a sibling-inerting host modal sets on the `<body>` children
 * outside its dialog: `inert` removes them from pointer and focus
 * interaction, `aria-hidden` (e.g. the `aria-hidden` package behind Radix's
 * `hideOthers`) removes them from the accessibility tree. The widget never
 * sets either on a registered surface root, so every occurrence there comes
 * from the host and is removed (see `keepSurfaceExposed` in host-isolation.ts).
 */
export const HOST_HIDING_ATTRIBUTES = ["inert", "aria-hidden"] as const satisfies readonly string[];

/**
 * Duration in milliseconds of the annotation popup's close transition. The
 * popup is set to `display: none` only once this fade-out has finished.
 */
export const POPUP_HIDE_TRANSITION_MS = 250;
