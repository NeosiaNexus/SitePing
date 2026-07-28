// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `vi.mock` is hoisted; the spy must be created via `vi.hoisted` so the
// reference is defined when the factory runs.
const { mockHtml2Canvas } = vi.hoisted(() => ({ mockHtml2Canvas: vi.fn() }));

vi.mock("html2canvas", () => ({
  default: mockHtml2Canvas,
}));

const { _resetScreenshotCacheForTests, captureAnnotatedScreenshot } = await import("../../src/screenshot.js");

// ---------------------------------------------------------------------------
// Environment helpers — jsdom has no layout, so document bounds and scroll
// offsets must be stubbed for the capture-rect math to have real inputs.
// ---------------------------------------------------------------------------

function setDocumentSize(width: number, height: number): void {
  for (const el of [document.documentElement, document.body]) {
    Object.defineProperty(el, "scrollWidth", { value: width, configurable: true });
    Object.defineProperty(el, "scrollHeight", { value: height, configurable: true });
  }
}

function setScroll(x: number, y: number): void {
  Object.defineProperty(window, "scrollX", { value: x, configurable: true });
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
}

interface CapturedOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  ignoreElements?: (element: Element) => boolean;
}

function lastCaptureOptions(): CapturedOptions {
  const opts = mockHtml2Canvas.mock.calls.at(-1)?.[1] as CapturedOptions | undefined;
  expect(opts).toBeDefined();
  return opts as CapturedOptions;
}

function stubCanvas(width = 100, height = 100) {
  return {
    width,
    height,
    toDataURL: () => "data:image/jpeg;base64,STUB",
  };
}

beforeEach(() => {
  _resetScreenshotCacheForTests();
  mockHtml2Canvas.mockReset();
  // Default success stub — give html2canvas a real-looking canvas so tests
  // that focus on geometry can complete without tripping graceful degrade.
  mockHtml2Canvas.mockResolvedValue(stubCanvas());
  // A big document and no scroll unless a test says otherwise.
  setDocumentSize(3000, 3000);
  setScroll(0, 0);
});

// -----------------------------------------------------------------------
// Graceful-degrade contract: captureAnnotatedScreenshot NEVER throws.
//
// html2canvas is a regular dependency, so it's always installed — the
// runtime failure modes that matter are: html2canvas threw (content-
// tainted canvas, version mismatch) and the dynamic import resolved to
// something unexpected (interop edge case). Both must result in `null`
// so the feedback submission still completes.
// -----------------------------------------------------------------------

