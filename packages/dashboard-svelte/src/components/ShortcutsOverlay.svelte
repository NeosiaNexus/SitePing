<!--
  Keyboard cheat sheet, toggled with "?". Modal: focus is trapped inside,
  Esc or a click outside the card closes it, and Esc never bubbles to the
  root (the overlay is always the topmost layer).
-->
<script lang="ts">
  import { trapTab, useInboxUi } from "./context.js";

  let {
    canChangeStatus,
    onclose,
  }: {
    /** False leaves out the status keys and undo. */
    canChangeStatus: boolean;
    onclose: () => void;
  } = $props();

  const ui = useInboxUi();
  let overlay: HTMLDivElement | null = $state(null);

  $effect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlay?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  });

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onclose();
      return;
    }
    if (event.key === "Tab" && overlay) trapTab(event, overlay);
  }

  const rows = $derived<Array<{ keys: string[]; label: string }>>([
    { keys: ["j", "k"], label: ui.t("hints.navigate") },
    { keys: ["⏎"], label: ui.t("hints.open") },
    ...(canChangeStatus
      ? [
          { keys: ["e"], label: ui.t("hints.resolve") },
          { keys: ["p"], label: ui.t("hints.inProgress") },
          { keys: ["x"], label: ui.t("hints.wontFix") },
          { keys: ["u"], label: ui.t("inbox.undo") },
        ]
      : []),
    { keys: ["r"], label: ui.t("inbox.refresh") },
    { keys: ["/"], label: ui.t("inbox.searchAria") },
    { keys: ["1–5"], label: ui.t("inbox.statusFilter") },
    { keys: ["?"], label: ui.t("hints.help") },
    { keys: ["Esc"], label: ui.t("shortcuts.close") },
  ]);
</script>

<!-- Close only on backdrop clicks — clicks inside the card stay put; Esc is the keyboard path. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  bind:this={overlay}
  class="spd-shortcuts"
  role="dialog"
  aria-modal="true"
  aria-label={ui.t("shortcuts.title")}
  tabindex="-1"
  onclick={(event) => {
    if (event.target === event.currentTarget) onclose();
  }}
  onkeydown={handleKeyDown}
>
  <div class="spd-shortcuts-card">
    <div class="spd-meta-label">{ui.t("shortcuts.title")}</div>
    <div class="spd-shortcuts-grid">
      {#each rows as row (row.label + row.keys.join())}
        <span class="spd-shortcut-keys">
          {#each row.keys as key (key)}
            <kbd class="spd-kbd">{key}</kbd>
          {/each}
        </span>
        <span class="spd-shortcut-label">{row.label}</span>
      {/each}
    </div>
  </div>
</div>
