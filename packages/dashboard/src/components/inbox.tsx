import type { FeedbackStatus } from "@siteping/core";
import type { CSSProperties, ReactElement, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useInsertionEffect, useMemo, useRef, useState } from "react";
import { buildDeepLink } from "../format.js";
import { createT, getStatusLabel, loadLocale, tWithParams } from "../i18n/index.js";
import { ensureStyles } from "../inject-styles.js";
import { normalizeAccent, resolveInitialTheme, watchSystemTheme } from "../theme.js";
import type { SitepingInboxProps } from "../types.js";
import { useSitepingInbox } from "../use-inbox.js";
import type { InboxUiContextValue } from "./context.js";
import { InboxUiProvider } from "./context.js";
import { Drawer } from "./drawer.js";
import { EmptyState, ErrorState } from "./empty-state.js";
import { List } from "./list.js";
import { ShortcutsOverlay } from "./shortcuts-overlay.js";
import { Skeleton } from "./skeleton.js";
import type { ToastData } from "./toast.js";
import { Toast } from "./toast.js";
import { Toolbar } from "./toolbar.js";

/** Container width (px) at which the drawer switches from overlay to side-by-side. Mirrors the CSS `@container spd (min-width: 960px)`. */
const SIDE_BY_SIDE_MIN = 960;

/**
 * `inbox.markedAs` interpolates the translated status label. Lowercase it
 * where natural — German capitalizes nouns, so it keeps the original casing.
 */
function toastStatusLabel(label: string, locale: string): string {
  return locale.toLowerCase().startsWith("de") ? label : label.toLocaleLowerCase(locale);
}

/**
 * Linear-style triage inbox for SitePing feedback.
 *
 * Renders in plain DOM (no Shadow DOM) with all styles scoped under
 * `.spd-root`. Keyboard-first: j/k navigate, Enter opens, e/p/x change
 * status, u undoes, "?" shows the full cheat sheet.
 */
