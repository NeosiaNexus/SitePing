<!--
  Status filter radiogroup. Roving tabindex with ArrowLeft/ArrowRight/Home/End
  (selection follows focus); the root additionally binds 1–5 as absolute
  shortcuts. Counts render "—" until the background count queries land.
-->
<script lang="ts">
  import { getStatusLabel } from "../i18n/index.js";
  import type { InboxState, InboxStatusFilter } from "../types.js";
  import { useInboxUi } from "./context.js";
  import StatusIcon from "./StatusIcon.svelte";

  const TABS: readonly InboxStatusFilter[] = ["all", "open", "in_progress", "resolved", "wont_fix"];

  let {
    status,
    counts,
    onchange,
  }: {
    status: InboxStatusFilter;
    counts: InboxState["counts"];
    onchange: (status: InboxStatusFilter) => void;
  } = $props();

  const ui = useInboxUi();
  const buttons: Array<HTMLButtonElement | null> = $state([]);

  function handleKeyDown(event: KeyboardEvent): void {
    const current = TABS.indexOf(status);
    let next: number | null = null;
    if (event.key === "ArrowRight") next = Math.min(current + 1, TABS.length - 1);
    else if (event.key === "ArrowLeft") next = Math.max(current - 1, 0);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    if (next === null || next === current) return;
    event.preventDefault();
    event.stopPropagation();
    const tab = TABS[next];
    if (!tab) return;
    onchange(tab);
    buttons[next]?.focus();
  }
</script>

<!-- Roving tabindex: the radios take focus, never the group itself. -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div class="spd-tabs" role="radiogroup" aria-label={ui.t("inbox.statusFilter")} onkeydown={handleKeyDown}>
  {#each TABS as tab, index (tab)}
    {@const count = counts[tab]}
    {@const label = getStatusLabel(tab, ui.t)}
    <!-- Buttons, not native radios: keeps the segmented-control layout + status glyphs. -->
    <button
      bind:this={buttons[index]}
      type="button"
      role="radio"
      class="spd-tab"
      data-status={tab}
      aria-checked={tab === status}
      aria-label={count === undefined ? label : `${label} (${count})`}
      tabindex={tab === status ? 0 : -1}
      onclick={() => onchange(tab)}
    >
      {#if tab !== "all"}
        <span class="spd-tab-glyph"><StatusIcon status={tab} /></span>
      {/if}
      <span class="spd-tab-label">{label}</span>
      <span class="spd-tab-count">{count ?? "—"}</span>
    </button>
  {/each}
</div>
