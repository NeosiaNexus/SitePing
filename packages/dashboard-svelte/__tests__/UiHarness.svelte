<!--
  Test-only: provides the inbox UI context and renders one component inside
  it — optionally wrapped in a plain <div> standing in for a parent (the
  drawer's focusable container, a keydown listener above the component).
-->
<script lang="ts">
  import { type Component, untrack } from "svelte";
  import { type InboxUiContextValue, provideInboxUi } from "../src/components/context.js";
  import type { HarnessWrap } from "./render.js";

  let {
    component: Child,
    props,
    ui,
    wrap,
  }: {
    component: Component<any>;
    props: Record<string, unknown>;
    ui: InboxUiContextValue;
    wrap?: HarnessWrap | undefined;
  } = $props();

  provideInboxUi(untrack(() => ui));
</script>

{#if wrap}
  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_no_noninteractive_tabindex -->
  <div class={wrap.class} tabindex={wrap.tabindex} onkeydown={wrap.onkeydown}>
    <Child {...props} />
  </div>
{:else}
  <Child {...props} />
{/if}