describe("captureAnnotatedScreenshot — graceful degrade", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("returns null when html2canvas rejects (covers all runtime capture failures)", async () => {
    mockHtml2Canvas.mockReset();
    mockHtml2Canvas.mockRejectedValue(new Error("canvas tainted"));

    const result = await captureAnnotatedScreenshot(new DOMRect(0, 0, 100, 100));

    expect(result).toBeNull();
    const captureWarnings = warnSpy.mock.calls.filter((c: unknown[]) => /Screenshot capture failed/.test(String(c[0])));
    expect(captureWarnings.length).toBe(1);
  });

  it("returns null when the dynamic import resolves to something un-callable", async () => {
    // Simulate a bundler/transform that exposes html2canvas as `undefined`
    // (rare but possible with some interop modes). The catch should swallow
    // the resulting TypeError.
    mockHtml2Canvas.mockReset();
    mockHtml2Canvas.mockImplementation(() => {
      throw new TypeError("html2canvas is not a function");
    });

    const result = await captureAnnotatedScreenshot(new DOMRect(0, 0, 100, 100));

    expect(result).toBeNull();
  });

  it("never propagates an exception out of captureAnnotatedScreenshot", async () => {
    mockHtml2Canvas.mockReset();
    mockHtml2Canvas.mockRejectedValue(new Error("any failure"));

    // The caller is `annotator.runSubmission` — feedback submission must
    // not be aborted because the screenshot failed.
    await expect(captureAnnotatedScreenshot(new DOMRect(0, 0, 100, 100))).resolves.not.toThrow();
  });

  it("returns null without rendering when the document reports a degenerate size", async () => {
    // Zero-sized document (broken embed contexts) — the capture rect math
    // yields a non-positive area; bail out instead of dividing by zero.
    setDocumentSize(0, 0);

    const result = await captureAnnotatedScreenshot(new DOMRect(0, 0, 100, 100));

    expect(result).toBeNull();
    expect(mockHtml2Canvas).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// Contextual capture geometry — padding, clamping, region math.
//
// The capture rect is the drawn rect padded by 60% of its own size
// (floor 48px, ceiling 280/220px), clamped to the document bounds. The
// region records where the drawn rect sits inside that capture as
// fractions of its dimensions, rounded to 4 decimals — the contract the
// dashboard relies on to re-render annotations on the screenshot.
// -----------------------------------------------------------------------

describe("captureAnnotatedScreenshot — capture rect and region", () => {
  it("pads the rect on all sides and reports the region as fractions of the capture", async () => {
    // 100x100 rect at doc (500,500): pad = clamp(48, 60, 280/220) = 60.
    const result = await captureAnnotatedScreenshot(new DOMRect(500, 500, 100, 100));

    expect(lastCaptureOptions()).toMatchObject({ x: 440, y: 440, width: 220, height: 220 });
    expect(result).toEqual({
      dataUrl: "data:image/jpeg;base64,STUB",
      // 60/220 = 0.2727…, 100/220 = 0.4545…
      region: { xPct: 0.2727, yPct: 0.2727, wPct: 0.4545, hPct: 0.4545 },
    });
  });

  it("applies the 48px padding floor to small rects", async () => {
    // 20x20 rect: 0.6 * 20 = 12 → floor 48 wins.
    const result = await captureAnnotatedScreenshot(new DOMRect(500, 500, 20, 20));

    expect(lastCaptureOptions()).toMatchObject({ x: 452, y: 452, width: 116, height: 116 });
    // 48/116 = 0.4137…, 20/116 = 0.1724…
    expect(result?.region).toEqual({ xPct: 0.4138, yPct: 0.4138, wPct: 0.1724, hPct: 0.1724 });
  });

  it("applies the 280/220px padding ceilings to large rects", async () => {
    // 600x400 rect: 0.6 * 600 = 360 → capped at 280; 0.6 * 400 = 240 → capped at 220.
    const result = await captureAnnotatedScreenshot(new DOMRect(1000, 1000, 600, 400));

    expect(lastCaptureOptions()).toMatchObject({ x: 720, y: 780, width: 1160, height: 840 });
    // 280/1160 = 0.2413…, 600/1160 = 0.5172…, 220/840 = 0.2619…, 400/840 = 0.4761…
    expect(result?.region).toEqual({ xPct: 0.2414, yPct: 0.2619, wPct: 0.5172, hPct: 0.4762 });
  });

  it("clamps the capture at the document origin and shifts the region accordingly", async () => {
    // Rect near (10,10): padded left/top edge would be -50 → clamped to 0.
    const result = await captureAnnotatedScreenshot(new DOMRect(10, 10, 100, 100));

    expect(lastCaptureOptions()).toMatchObject({ x: 0, y: 0, width: 170, height: 170 });
    // 10/170 = 0.0588…, 100/170 = 0.5882…
    expect(result?.region).toEqual({ xPct: 0.0588, yPct: 0.0588, wPct: 0.5882, hPct: 0.5882 });
  });

  it("clamps the capture at the far document edge", async () => {
    setDocumentSize(600, 600);

    // Rect at (450,450)+100: padded right/bottom edge would be 610 → clamped to 600.
    const result = await captureAnnotatedScreenshot(new DOMRect(450, 450, 100, 100));

    expect(lastCaptureOptions()).toMatchObject({ x: 390, y: 390, width: 210, height: 210 });
    // 60/210 = 0.2857…, 100/210 = 0.4761…
    expect(result?.region).toEqual({ xPct: 0.2857, yPct: 0.2857, wPct: 0.4762, hPct: 0.4762 });
  });

  it("converts the viewport rect to document coordinates using the scroll offset", async () => {
    setScroll(200, 300);

    // Viewport (100,100) + scroll (200,300) = doc (300,400); pad 60.
    await captureAnnotatedScreenshot(new DOMRect(100, 100, 100, 100));

    expect(lastCaptureOptions()).toMatchObject({ x: 240, y: 340, width: 220, height: 220 });
  });

  it("keeps the region unchanged when the canvas is downscaled (fractions are resolution-independent)", async () => {
    // Hi-DPI capture: canvas comes back wider than maxWidth (1200) and takes
    // the downscale path through an off-DOM canvas.
    mockHtml2Canvas.mockResolvedValue(stubCanvas(2400, 2400));

    const fakeCtx = { drawImage: vi.fn() };
    const fakeScaled = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(fakeCtx),
      toDataURL: vi.fn().mockReturnValue("data:image/jpeg;base64,SCALED"),
    };
    const origCreate = document.createElement.bind(document);
    const createSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tag: string) =>
        tag === "canvas" ? (fakeScaled as unknown as HTMLElement) : origCreate(tag),
      );

    try {
      const result = await captureAnnotatedScreenshot(new DOMRect(500, 500, 100, 100));

      expect(result?.dataUrl).toBe("data:image/jpeg;base64,SCALED");
      expect(fakeScaled.width).toBe(1200);
      expect(fakeScaled.height).toBe(1200);
      // Same fractions as the non-downscaled capture of the same rect —
      // the region is computed from CSS-px geometry, not canvas pixels.
      expect(result?.region).toEqual({ xPct: 0.2727, yPct: 0.2727, wPct: 0.4545, hPct: 0.4545 });
    } finally {
      createSpy.mockRestore();
    }
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

describe("captureAnnotatedScreenshot — ignoreElements predicate", () => {
  type IgnoreFn = (element: Element) => boolean;

  async function getIgnorePredicate(): Promise<IgnoreFn> {
    await captureAnnotatedScreenshot(new DOMRect(0, 0, 100, 100));
    const ignore = lastCaptureOptions().ignoreElements;
    expect(ignore).toBeTypeOf("function");
    return ignore as IgnoreFn;
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
