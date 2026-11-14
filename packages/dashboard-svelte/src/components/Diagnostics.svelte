<!-- Console + failed-network snapshot, merged chronologically — the "replay the context" section of the drawer. -->
<script lang="ts">
  import type { ConsoleDiagnosticEntry, DiagnosticsSnapshot, NetworkDiagnosticEntry } from "@siteping/core";
  import { SvelteSet } from "svelte/reactivity";
  import { tWithParams } from "../i18n/index.js";
  import { useInboxUi } from "./context.js";

  /** Entries shown before "Show all" expands the list. */
  const VISIBLE_COUNT = 6;

  type MergedEntry =
    | { kind: "console"; key: string; timestamp: string; console: ConsoleDiagnosticEntry }
    | { kind: "network"; key: string; timestamp: string; network: NetworkDiagnosticEntry };

  let { diagnostics }: { diagnostics: DiagnosticsSnapshot } = $props();

  const ui = useInboxUi();
  let showAll = $state(false);
  const expanded = new SvelteSet<string>();

  /** A console message is only worth an expander when it can actually overflow the 2-line clamp. */
  const isClampable = (message: string): boolean => message.length > 90 || message.includes("\n");
  const isFailed = (entry: NetworkDiagnosticEntry): boolean => entry.status >= 400 || entry.status === 0;

  const merged = $derived.by<MergedEntry[]>(() => {
    // Keys are stable per source-array position — unaffected by the sort below.
    const entries: MergedEntry[] = [
      ...diagnostics.console.map((entry, position) => ({
        kind: "console" as const,
        key: `console-${position}`,
        timestamp: entry.timestamp,
        console: entry,
      })),
      ...diagnostics.network.map((entry, position) => ({
        kind: "network" as const,
        key: `network-${position}`,
        timestamp: entry.timestamp,
        network: entry,
      })),
    ];
    return entries.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  });

  const visible = $derived(showAll ? merged : merged.slice(0, VISIBLE_COUNT));

  function formatTime(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleTimeString(ui.locale, { hour12: false });
  }

  function toggleExpanded(key: string): void {
    if (expanded.has(key)) expanded.delete(key);
    else expanded.add(key);
  }
</script>

<section class="spd-diagnostics">
  <div class="spd-meta-label">{ui.t("drawer.diagnostics")} · {merged.length}</div>
  <ul class="spd-diag-list">
    {#each visible as item (item.key)}
      {#if item.kind === "console"}
        {@const clampable = isClampable(item.console.message)}
        {@const isExpanded = expanded.has(item.key)}
        <li
          class="spd-diag-entry"
          data-level={item.console.level}
          data-expanded={clampable && isExpanded ? "true" : undefined}
        >
          <time class="spd-diag-time" datetime={item.timestamp}>{formatTime(item.timestamp)}</time>
          <span class="spd-diag-level">{item.console.level}</span>
          {#if clampable}
            <button
              type="button"
              class="spd-diag-msg"
              aria-expanded={isExpanded}
              onclick={() => toggleExpanded(item.key)}
            >
              {item.console.message}
            </button>
          {:else}
            <span class="spd-diag-msg" style:cursor="auto">{item.console.message}</span>
          {/if}
        </li>
      {:else}
        <li class="spd-diag-entry" data-level={isFailed(item.network) ? "error" : "info"}>
          <time class="spd-diag-time" datetime={item.timestamp}>{formatTime(item.timestamp)}</time>
          <span class="spd-diag-method">{item.network.method}</span>
          <span class="spd-diag-status" data-failed={isFailed(item.network) || undefined}>
            {item.network.status}
          </span>
          <span class="spd-diag-url" title={item.network.url}>{item.network.url}</span>
          <span class="spd-diag-dur">{Math.round(item.network.durationMs)}ms</span>
        </li>
      {/if}
    {/each}
  </ul>
  {#if !showAll && merged.length > VISIBLE_COUNT}
    <button type="button" class="spd-btn-ghost" onclick={() => (showAll = true)}>
      {tWithParams(ui.t, "drawer.showAllDiagnostics", { count: merged.length })}
    </button>
  {/if}
</section>
