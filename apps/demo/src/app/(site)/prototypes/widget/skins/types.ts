/**
 * PROTOTYPE ONLY (deleted once a direction is chosen).
 *
 * A skin restyles the real widget, mounted unchanged:
 * - `shadowCss` is appended to the widget's Shadow DOM stylesheet (after the
 *   built-in one, so a rule of equal specificity wins). Every `--sp-*` token
 *   of styles/theme.ts and styles/base.ts can be redefined on `:host`.
 * - `lightCss` styles the surfaces the widget mounts on the host page, whose
 *   look is set in inline styles: it needs `!important`. The harness tags them:
 *     [data-proto-surface="popup"]    the comment form (role=dialog). Children:
 *        > div:first-child               type grid, > button[data-type] (aria-pressed)
 *        > textarea                      the message
 *        > div:nth-child(3)              the "Ctrl+Enter to send" hint
 *        > div:last-child                the button row: > button:first-child (Cancel),
 *                                        > button:last-child (Send, :disabled while empty)
 *     [data-proto-surface="toolbar"]  the annotation bar at the top (dot span,
 *                                     instruction span, Cancel button)
 *     [data-proto-surface="overlay"]  the full-page drawing overlay; its child
 *                                     div is the rectangle being drawn
 *     #sp-tooltip                     the pin tooltip (header row of badges +
 *                                     date, then the message)
 *     #siteping-markers > [data-feedback-id]   the pins
 *     #siteping-markers .sp-cluster-badge       the count on stacked pins
 *   `html[data-proto-theme="dark"]` is set when the widget runs dark, and
 *   `--proto-accent` on `html` carries the accent colour.
 */
export interface Skin {
  /** Picker label: the direction, never "Option A". */
  name: string;
  /** The axis it explores, in a phrase. */
  axis: string;
  shadowCss: string;
  lightCss: string;
}
