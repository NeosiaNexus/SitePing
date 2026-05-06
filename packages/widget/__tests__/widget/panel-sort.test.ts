// @vitest-environment jsdom

import type { FeedbackResponse } from "@siteping/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPageGroupHeader, groupFeedbacksByPage, PanelSortControls, sortFeedbacks } from "../../src/panel-sort.js";
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

describe("panel sort utilities", () => {
  it("sorts newest and oldest without mutating the original array", () => {
    const feedbacks = [
      makeFeedback({ id: "older", createdAt: "2026-04-01T00:00:00.000Z" }),
      makeFeedback({ id: "newer", createdAt: "2026-04-03T00:00:00.000Z" }),
      makeFeedback({ id: "middle", createdAt: "2026-04-02T00:00:00.000Z" }),
    ];

    expect(sortFeedbacks(feedbacks, "newest").map((fb) => fb.id)).toEqual(["newer", "middle", "older"]);
    expect(sortFeedbacks(feedbacks, "oldest").map((fb) => fb.id)).toEqual(["older", "middle", "newer"]);
    expect(feedbacks.map((fb) => fb.id)).toEqual(["older", "newer", "middle"]);
  });

  it("sorts by type priority and then newest within the same type", () => {
    const feedbacks = [
      makeFeedback({ id: "bug", type: "bug", createdAt: "2026-04-05T00:00:00.000Z" }),
      makeFeedback({ id: "old-question", type: "question", createdAt: "2026-04-01T00:00:00.000Z" }),
      makeFeedback({ id: "other", type: "other", createdAt: "2026-04-04T00:00:00.000Z" }),
      makeFeedback({ id: "new-question", type: "question", createdAt: "2026-04-06T00:00:00.000Z" }),
      makeFeedback({ id: "change", type: "change", createdAt: "2026-04-03T00:00:00.000Z" }),
    ];

    expect(sortFeedbacks(feedbacks, "by-type").map((fb) => fb.id)).toEqual([
      "new-question",
      "old-question",
      "change",
      "bug",
      "other",
    ]);
  });

  it("sorts open feedback first and then newest within each status", () => {
    const feedbacks = [
      makeFeedback({ id: "old-open", status: "open", createdAt: "2026-04-01T00:00:00.000Z" }),
      makeFeedback({ id: "new-resolved", status: "resolved", createdAt: "2026-04-05T00:00:00.000Z" }),
      makeFeedback({ id: "new-open", status: "open", createdAt: "2026-04-04T00:00:00.000Z" }),
      makeFeedback({ id: "old-resolved", status: "resolved", createdAt: "2026-04-02T00:00:00.000Z" }),
    ];

    expect(sortFeedbacks(feedbacks, "open-first").map((fb) => fb.id)).toEqual([
      "new-open",
      "old-open",
      "new-resolved",
      "old-resolved",
    ]);
  });

  it("sort 'by-type' falls back to 99 priority for unknown types and breaks ties by date", () => {
    const feedbacks = [
      makeFeedback({ id: "weird", type: "unknown" as never, createdAt: "2026-04-05T00:00:00.000Z" }),
      makeFeedback({ id: "older-weird", type: "unknown" as never, createdAt: "2026-04-01T00:00:00.000Z" }),
      makeFeedback({ id: "question", type: "question", createdAt: "2026-04-02T00:00:00.000Z" }),
    ];

    expect(sortFeedbacks(feedbacks, "by-type").map((fb) => fb.id)).toEqual(["question", "weird", "older-weird"]);
  });

  it("groups feedback by URL pathname, preserves group item order, and sorts groups by count", () => {
    const feedbacks = [
      makeFeedback({ id: "settings-1", url: "https://example.com/settings?tab=team" }),
      makeFeedback({ id: "invalid", url: "not a url" }),
      makeFeedback({ id: "settings-2", url: "https://example.com/settings#billing" }),
      makeFeedback({ id: "home", url: "https://example.com/" }),
    ];

    const groups = groupFeedbacksByPage(feedbacks);

    expect([...groups.keys()]).toEqual(["/settings", "not a url", "/"]);
    expect(groups.get("/settings")?.map((fb) => fb.id)).toEqual(["settings-1", "settings-2"]);
  });
});

