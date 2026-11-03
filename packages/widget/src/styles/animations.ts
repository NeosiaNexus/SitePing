/**
 * Shared motion of the Shadow DOM: the curves live as `--sp-ease-*` tokens on
 * `:host` (styles/base.ts) and everything here reads them.
 *
 * The rules, after Emil Kowalski's animation guidelines:
 * - only `transform` and `opacity` move; never from `scale(0)`;
 * - entrances use the strong ease-out, panels the drawer curve, and exits are
 *   faster than entrances;
 * - nothing replays on a re-render: the list, the badge and the button only
 *   animate on the user's own action;
 * - reduced motion keeps the fades and colour changes, and drops the movement.
 */
export const ANIMATION_CSS = /* css */ `
  /* ---- FAB entrance: once per page load, so short and quiet ---- */

  @keyframes sp-fab-in {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
  }

  /* backwards, not both: once it ends, :hover and :active own transform again. */
  .sp-anim-fab-in {
    animation: sp-fab-in 0.2s var(--sp-ease-out) backwards;
  }

  /* ---- Marker click: the card it points to lights up once ---- */

  @keyframes sp-flash-bg {
    from { background-color: var(--sp-accent-light); }
  }

  .sp-anim-flash {
    animation: sp-flash-bg 0.6s var(--sp-ease-out);
  }

  /* ---- Panel: drawer curve in, a faster ease-out on the way out ---- */

  .sp-panel {
    transform: translateX(110%);
    transition: transform 0.2s var(--sp-ease-out);
  }

  .sp-panel.sp-panel--open {
    transform: translateX(0);
    transition: transform 0.3s var(--sp-ease-drawer);
  }

  /* ---- Speed dial: items rise out of the FAB, 30ms apart on the way up ---- */

  .sp-radial-item {
    opacity: 0;
    pointer-events: none;
    transform: translate(0, 0) scale(0.9);
    transition:
      transform 0.2s var(--sp-ease-out),
      opacity 0.15s ease,
      background-color 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      color 0.15s ease,
      scale 0.16s var(--sp-ease-out);
  }

  /* The individual scale property: it composes with the inline translate. */
  .sp-radial-item:active {
    scale: 0.97;
  }

  .sp-radial-item.sp-radial-item--open {
    opacity: 1;
    pointer-events: auto;
    /* Only the entrance staggers: hover colours and the exit stay immediate. */
    transition-delay: calc(var(--sp-i, 0) * 30ms), calc(var(--sp-i, 0) * 30ms), 0s, 0s, 0s, 0s, 0s;
  }

  /* ---- Loading spinner ---- */

  @keyframes sp-spin {
    to { transform: rotate(360deg); }
  }

  /* A neutral system spinner: grey track, secondary-text head. */
  .sp-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--sp-fill-strong);
    border-top-color: var(--sp-text-secondary);
    border-radius: 50%;
    animation: sp-spin 0.6s linear infinite;
  }

  /* ---- Reduced motion: fewer and gentler, not zero ---- */

  @media (prefers-reduced-motion: reduce) {
    /* Keyframes are all movement: they end at once. Transitions keep their
       fades and colour changes, but nothing travels or scales. */
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-delay: 0s !important;
      animation-iteration-count: 1 !important;
      transition-property: opacity, color, background-color, border-color, box-shadow, outline-color !important;
      transition-delay: 0s !important;
    }

    /* A frozen spinner reads as a hang: it keeps turning, slowly. */
    .sp-spinner {
      animation-duration: 1.2s !important;
      animation-iteration-count: infinite !important;
    }
  }
`;
