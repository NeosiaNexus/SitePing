<!--
  Detail dialog for the opened feedback. Rendered inside `{#key record.id}` by
  the root, so per-record UI state (delete confirm, evidence zoom, reply
  draft) resets on every open. In overlay mode focus lands on the panel when
  it opens and returns to the previously focused element (the listbox) when
  it closes.
-->
<script lang="ts">
  import type { FeedbackPermissions, FeedbackStatus } from "@siteping/core";
  import { untrack } from "svelte";
  import { formatAbsolute, formatRelativeTime, recordPageUrl, shortId, toDateTimeAttr } from "../format.js";
  import { getStatusLabel, getTypeLabel } from "../i18n/index.js";
  import type { InboxRecord, InboxSiteUrl, InboxState } from "../types.js";
  import { trapTab, useInboxUi } from "./context.js";
  import Diagnostics from "./Diagnostics.svelte";
  import EvidenceCard from "./EvidenceCard.svelte";
  import Icon from "./Icon.svelte";
  import StatusIcon from "./StatusIcon.svelte";
  import StatusMenu from "./StatusMenu.svelte";
  import Thread from "./Thread.svelte";

  let {
    record,
    overlay,
    deepLinkParam,
    siteUrl,
    onclose,
    onchangestatus,
    ondelete,
    permissions,
    commentPermissionsOf,
    onaddcomment,
    ondeletecomment,
  }: {
    record: InboxRecord;
    /** True below the 960cq container breakpoint — drawer overlays the list with a backdrop and traps focus. */
    overlay: boolean;
    deepLinkParam: string;
    /** Base for a relative record URL — see `InboxSharedOptions.siteUrl`. */
    siteUrl?: InboxSiteUrl | undefined;
    onclose: () => void;
    onchangestatus: (id: string, status: FeedbackStatus) => void;
    ondelete: (id: string) => void;
    /** What the user may do with the record — see `InboxState.permissionsOf`. */
    permissions: FeedbackPermissions;
    /** What the user may do with one reply of it. */
    commentPermissionsOf: InboxState["commentPermissionsOf"];
    onaddcomment: (id: string, body: string, clientId: string) => Promise<void>;
    ondeletecomment: (id: string, commentId: string) => Promise<void>;
  } = $props();

  const ui = useInboxUi();
  let panel: HTMLDivElement | null = null;
  let confirming = $state(false);

  // Focus management. Overlay mode is a modal dialog: focus moves to the
  // drawer container (NOT the close button — keydown Enter on a focused
  // button natively activates it, which would turn the advertised
  // "Enter jumps to the page" into "Enter closes the drawer") and returns to
  // the opener on teardown. Side-by-side mode is a complementary panel: focus
  // stays in the listbox so j/k/Enter keep working uninterrupted — but a click
  // inside it (close, delete) moves focus there, and removing the panel then
  // drops it to <body>, so it goes back to the listbox.
  $effect(() => {
    const modal = overlay;
    return untrack(() => {
      const previous = modal && document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const el = panel;
      if (modal) el?.focus();
      return () => {
        const active = document.activeElement;
        const leftInside = active === null || active === document.body || el?.contains(active) === true;
        if (!leftInside) return;
        if (previous?.isConnected) previous.focus();
        else ui.focusList();
      };
    });
  });

  // Focus trap — only in overlay mode; side-by-side keeps the natural tab order.
  function handleKeyDown(event: KeyboardEvent): void {
    if (overlay && event.key === "Tab" && panel) trapTab(event, panel);
  }

  const diagnostics = $derived(record.diagnostics);
  const hasDiagnostics = $derived(diagnostics !== null && diagnostics.console.length + diagnostics.network.length > 0);
  // Null for non-http(s) record URLs — the link/CTA render as plain text / not at all.
  const pageUrl = $derived(recordPageUrl(record, { siteUrl }));
  const deepLink = $derived(recordPageUrl(record, { siteUrl, deepLinkParam }));
  const typeLabel = $derived(getTypeLabel(record.type, ui.t));
</script>

