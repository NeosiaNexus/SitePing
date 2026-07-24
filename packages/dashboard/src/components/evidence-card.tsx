import type { AnnotationRecord, FeedbackRecord, ScreenshotRegion } from "@siteping/core";
import type { CSSProperties, ReactElement } from "react";
import { useState } from "react";
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
  const copySelector = (): void => {
    navigator.clipboard?.writeText(annotation.cssSelector).then(
      () => notify(t("inbox.copied")),
      () => {
        /* clipboard unavailable — nothing to report */
      },
    );
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
      <button type="button" className="spd-anchor-selector" title={annotation.cssSelector} onClick={copySelector}>
        {annotation.cssSelector}
      </button>
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
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: zoom is a pointer affordance; the image stays reachable without it */}
            <img
              className="spd-evidence-img"
              src={record.screenshotUrl}
              alt={t("drawer.screenshotAlt")}
              onClick={() => setZoomed((value) => !value)}
              onLoad={(event) => {
                const img = event.currentTarget;
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                  setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
                }
              }}
            />
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
