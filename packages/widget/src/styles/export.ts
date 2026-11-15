/**
 * Styles of the export menu (export-utils.ts). They live apart from its code so the
 * stylesheet, built at mount, does not pull the panel's code into the first
 * load: esbuild splits by module, and the panel loads on first open.
 */
export const EXPORT_CSS = /* css */ `
  /* ============================
     Export Button & Menu
     ============================ */

  /* A tinted text button, like a toolbar item. */
  /* An icon bar button, like Delete all (base.ts): its label is visually hidden. */
  .sp-export-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    justify-content: center;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--sp-accent-ink);
    font-family: var(--sp-font);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: var(--sp-tr);
    position: relative;
  }

  .sp-export-btn svg {
    width: 17px;
    height: 17px;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-export-btn:hover {
      background: color-mix(in srgb, var(--sp-accent) 10%, transparent);
    }
  }

  .sp-export-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .sp-export-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 180px;
    padding: 6px;
    border-radius: var(--sp-radius-lg);
    background: var(--sp-material-thick);
    backdrop-filter: var(--sp-material-blur);
    -webkit-backdrop-filter: var(--sp-material-blur);
    box-shadow: inset 0 0.5px 0 var(--sp-edge), var(--sp-shadow-float);
    z-index: 10;
    opacity: 0;
    /* Grows out of its trigger (right-aligned), and is interruptible. */
    transform: scale(0.96);
    transform-origin: top right;
    transition: opacity 0.15s ease, transform 0.15s var(--sp-ease-out);
    pointer-events: none;
  }

  .sp-export-menu--open {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }

  /* Rows highlight with a grey fill, the text keeps its colour. */
  .sp-export-option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 34px;
    padding: 7px 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--sp-text);
    font-family: var(--sp-font);
    font-size: 13px;
    font-weight: 400;
    letter-spacing: -0.005em;
    cursor: pointer;
    transition: var(--sp-tr);
    text-align: left;
  }

  .sp-export-option:focus-visible {
    background: var(--sp-fill);
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-export-option:hover {
      background: var(--sp-fill);
    }
  }

  .sp-export-option-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--sp-text-secondary);
  }

  .sp-export-option-icon svg {
    width: 16px;
    height: 16px;
  }

  .sp-export-option-label {
    flex: 1;
  }

  @media (forced-colors: active) {
    .sp-export-btn,
    .sp-export-option,
    .sp-export-menu {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
      color: ButtonText !important;
    }

    .sp-export-btn:focus-visible,
    .sp-export-option:focus-visible {
      outline: 3px solid Highlight !important;
    }
  }
`;
