// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EvidenceCard } from "../../src/components/evidence-card.js";
import { makeAnnotation, makeRecord, REGION } from "../helpers.js";
import { renderWithUi } from "../render.js";

beforeEach(() => {
  // jsdom ships no async clipboard API; default to a working one so the copy
  // affordance renders. Tests that need failure/absence override this.
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "clipboard");
});

function withScreenshot(overrides = {}) {
  return makeRecord({
    screenshotUrl: "data:image/jpeg;base64,AAAA",
    screenshotRegion: REGION,
    annotations: [makeAnnotation({ devicePixelRatio: 2 })],
    ...overrides,
  });
}

describe("EvidenceCard — screenshot with region", () => {
  it("renders the annotation rect at the region percentages with four dim panels", () => {
    const { container } = renderWithUi(<EvidenceCard record={withScreenshot()} />);
    const rect = container.querySelector<HTMLElement>(".spd-evidence-rect") as HTMLElement;
    expect(rect).not.toBeNull();
    // jsdom normalizes "25.000%" → "25%", so compare numerically.
    expect(Number.parseFloat(rect.style.left)).toBe(25);
    expect(Number.parseFloat(rect.style.top)).toBe(10);
    expect(Number.parseFloat(rect.style.width)).toBe(50);
    expect(Number.parseFloat(rect.style.height)).toBe(30);
    expect(container.querySelectorAll(".spd-evidence-dim")).toHaveLength(4);
    expect(container.querySelector(".spd-evidence-corners")).not.toBeNull();
  });

  it("adds the region pixel dimensions to the caption once the image reports its natural size", async () => {
    const { container } = renderWithUi(<EvidenceCard record={withScreenshot()} />);
    const img = container.querySelector<HTMLImageElement>(".spd-evidence-img");
    expect(img).not.toBeNull();
    Object.defineProperty(img, "naturalWidth", { value: 200, configurable: true });
    Object.defineProperty(img, "naturalHeight", { value: 100, configurable: true });
    fireEvent.load(img as HTMLImageElement);

    await waitFor(() => {
      const caption = container.querySelector(".spd-evidence-caption")?.textContent ?? "";
      // wPct 0.5 × 200 = 100, hPct 0.3 × 100 = 30
      expect(caption).toContain("100×30px");
      expect(caption).toContain("@2x");
    });
  });

  it("toggles the annotation overlay via the caption button", () => {
    const { container } = renderWithUi(<EvidenceCard record={withScreenshot()} />);
    expect(container.querySelector(".spd-evidence-rect")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Hide annotation" }));
    expect(container.querySelector(".spd-evidence-rect")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show annotation" }));
    expect(container.querySelector(".spd-evidence-rect")).not.toBeNull();
  });

  it("toggles the zoom class when the image is clicked", () => {
    const { container } = renderWithUi(<EvidenceCard record={withScreenshot()} />);
    const stage = container.querySelector(".spd-evidence-stage");
    const img = container.querySelector<HTMLImageElement>(".spd-evidence-img");
    expect(stage?.className).not.toContain("spd-evidence-zoomed");
    fireEvent.click(img as HTMLImageElement);
    expect(container.querySelector(".spd-evidence-stage")?.className).toContain("spd-evidence-zoomed");
  });

  it("exposes the zoom as a keyboard-operable toggle button", () => {
    const { container } = renderWithUi(<EvidenceCard record={withScreenshot()} />);
    const button = screen.getByRole("button", { name: "Zoom screenshot" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".spd-evidence-stage")?.className).toContain("spd-evidence-zoomed");
  });

  it("Esc while zoomed un-zooms without bubbling to close the drawer", () => {
    const onParentKeyDown = vi.fn();
    renderWithUi(
      // biome-ignore lint/a11y/noStaticElementInteractions: test-only backdrop stand-in for the drawer's Esc handler
      <div onKeyDown={onParentKeyDown}>
        <EvidenceCard record={withScreenshot()} />
      </div>,
    );
    const button = screen.getByRole("button", { name: "Zoom screenshot" });
    fireEvent.click(button); // zoom in
    fireEvent.keyDown(button, { key: "Escape" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(onParentKeyDown).not.toHaveBeenCalled(); // stopPropagation kept Esc local
    // Not zoomed: Esc now bubbles so the drawer can close on it.
    fireEvent.keyDown(button, { key: "Escape" });
    expect(onParentKeyDown).toHaveBeenCalledTimes(1);
  });
});

describe("EvidenceCard — screenshot without region (legacy)", () => {
  it("renders the image but no rect or toggle", () => {
    const record = makeRecord({ screenshotUrl: "data:image/jpeg;base64,AAAA", screenshotRegion: null });
    const { container } = renderWithUi(<EvidenceCard record={record} />);
    expect(container.querySelector(".spd-evidence-img")).not.toBeNull();
    expect(container.querySelector(".spd-evidence-rect")).toBeNull();
    expect(screen.queryByRole("button", { name: /annotation/i })).toBeNull();
  });
});

describe("EvidenceCard — no screenshot", () => {
  it("falls back to the anchor view with a copyable selector and snippet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    const record = makeRecord({
      screenshotUrl: null,
      annotations: [makeAnnotation({ cssSelector: "main > .hero > h1", textSnippet: "Welcome" })],
    });
    const { value } = renderWithUi(<EvidenceCard record={record} />);

    const selector = screen.getByRole("button", { name: "main > .hero > h1" });
    expect(screen.getByText("« Welcome »")).toBeTruthy();

    fireEvent.click(selector);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("main > .hero > h1"));
    await waitFor(() => expect(value.notify).toHaveBeenCalledWith("Copied"));
  });

  it("selects the selector text and stays silent when the clipboard write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("blocked"));
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const addRange = vi.fn();
    const removeAllRanges = vi.fn();
    vi.spyOn(window, "getSelection").mockReturnValue({ addRange, removeAllRanges } as unknown as Selection);

    const record = makeRecord({
      screenshotUrl: null,
      annotations: [makeAnnotation({ cssSelector: "main > .hero > h1" })],
    });
    const { value } = renderWithUi(<EvidenceCard record={record} />);

    fireEvent.click(screen.getByRole("button", { name: "main > .hero > h1" }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    await waitFor(() => expect(addRange).toHaveBeenCalled());
    expect(removeAllRanges).toHaveBeenCalled();
    expect(value.notify).not.toHaveBeenCalled();
  });

  it("renders the selector as plain text (no button) when the clipboard API is unavailable", () => {
    Reflect.deleteProperty(navigator, "clipboard");
    const record = makeRecord({
      screenshotUrl: null,
      annotations: [makeAnnotation({ cssSelector: "main h1" })],
    });
    const { container } = renderWithUi(<EvidenceCard record={record} />);
    expect(screen.queryByRole("button", { name: "main h1" })).toBeNull();
    const selector = container.querySelector<HTMLElement>(".spd-anchor-selector");
    expect(selector?.tagName).toBe("DIV");
    expect(selector?.textContent).toBe("main h1");
  });

  it("shows the no-screenshot message when there are no annotations either", () => {
    const record = makeRecord({ screenshotUrl: null, annotations: [] });
    renderWithUi(<EvidenceCard record={record} />);
    expect(screen.getByText("No screenshot for this feedback")).toBeTruthy();
  });
});

describe("EvidenceCard — extra annotations", () => {
  it("lists secondary annotations below the primary evidence", () => {
    const record = makeRecord({
      screenshotUrl: "data:image/jpeg;base64,AAAA",
      screenshotRegion: REGION,
      annotations: [
        makeAnnotation({ id: "a1", cssSelector: ".primary" }),
        makeAnnotation({ id: "a2", cssSelector: ".secondary" }),
      ],
    });
    const { container } = renderWithUi(<EvidenceCard record={record} />);
    // Primary renders the rect; the extra annotation renders a fallback selector.
    expect(container.querySelector(".spd-evidence-rect")).not.toBeNull();
    expect(screen.getByRole("button", { name: ".secondary" })).toBeTruthy();
  });
});