export function SitepingInbox(props: SitepingInboxProps): ReactElement {
  const {
    accentColor,
    theme: themePref = "auto",
    density = "comfortable",
    locale = "en",
    className,
    deepLinkParam = "siteping",
    emptyState,
    onError,
  } = props;

  // ----- i18n: English renders immediately; other locales upgrade when their chunk lands
  const [localeTick, setLocaleTick] = useState(0);
  useEffect(() => {
    if (locale.toLowerCase().startsWith("en")) return;
    let cancelled = false;
    loadLocale(locale)
      .then((dict) => {
        if (!cancelled && dict) setLocaleTick((tick) => tick + 1);
      })
      .catch(() => {
        /* English fallback already active */
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);
  const t = useMemo(() => {
    void localeTick; // new identity once the dictionary is registered
    return createT(locale);
  }, [locale, localeTick]);

  // ----- toast slot (single)
  const toastSeq = useRef(0);
  const [toast, setToast] = useState<ToastData | null>(null);
  const showToast = useCallback((message: string, undoable: boolean) => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message, undoable });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);
  const notify = useCallback((message: string) => showToast(message, false), [showToast]);

  // ----- data hook, with mutation failures routed to the toast
  const mutating = useRef(false);
  const failed = useRef(false);
  const handleError = useCallback(
    (error: Error) => {
      if (mutating.current && !failed.current) {
        failed.current = true;
        showToast(t("inbox.actionFailed"), false);
      }
      onError?.(error);
    },
    [onError, showToast, t],
  );
  const state = useSitepingInbox({
    projects: props.projects,
    source: props.source,
    store: props.store,
    endpoint: props.endpoint,
    apiKey: props.apiKey,
    headers: props.headers,
    pageSize: props.pageSize,
    onStatusChange: props.onStatusChange,
    onDelete: props.onDelete,
    onError: handleError,
  });

  /** Run a mutation; returns true when it (and its rollback path) stayed silent. */
  const runMutation = useCallback(
    async (action: () => Promise<void>): Promise<boolean> => {
      mutating.current = true;
      failed.current = false;
      try {
        await action();
      } catch {
        // The hook rolled back; make sure exactly one failure toast shows.
        if (!failed.current) showToast(t("inbox.actionFailed"), false);
        failed.current = true;
      } finally {
        mutating.current = false;
      }
      return !failed.current;
    },
    [showToast, t],
  );

  const changeStatus = useCallback(
    async (id: string, status: FeedbackStatus): Promise<void> => {
      const ok = await runMutation(() => state.changeStatus(id, status));
      if (ok) {
        const label = toastStatusLabel(getStatusLabel(status, t), locale);
        showToast(tWithParams(t, "inbox.markedAs", { status: label }), true);
      }
    },
    [runMutation, state, showToast, t, locale],
  );

  const deleteFeedback = useCallback(
    async (id: string): Promise<void> => {
      state.closeFeedback();
      const ok = await runMutation(() => state.deleteFeedback(id));
      if (ok) showToast(t("inbox.deleted"), false);
    },
    [runMutation, state, showToast, t],
  );

  const undo = useCallback(async (): Promise<void> => {
    dismissToast();
    await runMutation(() => state.undo());
  }, [dismissToast, runMutation, state]);

  // ----- styles + theme + accent
  useInsertionEffect(() => {
    ensureStyles();
  }, []);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => resolveInitialTheme(themePref));
  useEffect(() => {
    if (themePref !== "auto") return;
    setSystemTheme(resolveInitialTheme("auto"));
    return watchSystemTheme(setSystemTheme);
  }, [themePref]);
  const resolvedTheme = themePref === "auto" ? systemTheme : themePref;
  const rootStyle = useMemo(
    () => ({ "--spd-accent": normalizeAccent(accentColor ?? "#0066ff") }) as CSSProperties,
    [accentColor],
  );

  // ----- drawer mode: overlay below the side-by-side container breakpoint
  const rootRef = useRef<HTMLElement | null>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      setWide(width >= SIDE_BY_SIDE_MIN);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ----- return keyboard focus to the listbox (after a drawer/toast unmounts)
  const focusList = useCallback(() => {
    rootRef.current?.querySelector<HTMLElement>(".spd-list")?.focus();
  }, []);

  // ----- announce the result count whenever a fetch settles (separate from the toast)
  const [resultsMsg, setResultsMsg] = useState("");
  const wasLoading = useRef(state.loading);
  useEffect(() => {
    if (wasLoading.current && !state.loading) {
      setResultsMsg(tWithParams(t, "inbox.resultsCount", { count: state.total ?? state.items.length }));
    }
    wasLoading.current = state.loading;
  }, [state.loading, state.total, state.items.length, t]);

  // ----- keyboard
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const toggleStatus = useCallback(
    (status: FeedbackStatus, id: string | null) => {
      if (!id) return;
      const record = state.items.find((item) => item.id === id) ?? (state.opened?.id === id ? state.opened : null);
      if (!record) return;
      void changeStatus(id, record.status === status ? "open" : status);
    },
    [state, changeStatus],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const inField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      if (event.key === "Escape") {
        // Esc inside search stays inside search — it never closes the drawer.
        if (target && target === searchRef.current) {
          if (state.search) {
            state.setSearch(""); // keep focus in the field
          } else {
            searchRef.current?.blur();
            focusList();
          }
          event.preventDefault();
          return;
        }
        if (state.openedId) {
          state.closeFeedback();
          focusList(); // else focus drops to <body> and every shortcut dies
        } else if (shortcutsOpen) {
          setShortcutsOpen(false);
        } else {
          return;
        }
        event.preventDefault();
        return;
      }
      if (inField) return;

      // Overlay mode hides the list behind a backdrop: list navigation is
      // meaningless and the status/Enter keys must act on the opened record.
      const overlayOpen = state.openedId !== null && !wide;
      const actionId = overlayOpen ? state.openedId : (state.focusedId ?? state.openedId);

      switch (event.key) {
        case "j":
        case "ArrowDown":
          if (overlayOpen) return;
          state.focusNext();
          break;
        case "k":
        case "ArrowUp":
          if (overlayOpen) return;
          state.focusPrev();
          break;
        case "Enter": {
          // Native activation wins on interactive elements (buttons, links).
          if (target?.closest("button, a, [role='button'], summary")) return;
          if (!actionId) return;
          if (state.openedId === actionId) {
            // Drawer already open for this feedback → jump to it on the page.
            const record = state.items.find((item) => item.id === actionId) ?? state.opened;
            const link = record ? buildDeepLink(record, deepLinkParam) : null;
            if (link) window.open(link, "_blank", "noopener");
          } else {
            state.openFeedback(actionId);
          }
          break;
        }
        case "o":
          if (!state.focusedId) return;
          state.openFeedback(state.focusedId);
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
          void state.refresh();
          break;
        case "u":
          if (!state.pendingUndo) return;
          void undo();
          break;
        case "/":
          searchRef.current?.focus();
          break;
        case "?":
          setShortcutsOpen((open) => !open);
          break;
        case "1":
          state.setStatus("all");
          break;
        case "2":
          state.setStatus("open");
          break;
        case "3":
          state.setStatus("in_progress");
          break;
        case "4":
          state.setStatus("resolved");
          break;
        case "5":
          state.setStatus("wont_fix");
          break;
        default:
          return;
      }
      event.preventDefault();
    },
    [state, shortcutsOpen, toggleStatus, undo, deepLinkParam, wide, focusList],
  );

  // ----- render
  const ui = useMemo<InboxUiContextValue>(() => ({ t, locale, notify, focusList }), [t, locale, notify, focusList]);

  const showSkeleton = state.loading && state.items.length === 0;
  const showError = state.error !== null && state.items.length === 0 && !showSkeleton;
  const showEmpty = !showSkeleton && !showError && state.items.length === 0;
  const remaining = state.total !== null ? Math.max(0, state.total - state.items.length) : 0;

  return (
    <InboxUiProvider value={ui}>
      <section
        ref={rootRef}
        className={className ? `spd-root ${className}` : "spd-root"}
        style={rootStyle}
        data-theme={resolvedTheme}
        data-density={density}
        lang={locale}
        aria-label={t("inbox.regionLabel")}
        onKeyDown={handleKeyDown}
      >
        <Toolbar state={state} searchRef={searchRef} />
        <div className="spd-body">
          <div className="spd-list-pane">
            {showSkeleton ? (
              <Skeleton />
            ) : showError && state.error ? (
              <ErrorState
                error={state.error}
                onRetry={() => {
                  void state.refresh();
                }}
              />
            ) : showEmpty ? (
              <EmptyState state={state} custom={emptyState} />
            ) : (
              <>
                <List state={state} />
                {state.hasMore ? (
                  <div className="spd-loadmore">
                    <button
                      type="button"
                      className="spd-btn-ghost"
                      disabled={state.loadingMore}
                      onClick={() => {
                        void state.loadMore();
                      }}
                    >
                      {tWithParams(t, "inbox.loadMore", { count: remaining })}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
          {state.opened ? (
            <Drawer
              key={state.opened.id}
              record={state.opened}
              overlay={!wide}
              deepLinkParam={deepLinkParam}
              onClose={state.closeFeedback}
              onChangeStatus={(id, status) => {
                void changeStatus(id, status);
              }}
              onDelete={(id) => {
                void deleteFeedback(id);
              }}
            />
          ) : null}
        </div>
        <div className="spd-hints" aria-hidden="true">
          <span className="spd-hint">
            <kbd className="spd-kbd">j</kbd>
            <kbd className="spd-kbd">k</kbd> {t("hints.navigate")}
          </span>
          <span className="spd-hint">
            <kbd className="spd-kbd">⏎</kbd> {t("hints.open")}
          </span>
          <span className="spd-hint">
            <kbd className="spd-kbd">e</kbd> {t("hints.resolve")}
          </span>
          <span className="spd-hint">
            <kbd className="spd-kbd">p</kbd> {t("hints.inProgress")}
          </span>
          <span className="spd-hint">
            <kbd className="spd-kbd">x</kbd> {t("hints.wontFix")}
          </span>
          <span className="spd-hint">
            <kbd className="spd-kbd">?</kbd> {t("hints.help")}
          </span>
        </div>
        <div className="spd-sr-only" role="status">
          {resultsMsg}
        </div>
        <Toast
          toast={toast}
          onUndo={() => {
            void undo();
          }}
          onDismiss={dismissToast}
        />
        {shortcutsOpen ? <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} /> : null}
      </section>
    </InboxUiProvider>
  );
}
