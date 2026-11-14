<!--
  Linear-style triage inbox for SitePing feedback.

  Renders in plain DOM (no Shadow DOM) with all styles scoped under
  `.spd-root`. Keyboard-first: j/k navigate, Enter opens, e/p/x change
  status, u undoes, "?" shows the full cheat sheet — the status keys only
  where the user may change a status.
-->
<script lang="ts">
  import { type FeedbackStatus, intlLocale } from "@siteping/core";
  import { untrack } from "svelte";
  import { recordPageUrl } from "../format.js";
  import { createT, getStatusLabel, loadLocale, tWithParams } from "../i18n/index.js";
  import { createSitepingInbox } from "../inbox.svelte.js";
  import { ensureStyles } from "../inject-styles.js";
  import { normalizeAccent, type ResolvedTheme, resolveInitialTheme, watchSystemTheme } from "../theme.js";
  import type { SitepingInboxProps } from "../types.js";
  import { provideInboxUi } from "./context.js";
  import Drawer from "./Drawer.svelte";
  import EmptyState from "./EmptyState.svelte";
  import ErrorState from "./ErrorState.svelte";
  import List from "./List.svelte";
  import ShortcutsOverlay from "./ShortcutsOverlay.svelte";
  import Skeleton from "./Skeleton.svelte";
  import Toast from "./Toast.svelte";
  import Toolbar from "./Toolbar.svelte";
  import type { ToastData } from "./toast.js";

  /** Container width (px) at which the drawer switches from overlay to side-by-side. Mirrors the CSS `@container spd (min-width: 960px)`. */
  const SIDE_BY_SIDE_MIN = 960;

  /**
   * `inbox.markedAs` interpolates the translated status label. Lowercase it
   * where natural — German capitalizes nouns, so it keeps the original casing.
   */
  function toastStatusLabel(label: string, locale: string): string {
    return locale.toLowerCase().startsWith("de") ? label : label.toLocaleLowerCase(locale);
  }

  const props: SitepingInboxProps = $props();
  const themePref = $derived(props.theme ?? "auto");
  const density = $derived(props.density ?? "comfortable");
  const locale = $derived(props.locale ?? "en");
  const deepLinkParam = $derived(props.deepLinkParam ?? "siteping");

  // ----- styles: injected once, before the first paint on the client (no-op during SSR)
  ensureStyles();

  // ----- i18n: English renders immediately; other locales upgrade when their chunk lands
  let localeTick = $state(0);
  $effect(() => {
    const code = locale;
    if (code.toLowerCase().startsWith("en")) return;
    let cancelled = false;
    loadLocale(code)
      .then((dict) => {
        if (!cancelled && dict) localeTick += 1;
      })
      .catch(() => {
        /* English fallback already active */
      });
    return () => {
      cancelled = true;
    };
  });
  const t = $derived.by(() => {
    void localeTick; // new identity once the dictionary is registered
    return createT(locale);
  });
  // What every Intl / toLocale* call gets — a tag like "fr_FR" would throw there.
  const intlTag = $derived(intlLocale(locale));

  // ----- toast slot (single)
  let toastSeq = 0;
  let toast = $state.raw<ToastData | null>(null);
  function showToast(message: string, undoable: boolean): void {
    toastSeq += 1;
    toast = { id: toastSeq, message, undoable };
  }
  const dismissToast = (): void => {
    toast = null;
  };

  // ----- data. Failure toasts come from each mutation's own rejection
  // (runMutation), never from onError: onError also fires for loads, and
  // mutations overlap — shared flags mixed their outcomes up.
  const inbox = createSitepingInbox(() => props);

  /** Run a mutation; returns true when it succeeded, toasts the rollback when it didn't. */
  async function runMutation(action: () => Promise<void>): Promise<boolean> {
    try {
      await action();
      return true;
    } catch {
      // The controller rolled back and already reported through onError.
      showToast(t("inbox.actionFailed"), false);
      return false;
    }
  }

  async function changeStatus(id: string, status: FeedbackStatus): Promise<void> {
    if (await runMutation(() => inbox.changeStatus(id, status))) {
      const label = toastStatusLabel(getStatusLabel(status, t), intlTag);
      showToast(tWithParams(t, "inbox.markedAs", { status: label }), true);
    }
  }

  async function deleteFeedback(id: string): Promise<void> {
    inbox.closeFeedback();
    if (await runMutation(() => inbox.deleteFeedback(id))) showToast(t("inbox.deleted"), false);
  }

  async function undo(): Promise<void> {
    dismissToast();
    await runMutation(() => inbox.undo());
  }

  // ----- theme + accent
  let systemTheme = $state<ResolvedTheme>(untrack(() => resolveInitialTheme(themePref)));
  $effect(() => {
    if (themePref !== "auto") return;
    systemTheme = resolveInitialTheme("auto");
    return watchSystemTheme((next) => {
      systemTheme = next;
    });
  });
  const resolvedTheme = $derived(themePref === "auto" ? systemTheme : themePref);
  const accent = $derived(normalizeAccent(props.accentColor ?? "#0066ff"));

  // ----- drawer mode: overlay below the side-by-side container breakpoint
  let root: HTMLElement | null = $state(null);
  let wide = $state(false);
  $effect(() => {
    const el = root;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      wide = width >= SIDE_BY_SIDE_MIN;
    });
    observer.observe(el);
    return () => observer.disconnect();
  });

  // ----- return keyboard focus to the listbox (after a drawer/toast unmounts),
  // or to the root when the pane shows none (empty state, error, skeleton)
  function focusList(): void {
    (root?.querySelector<HTMLElement>(".spd-list") ?? root)?.focus();
  }

  provideInboxUi({
    get t() {
      return t;
    },
    get locale() {
      return intlTag;
    },
    notify: (message) => showToast(message, false),
    focusList,
  });

  // ----- keep keyboard focus in the inbox when the list pane swaps (the last
  // row resolved → empty state, a refetch → skeleton): the focused listbox
  // unmounts, focus falls to <body>, and every shortcut dies until the user
  // clicks back in. Only reclaimed when focus was ours to begin with.
  let focusInside = false;
  $effect(() => {
    const track = (event: Event) => {
      focusInside = root?.contains(event.target as Node) ?? false;
    };
    document.addEventListener("focusin", track);
    document.addEventListener("pointerdown", track);
    return () => {
      document.removeEventListener("focusin", track);
      document.removeEventListener("pointerdown", track);
    };
  });
  const pane = $derived(inbox.view === "ready" ? "list" : inbox.view);
  $effect(() => {
    void pane; // runs on every swap
    untrack(() => {
      const active = document.activeElement;
      if (!focusInside || (active && active !== document.body && active !== root)) return;
      focusList();
    });
  });

  // ----- announce the result count whenever a fetch settles (separate from the toast)
  let resultsMsg = $state("");
  let wasLoading = untrack(() => inbox.loading);
  $effect(() => {
    const loading = inbox.loading;
    untrack(() => {
      if (wasLoading && !loading) {
        resultsMsg = tWithParams(t, "inbox.resultsCount", { count: inbox.total ?? inbox.items.length });
      }
      wasLoading = loading;
    });
  });

  // ----- keyboard
  let search: HTMLInputElement | null = $state(null);
  let shortcutsOpen = $state(false);

  function toggleStatus(status: FeedbackStatus, id: string | null): void {
    if (!id) return;
    const record = inbox.items.find((item) => item.id === id) ?? (inbox.opened?.id === id ? inbox.opened : null);
    if (!record || !inbox.permissionsOf(record).canChangeStatus) return;
    void changeStatus(id, record.status === status ? "open" : status);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    const inField =
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;

    if (event.key === "Escape") {
      // An IME candidate window's Esc belongs to the IME.
      if (event.isComposing) return;
      // Esc in a reply draft leaves the field for the drawer rather than
      // closing it, which would drop the draft: the next Esc closes.
      if (target instanceof HTMLTextAreaElement && target.value.trim()) {
        target.parentElement?.closest<HTMLElement>("[tabindex]")?.focus();
        event.preventDefault();
        return;
      }
      // Esc inside search stays inside search — it never closes the drawer.
      if (target && target === search) {
        if (inbox.search) {
          inbox.setSearch(""); // keep focus in the field
        } else {
          search.blur();
          focusList();
        }
        event.preventDefault();
        return;
      }
      if (inbox.openedId) {
        inbox.closeFeedback();
        focusList(); // else focus drops to <body> and every shortcut dies
      } else if (shortcutsOpen) {
        shortcutsOpen = false;
      } else {
        return;
      }
      event.preventDefault();
      return;
    }
    // The cheat sheet is modal: the list behind it must not react. Only "?"
    // (toggles it closed) gets through; Esc is handled above / by the overlay.
    if (shortcutsOpen && event.key !== "?") return;
    if (inField) return;

    // Overlay mode hides the list behind a backdrop: list navigation is
    // meaningless and the status/Enter keys must act on the opened record.
    const overlayOpen = inbox.openedId !== null && !wide;
    const actionId = overlayOpen ? inbox.openedId : (inbox.focusedId ?? inbox.openedId);

    switch (event.key) {
      case "j":
      case "ArrowDown":
        if (overlayOpen) return;
        inbox.focusNext();
        break;
      case "k":
      case "ArrowUp":
        if (overlayOpen) return;
        inbox.focusPrev();
        break;
      case "Enter": {
        // Native activation wins on interactive elements (buttons, links).
        if (target?.closest("button, a, [role='button'], summary")) return;
        if (!actionId) return;
        if (inbox.openedId === actionId) {
          // Drawer already open for this feedback → jump to it on the page.
          const record = inbox.items.find((item) => item.id === actionId) ?? inbox.opened;
          const link = record ? recordPageUrl(record, { siteUrl: props.siteUrl, deepLinkParam }) : null;
          if (link) window.open(link, "_blank", "noopener");
        } else {
          inbox.openFeedback(actionId);
        }
        break;
      }
      case "o":
        if (!inbox.focusedId) return;
        inbox.openFeedback(inbox.focusedId);
        break;
      case "e":
        toggleStatus("resolved", actionId);
        break;
      case "p":
        toggleStatus("in_progress", actionId);
        break;
      case "x":
        toggleStatus("wont_fix", actionId);
        break;
      case "r":
        void inbox.refresh();
        break;
      case "u":
        if (!inbox.pendingUndo) return;
        void undo();
        break;
      case "/":
        search?.focus();
        break;
      case "?":
        shortcutsOpen = !shortcutsOpen;
        break;
      case "1":
        inbox.setStatusFilter("all");
        break;
      case "2":
        inbox.setStatusFilter("open");
        break;
      case "3":
        inbox.setStatusFilter("in_progress");
        break;
      case "4":
        inbox.setStatusFilter("resolved");
        break;
      case "5":
        inbox.setStatusFilter("wont_fix");
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  // The status keys do nothing where no listed feedback lets the user change its status.
  const canChangeStatus = $derived(inbox.items.some((record) => inbox.permissionsOf(record).canChangeStatus));
  const remaining = $derived(inbox.total !== null ? Math.max(0, inbox.total - inbox.items.length) : 0);
</script>

<!-- The root takes focus only as a fallback, when the listbox unmounts (see the pane effect). -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section
  bind:this={root}
  class={["spd-root", props.class]}
  style:--spd-accent={accent}
  data-theme={resolvedTheme}
  data-density={density}
  lang={intlTag}
  aria-label={t("inbox.regionLabel")}
  tabindex="-1"
  onkeydown={handleKeyDown}
>
  <Toolbar {inbox} bind:search />
  <div class="spd-body">
    <div class="spd-list-pane">
      {#if inbox.view === "loading"}
        <Skeleton />
      {:else if inbox.view === "error" && inbox.error}
        <ErrorState error={inbox.error} onretry={() => void inbox.refresh()} />
      {:else if inbox.view === "empty"}
        <EmptyState {inbox} custom={props.emptyState} />
      {:else}
        <List {inbox} />
        {#if inbox.hasMore}
          <div class="spd-loadmore">
            <button
              type="button"
              class="spd-btn-ghost"
              disabled={inbox.loadingMore}
              onclick={() => void inbox.loadMore()}
            >
              {tWithParams(t, "inbox.loadMore", { count: remaining })}
            </button>
          </div>
        {/if}
      {/if}
    </div>
    {#if inbox.opened}
      {@const opened = inbox.opened}
      {#key opened.id}
        <Drawer
          record={opened}
          overlay={!wide}
          {deepLinkParam}
          siteUrl={props.siteUrl}
          onclose={inbox.closeFeedback}
          onchangestatus={(id, status) => void changeStatus(id, status)}
          ondelete={(id) => void deleteFeedback(id)}
          permissions={inbox.permissionsOf(opened)}
          commentPermissionsOf={inbox.commentPermissionsOf}
          onaddcomment={inbox.addComment}
          ondeletecomment={inbox.deleteComment}
        />
      {/key}
    {/if}
  </div>
  <div class="spd-hints" aria-hidden="true">
    <span class="spd-hint"><kbd class="spd-kbd">j</kbd> <kbd class="spd-kbd">k</kbd> {t("hints.navigate")}</span>
    <span class="spd-hint"><kbd class="spd-kbd">⏎</kbd> {t("hints.open")}</span>
    {#if canChangeStatus}
      <span class="spd-hint"><kbd class="spd-kbd">e</kbd> {t("hints.resolve")}</span>
      <span class="spd-hint"><kbd class="spd-kbd">p</kbd> {t("hints.inProgress")}</span>
      <span class="spd-hint"><kbd class="spd-kbd">x</kbd> {t("hints.wontFix")}</span>
    {/if}
    <span class="spd-hint"><kbd class="spd-kbd">?</kbd> {t("hints.help")}</span>
  </div>
  <div class="spd-sr-only" role="status">{resultsMsg}</div>
  <Toast {toast} onundo={() => void undo()} ondismiss={dismissToast} />
  {#if shortcutsOpen}
    <ShortcutsOverlay {canChangeStatus} onclose={() => (shortcutsOpen = false)} />
  {/if}
</section>
