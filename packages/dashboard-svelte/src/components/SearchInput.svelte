<!-- Toolbar search field — updates state synchronously; the controller debounces the refetch. -->
<script lang="ts">
  import { useInboxUi } from "./context.js";
  import Icon from "./Icon.svelte";

  let {
    value,
    onchange,
    input = $bindable(null),
  }: {
    value: string;
    onchange: (value: string) => void;
    /** Bound so the root "/" shortcut can focus the field. */
    input?: HTMLInputElement | null;
  } = $props();

  const ui = useInboxUi();
</script>

<div class="spd-search">
  <Icon name="search" />
  <input
    bind:this={input}
    class="spd-search-input"
    type="search"
    placeholder={ui.t("inbox.searchPlaceholder")}
    aria-label={ui.t("inbox.searchAria")}
    {value}
    oninput={(event) => onchange(event.currentTarget.value)}
  />
  {#if value}
    <button
      type="button"
      class="spd-search-clear"
      aria-label={ui.t("inbox.clearSearch")}
      onclick={() => {
        onchange("");
        input?.focus();
      }}
    >
      <Icon name="close" />
    </button>
  {:else}
    <kbd class="spd-kbd">/</kbd>
  {/if}
</div>
