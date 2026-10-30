// @vitest-environment jsdom

import type { FeedbackResponse } from "@siteping/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { en as STATS_I18N_EN } from "../../src/i18n/en.js";
import { fr as STATS_I18N_FR } from "../../src/i18n/fr.js";
import { createT } from "../../src/i18n/index.js";
import { PanelStats, STATS_CSS } from "../../src/panel-stats.js";
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
    urlPattern: null,
    screenshotUrl: null,
    screenshotRegion: null,
    diagnostics: null,
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
    expect(STATS_I18N_EN["stats.closed"]).toBe("Closed");
    expect(STATS_I18N_EN["stats.bugs"]).toBe("Bugs");
    expect(STATS_I18N_EN["stats.progress"]).toBe("{percent}% closed");
    expect(STATS_I18N_FR["stats.open"]).toBe("Ouverts");
    expect(STATS_I18N_FR["stats.progress"]).toBe("{percent}% clôturés");
    expect(STATS_CSS).toContain(".sp-stats-bar");
  });

  it("creates a hidden stats element by default with English labels", () => {
    const stats = new PanelStats(buildThemeColors(), createT("en"));
    document.body.appendChild(stats.element);

    expect(stats.element.classList.contains("sp-stats-bar")).toBe(true);
    expect(stats.element.hidden).toBe(true);
    expect(stats.element.getAttribute("aria-label")).toBe("Feedback statistics");

    const labels = stats.element.querySelectorAll<HTMLElement>(".sp-stats-label");
    const labelTexts = Array.from(labels).map((el) => el.textContent);
    expect(labelTexts).toEqual([
      STATS_I18N_EN["stats.open"],
      STATS_I18N_EN["stats.closed"],
      STATS_I18N_EN["stats.bugs"],
    ]);
  });

  it("renders French labels when locale='fr'", () => {
    const stats = new PanelStats(buildThemeColors(), createT("fr"));
    document.body.appendChild(stats.element);

    const labels = stats.element.querySelectorAll<HTMLElement>(".sp-stats-label");
    const labelTexts = Array.from(labels).map((el) => el.textContent);
    expect(labelTexts).toEqual([
      STATS_I18N_FR["stats.open"],
      STATS_I18N_FR["stats.closed"],
      STATS_I18N_FR["stats.bugs"],
    ]);
  });

  it("falls back to English when locale is unknown", () => {
    const stats = new PanelStats(buildThemeColors(), createT("zz"));
    document.body.appendChild(stats.element);

    const labels = stats.element.querySelectorAll<HTMLElement>(".sp-stats-label");
    expect(labels[0]!.textContent).toBe(STATS_I18N_EN["stats.open"]);
  });

  it("hides the bar when total === 0", () => {
    const stats = new PanelStats(buildThemeColors(), createT("en"));
    document.body.appendChild(stats.element);

    // Force-show first, then call with total=0 to verify hiding
    stats.element.hidden = false;
    stats.update([], 0);

    expect(stats.element.hidden).toBe(true);
  });

  it("shows the bar and updates open/resolved/bug counts", () => {
    const stats = new PanelStats(buildThemeColors(), createT("en"));
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
    expect(values[0]!.textContent).toBe("2");
    expect(values[1]!.textContent).toBe("2");
    expect(values[2]!.textContent).toBe("2");
  });

  it("buckets in_progress as open and wont_fix as closed, never as resolved (#302)", () => {
    const stats = new PanelStats(buildThemeColors(), createT("en"));
    document.body.appendChild(stats.element);

    stats.update(
      [
        makeFeedback({ id: "1", status: "open" }),
        makeFeedback({ id: "2", status: "in_progress" }),
        makeFeedback({ id: "3", status: "resolved" }),
        makeFeedback({ id: "4", status: "wont_fix" }),
      ],
      4,
    );

    const values = stats.element.querySelectorAll<HTMLElement>(".sp-stats-value");
    // open bucket = open + in_progress, closed bucket = resolved + wont_fix
    expect(values[0]!.textContent).toBe("2");
    expect(values[1]!.textContent).toBe("2");

    // Progress reflects the closed share: 2/4 = 50%
    const fill = stats.element.querySelector<HTMLElement>(".sp-stats-progress-fill")!;
    expect(fill.style.width).toBe("50%");
  });

  it("never reports declined requests as resolved (#302)", () => {
    const stats = new PanelStats(buildThemeColors(), createT("fr"));
    document.body.appendChild(stats.element);

    stats.update([makeFeedback({ id: "1", status: "wont_fix" }), makeFeedback({ id: "2", status: "wont_fix" })], 2);

    const labels = Array.from(stats.element.querySelectorAll(".sp-stats-label"), (el) => el.textContent);
    expect(labels[1]).toBe("Clôturés");
    const label = stats.element.querySelector<HTMLElement>(".sp-stats-progress-label")!;
    expect(label.textContent).toBe("100% clôturés");
    expect(stats.element.textContent).not.toMatch(/[Rr]ésolu/);
  });

  it("computes the percentage closed relative to visible feedbacks", () => {
    const stats = new PanelStats(buildThemeColors(), createT("en"));
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
    expect(label.textContent).toContain("closed");
  });

  it("renders 0% when feedbacks is empty but total > 0 (filtered out)", () => {
    const stats = new PanelStats(buildThemeColors(), createT("en"));
    document.body.appendChild(stats.element);

    stats.update([], 5);

    expect(stats.element.hidden).toBe(false);
    const fill = stats.element.querySelector<HTMLElement>(".sp-stats-progress-fill")!;
    expect(fill.style.width).toBe("0%");
    const label = stats.element.querySelector<HTMLElement>(".sp-stats-progress-label")!;
    expect(label.textContent).toContain("0%");

    const values = stats.element.querySelectorAll<HTMLElement>(".sp-stats-value");
    expect(values[0]!.textContent).toBe("0");
    expect(values[1]!.textContent).toBe("0");
    expect(values[2]!.textContent).toBe("0");
  });

  it("uses the French progress text when locale='fr'", () => {
    const stats = new PanelStats(buildThemeColors(), createT("fr"));
    document.body.appendChild(stats.element);

    stats.update([makeFeedback({ status: "resolved" })], 1);

    const label = stats.element.querySelector<HTMLElement>(".sp-stats-progress-label")!;
    expect(label.textContent).toContain("100%");
    expect(label.textContent).toContain("clôturés");
  });

  it("rounds percentages (e.g., 1/3 -> 33%)", () => {
    const stats = new PanelStats(buildThemeColors(), createT("en"));
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
