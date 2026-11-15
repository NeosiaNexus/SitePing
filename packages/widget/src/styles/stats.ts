/**
 * Styles of the stats strip (panel-stats.ts). They live apart from its code so the
 * stylesheet, built at mount, does not pull the panel's code into the first
 * load: esbuild splits by module, and the panel loads on first open.
 */
export const STATS_CSS = /* css */ `
  .sp-stats-bar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    /* No rule under it: the summary reads as part of the sheet's title block. */
    padding: 2px 20px 12px;
    user-select: none;
  }

  .sp-stats-bar[hidden] {
    display: none;
  }

  .sp-stats-row {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .sp-stats-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .sp-stats-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .sp-stats-value {
    font-size: 17px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--sp-text);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    transition: opacity 0.2s ease;
  }

  .sp-stats-label {
    font-size: 11px;
    font-weight: 500;
    line-height: 1;
    color: var(--sp-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .sp-stats-progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sp-stats-progress-track {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--sp-fill-strong);
    overflow: hidden;
  }

  /* Full width, revealed by clip-path: composited, no layout per frame. It
     moves only when the share actually changes, never from zero on render. */
  .sp-stats-progress-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--sp-accent);
    clip-path: inset(0 100% 0 0 round 2px);
    transition: clip-path 0.3s var(--sp-ease-out);
  }

  .sp-stats-progress-label {
    font-size: 11px;
    line-height: 1;
    color: var(--sp-text-secondary);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    min-width: 64px;
    text-align: right;
  }
`;
