// @vitest-environment jsdom

import type { FeedbackResponse } from "@siteping/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PanelStats, STATS_CSS, STATS_I18N_EN, STATS_I18N_FR } from "../../src/panel-stats.js";
import { buildThemeColors } from "../../src/styles/theme.js";

function makeFeedback(overrides: Partial<FeedbackResponse> = {}): FeedbackResponse {
  return {
    id: "fb-1",
    projectName: "test-project",
    type: "bug",
    message: "Something is broken",
    status: "open",
    url: "https://example.com/docs/start",
    viewport: "1920x1080",
    userAgent: "test",
    authorName: "Test User",
    authorEmail: "test@example.com",
    resolvedAt: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    annotations: [],
    ...overrides,
  };
}

describe("PanelStats", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
    // Run rAF synchronously for deterministic assertions
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  it("exposes English i18n constants and CSS", () => {
    expect(STATS_I18N_EN["stats.open"]).toBe("Open");
    expect(STATS_I18N_EN["stats.resolved"]).toBe("Resolved");
    expect(STATS_I18N_EN["stats.bugs"]).toBe("Bugs");
    expect(STATS_I18N_EN["stats.progress"]).toBe("{percent}% resolved");
    expect(STATS_I18N_FR["stats.open"]).toBe("Ouverts");
    expect(STATS_I18N_FR["stats.progress"]).toBe("{percent}% résolus");
    expect(STATS_CSS).toContain(".sp-stats-bar");
  });

  it("creates a hidden stats element by default with English labels", () => {
    const stats = new PanelStats(buildThemeColors());
    document.body.appendChild(stats.element);

    expect(stats.element.classList.contains("sp-stats-bar")).toBe(true);
    expect(stats.element.hidden).toBe(true);
    expect(stats.element.getAttribute("aria-label")).toBe("Feedback statistics");

    const labels = stats.element.querySelectorAll<HTMLElement>(".sp-stats-label");
    const labelTexts = Array.from(labels).map((el) => el.textContent);
    expect(labelTexts).toEqual([
      STATS_I18N_EN["stats.open"],
      STATS_I18N_EN["stats.resolved"],
      STATS_I18N_EN["stats.bugs"],
    ]);
  });

  it("renders French labels when locale='fr'", () => {
    const stats = new PanelStats(buildThemeColors(), "fr");
    document.body.appendChild(stats.element);

    const labels = stats.element.querySelectorAll<HTMLElement>(".sp-stats-label");
    const labelTexts = Array.from(labels).map((el) => el.textContent);
    expect(labelTexts).toEqual([
      STATS_I18N_FR["stats.open"],
      STATS_I18N_FR["stats.resolved"],
      STATS_I18N_FR["stats.bugs"],
    ]);
  });

  it("falls back to English when locale is undefined or another", () => {
    const stats = new PanelStats(buildThemeColors(), "de");
    document.body.appendChild(stats.element);

    const labels = stats.element.querySelectorAll<HTMLElement>(".sp-stats-label");
    expect(labels[0].textContent).toBe(STATS_I18N_EN["stats.open"]);
  });

  it("hides the bar when total === 0", () => {
    const stats = new PanelStats(buildThemeColors());
    document.body.appendChild(stats.element);

    // Force-show first, then call with total=0 to verify hiding
    stats.element.hidden = false;
    stats.update([], 0);

    expect(stats.element.hidden).toBe(true);
  });

  it("shows the bar and updates open/resolved/bug counts", () => {
    const stats = new PanelStats(buildThemeColors());
    document.body.appendChild(stats.element);

    stats.update(
      [
        makeFeedback({ id: "1", status: "open", type: "bug" }),
        makeFeedback({ id: "2", status: "open", type: "question" }),
        makeFeedback({ id: "3", status: "resolved", type: "bug" }),
        makeFeedback({ id: "4", status: "resolved", type: "change" }),
      ],
      4,
    );

    expect(stats.element.hidden).toBe(false);

    const values = stats.element.querySelectorAll<HTMLElement>(".sp-stats-value");
    // open=2, resolved=2, bugs=2
    expect(values[0].textContent).toBe("2");
    expect(values[1].textContent).toBe("2");
    expect(values[2].textContent).toBe("2");
  });

  it("computes the percentage resolved relative to visible feedbacks", () => {
    const stats = new PanelStats(buildThemeColors());
    document.body.appendChild(stats.element);

    stats.update(
      [
        makeFeedback({ id: "1", status: "resolved" }),
        makeFeedback({ id: "2", status: "resolved" }),
        makeFeedback({ id: "3", status: "open" }),
        makeFeedback({ id: "4", status: "open" }),
      ],
      4,
    );

    const fill = stats.element.querySelector<HTMLElement>(".sp-stats-progress-fill")!;
    expect(fill.style.width).toBe("50%");

    const label = stats.element.querySelector<HTMLElement>(".sp-stats-progress-label")!;
    expect(label.textContent).toContain("50%");
    expect(label.textContent).toContain("resolved");
  });

  it("renders 0% when feedbacks is empty but total > 0 (filtered out)", () => {
    const stats = new PanelStats(buildThemeColors());
    document.body.appendChild(stats.element);

    stats.update([], 5);

    expect(stats.element.hidden).toBe(false);
    const fill = stats.element.querySelector<HTMLElement>(".sp-stats-progress-fill")!;
    expect(fill.style.width).toBe("0%");
    const label = stats.element.querySelector<HTMLElement>(".sp-stats-progress-label")!;
    expect(label.textContent).toContain("0%");

    const values = stats.element.querySelectorAll<HTMLElement>(".sp-stats-value");
    expect(values[0].textContent).toBe("0");
    expect(values[1].textContent).toBe("0");
    expect(values[2].textContent).toBe("0");
  });

  it("uses the French progress text when locale='fr'", () => {
    const stats = new PanelStats(buildThemeColors(), "fr");
    document.body.appendChild(stats.element);

    stats.update([makeFeedback({ status: "resolved" })], 1);

    const label = stats.element.querySelector<HTMLElement>(".sp-stats-progress-label")!;
    expect(label.textContent).toContain("100%");
    expect(label.textContent).toContain("résolus");
  });

  it("rounds percentages (e.g., 1/3 -> 33%)", () => {
    const stats = new PanelStats(buildThemeColors());
    document.body.appendChild(stats.element);

    stats.update(
      [
        makeFeedback({ id: "1", status: "resolved" }),
        makeFeedback({ id: "2", status: "open" }),
        makeFeedback({ id: "3", status: "open" }),
      ],
      3,
    );

    const fill = stats.element.querySelector<HTMLElement>(".sp-stats-progress-fill")!;
    expect(fill.style.width).toBe("33%");
  });
});
