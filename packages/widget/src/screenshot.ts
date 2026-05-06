/**
 * Screenshot capture via html2canvas.
 *
 * `html2canvas` is an **optional peer dependency** — it is not bundled with
 * the widget. Hosts that want screenshots install it themselves; hosts that
 * don't keep a smaller bundle. We dynamic-import it so the chunk is only
 * pulled in when `enableScreenshot: true` is set.
 *
 * On failure (capture error, library not installed, content-tainted canvas)
 * we return `null` rather than throwing — the feedback is still submitted,
 * just without an image.
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
    // html2canvas is an *optional* peer dependency — keep the specifier
    // off the bundler's static graph so missing-package errors are caught
    // at runtime (returning null) instead of failing the host's build.
    // The `/* @vite-ignore */` and indirected specifier together opt every
    // common bundler (Vite, webpack, esbuild) out of static resolution.
    const specifier = "html2canvas";
    const mod = (await import(/* @vite-ignore */ /* webpackIgnore: true */ specifier)) as {
      default?: Html2CanvasFn;
    } & Html2CanvasFn;
    cachedHtml2Canvas = (mod.default ?? mod) as Html2CanvasFn;
    return cachedHtml2Canvas;
  } catch {
    cachedHtml2Canvas = null;
    if (!warnedAboutMissingDep) {
      warnedAboutMissingDep = true;
      console.warn(
        "[siteping] enableScreenshot is on but html2canvas is not installed. Run `npm install html2canvas` (or your equivalent) to enable capture, or remove `enableScreenshot` from the config to silence this warning.",
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
