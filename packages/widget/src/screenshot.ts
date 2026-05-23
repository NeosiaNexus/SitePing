/**
 * Screenshot capture via html2canvas.
 *
 * `html2canvas` is a regular `dependency` of `@siteping/widget` — every
 * install gets it. We dynamic-import it so bundlers emit a separate chunk
 * loaded only when `enableScreenshot: true` triggers the first capture;
 * hosts that never enable screenshots pay only the disk-space cost.
 *
 * On capture failure (content-tainted canvas, version mismatch, missing 2D
 * context) we return `null` rather than throwing — the feedback is still
 * submitted, just without an image.
 */

type Html2CanvasFn = (element: HTMLElement, options?: Html2CanvasOptions) => Promise<HTMLCanvasElement>;

interface Html2CanvasOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scale?: number;
  useCORS?: boolean;
  allowTaint?: boolean;
  logging?: boolean;
  ignoreElements?: (element: Element) => boolean;
}

let cachedHtml2Canvas: Html2CanvasFn | null | undefined; // undefined = not loaded yet, null = failed
let warnedAboutMissingDep = false;

async function loadHtml2Canvas(): Promise<Html2CanvasFn | null> {
  if (cachedHtml2Canvas !== undefined) return cachedHtml2Canvas;
  try {
    // Static dynamic import — bundlers (Vite, webpack, esbuild) resolve this
    // at build time and emit a separate chunk loaded only on first capture.
    // html2canvas ships as a regular dependency so this resolves on every
    // install. Earlier attempts to dodge static resolution via magic comments
    // silently broke production: bare specifiers can't be resolved at runtime
    // in browsers without import maps.
    const mod = (await import("html2canvas")) as { default?: Html2CanvasFn } & Html2CanvasFn;
    cachedHtml2Canvas = (mod.default ?? mod) as Html2CanvasFn;
    return cachedHtml2Canvas;
  } catch (err) {
    cachedHtml2Canvas = null;
    if (!warnedAboutMissingDep) {
      warnedAboutMissingDep = true;
      console.warn(
        "[siteping] html2canvas import failed unexpectedly. Capture is disabled for this session — feedbacks are still submitted, just without screenshots. Underlying error:",
        err,
      );
    }
    return null;
  }
}

export interface CaptureOptions {
  /** JPEG quality 0..1 (default 0.85). */
  quality?: number;
  /** Max output width in CSS pixels (default 1200). Wider canvases are downscaled. */
  maxWidth?: number;
}

/**
 * Capture the page region within `rect` as a JPEG data URL. Returns `null`
 * on any failure — callers should not abort feedback submission.
 *
 * - Excludes Siteping's own overlay elements via `ignoreElements`
 * - Honors devicePixelRatio for crisp captures, then downscales to `maxWidth`
 * - JPEG at `quality` (0.85 = ~50–150 KB for a typical annotated area)
 */
export async function captureScreenshot(rect: DOMRect, options?: CaptureOptions): Promise<string | null> {
  const html2canvas = await loadHtml2Canvas();
  if (!html2canvas) return null;

  const quality = options?.quality ?? 0.85;
  const maxWidth = options?.maxWidth ?? 1200;

  try {
    const canvas = await html2canvas(document.body, {
      x: window.scrollX + rect.x,
      y: window.scrollY + rect.y,
      width: rect.width,
      height: rect.height,
      scale: window.devicePixelRatio,
      useCORS: true,
      allowTaint: true,
      logging: false,
      ignoreElements: (element: Element) => {
        // Matched elements (and their descendants) are removed from the
        // render pass — the page underneath shows through. Two layers of
        // exclusion:
        //
        // 1. The widget's own shadow host (`<siteping-widget>`).
        // 2. Anything carrying `data-siteping-ignore="true"` — the
        //    documented host-facing masking attribute AND how widget
        //    chrome that lives OUTSIDE the shadow host (annotator overlay
        //    + toolbar + drawing rect, popup) opts itself out of capture.
        //    Without (2) the accent-colored selection border ends up
        //    baked into the JPEG.
        return (
          element.tagName === "SITEPING-WIDGET" ||
          element.closest?.("siteping-widget") !== null ||
          element.getAttribute?.("data-siteping-ignore") === "true"
        );
      },
    });

    if (canvas.width <= maxWidth) {
      return canvas.toDataURL("image/jpeg", quality);
    }

    // Downscale via an off-DOM canvas — keeps payload reasonable on
    // hi-DPI displays where the raw capture can be 2x–3x intended size.
    const ratio = maxWidth / canvas.width;
    const targetW = maxWidth;
    const targetH = Math.round(canvas.height * ratio);

    const scaled = document.createElement("canvas");
    scaled.width = targetW;
    scaled.height = targetH;
    const ctx = scaled.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(canvas, 0, 0, targetW, targetH);
    return scaled.toDataURL("image/jpeg", quality);
  } catch (err) {
    console.warn("[siteping] Screenshot capture failed:", err);
    return null;
  }
}

/** @internal — exposed for tests. Resets the dynamic-import cache. */
export function _resetScreenshotCacheForTests(): void {
  cachedHtml2Canvas = undefined;
  warnedAboutMissingDep = false;
}
