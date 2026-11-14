<!--
  Inline SVG icon set — 16×16, stroke 1.5, `currentColor`, decorative
  (`aria-hidden`). Status glyphs (see StatusIcon.svelte) are the signature
  language: circles for status, squares mark type. Never emoji.
-->
<script lang="ts" module>
  export type IconName = "search" | "refresh" | "close" | "chevron-down" | "external" | "camera" | "trash" | "check";
</script>

<script lang="ts">
  let { name, class: className }: { name: IconName; class?: string | undefined } = $props();
</script>

<svg
  width="16"
  height="16"
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  class={className}
>
  {#if name === "search"}
    <circle cx="7.25" cy="7.25" r="4.75" />
    <path d="m10.75 10.75 3 3" />
  {:else if name === "refresh"}
    <path d="M14 8a6 6 0 1 1-6-6c1.68 0 3.29.67 4.49 1.83L14 5.33" />
    <path d="M14 2v3.33h-3.33" />
  {:else if name === "close"}
    <path d="M4 4l8 8M12 4l-8 8" />
  {:else if name === "chevron-down"}
    <path d="m4 6.5 4 4 4-4" />
  {:else if name === "external"}
    <path d="M12.5 8.5V12a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 12V5A1.5 1.5 0 0 1 4 3.5h3.5" />
    <path d="M9.5 2.5h4v4" />
    <path d="M13.5 2.5 8 8" />
  {:else if name === "camera"}
    <path
      d="M2.5 5.5A1.5 1.5 0 0 1 4 4h1.3l1-1.5h3.4l1 1.5H12a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 12 13H4a1.5 1.5 0 0 1-1.5-1.5v-6Z"
    />
    <circle cx="8" cy="8.25" r="2.25" />
  {:else if name === "trash"}
    <path d="M2.5 4.5h11" />
    <path d="M5.5 4.5V3.25A1.25 1.25 0 0 1 6.75 2h2.5a1.25 1.25 0 0 1 1.25 1.25V4.5" />
    <path d="M4 4.5l.6 8.11A1.5 1.5 0 0 0 6.1 14h3.8a1.5 1.5 0 0 0 1.5-1.39L12 4.5" />
  {:else if name === "check"}
    <path d="m3.5 8.5 3 3 6-6.5" />
  {/if}
</svg>
