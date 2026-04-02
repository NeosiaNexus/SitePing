/**
 * CSS keyframes and animation utilities.
 *
 * Uses CSS-only spring animations via linear() timing function
 * (Josh Comeau pattern) for natural-feeling motion without JS.
 */

// Spring easing — computed from a spring simulation (damping: 15, stiffness: 100)
const SPRING_LINEAR = `linear(0, 0.006, 0.025, 0.06, 0.11, 0.17, 0.25, 0.34, 0.45, 0.56, 0.67, 0.78, 0.88, 0.95, 1.01, 1.04, 1.05, 1.04, 1.02, 1, 0.99, 1)`;

// Ease-out-expo — fast start, smooth deceleration
const EASE_OUT_EXPO = `cubic-bezier(0.16, 1, 0.3, 1)`;

// Spring overshoot — for radial menu items
const SPRING_OVERSHOOT = `cubic-bezier(0.34, 1.56, 0.64, 1)`;

export const ANIMATION_CSS = `
  /* ---- Keyframes ---- */

  @keyframes sp-fab-in {
    from { transform: scale(0); }
    to { transform: scale(1); }
  }

  @keyframes sp-marker-in {
    0% { transform: scale(0); }
    70% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }

  @keyframes sp-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes sp-slide-up {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes sp-pulse-outline {
    0% { box-shadow: 0 0 0 0 var(--sp-accent-light); }
    70% { box-shadow: 0 0 0 6px transparent; }
    100% { box-shadow: 0 0 0 0 transparent; }
  }

  @keyframes sp-flash-bg {
    0% { background-color: #fef9c3; }
    100% { background-color: transparent; }
  }

  /* ---- Animation classes ---- */

  .sp-anim-fab-in {
    animation: sp-fab-in 0.6s ${SPRING_LINEAR} both;
  }

  .sp-anim-marker-in {
    animation: sp-marker-in 0.3s ${SPRING_OVERSHOOT} both;
  }

  .sp-anim-fade-in {
    animation: sp-fade-in 0.15s ease-out both;
  }

  .sp-anim-slide-up {
    animation: sp-slide-up 0.2s ease-out both;
  }

  .sp-anim-pulse {
    animation: sp-pulse-outline 0.6s ease-out;
  }

  .sp-anim-flash {
    animation: sp-flash-bg 0.4s ease-out;
  }

  /* ---- Transition utilities ---- */

  .sp-panel {
    transform: translateX(110%);
    transition: transform 0.35s ${EASE_OUT_EXPO};
  }

  .sp-panel.sp-panel--open {
    transform: translateX(0);
  }

  .sp-radial-item {
    opacity: 0;
    pointer-events: none;
    transform: translate(0, 0);
    transition:
      transform 0.3s ${SPRING_OVERSHOOT},
      opacity 0.2s ease;
  }

  .sp-radial-item.sp-radial-item--open {
    opacity: 1;
    pointer-events: auto;
  }

  /* Stagger delay via CSS custom property --sp-i */
  .sp-radial-item {
    transition-delay: calc(var(--sp-i, 0) * 40ms);
  }

  /* Resolve animation */
  .sp-card--resolving {
    transition: max-height 0.3s ease, opacity 0.3s ease;
    max-height: 48px;
    opacity: 0.6;
  }
`;
