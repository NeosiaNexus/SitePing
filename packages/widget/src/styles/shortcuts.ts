/**
 * Styles of the keyboard shortcuts dialog (shortcuts.ts). They live apart from its code so the
 * stylesheet, built at mount, does not pull the panel's code into the first
 * load: esbuild splits by module, and the panel loads on first open.
 */
export const SHORTCUTS_CSS = /* css */ `
  /* ---- Help overlay backdrop ----
     Opened by the ? key: keyboard-initiated, so it appears at once (no fade).
     The card is the material: a blurred backdrop under it would only cost paint. */

  .sp-shortcuts-overlay {
    position: fixed;
    inset: 0;
    background: var(--sp-backdrop, rgba(15, 23, 42, 0.2));
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    opacity: 0;
    pointer-events: none;
  }

  .sp-shortcuts-overlay--visible {
    opacity: 1;
    pointer-events: auto;
  }

  /* ---- Material card ---- */

  .sp-shortcuts-card {
    width: min(356px, calc(100% - 24px));
    padding: 22px 22px 18px;
    border-radius: var(--sp-radius-xl);
    background: var(--sp-material-thick);
    backdrop-filter: var(--sp-material-blur);
    -webkit-backdrop-filter: var(--sp-material-blur);
    box-shadow: inset 0 0.5px 0 var(--sp-edge), var(--sp-shadow-sheet);
    font-family: var(--sp-font);
    position: relative;
  }

  /* ---- Title row ---- */

  .sp-shortcuts-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.022em;
    color: var(--sp-text);
    margin-bottom: 18px;
  }

  .sp-shortcuts-title svg {
    width: 18px;
    height: 18px;
    color: var(--sp-text-secondary);
    flex-shrink: 0;
  }

  /* ---- Close button: a filled circle ---- */

  .sp-shortcuts-close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: none;
    background: var(--sp-fill);
    color: var(--sp-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, color 0.15s ease;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-shortcuts-close:hover {
      background: var(--sp-fill-strong);
      color: var(--sp-text);
    }
  }

  .sp-shortcuts-close svg {
    width: 14px;
    height: 14px;
  }

  /* ---- Two-column grid ---- */

  .sp-shortcuts-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .sp-shortcuts-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .sp-shortcuts-keys {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 80px;
    justify-content: flex-end;
  }

  .sp-shortcuts-separator {
    font-size: 11px;
    color: var(--sp-text-secondary);
    user-select: none;
  }

  /* ---- Key badge (<kbd> styling): a raised key, hairline edge ---- */

  .sp-kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 24px;
    padding: 0 7px;
    border-radius: 6px;
    background: var(--sp-row);
    box-shadow: 0 0 0 0.5px var(--sp-separator), var(--sp-shadow-edge-drop);
    font-family: var(--sp-font);
    font-size: 12px;
    font-weight: 500;
    color: var(--sp-text);
    text-align: center;
    line-height: 1;
    user-select: none;
  }

  /* ---- Description text ---- */

  .sp-shortcuts-desc {
    font-size: 13px;
    color: var(--sp-text);
    line-height: 1.3;
  }

  /* ---- Hint button (bottom-right of panel): a material disc ---- */

  .sp-shortcuts-hint {
    width: 28px;
    height: 28px;
    border-radius: var(--sp-radius-full);
    border: none;
    background: var(--sp-material-thick);
    backdrop-filter: var(--sp-material-blur);
    -webkit-backdrop-filter: var(--sp-material-blur);
    box-shadow: inset 0 0.5px 0 var(--sp-edge), var(--sp-shadow-float);
    color: var(--sp-text-secondary);
    font-family: var(--sp-font);
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, color 0.15s ease;
    position: absolute;
    bottom: 12px;
    right: 12px;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-shortcuts-hint:hover {
      background: color-mix(in srgb, var(--sp-accent) 14%, transparent);
      color: var(--sp-accent-ink);
    }
  }

  .sp-shortcuts-hint::after {
    content: attr(aria-label);
    position: absolute;
    bottom: calc(100% + 6px);
    right: 0;
    padding: 5px 10px;
    border-radius: var(--sp-radius-full);
    background: var(--sp-material-thick);
    backdrop-filter: var(--sp-material-blur);
    -webkit-backdrop-filter: var(--sp-material-blur);
    box-shadow: inset 0 0.5px 0 var(--sp-edge), var(--sp-shadow-float);
    font-family: var(--sp-font);
    font-size: 12px;
    font-weight: 500;
    color: var(--sp-text);
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transform: translateY(4px);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-shortcuts-hint:hover::after {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Forced colours drop the shadows that draw these edges. */
  @media (forced-colors: active) {
    .sp-shortcuts-card,
    .sp-shortcuts-hint,
    .sp-kbd {
      border: 1px solid ButtonText;
    }
  }

  /* ---- Card focus highlight (navigation) ---- */

  .sp-card--focused {
    outline: 2px solid var(--sp-accent);
    outline-offset: -2px;
    border-radius: inherit;
  }

`;
