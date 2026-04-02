import { ANIMATION_CSS } from "./animations.js";
import { type ThemeColors, cssVariables } from "./theme.js";

/**
 * Build the complete CSS stylesheet for the Shadow DOM.
 *
 * Design principles:
 * - :host uses `all: initial` to block inherited styles from bleeding in
 * - All classes prefixed with sp- even inside Shadow DOM (defense in depth)
 * - CSS custom properties for theming
 * - No external fonts — system-ui stack only
 */
export function buildStyles(colors: ThemeColors): string {
  return `
    :host {
      all: initial;
      position: fixed;
      z-index: 2147483647;
      font-family: var(--sp-font);
      font-size: 14px;
      line-height: 1.5;
      color: var(--sp-text);
      ${cssVariables(colors)}
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* ---- FAB (Floating Action Button) ---- */

    .sp-fab {
      position: fixed;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--sp-accent);
      color: #fff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px var(--sp-shadow), 0 2px 4px var(--sp-shadow);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      outline: none;
    }

    .sp-fab:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px var(--sp-shadow), 0 3px 6px var(--sp-shadow);
    }

    .sp-fab:active {
      transform: scale(0.95);
    }

    .sp-fab--bottom-right {
      bottom: 24px;
      right: 24px;
    }

    .sp-fab--bottom-left {
      bottom: 24px;
      left: 24px;
    }

    .sp-fab svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }

    /* ---- Radial Menu ---- */

    .sp-radial {
      position: fixed;
      pointer-events: none;
    }

    .sp-radial--bottom-right {
      bottom: 24px;
      right: 24px;
    }

    .sp-radial--bottom-left {
      bottom: 24px;
      left: 24px;
    }

    .sp-radial-item {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--sp-bg);
      color: var(--sp-text);
      border: 1px solid var(--sp-border);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px var(--sp-shadow);
      font-size: 12px;
      font-weight: 600;
    }

    .sp-radial-item:hover {
      background: var(--sp-bg-hover);
      border-color: var(--sp-accent);
      color: var(--sp-accent);
    }

    .sp-radial-item svg {
      width: 20px;
      height: 20px;
    }

    .sp-radial-label {
      position: absolute;
      white-space: nowrap;
      font-size: 11px;
      font-weight: 500;
      color: var(--sp-text-secondary);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .sp-radial-item:hover + .sp-radial-label,
    .sp-radial-item--open + .sp-radial-label {
      opacity: 1;
    }

    /* ---- Panel ---- */

    .sp-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 380px;
      height: 100vh;
      background: var(--sp-bg);
      box-shadow: -4px 0 16px var(--sp-shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sp-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--sp-border);
    }

    .sp-panel-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--sp-text);
    }

    .sp-panel-close {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--sp-text-secondary);
      transition: background 0.15s ease, color 0.15s ease;
    }

    .sp-panel-close:hover {
      background: var(--sp-bg-hover);
      color: var(--sp-text);
    }

    /* ---- Filter bar ---- */

    .sp-filters {
      padding: 12px 20px;
      border-bottom: 1px solid var(--sp-border);
      position: sticky;
      top: 0;
      background: var(--sp-bg);
      z-index: 1;
    }

    .sp-search {
      width: 100%;
      height: 40px;
      padding: 0 12px 0 36px;
      border-radius: var(--sp-radius);
      border: 1px solid var(--sp-border);
      background: var(--sp-bg);
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .sp-search:focus {
      border-color: var(--sp-accent);
    }

    .sp-search-wrap {
      position: relative;
      margin-bottom: 10px;
    }

    .sp-search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--sp-text-secondary);
      width: 18px;
      height: 18px;
    }

    .sp-chips {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .sp-chip {
      padding: 4px 10px;
      border-radius: 16px;
      border: 1px solid var(--sp-border);
      background: var(--sp-bg);
      color: var(--sp-text-secondary);
      font-family: var(--sp-font);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .sp-chip:hover {
      border-color: var(--sp-accent);
      color: var(--sp-accent);
    }

    .sp-chip--active {
      background: var(--sp-accent);
      border-color: var(--sp-accent);
      color: #fff;
    }

    /* ---- Feedback list ---- */

    .sp-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }

    .sp-card {
      display: flex;
      padding: 12px 20px;
      cursor: pointer;
      transition: background 0.15s ease;
      border-bottom: 1px solid var(--sp-border);
    }

    .sp-card:hover {
      background: var(--sp-bg-hover);
    }

    .sp-card-bar {
      width: 4px;
      border-radius: 2px;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .sp-card-body {
      flex: 1;
      min-width: 0;
    }

    .sp-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .sp-card-number {
      font-size: 12px;
      font-weight: 600;
      color: var(--sp-text-secondary);
    }

    .sp-badge {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
    }

    .sp-card-date {
      font-size: 11px;
      color: var(--sp-text-secondary);
      margin-left: auto;
    }

    .sp-card-message {
      font-size: 13px;
      line-height: 1.4;
      color: var(--sp-text);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .sp-card-message--expanded {
      -webkit-line-clamp: unset;
    }

    .sp-card-expand {
      font-size: 12px;
      color: var(--sp-accent);
      cursor: pointer;
      background: none;
      border: none;
      padding: 4px 0;
      font-family: var(--sp-font);
    }

    .sp-card-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      margin-top: 8px;
    }

    .sp-btn-resolve {
      padding: 4px 12px;
      border-radius: var(--sp-radius);
      border: 1px solid var(--sp-border);
      background: transparent;
      color: var(--sp-text-secondary);
      font-family: var(--sp-font);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .sp-btn-resolve:hover {
      border-color: #22c55e;
      color: #22c55e;
    }

    .sp-card--resolved {
      opacity: 0.6;
    }

    .sp-card--resolved .sp-card-message {
      text-decoration: line-through;
    }

    /* ---- Identity form ---- */

    .sp-identity {
      padding: 24px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .sp-identity-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--sp-text);
    }

    .sp-input {
      width: 100%;
      height: 40px;
      padding: 0 12px;
      border-radius: var(--sp-radius);
      border: 1px solid var(--sp-border);
      background: var(--sp-bg);
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .sp-input:focus {
      border-color: var(--sp-accent);
    }

    .sp-input-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--sp-text-secondary);
      margin-bottom: 4px;
    }

    .sp-btn-primary {
      height: 40px;
      padding: 0 20px;
      border-radius: var(--sp-radius);
      border: none;
      background: var(--sp-accent);
      color: #fff;
      font-family: var(--sp-font);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.1s ease;
    }

    .sp-btn-primary:hover {
      filter: brightness(1.1);
    }

    .sp-btn-primary:active {
      transform: scale(0.98);
    }

    .sp-btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .sp-btn-ghost {
      height: 40px;
      padding: 0 20px;
      border-radius: var(--sp-radius);
      border: 1px solid var(--sp-border);
      background: transparent;
      color: var(--sp-text-secondary);
      font-family: var(--sp-font);
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .sp-btn-ghost:hover {
      border-color: var(--sp-accent);
      color: var(--sp-accent);
    }

    /* ---- Empty state ---- */

    .sp-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 20px;
      color: var(--sp-text-secondary);
      text-align: center;
      gap: 8px;
    }

    .sp-empty-icon {
      width: 48px;
      height: 48px;
      opacity: 0.3;
    }

    .sp-empty-text {
      font-size: 14px;
    }

    ${ANIMATION_CSS}
  `;
}
