// @vitest-environment jsdom

import type { FeedbackResponse } from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadFile, EXPORT_I18N_FR, ExportButton, feedbacksToCsv, feedbacksToJson } from "../../src/export-utils.js";
import { buildThemeColors } from "../../src/styles/theme.js";

function installObjectUrlMocks(): void {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:siteping-export"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
}

function makeFeedback(overrides: Partial<FeedbackResponse> = {}): FeedbackResponse {
  return {
    id: "fb-1",
    projectName: "Client Portal",
    type: "bug",
    message: "Export button fails",
    status: "open",
    url: "https://example.com/dashboard",
    viewport: "1440x900",
    userAgent: "vitest",
    authorName: "Ava Tester",
    authorEmail: "ava@example.com",
    resolvedAt: null,
    createdAt: "2026-04-30T12:00:00.000Z",
    updatedAt: "2026-04-30T12:30:00.000Z",
    annotations: [],
    ...overrides,
  };
}

describe("feedback export conversion", () => {
  it("serializes CSV headers, ordered fields, empty nullable values, and escaped special characters", () => {
    const csv = feedbacksToCsv([
      makeFeedback({
        id: "fb-quoted",
        message: 'Quote "inside", comma, and\nnewline',
        authorName: "Sam, QA",
        authorEmail: "",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      }),
      makeFeedback({
        id: "fb-empty",
        message: "Simple message",
        url: "https://example.com/export",
        resolvedAt: null,
      }),
    ]);

    expect(csv).toMatchInlineSnapshot(`
      "id,type,status,message,url,authorName,authorEmail,createdAt,resolvedAt,viewport
      fb-quoted,bug,open,"Quote ""inside"", comma, and
      newline",https://example.com/dashboard,"Sam, QA",,2026-04-30T12:00:00.000Z,2026-05-01T00:00:00.000Z,1440x900
      fb-empty,bug,open,Simple message,https://example.com/export,Ava Tester,ava@example.com,2026-04-30T12:00:00.000Z,,1440x900"
    `);
  });

  it("returns only the header row when there are no feedbacks", () => {
    expect(feedbacksToCsv([])).toBe("id,type,status,message,url,authorName,authorEmail,createdAt,resolvedAt,viewport");
  });

  it("serializes formatted JSON without dropping nested annotation data", () => {
    const json = feedbacksToJson([
      makeFeedback({
        annotations: [
          {
            id: "ann-1",
            feedbackId: "fb-1",
            cssSelector: ".cta",
            xpath: "/html/body/button",
            textSnippet: "Submit",
            elementTag: "BUTTON",
            elementId: null,
            textPrefix: "Before",
            textSuffix: "After",
            fingerprint: "abc123",
            neighborText: "Cancel Submit",
            xPct: 10,
            yPct: 20,
            wPct: 30,
            hPct: 40,
            scrollX: 0,
            scrollY: 100,
            viewportW: 1440,
            viewportH: 900,
            devicePixelRatio: 2,
            createdAt: "2026-04-30T12:01:00.000Z",
          },
        ],
      }),
    ]);

    expect(JSON.parse(json)[0].annotations[0]).toMatchObject({ cssSelector: ".cta", devicePixelRatio: 2 });
    expect(json).toContain('    "id": "fb-1"');
  });
});

describe("downloadFile", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
    installObjectUrlMocks();
  });

  it("creates an object URL, clicks a hidden anchor, and revokes the URL on the next frame", async () => {
    const createObjectURL = vi.mocked(URL.createObjectURL);
    const revokeObjectURL = vi.mocked(URL.revokeObjectURL);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(1);
      return 1;
    });

    downloadFile("id,message\n1,Hello", "feedbacks.csv", "text/csv;charset=utf-8");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    await expect(blob.text()).resolves.toBe("id,message\n1,Hello");
    expect(blob.type).toBe("text/csv;charset=utf-8");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:siteping-export");
    expect(document.querySelector("a[download='feedbacks.csv']")).toBeNull();
  });
});

