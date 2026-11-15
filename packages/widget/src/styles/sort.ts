/**
 * Styles of the sort and filter controls (panel-sort.ts). They live apart from its code so the
 * stylesheet, built at mount, does not pull the panel's code into the first
 * load: esbuild splits by module, and the panel loads on first open.
 */
export const SORT_CSS = /* css */ `
  /* ============================
     Sort Controls Container
     ============================ */

  .sp-sort-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Groups the sort button with its menu for outside clicks, without a box:
     both still lay out as children of .sp-sort-controls. */
  .sp-sort-dropdown {
    display: contents;
  }

  /* ============================
     Sort Button and Toggles
     ============================ */

  /* Borderless fill capsules, like the system's toolbar buttons; a toggle
     that is on fills with the accent. */
  .sp-sort-btn,
  .sp-group-toggle,
  .sp-mine-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 30px;
    padding: 0 12px;
    border-radius: var(--sp-radius-full);
    border: none;
    background: var(--sp-fill);
    color: var(--sp-text);
    font-family: var(--sp-font);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: var(--sp-tr);
  }

  .sp-sort-btn {
    position: relative;
  }

  .sp-sort-btn svg,
  .sp-group-toggle svg,
  .sp-mine-toggle svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    color: var(--sp-text-secondary);
  }

  .sp-sort-btn svg {
    width: 14px;
    height: 14px;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-sort-btn:hover,
    .sp-group-toggle:hover,
    .sp-mine-toggle:hover {
      background: var(--sp-fill-strong);
    }

    .sp-group-toggle--active:hover,
    .sp-mine-toggle--active:hover {
      background: var(--sp-accent-dark);
    }
  }

  .sp-sort-btn[aria-expanded="true"] {
    background: var(--sp-fill-strong);
  }

  .sp-group-toggle--active,
  .sp-mine-toggle--active {
    background: var(--sp-accent);
    color: #fff;
  }

  .sp-group-toggle--active svg,
  .sp-mine-toggle--active svg {
    color: inherit;
  }

  /* ============================
     Sort Floating Menu
     ============================ */

  /* Hangs from the filters block (the dropdown wrapper has no box), aligned
     under its button. */
  .sp-sort-menu {
    position: absolute;
    top: calc(100% - 4px);
    left: 16px;
    min-width: 170px;
    padding: 6px;
    border-radius: var(--sp-radius-lg);
    background: var(--sp-material-thick);
    backdrop-filter: var(--sp-material-blur);
    -webkit-backdrop-filter: var(--sp-material-blur);
    box-shadow: inset 0 0.5px 0 var(--sp-edge), var(--sp-shadow-float);
    z-index: 10;
    transform-origin: top left;
    animation: sp-menu-in 0.15s var(--sp-ease-out) backwards;
  }

  /* ============================
     Sort Menu Option
     ============================ */

  .sp-sort-option {
    display: block;
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
    text-align: left;
    transition: var(--sp-tr);
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-sort-option:hover {
      background: var(--sp-fill);
    }
  }

  /* The current order carries a check, like the type menu, not a tint. */
  .sp-sort-option--active {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-weight: 600;
  }

  .sp-sort-option--active svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    color: var(--sp-accent-ink);
    stroke-width: 2.5;
  }

  /* ============================
     Page Group Header
     ============================ */

  /* A section header that stays on top of its cards, on a blurred band. */
  .sp-group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 2px -4px 6px;
    padding: 8px;
    border-radius: var(--sp-radius);
    background: color-mix(in srgb, var(--sp-grouped) 72%, transparent);
    backdrop-filter: var(--sp-material-blur);
    -webkit-backdrop-filter: var(--sp-material-blur);
    cursor: pointer;
    user-select: none;
    position: sticky;
    top: 0;
    z-index: 2;
    transition: background-color 0.15s ease;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-group-header:hover {
      background: color-mix(in srgb, var(--sp-grouped) 72%, var(--sp-fill-strong));
    }
  }

  .sp-group-header:focus-visible {
    outline: 2px solid var(--sp-accent);
    outline-offset: -2px;
  }

  .sp-group-header-chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    transition: transform 0.2s var(--sp-ease-out);
    transform: rotate(90deg);
  }

  .sp-group-header-chevron svg {
    width: 12px;
    height: 12px;
    color: var(--sp-text-secondary);
  }

  .sp-group-header--collapsed .sp-group-header-chevron {
    transform: rotate(0deg);
  }

  .sp-group-header-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .sp-group-header-icon svg {
    width: 14px;
    height: 14px;
    color: var(--sp-text-secondary);
  }

  .sp-group-header-path {
    font-size: 13px;
    font-weight: 600;
    color: var(--sp-text-secondary);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sp-group-header-count {
    font-size: 12px;
    font-weight: 600;
    padding: 1px 8px;
    border-radius: var(--sp-radius-full);
    background: color-mix(in srgb, var(--sp-accent) 13%, transparent);
    color: var(--sp-accent-ink);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  /* ============================
     Page Group Content
     ============================ */

  /* Folded groups leave the layout (and the Tab order) entirely; the old
     max-height cap clipped every card past 5000px of one open group. */
  .sp-group-content--collapsed {
    display: none;
  }

  /* ============================
     Forced Colors / High Contrast
     ============================ */

  @media (forced-colors: active) {
    .sp-sort-btn,
    .sp-group-toggle,
    .sp-mine-toggle,
    .sp-sort-option,
    .sp-group-header {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
      color: ButtonText !important;
    }

    /* A pressed toggle, like an active segment */
    .sp-group-toggle--active,
    .sp-mine-toggle--active {
      background: Highlight !important;
      color: HighlightText !important;
    }

    .sp-sort-btn:focus-visible,
    .sp-group-toggle:focus-visible,
    .sp-mine-toggle:focus-visible,
    .sp-sort-option:focus-visible,
    .sp-group-header:focus-visible {
      outline: 3px solid Highlight !important;
    }

    .sp-sort-menu {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
    }
  }

`;