describe("PanelSortControls", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("renders English controls, chooses a sort mode, and notifies once", () => {
    const onChange = vi.fn();
    const controls = new PanelSortControls(buildThemeColors(), onChange);
    document.body.appendChild(controls.element);

    const sortButton = controls.element.querySelector<HTMLButtonElement>(".sp-sort-btn")!;
    sortButton.click();

    expect(sortButton.getAttribute("aria-expanded")).toBe("true");
    expect(controls.element.querySelectorAll('[role="option"]')).toHaveLength(4);

    controls.element.querySelectorAll<HTMLButtonElement>('[role="option"]')[1].click();

    expect(controls.sortMode).toBe("oldest");
    expect(sortButton.textContent).toContain("Oldest first");
    expect(sortButton.getAttribute("aria-expanded")).toBe("false");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("toggles group-by-page state and renders French labels", () => {
    const onChange = vi.fn();
    const controls = new PanelSortControls(buildThemeColors(), onChange, "fr");
    document.body.appendChild(controls.element);

    const groupToggle = controls.element.querySelector<HTMLButtonElement>(".sp-group-toggle")!;
    expect(groupToggle.textContent).toContain("Par page");

    groupToggle.click();

    expect(controls.groupByPage).toBe(true);
    expect(groupToggle.getAttribute("aria-pressed")).toBe("true");
    expect(groupToggle.classList.contains("sp-group-toggle--active")).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("destroy without an open menu is a no-op (closeMenu handles null menuEl)", () => {
    const controls = new PanelSortControls(buildThemeColors(), vi.fn());
    document.body.appendChild(controls.element);

    // No menu has been opened — destroy should still set aria-expanded=false safely
    controls.destroy();

    const sortButton = controls.element.querySelector<HTMLButtonElement>(".sp-sort-btn")!;
    expect(sortButton.getAttribute("aria-expanded")).toBe("false");
  });

  it("ignores non-Escape keys inside the open sort menu", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    const controls = new PanelSortControls(buildThemeColors(), vi.fn());
    document.body.appendChild(controls.element);

    const sortButton = controls.element.querySelector<HTMLButtonElement>(".sp-sort-btn")!;
    sortButton.click();

    const menu = controls.element.querySelector<HTMLElement>(".sp-sort-menu")!;
    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    expect(controls.element.querySelector(".sp-sort-menu")).not.toBeNull();
  });

  it("updateSortLabel safely handles a missing .sp-sort-btn-label child", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    const onChange = vi.fn();
    const controls = new PanelSortControls(buildThemeColors(), onChange);
    document.body.appendChild(controls.element);

    const sortButton = controls.element.querySelector<HTMLButtonElement>(".sp-sort-btn")!;
    // Remove the label span so updateSortLabel hits the `if (label)` false branch
    sortButton.querySelector(".sp-sort-btn-label")?.remove();

    sortButton.click();
    controls.element.querySelectorAll<HTMLButtonElement>('[role="option"]')[2].click();

    expect(controls.sortMode).toBe("by-type");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("clicking the sort button twice toggles the menu open then closed", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    const onChange = vi.fn();
    const controls = new PanelSortControls(buildThemeColors(), onChange);
    document.body.appendChild(controls.element);

    const sortButton = controls.element.querySelector<HTMLButtonElement>(".sp-sort-btn")!;

    // First click opens the menu
    sortButton.click();
    expect(controls.element.querySelector(".sp-sort-menu")).not.toBeNull();
    expect(sortButton.getAttribute("aria-expanded")).toBe("true");

    // Second click on the sort button should close the menu via toggleMenu->closeMenu
    sortButton.click();
    expect(controls.element.querySelector(".sp-sort-menu")).toBeNull();
    expect(sortButton.getAttribute("aria-expanded")).toBe("false");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes the menu on outside click, Escape, and destroy", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    const controls = new PanelSortControls(buildThemeColors(), vi.fn());
    document.body.appendChild(controls.element);
    const sortButton = controls.element.querySelector<HTMLButtonElement>(".sp-sort-btn")!;

    sortButton.click();
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(controls.element.querySelector(".sp-sort-menu")).toBeNull();
    expect(sortButton.getAttribute("aria-expanded")).toBe("false");

    sortButton.click();
    const menu = controls.element.querySelector<HTMLElement>(".sp-sort-menu")!;
    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(controls.element.querySelector(".sp-sort-menu")).toBeNull();

    sortButton.click();
    controls.destroy();

    expect(controls.element.querySelector(".sp-sort-menu")).toBeNull();
    expect(sortButton.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("createPageGroupHeader", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("renders a short path verbatim (no truncation, no title attribute)", () => {
    const header = createPageGroupHeader("/short", 2, buildThemeColors());
    document.body.appendChild(header);

    const path = header.querySelector<HTMLElement>(".sp-group-header-path")!;
    expect(path.textContent).toBe("/short");
    expect(path.title).toBe("");
  });

  it("toggling a header without a sp-group-content sibling still flips its own state", () => {
    const header = createPageGroupHeader("/page", 1, buildThemeColors());
    // Sibling is something other than sp-group-content
    const sibling = document.createElement("div");
    sibling.className = "sp-other";
    document.body.append(header, sibling);

    expect(header.getAttribute("aria-expanded")).toBe("true");

    header.click();

    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(header.classList.contains("sp-group-header--collapsed")).toBe(true);
    expect(sibling.classList.contains("sp-group-content--collapsed")).toBe(false);
  });

  it("ignores keys that are not Enter or Space on the header", () => {
    const header = createPageGroupHeader("/page", 1, buildThemeColors());
    const content = document.createElement("div");
    content.className = "sp-group-content";
    document.body.append(header, content);

    header.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(content.classList.contains("sp-group-content--collapsed")).toBe(false);
  });

  it("supports Space as a toggle key", () => {
    const header = createPageGroupHeader("/page", 1, buildThemeColors());
    const content = document.createElement("div");
    content.className = "sp-group-content";
    document.body.append(header, content);

    header.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));

    expect(header.getAttribute("aria-expanded")).toBe("false");
  });

  it("renders a collapsible accessible header with truncated title", () => {
    const header = createPageGroupHeader(
      "/very/long/path/that/should/be/truncated/inside/the/header/component",
      7,
      buildThemeColors(),
    );
    const content = document.createElement("div");
    content.className = "sp-group-content";
    document.body.append(header, content);

    expect(header.getAttribute("role")).toBe("button");
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(header.querySelector(".sp-group-header-count")?.textContent).toBe("7");
    expect(header.querySelector<HTMLElement>(".sp-group-header-path")?.title).toContain("/very/long/path");

    header.click();

    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(header.classList.contains("sp-group-header--collapsed")).toBe(true);
    expect(content.classList.contains("sp-group-content--collapsed")).toBe(true);

    header.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(content.classList.contains("sp-group-content--collapsed")).toBe(false);
  });
});
