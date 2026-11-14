<!-- Fixed 48px toolbar: project switcher (multi-project only), status tabs, type filter, search, refresh. -->
<script lang="ts">
  import type { InboxState } from "../types.js";
  import { useInboxUi } from "./context.js";
  import Icon from "./Icon.svelte";
  import ProjectSwitcher from "./ProjectSwitcher.svelte";
  import SearchInput from "./SearchInput.svelte";
  import StatusTabs from "./StatusTabs.svelte";
  import TypeFilter from "./TypeFilter.svelte";

  let { inbox, search = $bindable(null) }: { inbox: InboxState; search?: HTMLInputElement | null } = $props();

  const ui = useInboxUi();
</script>

<div class="spd-toolbar">
  {#if inbox.projects.length > 1}
    <ProjectSwitcher projects={inbox.projects} project={inbox.project} onchange={inbox.setProject} />
  {/if}
  <StatusTabs status={inbox.status} counts={inbox.counts} onchange={inbox.setStatusFilter} />
  <div class="spd-toolbar-spacer"></div>
  <TypeFilter type={inbox.type} onchange={inbox.setTypeFilter} />
  <SearchInput value={inbox.search} onchange={inbox.setSearch} bind:input={search} />
  <button
    type="button"
    class={["spd-icon-btn", "spd-refresh", inbox.loading && "spd-spin"]}
    aria-label={ui.t("inbox.refresh")}
    onclick={() => void inbox.refresh()}
  >
    <Icon name="refresh" />
  </button>
</div>
