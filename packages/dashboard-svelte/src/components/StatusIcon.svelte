<!--
  Status → 16px glyph (S1 glyph language: circle shapes, never emoji) —
  ○ open, ◐ in progress, ● resolved (check knocked out), ⊘ won't fix.
-->
<script lang="ts">
  import type { FeedbackStatus } from "@siteping/core";

  let { status, class: className }: { status: FeedbackStatus; class?: string | undefined } = $props();
  // Per-instance mask id, safe inside `url(#…)`.
  const uid = $props.id();
  const maskId = `spd-resolved-${uid.replace(/[^a-zA-Z0-9_-]/g, "")}`;
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
  {#if status === "open"}
    <circle cx="8" cy="8" r="6" />
  {:else if status === "in_progress"}
    <circle cx="8" cy="8" r="6" />
    <path d="M8 2.5a5.5 5.5 0 0 1 0 11Z" fill="currentColor" stroke="none" />
  {:else if status === "resolved"}
    <mask id={maskId}>
      <rect width="16" height="16" fill="#fff" />
      <path d="M5.1 8.4l2 2 3.8-4.4" stroke="#000" stroke-width="1.7" fill="none" />
    </mask>
    <circle cx="8" cy="8" r="6.75" fill="currentColor" stroke="none" mask={`url(#${maskId})`} />
  {:else}
    <circle cx="8" cy="8" r="6" />
    <path d="M4.3 11.7 11.7 4.3" />
  {/if}
</svg>
