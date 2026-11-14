<!--
  The feedback listbox. Focus stays on the listbox element itself —
  `aria-activedescendant` points at the focused row, which the root's
  keyboard handler moves with j/k. Clicking a row opens it and returns
  focus to the listbox so keyboard triage continues seamlessly.
-->
<script lang="ts">
  import type { FeedbackRecord } from "@siteping/core";
  import { untrack } from "svelte";
  import type { InboxState } from "../types.js";
  import { useInboxUi } from "./context.js";
  import Row from "./Row.svelte";

  /** How long removed rows linger for their `.spd-row-leaving` exit animation (CSS runs 160ms). */
  const LEAVE_MS = 200;

  /** A removed row remembered with its former index so the ghost renders in place. */
  interface Ghost {
    record: FeedbackRecord;
    index: number;
  }

  let { inbox }: { inbox: InboxState } = $props();

  const ui = useInboxUi();
  const baseId = $props.id();
  const rowDomId = (id: string): string => `${baseId}-${id}`;
  let list: HTMLDivElement | null = $state(null);

  // Keep the keyboard-focused row visible while navigating.
  $effect(() => {
    const id = inbox.focusedId;
    if (!id) return;
    document.getElementById(rowDomId(id))?.scrollIntoView({ block: "nearest" });
  });

  // Status-leave animation: when a status change (or delete) removes one or
  // two rows while the rest of the list is untouched, keep ghosts in place
  // briefly so CSS can fade them out. Filter/page swaps replace the list
  // wholesale and are deliberately excluded — no ghost storm.
  let previous: FeedbackRecord[] = untrack(() => inbox.items);
  let leaving = $state.raw<Ghost[]>([]);
  $effect(() => {
    const items = inbox.items;
    const prev = previous;
    previous = items;
    const currentIds = new Set(items.map((item) => item.id));
    const removed = prev.filter((item) => !currentIds.has(item.id));
    const pureRemoval = removed.length > 0 && removed.length <= 2 && prev.length - removed.length === items.length;
    if (!pureRemoval) {
      if (untrack(() => leaving.length) > 0) leaving = [];
      return;
    }
    leaving = removed.map((record) => ({ record, index: prev.findIndex((item) => item.id === record.id) }));
    const timer = setTimeout(() => {
      leaving = [];
    }, LEAVE_MS);
    return () => clearTimeout(timer);
  });

  const rendered = $derived.by(() => {
    const rows: Array<{ record: FeedbackRecord; ghost: boolean }> = inbox.items.map((record) => ({
      record,
      ghost: false,
    }));
    const liveIds = new Set(inbox.items.map((item) => item.id));
    for (const ghost of leaving) {
      // A record can re-enter the list while its ghost lingers (e → u within
      // 200ms) — skip the ghost, or the same key/DOM id would render twice.
      if (liveIds.has(ghost.record.id)) continue;
      rows.splice(Math.min(Math.max(ghost.index, 0), rows.length), 0, { record: ghost.record, ghost: true });
    }
    return rows;
  });
</script>

<div
  bind:this={list}
  class="spd-list"
  role="listbox"
  tabindex="0"
  aria-label={ui.t("inbox.listLabel")}
  aria-activedescendant={inbox.focusedId ? rowDomId(inbox.focusedId) : undefined}
  aria-busy={inbox.loading || undefined}
>
  {#each rendered as { record, ghost } (record.id)}
    <Row
      {record}
      domId={rowDomId(record.id)}
      focused={!ghost && inbox.focusedId === record.id}
      selected={!ghost && inbox.openedId === record.id}
      leaving={ghost}
      onselect={() => {
        inbox.focus(record.id);
        inbox.openFeedback(record.id);
        list?.focus();
      }}
    />
  {/each}
</div>
