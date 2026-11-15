/**
 * Styles of bulk selection: checkboxes and the action bar (panel-bulk.ts). They live apart from its code so the
 * stylesheet, built at mount, does not pull the panel's code into the first
 * load: esbuild splits by module, and the panel loads on first open.
 */
export const BULK_CSS = /* css */ `
  /* ============================
     Bulk Checkbox
     ============================ */

  /* A round check, after the system's edit mode. */
  .sp-bulk-checkbox {
    position: relative;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    cursor: pointer;
    border-radius: 4px;
    color: var(--sp-gray3);
    opacity: 0;
    transition: opacity 0.15s ease, color 0.15s ease, transform 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .sp-bulk-checkbox svg {
    width: 18px;
    height: 18px;
    display: block;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-bulk-checkbox:hover {
      color: var(--sp-accent);
    }
  }

  .sp-bulk-checkbox--checked {
    color: var(--sp-accent);
    opacity: 1 !important;
  }

  /* Show checkboxes when hovering a card, or reaching one by keyboard */
  @media (hover: hover) and (pointer: fine) {
    .sp-card:hover .sp-bulk-checkbox {
      opacity: 1;
    }
  }

  .sp-bulk-checkbox:focus-visible {
    opacity: 1;
  }

  /* When any card has selection, show ALL checkboxes */
  .sp-list--has-selection .sp-bulk-checkbox {
    opacity: 1;
  }

  /* The card's check takes the type dot's place instead of pushing the row:
     the dot steps aside whenever the check shows. */
  .sp-card-header > .sp-bulk-checkbox {
    position: absolute;
    top: 13px;
    left: 9px;
  }

  .sp-list--has-selection .sp-card-bar,
  .sp-card:has(.sp-bulk-checkbox:focus-visible) .sp-card-bar {
    opacity: 0;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-card:hover:has(.sp-bulk-checkbox) .sp-card-bar {
      opacity: 0;
    }
  }

  @media not all and (hover: hover) and (pointer: fine) {
    .sp-card:has(.sp-bulk-checkbox) .sp-card-bar {
      opacity: 0;
    }
  }

  /* ============================
     Card Selected State
     ============================ */

  /* !important: the card's own hover background is more specific. */
  .sp-card--selected {
    background: color-mix(in srgb, var(--sp-accent) 9%, var(--sp-row)) !important;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sp-accent) 30%, transparent);
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-card--selected:hover {
      background: color-mix(in srgb, var(--sp-accent) 12%, var(--sp-row)) !important;
    }
  }

  /* ============================
     Select All Bar
     ============================ */

  .sp-bulk-select-all {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px;
    margin-bottom: 2px;
    border-radius: var(--sp-radius);
    background: transparent;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s ease, background 0.2s ease;
    user-select: none;
    font-family: var(--sp-font);
    font-size: 13px;
    font-weight: 500;
    color: var(--sp-text-secondary);
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-bulk-select-all:hover {
      background: var(--sp-fill);
    }
  }

  /* Show select-all on list hover or when selections exist */
  .sp-list--has-selection .sp-bulk-select-all {
    opacity: 1;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-list:hover .sp-bulk-select-all {
      opacity: 1;
    }
  }

  .sp-bulk-select-all .sp-bulk-checkbox {
    opacity: 1;
  }

  /* ============================
     Floating Action Bar
     ============================ */

  /* A floating material capsule over the list. */
  .sp-bulk-bar {
    position: absolute;
    bottom: 12px;
    left: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px 12px;
    padding: 8px 8px 8px 16px;
    border-radius: 18px;
    background: var(--sp-material-thick);
    backdrop-filter: var(--sp-material-blur);
    -webkit-backdrop-filter: var(--sp-material-blur);
    box-shadow: inset 0 0.5px 0 var(--sp-edge), var(--sp-shadow-float);
    z-index: 10;
    pointer-events: none;
    opacity: 0;
    /* Rises from the panel's bottom edge and leaves the same way. */
    transform: translateY(calc(100% + 16px));
    transition: transform 0.2s var(--sp-ease-out), opacity 0.15s ease;
    font-family: var(--sp-font);
  }

  .sp-bulk-bar--visible {
    pointer-events: auto;
    opacity: 1;
    transform: none;
  }

  .sp-bulk-bar-count {
    font-size: 15px;
    font-weight: 600;
    color: var(--sp-text);
    white-space: nowrap;
    letter-spacing: -0.02em;
  }

  .sp-bulk-bar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }

  /* Tinted buttons: an ink that reads 4.5:1 on its own tint. */
  .sp-bulk-btn-resolve,
  .sp-bulk-btn-delete {
    height: 34px;
    padding: 0 12px;
    border-radius: var(--sp-radius);
    border: none;
    font-family: var(--sp-font);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: var(--sp-tr);
    white-space: nowrap;
  }

  .sp-bulk-btn-resolve {
    color: var(--sp-ink-green);
    background: color-mix(in srgb, var(--sp-status-open) 13%, transparent);
  }

  .sp-bulk-btn-delete {
    color: var(--sp-ink-red);
    background: color-mix(in srgb, var(--sp-type-bug) 11%, transparent);
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-bulk-btn-resolve:hover {
      background: color-mix(in srgb, var(--sp-status-open) 19%, transparent);
    }

    .sp-bulk-btn-delete:hover {
      background: color-mix(in srgb, var(--sp-type-bug) 16%, transparent);
    }
  }

  .sp-bulk-btn-resolve:disabled,
  .sp-bulk-btn-delete:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .sp-bulk-btn-deselect {
    width: 30px;
    height: 30px;
    border-radius: var(--sp-radius-full);
    border: none;
    background: var(--sp-fill);
    color: var(--sp-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--sp-tr);
    flex-shrink: 0;
    padding: 0;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-bulk-btn-deselect:hover {
      background: var(--sp-fill-strong);
      color: var(--sp-text);
    }
  }

  .sp-bulk-btn-deselect svg {
    width: 12px;
    height: 12px;
  }

  /* Spinner inside bulk bar buttons */
  .sp-bulk-btn-resolve .sp-spinner,
  .sp-bulk-btn-delete .sp-spinner {
    width: 14px;
    height: 14px;
  }

  /* ============================
     Forced Colors / High Contrast
     ============================ */

  @media (forced-colors: active) {
    .sp-bulk-checkbox,
    .sp-bulk-btn-resolve,
    .sp-bulk-btn-delete,
    .sp-bulk-btn-deselect,
    .sp-bulk-bar {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
      color: ButtonText !important;
    }

    .sp-bulk-checkbox--checked {
      background: Highlight !important;
      color: HighlightText !important;
    }

    /* The disc takes the text colour: the white check would vanish on it. */
    .sp-bulk-checkbox--checked polyline {
      stroke: Highlight;
    }

    .sp-card--selected {
      border-left: 4px solid Highlight !important;
    }
  }
`;
