import type { FeedbackResponse } from "@siteping/core";
import { el, setText } from "./dom-utils.js";
import type { TFunction } from "./i18n/index.js";
import type { ThemeColors } from "./styles/theme.js";

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

export const STATS_CSS = /* css */ `
  .sp-stats-bar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 24px;
    border-bottom: 1px solid var(--sp-border);
    user-select: none;
  }

  .sp-stats-bar[hidden] {
    display: none;
  }

  .sp-stats-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .sp-stats-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .sp-stats-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .sp-stats-value {
    font-size: 16px;
    font-weight: 600;
    line-height: 1;
    color: var(--sp-text);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    transition: opacity 0.3s ease;
  }

  .sp-stats-label {
    font-size: 11px;
    line-height: 1;
    color: var(--sp-text-tertiary);
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
    background: var(--sp-border);
    overflow: hidden;
  }

  .sp-stats-progress-fill {
    height: 100%;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--sp-accent), #22c55e);
    width: 0%;
    transition: width 0.5s ease;
  }

  .sp-stats-progress-label {
    font-size: 10px;
    line-height: 1;
    color: var(--sp-text-tertiary);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    min-width: 64px;
    text-align: right;
  }
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Compact statistics bar displayed between filters and the feedback list.
 * Shows open/resolved/bug counts and a resolved-percentage progress bar.
 */
export class PanelStats {
  readonly element: HTMLElement;

  private readonly valueOpen: HTMLElement;
  private readonly valueResolved: HTMLElement;
  private readonly valueBugs: HTMLElement;
  private readonly progressFill: HTMLElement;
  private readonly progressLabel: HTMLElement;
  private readonly t: TFunction;

  constructor(
    private readonly colors: ThemeColors,
    t: TFunction,
  ) {
    this.t = t;
    // Container
    this.element = el("div", { class: "sp-stats-bar" });
    this.element.setAttribute("aria-label", "Feedback statistics");
    this.element.hidden = true;

    // --- Stats row ---
    const row = el("div", { class: "sp-stats-row" });

    // Open
    const itemOpen = el("div", { class: "sp-stats-item" });
    const dotOpen = el("span", { class: "sp-stats-dot" });
    dotOpen.style.background = "#22c55e";
    this.valueOpen = el("span", { class: "sp-stats-value" });
    setText(this.valueOpen, "0");
    const labelOpen = el("span", { class: "sp-stats-label" });
    setText(labelOpen, this.t("stats.open"));
    itemOpen.appendChild(dotOpen);
    itemOpen.appendChild(this.valueOpen);
    itemOpen.appendChild(labelOpen);

    // Resolved
    const itemResolved = el("div", { class: "sp-stats-item" });
    const dotResolved = el("span", { class: "sp-stats-dot" });
    dotResolved.style.background = "#9ca3af";
    this.valueResolved = el("span", { class: "sp-stats-value" });
    setText(this.valueResolved, "0");
    const labelResolved = el("span", { class: "sp-stats-label" });
    setText(labelResolved, this.t("stats.resolved"));
    itemResolved.appendChild(dotResolved);
    itemResolved.appendChild(this.valueResolved);
    itemResolved.appendChild(labelResolved);

    // Bugs
    const itemBugs = el("div", { class: "sp-stats-item" });
    const dotBugs = el("span", { class: "sp-stats-dot" });
    dotBugs.style.background = this.colors.typeBug;
    this.valueBugs = el("span", { class: "sp-stats-value" });
    setText(this.valueBugs, "0");
    const labelBugs = el("span", { class: "sp-stats-label" });
    setText(labelBugs, this.t("stats.bugs"));
    itemBugs.appendChild(dotBugs);
    itemBugs.appendChild(this.valueBugs);
    itemBugs.appendChild(labelBugs);

    row.appendChild(itemOpen);
    row.appendChild(itemResolved);
    row.appendChild(itemBugs);

    // --- Progress bar ---
    const progress = el("div", { class: "sp-stats-progress" });
    const track = el("div", { class: "sp-stats-progress-track" });
    this.progressFill = el("div", { class: "sp-stats-progress-fill" });
    track.appendChild(this.progressFill);
    this.progressLabel = el("span", { class: "sp-stats-progress-label" });
    setText(this.progressLabel, "");
    progress.appendChild(track);
    progress.appendChild(this.progressLabel);

    this.element.appendChild(row);
    this.element.appendChild(progress);
  }

  /** Update stats from current feedbacks array + total count. */
  update(feedbacks: FeedbackResponse[], total: number): void {
    // Hide when there are no feedbacks at all
    if (total === 0) {
      this.element.hidden = true;
      return;
    }
    this.element.hidden = false;

    let openCount = 0;
    let resolvedCount = 0;
    let bugCount = 0;

    for (const fb of feedbacks) {
      if (fb.status === "open") openCount++;
      if (fb.status === "resolved") resolvedCount++;
      if (fb.type === "bug") bugCount++;
    }

    setText(this.valueOpen, String(openCount));
    setText(this.valueResolved, String(resolvedCount));
    setText(this.valueBugs, String(bugCount));

    // Percentage resolved (relative to visible feedbacks, not total)
    const visible = feedbacks.length;
    const pct = visible > 0 ? Math.round((resolvedCount / visible) * 100) : 0;

    // Animate fill width via rAF so the transition kicks in after the DOM update
    requestAnimationFrame(() => {
      this.progressFill.style.width = `${pct}%`;
    });

    const progressText = this.t("stats.progress").replace("{percent}", String(pct));
    setText(this.progressLabel, progressText);
  }
}
