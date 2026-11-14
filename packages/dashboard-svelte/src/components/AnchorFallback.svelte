<!-- Anchor view — CSS selector (click to copy) + text snippet. Used when no screenshot exists and for extra annotations. -->
<script lang="ts">
  import type { AnnotationRecord } from "@siteping/core";
  import { useInboxUi } from "./context.js";

  let { annotation, withCorners }: { annotation: AnnotationRecord; withCorners: boolean } = $props();

  const ui = useInboxUi();
  const hasClipboard = typeof navigator !== "undefined" && Boolean(navigator.clipboard);
  let selector: HTMLButtonElement | null = $state(null);

  async function copySelector(): Promise<void> {
    try {
      await navigator.clipboard.writeText(annotation.cssSelector);
      ui.notify(ui.t("inbox.copied"));
    } catch {
      // Write blocked (permission, insecure context): select the text so a
      // manual Ctrl+C works, and stay silent — nothing landed on the clipboard.
      const selection = typeof window !== "undefined" ? window.getSelection() : null;
      if (selector && selection) {
        const range = document.createRange();
        range.selectNodeContents(selector);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }
</script>

<div class="spd-evidence-fallback">
  {#if withCorners}
    <div class="spd-evidence-corners" aria-hidden="true"><i></i><i></i></div>
  {/if}
  <div class="spd-meta-label">{ui.t("drawer.anchor")}</div>
  {#if hasClipboard}
    <button
      bind:this={selector}
      type="button"
      class="spd-anchor-selector"
      title={annotation.cssSelector}
      onclick={() => void copySelector()}
    >
      {annotation.cssSelector}
    </button>
  {:else}
    <div class="spd-anchor-selector" title={annotation.cssSelector}>{annotation.cssSelector}</div>
  {/if}
  {#if annotation.textSnippet}
    <blockquote class="spd-anchor-snippet">« {annotation.textSnippet} »</blockquote>
  {/if}
</div>
