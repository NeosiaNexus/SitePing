<!--
  Evidence card (signature element): the screenshot with the client's
  annotation re-rendered on top from `record.screenshotRegion` — dimmed
  surround, accent rect, viewfinder corner brackets, EXIF-style caption.
  Legacy records without a region render the plain image; records without
  a screenshot fall back to the DOM anchor view.
-->
<script lang="ts" module>
  import type { ScreenshotRegion } from "@siteping/core";

  const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
  const pct = (value: number): string => `${(clamp01(value) * 100).toFixed(3)}%`;

  /** Geometry is data-driven (per-record percentages), so it lives inline; colors/borders come from the CSS. */
  function dimBoxes(region: ScreenshotRegion): Array<{ left: string; top: string; width: string; height: string }> {
    return [
      { left: "0", top: "0", width: "100%", height: pct(region.yPct) },
      { left: "0", top: pct(region.yPct), width: pct(region.xPct), height: pct(region.hPct) },
      {
        left: pct(region.xPct + region.wPct),
        top: pct(region.yPct),
        width: pct(1 - region.xPct - region.wPct),
        height: pct(region.hPct),
      },
      { left: "0", top: pct(region.yPct + region.hPct), width: "100%", height: pct(1 - region.yPct - region.hPct) },
    ];
  }
</script>

<script lang="ts">
  import type { FeedbackRecord } from "@siteping/core";
  import { pathFromUrl, safeScreenshotUrl } from "../format.js";
  import AnchorFallback from "./AnchorFallback.svelte";
  import { useInboxUi } from "./context.js";

  let { record }: { record: FeedbackRecord } = $props();

  const ui = useInboxUi();
  let zoomed = $state(false);
  let showAnnotation = $state(true);
  let imgSize = $state.raw<{ w: number; h: number } | null>(null);

  const region = $derived(record.screenshotRegion);
  const primary = $derived(record.annotations[0]);
  const extras = $derived(record.annotations.slice(1));
  const screenshotUrl = $derived(safeScreenshotUrl(record));
  const caption = $derived.by(() => {
    const parts: string[] = [pathFromUrl(record.url), record.viewport];
    if (primary) parts.push(`@${primary.devicePixelRatio}x`);
    if (region && imgSize) parts.push(`${Math.round(region.wPct * imgSize.w)}×${Math.round(region.hPct * imgSize.h)}px`);
    return parts.join(" · ");
  });
</script>

<div class="spd-evidence">
  {#if screenshotUrl}
    <div class={["spd-evidence-stage", zoomed && "spd-evidence-zoomed"]}>
      <button
        type="button"
        class="spd-evidence-zoom"
        aria-pressed={zoomed}
        aria-label={ui.t("drawer.zoomScreenshot")}
        style:display="block"
        style:width="100%"
        style:cursor={zoomed ? "zoom-out" : "zoom-in"}
        onclick={() => (zoomed = !zoomed)}
        onkeydown={(event) => {
          // Esc collapses the zoom without bubbling up to close the drawer.
          if (event.key === "Escape" && zoomed) {
            event.stopPropagation();
            zoomed = false;
          }
        }}
      >
        <!-- Like the widget's panel: the storage host never learns which page views which feedback. -->
        <img
          class="spd-evidence-img"
          src={screenshotUrl}
          alt={ui.t("drawer.screenshotAlt")}
          referrerpolicy="no-referrer"
          onload={(event) => {
            const img = event.currentTarget as HTMLImageElement;
            if (img.naturalWidth > 0 && img.naturalHeight > 0) imgSize = { w: img.naturalWidth, h: img.naturalHeight };
          }}
        />
      </button>
      {#if region && showAnnotation}
        {#each dimBoxes(region) as box, index (index)}
          <div
            class="spd-evidence-dim"
            style:position="absolute"
            style:pointer-events="none"
            style:left={box.left}
            style:top={box.top}
            style:width={box.width}
            style:height={box.height}
          ></div>
        {/each}
        <div
          class="spd-evidence-rect"
          style:position="absolute"
          style:pointer-events="none"
          style:left={pct(region.xPct)}
          style:top={pct(region.yPct)}
          style:width={pct(region.wPct)}
          style:height={pct(region.hPct)}
        ></div>
      {/if}
      <div class="spd-evidence-corners" aria-hidden="true"><i></i><i></i></div>
    </div>
    <div class="spd-evidence-caption">
      <span>{caption}</span>
      {#if region}
        <button type="button" class="spd-evidence-toggle" onclick={() => (showAnnotation = !showAnnotation)}>
          {showAnnotation ? ui.t("drawer.hideAnnotation") : ui.t("drawer.showAnnotation")}
        </button>
      {/if}
    </div>
  {:else if primary}
    <AnchorFallback annotation={primary} withCorners />
  {:else}
    <div class="spd-evidence-fallback">
      <div class="spd-evidence-corners" aria-hidden="true"><i></i><i></i></div>
      <div class="spd-empty-sub">{ui.t("drawer.noScreenshot")}</div>
    </div>
  {/if}
  {#each extras as annotation (annotation.id)}
    <AnchorFallback {annotation} withCorners={false} />
  {/each}
</div>
