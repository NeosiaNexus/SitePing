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

import type { ScreenshotRegion } from "@siteping/core";

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

/** Result of a contextual capture: the JPEG plus where the drawn rect sits in it. */
export interface AnnotatedScreenshot {
  /** Base64 JPEG `data:` URL of the padded capture area. */
  dataUrl: string;
  /** The drawn rect's position within the image, as fractions of its dimensions. */
  region: ScreenshotRegion;
}

/** Clamp `value` into `[min, max]`. */
function clamp(min: number, value: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round a fraction to 4 decimals and clamp it into [0, 1]. */
function roundPct(value: number): number {
  return clamp(0, Math.round(value * 10_000) / 10_000, 1);
}

/**
 * Capture the drawn rect *plus surrounding context* as a JPEG data URL, and
 * report where the rect sits inside the image (`region`, as fractions of the
 * image dimensions) so dashboards can re-render the annotation on top.
 * Returns `null` on any failure — callers should not abort feedback submission.
 *
 * - Pads the rect by up to 60% of its own size (48px floor, 280/220px ceiling)
 *   so reviewers see the UI around the annotation, not just its pixels
 * - Clamps the capture area to the document bounds (no blank margins)
 * - Excludes Siteping's own overlay elements via `ignoreElements`
 * - Honors devicePixelRatio for crisp captures, then downscales to `maxWidth`
 *   — `region` is resolution-independent, so it survives the downscale
 * - JPEG at `quality` (0.85 = ~50–150 KB for a typical annotated area)
 */
export async function captureAnnotatedScreenshot(
  rect: DOMRect,
  options?: CaptureOptions,
): Promise<AnnotatedScreenshot | null> {
  const html2canvas = await loadHtml2Canvas();
  if (!html2canvas) return null;

  const quality = options?.quality ?? 0.85;
  const maxWidth = options?.maxWidth ?? 1200;

  // Contextual padding, proportional to the rect with fixed floor/ceiling —
  // small rects still get enough context to be recognizable, huge rects
  // don't balloon the capture (CSS px).
  const padX = clamp(48, rect.width * 0.6, 280);
  const padY = clamp(48, rect.height * 0.6, 220);

  // Document coordinates of the drawn rect (rect is viewport-relative).
  const docX = window.scrollX + rect.x;
  const docY = window.scrollY + rect.y;

  // Clamp the padded capture area to the document bounds so html2canvas
  // never renders blank out-of-document margins.
  const docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  const docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  const capX = Math.max(0, docX - padX);
  const capY = Math.max(0, docY - padY);
  const capW = Math.min(docW, docX + rect.width + padX) - capX;
  const capH = Math.min(docH, docY + rect.height + padY) - capY;
  if (capW <= 0 || capH <= 0) return null;

  // Fractions are resolution-independent — computed once from CSS-px
  // geometry, they stay valid after the hi-DPI render and the downscale.
  const region: ScreenshotRegion = {
    xPct: roundPct((docX - capX) / capW),
    yPct: roundPct((docY - capY) / capH),
    wPct: roundPct(rect.width / capW),
    hPct: roundPct(rect.height / capH),
  };

  try {
    const canvas = await html2canvas(document.body, {
      x: capX,
      y: capY,
      width: capW,
      height: capH,
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
      return { dataUrl: canvas.toDataURL("image/jpeg", quality), region };
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
    return { dataUrl: scaled.toDataURL("image/jpeg", quality), region };
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
