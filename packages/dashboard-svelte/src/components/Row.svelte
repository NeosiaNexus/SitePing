<!-- One feedback line in the listbox — density-aware, ellipsized, keyboard-driven from the root. -->
<script lang="ts">
  import type { FeedbackRecord } from "@siteping/core";
  import { formatAbsolute, formatRelativeTime, pathFromUrl, safeScreenshotUrl, toDateTimeAttr } from "../format.js";
  import { getStatusLabel, getTypeLabel } from "../i18n/index.js";
  import { useInboxUi } from "./context.js";
  import Icon from "./Icon.svelte";
  import StatusIcon from "./StatusIcon.svelte";

  let {
    record,
    domId,
    focused,
    selected,
    leaving,
    onselect,
  }: {
    record: FeedbackRecord;
    /** DOM id targeted by the listbox `aria-activedescendant`. */
    domId: string;
    /** Keyboard-focused row — drives the focus ring + `aria-activedescendant`, never selection. */
    focused: boolean;
    /** The opened record — drives `aria-selected` (the real listbox selection). */
    selected: boolean;
    /** Ghost row kept briefly in the DOM while its status-leave animation runs. */
    leaving: boolean;
    onselect: () => void;
  } = $props();

  const ui = useInboxUi();
  const typeLabel = $derived(getTypeLabel(record.type, ui.t));
  const path = $derived(pathFromUrl(record.url));

  function handleClick(): void {
    // Dragging to select message text must not open the drawer.
    if (window.getSelection()?.toString()) return;
    onselect();
  }
</script>

<!-- Keyboard interaction lives on the listbox (aria-activedescendant), not on each option. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  id={domId}
  role="option"
  tabindex="-1"
  aria-selected={selected}
  aria-hidden={leaving || undefined}
  data-status={record.status}
  class={["spd-row", focused && "spd-row-focused", leaving && "spd-row-leaving"]}
  onclick={leaving ? undefined : handleClick}
>
  <span class="spd-row-status" role="img" aria-label={getStatusLabel(record.status, ui.t)}>
    <StatusIcon status={record.status} />
  </span>
  <span class="spd-row-type" title={typeLabel}>
    <i class="spd-type-square" data-type={record.type} aria-hidden="true"></i>
    <!-- Type label is display:none below 720cq; keep it in the a11y tree always. -->
    <span class="spd-sr-only">{typeLabel}</span>
    <span class="spd-type-label" aria-hidden="true">{typeLabel}</span>
  </span>
  <span class="spd-row-message" title={record.message}>{record.message}</span>
  <span class="spd-row-path" title={path}>{path}</span>
  <span class="spd-row-author" title={record.authorName}>{record.authorName}</span>
  {#if safeScreenshotUrl(record)}
    <span class="spd-row-camera" role="img" aria-label={ui.t("drawer.screenshotAlt")}>
      <Icon name="camera" />
    </span>
  {/if}
  <time
    class="spd-row-time"
    datetime={toDateTimeAttr(record.createdAt)}
    title={formatAbsolute(record.createdAt, ui.locale)}
  >
    {formatRelativeTime(record.createdAt, ui.t)}
  </time>
</div>
