import type { FeedbackResponse } from "@siteping/core";
import { el, parseSvg, setText } from "./dom-utils.js";
import type { TFunction } from "./i18n/index.js";
import type { ThemeColors } from "./styles/theme.js";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

export const ICON_EXPORT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

const ICON_CSV = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`;

const ICON_JSON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H6a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h2"/><path d="M16 3h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-2"/></svg>`;

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

export const EXPORT_CSS = `
  /* ============================
     Export Button & Menu
     ============================ */

  .sp-export-btn {
    padding: 5px 12px;
    border-radius: var(--sp-radius-full);
    border: 1px solid var(--sp-border);
    background: transparent;
    color: var(--sp-text-tertiary);
    font-family: var(--sp-font);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;
    position: relative;
  }

  .sp-export-btn svg {
    width: 13px;
    height: 13px;
  }

  .sp-export-btn:hover {
    border-color: var(--sp-accent);
    color: var(--sp-accent);
    background: var(--sp-accent-light);
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
    padding: 4px;
    border-radius: var(--sp-radius);
    background: var(--sp-glass-bg-heavy);
    backdrop-filter: blur(var(--sp-blur));
    -webkit-backdrop-filter: blur(var(--sp-blur));
    border: 1px solid var(--sp-glass-border);
    box-shadow: var(--sp-shadow-lg);
    z-index: 10;
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
    transition: opacity 0.15s ease, transform 0.15s ease;
    pointer-events: none;
  }

  .sp-export-menu--open {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  .sp-export-option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--sp-text-secondary);
    font-family: var(--sp-font);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
  }

  .sp-export-option:hover,
  .sp-export-option:focus-visible {
    background: var(--sp-accent-light);
    color: var(--sp-accent);
  }

  .sp-export-option-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
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

// ---------------------------------------------------------------------------
// CSV / JSON conversion
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  "id",
  "type",
  "status",
  "message",
  "url",
  "authorName",
  "authorEmail",
  "createdAt",
  "resolvedAt",
  "viewport",
] as const;

/** Escape a value for CSV: wrap in double-quotes if it contains commas, newlines, or quotes. */
function escapeCsvField(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Convert feedbacks to CSV string */
export function feedbacksToCsv(feedbacks: FeedbackResponse[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = feedbacks.map((fb) =>
    CSV_COLUMNS.map((col) => {
      const raw = fb[col];
      return escapeCsvField(raw == null ? "" : String(raw));
    }).join(","),
  );
  return [header, ...rows].join("\n");
}

/** Convert feedbacks to formatted JSON string */
export function feedbacksToJson(feedbacks: FeedbackResponse[]): string {
  return JSON.stringify(feedbacks, null, 2);
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

/** Trigger browser download of a string as file */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  // Clean up after a tick to ensure the download starts
  requestAnimationFrame(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  });
}

// ---------------------------------------------------------------------------
// ExportButton component
// ---------------------------------------------------------------------------

export class ExportButton {
  readonly element: HTMLElement;

  private menu: HTMLElement;
  private isOpen = false;
  private onDocumentClick: (e: MouseEvent) => void;

  constructor(
    _colors: ThemeColors,
    private readonly getFeedbacks: () => FeedbackResponse[],
    t: TFunction,
  ) {
    // Wrapper for relative positioning of the menu
    this.element = el("div", { style: "position: relative; display: inline-flex;" });

    // Trigger button — matches .sp-btn-delete-all pill style
    const btn = document.createElement("button");
    btn.className = "sp-export-btn";
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.appendChild(parseSvg(ICON_EXPORT));
    const label = document.createElement("span");
    setText(label, t("export.label"));
    btn.appendChild(label);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Dropdown menu
    this.menu = el("div", { class: "sp-export-menu" });
    this.menu.setAttribute("role", "menu");

    // CSV option
    const csvOption = this.createOption(ICON_CSV, t("export.csv"), () => {
      this.exportAs("csv");
    });

    // JSON option
    const jsonOption = this.createOption(ICON_JSON, t("export.json"), () => {
      this.exportAs("json");
    });

    this.menu.appendChild(csvOption);
    this.menu.appendChild(jsonOption);

    this.element.appendChild(btn);
    this.element.appendChild(this.menu);

    // Close on outside click
    this.onDocumentClick = (e: MouseEvent) => {
      if (this.isOpen && !this.element.contains(e.target as Node)) {
        this.close();
      }
    };
    document.addEventListener("click", this.onDocumentClick, true);
  }

  private createOption(iconSvg: string, labelText: string, onClick: () => void): HTMLButtonElement {
    const option = document.createElement("button");
    option.className = "sp-export-option";
    option.setAttribute("role", "menuitem");

    const iconWrap = el("span", { class: "sp-export-option-icon" });
    iconWrap.appendChild(parseSvg(iconSvg));

    const labelEl = el("span", { class: "sp-export-option-label" });
    setText(labelEl, labelText);

    option.appendChild(iconWrap);
    option.appendChild(labelEl);

    option.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
      this.close();
    });

    return option;
  }

  private toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  private open(): void {
    this.isOpen = true;
    this.menu.classList.add("sp-export-menu--open");
    const btn = this.element.querySelector<HTMLButtonElement>(".sp-export-btn");
    btn?.setAttribute("aria-expanded", "true");
  }

  private close(): void {
    this.isOpen = false;
    this.menu.classList.remove("sp-export-menu--open");
    const btn = this.element.querySelector<HTMLButtonElement>(".sp-export-btn");
    btn?.setAttribute("aria-expanded", "false");
  }

  private exportAs(format: "csv" | "json"): void {
    const feedbacks = this.getFeedbacks();
    if (feedbacks.length === 0) return;

    const projectName = feedbacks[0]?.projectName ?? "feedbacks";
    const date = new Date().toISOString().slice(0, 10);
    const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_");

    if (format === "csv") {
      const content = feedbacksToCsv(feedbacks);
      downloadFile(content, `feedbacks-${safeName}-${date}.csv`, "text/csv;charset=utf-8");
    } else {
      const content = feedbacksToJson(feedbacks);
      downloadFile(content, `feedbacks-${safeName}-${date}.json`, "application/json;charset=utf-8");
    }
  }

  destroy(): void {
    document.removeEventListener("click", this.onDocumentClick, true);
    this.element.remove();
  }
}
