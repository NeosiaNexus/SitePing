import type { AnnotationRecord, FeedbackRecord, ScreenshotRegion } from "@siteping/core";
import type { CSSProperties, ReactElement } from "react";
import { useRef, useState } from "react";
import { pathFromUrl } from "../format.js";
import { useInboxUi } from "./context.js";

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const pct = (value: number): string => `${(clamp01(value) * 100).toFixed(3)}%`;

/** Geometry is data-driven (per-record percentages), so it lives inline; colors/borders come from the CSS. */
function dimStyles(region: ScreenshotRegion): CSSProperties[] {
  const base: CSSProperties = { position: "absolute", pointerEvents: "none" };
  return [
    { ...base, left: 0, top: 0, width: "100%", height: pct(region.yPct) },
    { ...base, left: 0, top: pct(region.yPct), width: pct(region.xPct), height: pct(region.hPct) },
    {
      ...base,
      left: pct(region.xPct + region.wPct),
      top: pct(region.yPct),
      width: pct(1 - region.xPct - region.wPct),
      height: pct(region.hPct),
    },
    {
      ...base,
      left: 0,
      top: pct(region.yPct + region.hPct),
      width: "100%",
      height: pct(1 - region.yPct - region.hPct),
    },
  ];
}

function rectStyle(region: ScreenshotRegion): CSSProperties {
  return {
    position: "absolute",
    pointerEvents: "none",
    left: pct(region.xPct),
    top: pct(region.yPct),
    width: pct(region.wPct),
    height: pct(region.hPct),
  };
}

interface AnchorFallbackProps {
  annotation: AnnotationRecord;
  withCorners: boolean;
}

/** Anchor view — CSS selector (click to copy) + text snippet. Used when no screenshot exists and for extra annotations. */
function AnchorFallback({ annotation, withCorners }: AnchorFallbackProps): ReactElement {
  const { t, notify } = useInboxUi();
  const selectorRef = useRef<HTMLButtonElement | null>(null);
  const hasClipboard = typeof navigator !== "undefined" && Boolean(navigator.clipboard);

  const copySelector = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(annotation.cssSelector);
      notify(t("inbox.copied"));
    } catch {
      // Write blocked (permission, insecure context): select the text so a
      // manual Ctrl+C works, and stay silent — nothing landed on the clipboard.
      const el = selectorRef.current;
      const selection = typeof window !== "undefined" ? window.getSelection() : null;
      if (el && selection) {
        const range = document.createRange();
        range.selectNodeContents(el);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  return (
    <div className="spd-evidence-fallback">
      {withCorners ? (
        <div className="spd-evidence-corners" aria-hidden="true">
          <i />
          <i />
        </div>
      ) : null}
      <div className="spd-meta-label">{t("drawer.anchor")}</div>
      {hasClipboard ? (
        <button
          ref={selectorRef}
          type="button"
          className="spd-anchor-selector"
          title={annotation.cssSelector}
          onClick={() => {
            void copySelector();
          }}
        >
          {annotation.cssSelector}
        </button>
      ) : (
        <div className="spd-anchor-selector" title={annotation.cssSelector}>
          {annotation.cssSelector}
        </div>
      )}
      {annotation.textSnippet ? (
        <blockquote className="spd-anchor-snippet">« {annotation.textSnippet} »</blockquote>
      ) : null}
    </div>
  );
}

interface EvidenceCardProps {
  record: FeedbackRecord;
}

/**
 * Evidence card (signature element): the screenshot with the client's
 * annotation re-rendered on top from `record.screenshotRegion` — dimmed
 * surround, accent rect, viewfinder corner brackets, EXIF-style caption.
 * Legacy records without a region render the plain image; records without
 * a screenshot fall back to the DOM anchor view.
 */
export function EvidenceCard({ record }: EvidenceCardProps): ReactElement {
  const { t } = useInboxUi();
  const [zoomed, setZoomed] = useState(false);
  const [showAnnotation, setShowAnnotation] = useState(true);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  const region = record.screenshotRegion;
  const primary = record.annotations[0];
  const extras = record.annotations.slice(1);

  const captionParts: string[] = [pathFromUrl(record.url), record.viewport];
  if (primary) captionParts.push(`@${primary.devicePixelRatio}x`);
  if (region && imgSize) {
    captionParts.push(`${Math.round(region.wPct * imgSize.w)}×${Math.round(region.hPct * imgSize.h)}px`);
  }

  return (
    <div className="spd-evidence">
      {record.screenshotUrl ? (
        <>
          <div className={`spd-evidence-stage${zoomed ? " spd-evidence-zoomed" : ""}`}>
            <button
              type="button"
              className="spd-evidence-zoom"
              aria-pressed={zoomed}
              aria-label={t("drawer.zoomScreenshot")}
              style={{ display: "block", width: "100%", cursor: zoomed ? "zoom-out" : "zoom-in" }}
              onClick={() => setZoomed((value) => !value)}
              onKeyDown={(event) => {
                // Esc collapses the zoom without bubbling up to close the drawer.
                if (event.key === "Escape" && zoomed) {
                  event.stopPropagation();
                  setZoomed(false);
                }
              }}
            >
              <img
                className="spd-evidence-img"
                src={record.screenshotUrl}
                alt={t("drawer.screenshotAlt")}
                onLoad={(event) => {
                  const img = event.currentTarget;
                  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
                  }
                }}
              />
            </button>
            {region && showAnnotation ? (
              <>
                {dimStyles(region).map((style, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: the four dim panels are positional by nature
                  <div key={index} className="spd-evidence-dim" style={style} />
                ))}
                <div className="spd-evidence-rect" style={rectStyle(region)} />
              </>
            ) : null}
            <div className="spd-evidence-corners" aria-hidden="true">
              <i />
              <i />
            </div>
          </div>
          <div className="spd-evidence-caption">
            <span>{captionParts.join(" · ")}</span>
            {region ? (
              <button
                type="button"
                className="spd-evidence-toggle"
                onClick={() => setShowAnnotation((value) => !value)}
              >
                {showAnnotation ? t("drawer.hideAnnotation") : t("drawer.showAnnotation")}
              </button>
            ) : null}
          </div>
        </>
      ) : primary ? (
        <AnchorFallback annotation={primary} withCorners />
      ) : (
        <div className="spd-evidence-fallback">
          <div className="spd-evidence-corners" aria-hidden="true">
            <i />
            <i />
          </div>
          <div className="spd-empty-sub">{t("drawer.noScreenshot")}</div>
        </div>
      )}
      {extras.map((annotation) => (
        <AnchorFallback key={annotation.id} annotation={annotation} withCorners={false} />
      ))}
    </div>
  );
}
