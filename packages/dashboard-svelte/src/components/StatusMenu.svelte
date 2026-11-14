<!--
  Drawer status control: a trigger button opening a popup listbox of the four
  statuses with their glyphs. Fully keyboard navigable (arrows/Home/End/Enter,
  Esc closes). Key events inside the popup never bubble to the inbox root, so
  the global shortcuts stay quiet while the menu is open.
-->
<script lang="ts">
  import { FEEDBACK_STATUSES, type FeedbackStatus } from "@siteping/core";
  import { getStatusLabel } from "../i18n/index.js";
  import { useInboxUi } from "./context.js";
  import Icon from "./Icon.svelte";
  import StatusIcon from "./StatusIcon.svelte";

  let { status, onselect }: { status: FeedbackStatus; onselect: (status: FeedbackStatus) => void } = $props();

  const ui = useInboxUi();
  const listId = $props.id();
  let open = $state(false);
  let activeIndex = $state(0);
  let root: HTMLDivElement | null = $state(null);
  let trigger: HTMLButtonElement | null = $state(null);
  let pop: HTMLDivElement | null = $state(null);
  const activeStatus = $derived(FEEDBACK_STATUSES[activeIndex] ?? "open");

  // Close when the pointer goes down anywhere outside the menu.
  $effect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent): void => {
      if (root && event.target instanceof Node && !root.contains(event.target)) open = false;
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  });

  // Move focus into the popup listbox once it appears.
  $effect(() => {
    if (open) pop?.focus();
  });

  function openMenu(): void {
    activeIndex = Math.max(0, FEEDBACK_STATUSES.indexOf(status));
    open = true;
  }

  function close(): void {
    open = false;
    trigger?.focus();
  }

  function select(next: FeedbackStatus): void {
    close();
    if (next !== status) onselect(next);
  }

  function handlePopKeyDown(event: KeyboardEvent): void {
    event.stopPropagation();
    switch (event.key) {
      case "ArrowDown":
        activeIndex = Math.min(activeIndex + 1, FEEDBACK_STATUSES.length - 1);
        break;
      case "ArrowUp":
        activeIndex = Math.max(activeIndex - 1, 0);
        break;
      case "Home":
        activeIndex = 0;
        break;
      case "End":
        activeIndex = FEEDBACK_STATUSES.length - 1;
        break;
      case "Enter":
      case " ": {
        const next = FEEDBACK_STATUSES[activeIndex];
        if (next) select(next);
        break;
      }
      case "Escape":
      case "Tab":
        close();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  function handleTriggerKeyDown(event: KeyboardEvent): void {
    // Enter/Space activate the trigger natively — keep them away from the
    // root handler (where Enter means "open on page").
    if (event.key === "Enter" || event.key === " ") {
      event.stopPropagation();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      openMenu();
    }
  }
</script>

<div bind:this={root} class="spd-status-menu">
  <!-- No aria-label: the accessible name is the visible status text (WCAG 2.5.3). -->
  <button
    bind:this={trigger}
    type="button"
    class="spd-status-menu-trigger"
    data-status={status}
    aria-haspopup="listbox"
    aria-expanded={open}
    onclick={() => (open ? (open = false) : openMenu())}
    onkeydown={handleTriggerKeyDown}
  >
    <StatusIcon {status} />
    <span>{getStatusLabel(status, ui.t)}</span>
    <Icon name="chevron-down" />
  </button>
  {#if open}
    <div
      bind:this={pop}
      class="spd-status-menu-pop"
      role="listbox"
      tabindex="-1"
      aria-label={ui.t("drawer.status")}
      aria-activedescendant={`${listId}-${activeStatus}`}
      onkeydown={handlePopKeyDown}
    >
      {#each FEEDBACK_STATUSES as value, index (value)}
        <!-- Keyboard selection is handled on the listbox itself. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          id={`${listId}-${value}`}
          role="option"
          tabindex="-1"
          aria-selected={value === status}
          data-status={value}
          class={["spd-status-menu-item", index === activeIndex && "spd-status-menu-item-active"]}
          onclick={() => select(value)}
          onmouseenter={() => (activeIndex = index)}
        >
          <StatusIcon status={value} />
          <span>{getStatusLabel(value, ui.t)}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