{#if overlay}
  <!-- Standard dialog backdrop — Esc is the keyboard path. -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="spd-drawer-backdrop" role="presentation" onclick={onclose}></div>
{/if}
<!-- The panel is a dialog/region widget; the keydown handler drives the focus trap. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={panel}
  class="spd-drawer"
  role={overlay ? "dialog" : "region"}
  aria-modal={overlay || undefined}
  aria-label={`${ui.t("drawer.title")} — ${typeLabel} #${shortId(record.id)}`}
  tabindex="-1"
  onkeydown={handleKeyDown}
>
  <h2 class="spd-sr-only">{ui.t("drawer.title")}</h2>
  <div class="spd-drawer-head">
    <div class="spd-drawer-titles">
      <span class="spd-drawer-type">
        <i class="spd-type-square" data-type={record.type} aria-hidden="true"></i>{typeLabel}
      </span>
      <span class="spd-drawer-id" title={record.id}>#{shortId(record.id)}</span>
    </div>
    {#if permissions.canChangeStatus}
      <StatusMenu status={record.status} onselect={(status) => onchangestatus(record.id, status)} />
    {:else}
      <span class="spd-status-menu-trigger" data-status={record.status}>
        <StatusIcon status={record.status} />{getStatusLabel(record.status, ui.t)}
      </span>
    {/if}
    <button type="button" class="spd-icon-btn spd-drawer-close" aria-label={ui.t("drawer.close")} onclick={onclose}>
      <Icon name="close" />
    </button>
  </div>
  <div class="spd-drawer-scroll">
    <EvidenceCard {record} />
    <p class="spd-message">{record.message}</p>
    <dl class="spd-meta-grid">
      <dt class="spd-meta-label">{ui.t("drawer.author")}</dt>
      <dd class="spd-meta-value">
        <!-- Empty email = redacted by the adapter (unauthenticated request) — skip the <> shell. -->
        {#if record.authorEmail}
          {record.authorName} <span data-mono>&lt;{record.authorEmail}&gt;</span>
        {:else}
          {record.authorName}
        {/if}
      </dd>
      <dt class="spd-meta-label">{ui.t("drawer.page")}</dt>
      <dd class="spd-meta-value" data-mono>
        {#if pageUrl}
          <a href={pageUrl} target="_blank" rel="noreferrer">{record.url}</a>
        {:else}
          {record.url}
        {/if}
      </dd>
      <dt class="spd-meta-label">{ui.t("drawer.viewport")}</dt>
      <dd class="spd-meta-value" data-mono>{record.viewport}</dd>
      <dt class="spd-meta-label">{ui.t("drawer.submitted")}</dt>
      <dd class="spd-meta-value">
        <time datetime={toDateTimeAttr(record.createdAt)}>{formatAbsolute(record.createdAt, ui.locale)}</time>
        {" · "}{formatRelativeTime(record.createdAt, ui.t)}
      </dd>
      <dt class="spd-meta-label">{ui.t("drawer.browser")}</dt>
      <dd class="spd-meta-value spd-clamp-2" title={record.userAgent}>{record.userAgent}</dd>
    </dl>
    {#if hasDiagnostics && diagnostics}
      <Diagnostics {diagnostics} />
    {/if}
    <Thread
      {record}
      canComment={permissions.canComment}
      canDelete={(comment) => commentPermissionsOf(record, comment).canDelete}
      onadd={(body, clientId) => onaddcomment(record.id, body, clientId)}
      ondelete={(commentId) => ondeletecomment(record.id, commentId)}
    />
    {#if permissions.canDelete}
      <div class="spd-danger-zone">
        {#if confirming}
          <div class="spd-confirm">
            <span>{ui.t("drawer.deleteConfirm")}</span>
            <button type="button" class="spd-btn-danger" onclick={() => ondelete(record.id)}>
              {ui.t("drawer.deleteYes")}
            </button>
            <button type="button" class="spd-btn-ghost" onclick={() => (confirming = false)}>
              {ui.t("inbox.cancel")}
            </button>
          </div>
        {:else}
          <button type="button" class="spd-btn-danger-ghost" onclick={() => (confirming = true)}>
            <Icon name="trash" />{ui.t("drawer.delete")}
          </button>
        {/if}
      </div>
    {/if}
  </div>
  {#if deepLink}
    <div class="spd-drawer-foot">
      <a class="spd-btn-primary" href={deepLink} target="_blank" rel="noreferrer">
        {ui.t("drawer.openOnPage")}<Icon name="external" />
      </a>
      <kbd class="spd-kbd">⏎</kbd>
    </div>
  {/if}
</div>
