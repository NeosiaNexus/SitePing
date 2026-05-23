// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `vi.mock` is hoisted; the spy must be created via `vi.hoisted` so the
// reference is defined when the factory runs.
const { mockHtml2Canvas } = vi.hoisted(() => ({ mockHtml2Canvas: vi.fn() }));

vi.mock("html2canvas", () => ({
  default: mockHtml2Canvas,
}));

const { _resetScreenshotCacheForTests, captureScreenshot } = await import("../../src/screenshot.js");

// -----------------------------------------------------------------------
// Graceful-degrade contract: captureScreenshot NEVER throws.
//
// html2canvas is a regular dependency, so it's always installed — the
// runtime failure modes that matter are: html2canvas threw (content-
// tainted canvas, version mismatch) and the dynamic import resolved to
// something unexpected (interop edge case). Both must result in `null`
// so the feedback submission still completes.
// -----------------------------------------------------------------------

describe("captureScreenshot — graceful degrade", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    _resetScreenshotCacheForTests();
    mockHtml2Canvas.mockReset();
    // Default success stub — give html2canvas a real-looking canvas so tests
    // that focus on the ignoreElements predicate can complete without
    // tripping the graceful-degrade path.
    mockHtml2Canvas.mockResolvedValue({
      width: 100,
      height: 100,
      toDataURL: () => "data:image/jpeg;base64,STUB",
    });
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("returns null when html2canvas rejects (covers all runtime capture failures)", async () => {
    mockHtml2Canvas.mockReset();
    mockHtml2Canvas.mockRejectedValue(new Error("canvas tainted"));

    const result = await captureScreenshot(new DOMRect(0, 0, 100, 100));

    expect(result).toBeNull();
    const captureWarnings = warnSpy.mock.calls.filter((c) => /Screenshot capture failed/.test(String(c[0])));
    expect(captureWarnings.length).toBe(1);
  });

  it("returns null when the dynamic import resolves to something un-callable", async () => {
    // Simulate a bundler/transform that exposes html2canvas as `undefined`
    // (rare but possible with some interop modes). The captureScreenshot
    // catch should swallow the resulting TypeError.
    mockHtml2Canvas.mockReset();
    mockHtml2Canvas.mockImplementation(() => {
      throw new TypeError("html2canvas is not a function");
    });

    const result = await captureScreenshot(new DOMRect(0, 0, 100, 100));

    expect(result).toBeNull();
  });

  it("never propagates an exception out of captureScreenshot", async () => {
    mockHtml2Canvas.mockReset();
    mockHtml2Canvas.mockRejectedValue(new Error("any failure"));

    // The caller is `annotator.finishDrawing` — feedback submission must
    // not be aborted because the screenshot failed.
    await expect(captureScreenshot(new DOMRect(0, 0, 100, 100))).resolves.not.toThrow();
  });
});

// -----------------------------------------------------------------------
// ignoreElements predicate — masking contract for screenshots.
//
// The predicate is the only thing standing between widget chrome (annotator
// overlay, drawing rect, popup) and the captured JPEG, and between host-
// marked sensitive elements and the captured JPEG. Both code paths share
// the same `data-siteping-ignore="true"` attribute, so we verify both here.
// Regression for issue #124 (annotator selection overlay leaking into the
// screenshot).
// -----------------------------------------------------------------------

describe("captureScreenshot — ignoreElements predicate", () => {
  beforeEach(() => {
    _resetScreenshotCacheForTests();
    mockHtml2Canvas.mockReset();
    mockHtml2Canvas.mockResolvedValue({
      width: 100,
      height: 100,
      toDataURL: () => "data:image/jpeg;base64,STUB",
    });
  });

  type IgnoreFn = (element: Element) => boolean;

  async function getIgnorePredicate(): Promise<IgnoreFn> {
    await captureScreenshot(new DOMRect(0, 0, 100, 100));
    const opts = mockHtml2Canvas.mock.calls[0]?.[1] as { ignoreElements?: IgnoreFn } | undefined;
    expect(opts?.ignoreElements).toBeTypeOf("function");
    return opts!.ignoreElements as IgnoreFn;
  }

  it("excludes the siteping-widget shadow host (widget's own DOM)", async () => {
    const ignore = await getIgnorePredicate();
    const host = document.createElement("siteping-widget");
    expect(ignore(host)).toBe(true);
  });

  it("excludes descendants of the siteping-widget shadow host", async () => {
    const ignore = await getIgnorePredicate();
    const host = document.createElement("siteping-widget");
    const child = document.createElement("div");
    host.appendChild(child);
    document.body.appendChild(host);
    expect(ignore(child)).toBe(true);
    host.remove();
  });

  it("excludes elements explicitly marked data-siteping-ignore=true (host masking + annotator chrome)", async () => {
    const ignore = await getIgnorePredicate();
    const masked = document.createElement("div");
    masked.setAttribute("data-siteping-ignore", "true");
    expect(ignore(masked)).toBe(true);
  });

  it("does NOT exclude regular page elements", async () => {
    const ignore = await getIgnorePredicate();
    const regular = document.createElement("p");
    regular.textContent = "Plain page content";
    expect(ignore(regular)).toBe(false);
  });
});