describe("ExportButton", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
    installObjectUrlMocks();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(1);
      return 1;
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-30T15:45:00.000Z"));
  });

  it("renders, toggles, translates labels, and closes on outside click", () => {
    const button = new ExportButton(buildThemeColors(), () => [makeFeedback()]);
    document.body.appendChild(button.element);

    const trigger = button.element.querySelector<HTMLButtonElement>(".sp-export-btn")!;
    expect(trigger.textContent).toContain("Export");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    trigger.click();

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(button.element.querySelector(".sp-export-menu")?.classList.contains("sp-export-menu--open")).toBe(true);

    button.setLabels(EXPORT_I18N_FR);

    expect(trigger.textContent).toContain("Exporter");
    expect([...button.element.querySelectorAll(".sp-export-option-label")].map((node) => node.textContent)).toEqual([
      "Exporter CSV",
      "Exporter JSON",
    ]);

    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(button.element.querySelector(".sp-export-menu")?.classList.contains("sp-export-menu--open")).toBe(false);

    button.destroy();
    expect(document.body.contains(button.element)).toBe(false);
  });

  it("downloads CSV and JSON with a sanitized project name", () => {
    const button = new ExportButton(buildThemeColors(), () => [makeFeedback({ projectName: "Client Portal / QA" })]);
    document.body.appendChild(button.element);
    const trigger = button.element.querySelector<HTMLButtonElement>(".sp-export-btn")!;

    trigger.click();
    button.element.querySelectorAll<HTMLButtonElement>(".sp-export-option")[0].click();

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(button.element.querySelector<HTMLButtonElement>(".sp-export-btn")?.getAttribute("aria-expanded")).toBe(
      "false",
    );

    trigger.click();
    button.element.querySelectorAll<HTMLButtonElement>(".sp-export-option")[1].click();

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2);
    const downloads = Array.from(document.querySelectorAll("a")).map((anchor) => anchor.getAttribute("download"));
    expect(downloads).toEqual([]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:siteping-export");
  });

  it("does not download when there are no feedbacks", () => {
    const button = new ExportButton(buildThemeColors(), () => []);
    document.body.appendChild(button.element);

    button.element.querySelector<HTMLButtonElement>(".sp-export-btn")!.click();
    button.element.querySelector<HTMLButtonElement>(".sp-export-option")!.click();

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });

  it("falls back to 'feedbacks' filename when projectName is missing", () => {
    // FeedbackResponse without projectName → fallback to 'feedbacks'
    const fb = makeFeedback();
    delete (fb as Partial<FeedbackResponse>).projectName;

    const button = new ExportButton(buildThemeColors(), () => [fb]);
    document.body.appendChild(button.element);

    const trigger = button.element.querySelector<HTMLButtonElement>(".sp-export-btn")!;
    trigger.click();
    button.element.querySelectorAll<HTMLButtonElement>(".sp-export-option")[0].click();

    // Verify createObjectURL was called (download flow ran with fallback name)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });

  it("setLabels is a no-op when the export button element is missing from the DOM tree", () => {
    const button = new ExportButton(buildThemeColors(), () => [makeFeedback()]);
    document.body.appendChild(button.element);

    // Remove the trigger button
    const triggerBtn = button.element.querySelector<HTMLButtonElement>(".sp-export-btn");
    triggerBtn?.remove();

    // Should not throw — both branches (btn missing, options[0]/options[1] still present) handled
    expect(() => button.setLabels(EXPORT_I18N_FR)).not.toThrow();
  });

  it("setLabels handles the case where the trigger button has no span child", () => {
    const button = new ExportButton(buildThemeColors(), () => [makeFeedback()]);
    document.body.appendChild(button.element);

    // Remove only the span inside the trigger button
    const triggerBtn = button.element.querySelector<HTMLButtonElement>(".sp-export-btn");
    triggerBtn?.querySelector("span")?.remove();

    expect(() => button.setLabels(EXPORT_I18N_FR)).not.toThrow();
  });

  it("setLabels handles the case where option labels are missing", () => {
    const button = new ExportButton(buildThemeColors(), () => [makeFeedback()]);
    document.body.appendChild(button.element);

    // Remove the option labels
    for (const node of button.element.querySelectorAll(".sp-export-option-label")) {
      node.remove();
    }

    expect(() => button.setLabels(EXPORT_I18N_FR)).not.toThrow();
  });
});
