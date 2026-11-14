<!--
  Empty list states, most specific first:
  - inbox zero — the "open" tab is empty while the project has feedback: the good news state;
  - filtered empty — an active filter matches nothing, with a one-click way out;
  - project empty — no feedback at all (replaceable via the `emptyState` snippet).
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { InboxState } from "../types.js";
  import { useInboxUi } from "./context.js";
  import Icon from "./Icon.svelte";
  import StatusIcon from "./StatusIcon.svelte";

  let {
    inbox,
    custom,
  }: {
    inbox: InboxState;
    /** Host-provided replacement for the default "no feedback yet" state. */
    custom?: Snippet | undefined;
  } = $props();

  const ui = useInboxUi();
  const filtered = $derived(inbox.status !== "all" || inbox.type !== "all" || inbox.search !== "");
  const inboxZero = $derived(
    inbox.status === "open" && inbox.type === "all" && inbox.search === "" && (inbox.counts.all ?? 0) > 0,
  );
</script>

{#if inboxZero}
  <div class="spd-empty">
    <span class="spd-empty-glyph" aria-hidden="true"><Icon name="check" /></span>
    <div class="spd-empty-title">{ui.t("inbox.inboxZeroTitle")}</div>
    <div class="spd-empty-sub">{ui.t("inbox.inboxZeroSub")}</div>
  </div>
{:else if filtered}
  <div class="spd-empty">
    <span class="spd-empty-glyph" aria-hidden="true"><Icon name="search" /></span>
    <div class="spd-empty-title">{ui.t("inbox.emptyFilteredTitle")}</div>
    <div class="spd-empty-sub">{ui.t("inbox.emptyFilteredSub")}</div>
    <button
      type="button"
      class="spd-btn-ghost"
      onclick={() => {
        inbox.setStatusFilter("all");
        inbox.setTypeFilter("all");
        inbox.setSearch("");
      }}
    >
      {ui.t("inbox.viewAll")}
    </button>
  </div>
{:else if custom}
  {@render custom()}
{:else}
  <div class="spd-empty">
    <span class="spd-empty-glyph" aria-hidden="true"><StatusIcon status="open" /></span>
    <div class="spd-empty-title">{ui.t("inbox.emptyTitle")}</div>
    <div class="spd-empty-sub">{ui.t("inbox.emptySub")}</div>
  </div>
{/if}
