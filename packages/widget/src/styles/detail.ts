/**
 * Styles of the detail view: a feedback's annotations, thread and actions (panel-detail.ts). They live apart from its code so the
 * stylesheet, built at mount, does not pull the panel's code into the first
 * load: esbuild splits by module, and the panel loads on first open.
 */
export const DETAIL_CSS = /* css */ `
  /* ============================
     Detail View: a navigation push
     ============================ */

  /* No surface of its own: the list slides away under it (below), so the
     detail lays its sections straight on the sheet's material and never
     stacks a second translucent layer over readable content. */
  .sp-detail {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    z-index: 20;
    transform: translateX(100%);
    transition: transform 0.2s var(--sp-ease-out);
    will-change: transform;
    overflow: clip;
  }

  /* Pushed in on the drawer curve, back out the same way, faster. */
  .sp-detail--visible {
    transform: translateX(0);
    transition: transform 0.3s var(--sp-ease-drawer);
  }

  /* The list it covers slides a little left and fades, like a navigation
     stack; hidden once out of sight, so it leaves the tab order and the
     accessibility tree. It comes back on the faster curve, at once visible. */
  .sp-panel > :is(.sp-panel-header, .sp-stats-bar, .sp-filters, .sp-list) {
    transition:
      opacity 0.2s var(--sp-ease-out),
      transform 0.2s var(--sp-ease-out),
      visibility 0s;
  }

  .sp-panel--detail > :is(.sp-panel-header, .sp-stats-bar, .sp-filters, .sp-list) {
    opacity: 0;
    transform: translateX(-24%);
    visibility: hidden;
    transition:
      opacity 0.3s var(--sp-ease-drawer),
      transform 0.3s var(--sp-ease-drawer),
      visibility 0s linear 0.3s;
  }

  .sp-panel--detail > :is(.sp-bulk-bar, .sp-shortcuts-hint) {
    visibility: hidden;
    opacity: 0;
  }

  /* ---- Header ---- */

  .sp-detail-header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 10px 12px 6px 6px;
    flex-shrink: 0;
    min-height: 60px;
  }

  /* The back chevron: an accent glyph in a 44px circle. */
  .sp-detail-back {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sp-accent-ink);
    transition: var(--sp-tr);
    flex-shrink: 0;
    padding: 0;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-detail-back:hover {
      background: var(--sp-fill);
    }
  }

  .sp-detail-back svg {
    width: 20px;
    height: 20px;
    stroke-width: 2.4;
  }

  .sp-detail-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--sp-text);
    letter-spacing: -0.024em;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sp-detail-header .sp-badge {
    flex-shrink: 0;
  }

  /* ---- Content ---- */

  /* Sections fade out under the header rather than being cut by it. */
  .sp-detail-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 0 20px;
    -webkit-mask-image: linear-gradient(to bottom, transparent, #000 10px);
    mask-image: linear-gradient(to bottom, transparent, #000 10px);
  }

  .sp-detail-content::-webkit-scrollbar {
    width: 6px;
  }

  .sp-detail-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .sp-detail-content::-webkit-scrollbar-thumb {
    background: var(--sp-fill-strong);
    border-radius: var(--sp-radius-full);
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-detail-content::-webkit-scrollbar-thumb:hover {
      background: var(--sp-text-tertiary);
    }
  }

  /* ---- Section: inset grouped, a caption over its rows ---- */

  .sp-detail-section {
    margin-top: 22px;
    padding: 0 16px;
  }

  .sp-detail-section:first-child {
    margin-top: 8px;
  }

  .sp-detail-section-title {
    font-size: 12px;
    font-weight: 500;
    color: var(--sp-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0 16px 7px;
  }

  /* ---- Status + Actions Section ---- */

  .sp-detail-status {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .sp-detail-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: var(--sp-radius-full);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.005em;
  }

  /* A tint of the status with its ink, 4.5:1 on the tint in both themes;
     closed statuses go grey. */
  .sp-detail-status-pill--open {
    background: color-mix(in srgb, var(--sp-status-open) 13%, transparent);
    color: var(--sp-ink-green);
  }

  .sp-detail-status-pill--in-progress {
    background: color-mix(in srgb, var(--sp-status-in-progress) 13%, transparent);
    color: var(--sp-ink-amber);
  }

  .sp-detail-status-pill--resolved,
  .sp-detail-status-pill--wont-fix {
    background: var(--sp-fill);
    color: var(--sp-text-secondary);
  }

  .sp-detail-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .sp-detail-actions {
    display: flex;
    gap: 10px;
  }

  /* Tinted buttons, the system's large size. */
  .sp-detail-actions button,
  .sp-detail-actions a {
    flex: 1;
    height: 44px;
    padding: 0 16px;
    border: none;
    border-radius: 12px;
    font-family: var(--sp-font);
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: var(--sp-tr);
  }

  .sp-detail-actions button svg,
  .sp-detail-actions a svg {
    width: 16px;
    height: 16px;
  }

  .sp-detail-btn-resolve {
    background: color-mix(in srgb, var(--sp-status-open) 14%, transparent);
    color: var(--sp-ink-green);
  }

  .sp-detail-btn-reopen {
    background: color-mix(in srgb, var(--sp-accent) 13%, transparent);
    color: var(--sp-accent-ink);
  }

  .sp-detail-btn-delete {
    background: color-mix(in srgb, var(--sp-type-bug) 11%, transparent);
    color: var(--sp-ink-red);
  }

  .sp-detail-btn-custom {
    background: var(--sp-fill);
    color: var(--sp-text);
    text-decoration: none;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-detail-btn-resolve:hover {
      background: color-mix(in srgb, var(--sp-status-open) 20%, transparent);
    }

    .sp-detail-btn-reopen:hover {
      background: color-mix(in srgb, var(--sp-accent) 19%, transparent);
    }

    .sp-detail-btn-delete:hover {
      background: color-mix(in srgb, var(--sp-type-bug) 16%, transparent);
    }

    .sp-detail-btn-custom:hover {
      background: var(--sp-fill-strong);
    }
  }

  .sp-detail-actions--custom {
    flex-wrap: wrap;
    margin-top: 8px;
  }

  /* Content-sized so the row wraps, shrinkable so one long label truncates. */
  .sp-detail-actions--custom > .sp-detail-btn-custom {
    flex: 1 1 auto;
    min-width: 0;
  }

  .sp-detail-btn-custom svg {
    flex-shrink: 0;
  }

  .sp-detail-btn-custom span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sp-detail-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* ---- Message Section: a solid row, body text size ---- */

  .sp-detail-message {
    font-size: 15px;
    line-height: 1.47;
    letter-spacing: -0.012em;
    color: var(--sp-text);
    padding: 12px 16px;
    border-radius: var(--sp-radius-lg);
    background: var(--sp-row);
    box-shadow: var(--sp-shadow-row);
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* ---- Thread Section ---- */

  .sp-thread-list {
    list-style: none;
  }

  .sp-comment {
    margin-top: 8px;
  }

  /* The team's replies take a faint accent tint. */
  .sp-comment[data-role="team"] {
    background: color-mix(in srgb, var(--sp-accent) 8%, var(--sp-row));
  }

  .sp-comment-head,
  .sp-thread-foot {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .sp-comment-head {
    margin-bottom: 4px;
    font-size: 13px;
    font-weight: 600;
  }

  .sp-comment-head time,
  .sp-thread-foot,
  .sp-thread-input::placeholder {
    font-weight: 400;
    color: var(--sp-text-secondary);
  }

  .sp-comment-head time {
    margin-left: auto;
  }

  /* The reply field is a row of the section, not a grey field
     (two classes: over .sp-input and its focus state). */
  .sp-input.sp-thread-input {
    height: auto;
    min-height: 84px;
    margin-top: 8px;
    padding: 11px 16px;
    border-radius: var(--sp-radius-lg);
    background: var(--sp-row);
    line-height: 1.4;
    box-shadow: var(--sp-shadow-row);
  }

  .sp-input.sp-thread-input:focus {
    background: var(--sp-row);
    box-shadow: var(--sp-ring);
  }

  .sp-thread-foot {
    justify-content: space-between;
    margin-top: 8px;
    padding-left: 16px;
    font-size: 12px;
  }

  .sp-thread-foot .sp-btn-primary {
    height: 34px;
    padding: 0 18px;
    border-radius: var(--sp-radius-full);
  }

  /* A reply in flight: Send spins, and keeps the keyboard focus. */
  .sp-thread-foot [aria-busy="true"]::before {
    content: "";
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 8px;
    border: 2px solid;
    border-top-color: transparent;
    border-radius: 50%;
    animation: sp-spin 0.6s linear infinite;
  }

  .sp-thread-error {
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--sp-type-bug) 11%, transparent);
    color: var(--sp-ink-red);
    font-size: 12px;
  }

  .sp-thread-error:empty {
    display: none;
  }

  /* ---- Screenshot Section ---- */

  .sp-detail-screenshot {
    display: block;
    width: 100%;
    height: auto;
    max-height: 400px;
    object-fit: contain;
    border-radius: var(--sp-radius-lg);
    background: var(--sp-row);
    box-shadow: 0 0 0 0.5px var(--sp-separator);
  }

  /* ---- Metadata and annotation: rows with inset separators ---- */

  .sp-detail-meta,
  .sp-detail-annotation-info {
    display: flex;
    flex-direction: column;
    padding: 0 16px;
    border-radius: var(--sp-radius-lg);
    background: var(--sp-row);
    box-shadow: var(--sp-shadow-row);
  }

  .sp-detail-meta-row,
  .sp-detail-annotation-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .sp-detail-meta-row svg,
  .sp-detail-annotation-row svg {
    width: 16px;
    height: 16px;
    color: var(--sp-text-tertiary);
    flex-shrink: 0;
    margin-top: 13px;
  }

  /* The separator starts at the text, past the icon. */
  .sp-detail-meta-content {
    flex: 1;
    min-width: 0;
    padding: 10px 0;
  }

  .sp-detail-meta-row + .sp-detail-meta-row .sp-detail-meta-content,
  .sp-detail-annotation-row + .sp-detail-annotation-row .sp-detail-meta-content {
    border-top: 0.5px solid var(--sp-separator);
  }

  .sp-detail-meta-label,
  .sp-detail-annotation-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--sp-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1;
    margin-bottom: 3px;
  }

  .sp-detail-meta-value,
  .sp-detail-annotation-value {
    font-size: 15px;
    line-height: 1.33;
    letter-spacing: -0.01em;
    color: var(--sp-text);
    word-break: break-all;
  }

  .sp-detail-meta-value--mono,
  .sp-detail-annotation-value--mono {
    font-family: var(--sp-font-mono);
    font-size: 12px;
    letter-spacing: 0;
    background: var(--sp-fill);
    padding: 1px 6px;
    border-radius: 6px;
  }

  .sp-detail-meta-value--secondary {
    color: var(--sp-text-secondary);
    font-size: 13px;
  }

  /* ---- Annotation Section ---- */

  .sp-detail-annotation {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .sp-detail-annotation-value--mono {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sp-detail-btn-goto {
    width: 100%;
    height: 44px;
    padding: 0 20px;
    border-radius: 12px;
    border: none;
    background: var(--sp-accent);
    color: #fff;
    font-family: var(--sp-font);
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: var(--sp-tr);
  }

  .sp-detail-btn-goto svg {
    width: 16px;
    height: 16px;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-detail-btn-goto:hover {
      background: var(--sp-accent-dark);
    }
  }

  /* ---- Diagnostics: a disclosure row, then grouped mono lists ---- */

  .sp-detail-diag {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .sp-detail-diag-toggle {
    width: 100%;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 0 14px 0 16px;
    border-radius: var(--sp-radius-lg);
    border: none;
    background: var(--sp-row);
    box-shadow: var(--sp-shadow-row);
    color: var(--sp-text);
    font-family: var(--sp-font);
    font-size: 15px;
    font-weight: 400;
    letter-spacing: -0.01em;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  @media (hover: hover) and (pointer: fine) {
    .sp-detail-diag-toggle:hover {
      background: var(--sp-row-hover);
    }
  }

  .sp-detail-diag-toggle svg {
    width: 12px;
    height: 12px;
    color: var(--sp-text-tertiary);
    transition: transform 0.2s ease;
  }

  .sp-detail-diag-toggle[aria-expanded="true"] svg {
    transform: rotate(90deg);
  }

  .sp-detail-diag-counts {
    display: inline-flex;
    gap: 6px;
    font-weight: 500;
    color: var(--sp-text-secondary);
  }

  .sp-detail-diag-count {
    padding: 2px 8px;
    border-radius: var(--sp-radius-full);
    background: var(--sp-fill);
    color: var(--sp-text-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .sp-detail-diag-count--errors {
    background: color-mix(in srgb, var(--sp-type-bug) 11%, transparent);
    color: var(--sp-ink-red);
  }

  .sp-detail-diag-body {
    display: none;
    flex-direction: column;
    gap: 14px;
  }

  .sp-detail-diag-body--open {
    display: flex;
  }

  .sp-detail-diag-group-title {
    font-size: 11px;
    font-weight: 500;
    color: var(--sp-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0 16px 7px;
  }

  .sp-detail-diag-list {
    list-style: none;
    padding: 0;
    margin: 0;
    border-radius: var(--sp-radius-lg);
    background: var(--sp-row);
    box-shadow: var(--sp-shadow-row);
    max-height: 240px;
    overflow-y: auto;
  }

  .sp-detail-diag-list li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 9px 14px;
    border-bottom: 0.5px solid var(--sp-separator);
    font-family: var(--sp-font-mono);
    font-size: 11px;
    line-height: 1.45;
    color: var(--sp-text);
  }

  .sp-detail-diag-list li:last-child {
    border-bottom: none;
  }

  .sp-detail-diag-level {
    flex-shrink: 0;
    font-weight: 700;
    width: 44px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 10px;
  }

  .sp-detail-diag-level--log {
    color: var(--sp-text-tertiary);
  }
  .sp-detail-diag-level--info {
    color: var(--sp-type-question);
  }
  .sp-detail-diag-level--warn {
    color: var(--sp-type-change);
  }
  .sp-detail-diag-level--error {
    color: var(--sp-type-bug);
  }

  .sp-detail-diag-message {
    flex: 1;
    min-width: 0;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .sp-detail-diag-net {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 8px;
    align-items: center;
  }

  .sp-detail-diag-net-status {
    flex-shrink: 0;
    font-weight: 700;
    color: var(--sp-type-bug);
    min-width: 32px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .sp-detail-diag-net-method {
    flex-shrink: 0;
    font-weight: 600;
    color: var(--sp-text-tertiary);
    min-width: 44px;
  }

  .sp-detail-diag-net-url {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--sp-text);
  }

  .sp-detail-diag-empty {
    padding: 12px;
    font-style: italic;
    font-size: 11px;
    color: var(--sp-text-tertiary);
    text-align: center;
  }

  /* ---- Forced Colors / High Contrast ---- */

  @media (forced-colors: active) {
    .sp-detail {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
    }

    .sp-detail-back,
    .sp-detail-btn-goto,
    .sp-detail-btn-resolve,
    .sp-detail-btn-reopen,
    .sp-detail-btn-delete,
    .sp-detail-btn-custom {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
      color: ButtonText !important;
    }

    .sp-detail-back:focus-visible,
    .sp-detail-btn-goto:focus-visible,
    .sp-detail-btn-resolve:focus-visible,
    .sp-detail-btn-reopen:focus-visible,
    .sp-detail-btn-delete:focus-visible,
    .sp-detail-btn-custom:focus-visible {
      outline: 3px solid Highlight !important;
    }

    .sp-detail-status-pill {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
      color: ButtonText !important;
    }

    /* The rows are drawn by shadows, which forced colours drop. */
    .sp-detail-message,
    .sp-detail-screenshot,
    .sp-detail-meta,
    .sp-detail-annotation-info,
    .sp-detail-diag-toggle,
    .sp-detail-diag-list {
      border: 1px solid ButtonText;
    }
  }
`;
