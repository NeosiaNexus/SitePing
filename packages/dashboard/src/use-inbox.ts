import {
  FEEDBACK_STATUSES,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackStatus,
  isClosedStatus,
} from "@siteping/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createEndpointSource, createStoreSource } from "./source.js";
import type { InboxSource, InboxState, InboxStatusFilter, InboxTypeFilter, UseSitepingInboxOptions } from "./types.js";

const DEFAULT_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 250;

/** Debounced-search + counts keys — the 4 statuses plus the "all" tab. */
const COUNT_KEYS: readonly ("all" | FeedbackStatus)[] = ["all", ...FEEDBACK_STATUSES];

function clampPageSize(pageSize: number | undefined): number {
  if (pageSize === undefined || Number.isNaN(pageSize)) return DEFAULT_PAGE_SIZE;
  return Math.min(100, Math.max(1, Math.floor(pageSize)));
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

/** Apply deltas to the count keys that are known — unknown (undefined) counts stay unknown. */
function adjustCounts(
  counts: InboxState["counts"],
  deltas: readonly (readonly ["all" | FeedbackStatus, number])[],
): InboxState["counts"] {
  const next: InboxState["counts"] = { ...counts };
  for (const [key, delta] of deltas) {
    const current = next[key];
    if (typeof current === "number") next[key] = Math.max(0, current + delta);
  }
  return next;
}

/** Insert a record keeping the list's newest-first order (server default). */
function insertByCreatedAtDesc(list: FeedbackRecord[], record: FeedbackRecord): FeedbackRecord[] {
  const index = list.findIndex((f) => f.createdAt.getTime() < record.createdAt.getTime());
  if (index === -1) return [...list, record];
  return [...list.slice(0, index), record, ...list.slice(index)];
}

/**
 * Headless triage-inbox hook — full state + actions behind `<SitepingInbox />`.
 *
 * - Fetches on mount and whenever project / status / type / debounced search
 *   change; stale responses are discarded via a request token (latest wins).
 * - Tab counts are refreshed alongside page 1 (limit-1 queries, best-effort)
 *   and adjusted locally on mutations.
 * - `changeStatus` / `deleteFeedback` are optimistic with rollback on error;
 *   the rejected promise carries the error so UIs can toast on top of the
 *   `onError` callback.
 */
export function useSitepingInbox(options: UseSitepingInboxOptions): InboxState {
  const { source, store, endpoint, apiKey, onStatusChange, onDelete, onError } = options;

  const projects = useMemo<readonly string[]>(
    () => (typeof options.projects === "string" ? [options.projects] : [...options.projects]),
    [options.projects],
  );
  const firstProject = projects[0];
  if (firstProject === undefined) {
    throw new Error("[siteping] useSitepingInbox: `projects` must contain at least one project name.");
  }

  const pageSize = clampPageSize(options.pageSize);

  // Live refs — keep option callbacks and headers fresh without destabilizing memoized callbacks.
  const headersRef = useRef(options.headers);
  headersRef.current = options.headers;
  const callbacksRef = useRef({ onStatusChange, onDelete, onError });
  callbacksRef.current = { onStatusChange, onDelete, onError };

  const src = useMemo<InboxSource>(() => {
    if (source) return source;
    if (store) return createStoreSource(store);
    if (endpoint) {
      return createEndpointSource({
        endpoint,
        apiKey,
        headers: () => {
          const h = headersRef.current;
          return typeof h === "function" ? h() : (h ?? {});
        },
      });
    }
    throw new Error("[siteping] useSitepingInbox requires one of `source`, `store` or `endpoint`.");
  }, [source, store, endpoint, apiKey]);

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [project, setProjectState] = useState(firstProject);
  const [status, setStatusFilter] = useState<InboxStatusFilter>("open");
  const [type, setTypeFilter] = useState<InboxTypeFilter>("all");
  const [search, setSearchState] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<FeedbackRecord[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [counts, setCounts] = useState<InboxState["counts"]>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setErrorState] = useState<Error | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [pendingUndo, setPendingUndo] = useState<InboxState["pendingUndo"]>(null);

  // Mirrors for stable mutation callbacks (avoid stale closures without dep churn).
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const countsRef = useRef(counts);
  countsRef.current = counts;
  const totalRef = useRef(total);
  totalRef.current = total;
  const focusedIdRef = useRef(focusedId);
  focusedIdRef.current = focusedId;
  const openedIdRef = useRef(openedId);
  openedIdRef.current = openedId;
  const pendingUndoRef = useRef(pendingUndo);
  pendingUndoRef.current = pendingUndo;
  const statusRef = useRef(status);
  statusRef.current = status;
  const projectRef = useRef(project);
  projectRef.current = project;
  const srcRef = useRef(src);
  srcRef.current = src;

  /** Monotonic request token — any newer fetch invalidates older in-flight results. */
  const tokenRef = useRef(0);
  /**
   * Counts freshness token — only full loads produce counts, so only load()
   * bumps it. loadMore() must not discard an in-flight counts result.
   */
  const countsTokenRef = useRef(0);
  /** Set when a loadMore page returned nothing new — the server has no more rows for us. */
  const [exhausted, setExhausted] = useState(false);
  /** The opened record — kept so the drawer survives its row leaving the filtered list. */
  const openedCacheRef = useRef<FeedbackRecord | null>(null);
  /** Full record behind `pendingUndo` — undo must work after the row left the list. */
  const undoRecordRef = useRef<FeedbackRecord | null>(null);

  // Keep the selected project valid when the `projects` prop changes.
  useEffect(() => {
    if (!projects.includes(projectRef.current)) {
      setProjectState(firstProject);
      setFocusedId(null);
      setOpenedId(null);
      setPendingUndo(null);
      undoRecordRef.current = null;
      openedCacheRef.current = null;
    }
  }, [projects, firstProject]);

  // Debounce search → refetch trigger. `search` itself updates synchronously.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // -------------------------------------------------------------------------
  // Fetching — page 1 + counts, latest wins
  // -------------------------------------------------------------------------

  const queryBase = useMemo(
    () => ({
      projectName: project,
      type: type === "all" ? undefined : type,
      // Clamped to the adapter query schema's 200-char cap — longer input
      // would 400 the whole request instead of returning "no results".
      search: debouncedSearch.trim() === "" ? undefined : debouncedSearch.trim().slice(0, 200),
    }),
    [project, type, debouncedSearch],
  );
  const queryBaseRef = useRef(queryBase);
  queryBaseRef.current = queryBase;

  const load = useCallback(async (): Promise<void> => {
    const token = ++tokenRef.current;
    const countsToken = ++countsTokenRef.current;
    setLoading(true);
    setErrorState(null);
    const query: FeedbackQuery = {
      ...queryBase,
      status: status === "all" ? undefined : status,
      page: 1,
      limit: pageSize,
    };
    try {
      const page = await src.list(query);
      if (token !== tokenRef.current) return;
      setExhausted(false);
      itemsRef.current = page.feedbacks;
      totalRef.current = page.total;
      setItems(page.feedbacks);
      setTotal(page.total);
      setLoading(false);
    } catch (cause) {
      if (token !== tokenRef.current) return;
      const err = toError(cause);
      setLoading(false);
      setErrorState(err);
      callbacksRef.current.onError?.(err);
      return;
    }
    // Tab counts — limit-1 queries per status + all. Best-effort: a failed
    // count stays undefined (tab shows a placeholder), never fails the list.
    const totals = await Promise.all(
      COUNT_KEYS.map((key) =>
        src
          .list({ ...queryBase, status: key === "all" ? undefined : key, page: 1, limit: 1 })
          .then((page) => page.total)
          .catch(() => undefined),
      ),
    );
    if (countsToken !== countsTokenRef.current) return;
    const next: InboxState["counts"] = {};
    COUNT_KEYS.forEach((key, index) => {
      const value = totals[index];
      if (typeof value === "number") next[key] = value;
    });
    countsRef.current = next;
    setCounts(next);
  }, [src, queryBase, status, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (loading || loadingMore) return;
    if (totalRef.current === null || itemsRef.current.length >= totalRef.current) return;
    const token = ++tokenRef.current;
    setLoadingMore(true);
    try {
      // Derive the page from what is actually loaded, not a counter —
      // optimistic removals shrink the server set, and a stale counter would
      // skip the rows that slid into already-consumed offsets.
      const nextPage = Math.floor(itemsRef.current.length / pageSize) + 1;
      const currentStatus = statusRef.current;
      const page = await srcRef.current.list({
        ...queryBaseRef.current,
        status: currentStatus === "all" ? undefined : currentStatus,
        page: nextPage,
        limit: pageSize,
      });
      if (token !== tokenRef.current) return;
      const seen = new Set(itemsRef.current.map((f) => f.id));
      const fresh = page.feedbacks.filter((f) => !seen.has(f.id));
      if (fresh.length === 0) setExhausted(true);
      const nextItems = [...itemsRef.current, ...fresh];
      itemsRef.current = nextItems;
      totalRef.current = page.total;
      setItems(nextItems);
      setTotal(page.total);
    } catch (cause) {
      if (token !== tokenRef.current) return;
      const err = toError(cause);
      setErrorState(err);
      callbacksRef.current.onError?.(err);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, pageSize]);

  // -------------------------------------------------------------------------
  // Focus & drawer
  // -------------------------------------------------------------------------

  const focus = useCallback((id: string) => setFocusedId(id), []);

  const focusNext = useCallback(() => {
    setFocusedId((prev) => {
      const list = itemsRef.current;
      if (list.length === 0) return prev;
      const index = list.findIndex((f) => f.id === prev);
      const next = index === -1 ? list[0] : list[Math.min(index + 1, list.length - 1)];
      return next ? next.id : prev;
    });
  }, []);

  const focusPrev = useCallback(() => {
    setFocusedId((prev) => {
      const list = itemsRef.current;
      if (list.length === 0) return prev;
      const index = list.findIndex((f) => f.id === prev);
      const next = index === -1 ? list[0] : list[Math.max(index - 1, 0)];
      return next ? next.id : prev;
    });
  }, []);

  const openFeedback = useCallback((id: string) => {
    const record = itemsRef.current.find((f) => f.id === id) ?? null;
    if (record) openedCacheRef.current = record;
    setOpenedId(id);
    setFocusedId(id);
  }, []);

  const closeFeedback = useCallback(() => setOpenedId(null), []);

  const opened = useMemo<FeedbackRecord | null>(() => {
    if (openedId === null) return null;
    const inList = items.find((f) => f.id === openedId);
    if (inList) return inList;
    return openedCacheRef.current?.id === openedId ? openedCacheRef.current : null;
  }, [items, openedId]);

  // -------------------------------------------------------------------------
  // Mutations — optimistic, rollback on error (guarded against newer fetches)
  // -------------------------------------------------------------------------

  /** After removing the row at `index`, focus the row now sitting at that index (or the new last). */
  const moveFocusAfterRemoval = useCallback((nextItems: FeedbackRecord[], index: number) => {
    const fallback = index === -1 ? null : (nextItems[Math.min(index, nextItems.length - 1)] ?? null);
    focusedIdRef.current = fallback ? fallback.id : null;
    setFocusedId(fallback ? fallback.id : null);
  }, []);

  /**
   * Mutations write through the mirrors immediately instead of waiting for the
   * next render — two awaited mutations over a microtask-fast source (memory /
   * localStorage stores) would otherwise both compute from the pre-mutation
   * arrays and the second would clobber the first.
   */
  const commitItems = useCallback((nextItems: FeedbackRecord[]) => {
    itemsRef.current = nextItems;
    setItems(nextItems);
  }, []);
  const commitCounts = useCallback((nextCounts: InboxState["counts"]) => {
    countsRef.current = nextCounts;
    setCounts(nextCounts);
  }, []);
  const commitTotal = useCallback((nextTotal: number | null) => {
    totalRef.current = nextTotal;
    setTotal(nextTotal);
  }, []);
  const commitPendingUndo = useCallback((next: InboxState["pendingUndo"]) => {
    pendingUndoRef.current = next;
    setPendingUndo(next);
  }, []);

  const applyStatusChange = useCallback(
    async (id: string, nextStatus: FeedbackStatus, isUndo: boolean): Promise<void> => {
      const record =
        itemsRef.current.find((f) => f.id === id) ??
        (undoRecordRef.current?.id === id ? undoRecordRef.current : null) ??
        (openedCacheRef.current?.id === id ? openedCacheRef.current : null);
      if (!record || record.status === nextStatus) {
        if (isUndo) setPendingUndo(null);
        return;
      }

      const snapshot = {
        items: itemsRef.current,
        counts: countsRef.current,
        total: totalRef.current,
        focusedId: focusedIdRef.current,
        // Unconditional: a FAILED undo leaves the status change standing, so
        // the undo affordance must survive the rollback.
        pendingUndo: pendingUndoRef.current,
        undoRecord: undoRecordRef.current,
        openedCache: openedCacheRef.current,
        token: tokenRef.current,
      };

      const previous = record.status;
      const now = new Date();
      const optimistic: FeedbackRecord = {
        ...record,
        status: nextStatus,
        // Closure semantics derived at the edge: resolvedAt = closure timestamp.
        resolvedAt: isClosedStatus(nextStatus) ? now : null,
        updatedAt: now,
      };

      const filter = statusRef.current;
      const includedAfter = filter === "all" || filter === nextStatus;
      const index = itemsRef.current.findIndex((f) => f.id === id);
      if (index !== -1 && !includedAfter) {
        // Row leaves the filtered list.
        const nextItems = itemsRef.current.filter((f) => f.id !== id);
        commitItems(nextItems);
        commitTotal(totalRef.current === null ? null : Math.max(0, totalRef.current - 1));
        if (snapshot.focusedId === id) moveFocusAfterRemoval(nextItems, index);
      } else if (index !== -1) {
        commitItems(itemsRef.current.map((f) => (f.id === id ? optimistic : f)));
      } else if (includedAfter) {
        // Row re-enters the filtered list (typically an undo).
        commitItems(insertByCreatedAtDesc(itemsRef.current, optimistic));
        commitTotal(totalRef.current === null ? null : totalRef.current + 1);
      }

      if (openedCacheRef.current?.id === id) openedCacheRef.current = optimistic;
      commitCounts(
        adjustCounts(countsRef.current, [
          [previous, -1],
          [nextStatus, +1],
        ]),
      );
      if (isUndo) {
        commitPendingUndo(null);
        undoRecordRef.current = null;
      } else {
        commitPendingUndo({ id, previousStatus: previous });
        undoRecordRef.current = optimistic;
      }

      try {
        const saved = await srcRef.current.setStatus(id, projectRef.current, nextStatus);
        commitItems(itemsRef.current.map((f) => (f.id === id ? saved : f)));
        if (openedCacheRef.current?.id === id) openedCacheRef.current = saved;
        if (undoRecordRef.current?.id === id) undoRecordRef.current = saved;
        callbacksRef.current.onStatusChange?.(saved, previous);
      } catch (cause) {
        // Roll back — unless a newer fetch already replaced the list.
        if (tokenRef.current === snapshot.token) {
          commitItems(snapshot.items);
          commitCounts(snapshot.counts);
          commitTotal(snapshot.total);
          focusedIdRef.current = snapshot.focusedId;
          setFocusedId(snapshot.focusedId);
          openedCacheRef.current = snapshot.openedCache;
        }
        commitPendingUndo(snapshot.pendingUndo);
        undoRecordRef.current = snapshot.undoRecord;
        const err = toError(cause);
        callbacksRef.current.onError?.(err);
        throw err;
      }
    },
    [moveFocusAfterRemoval, commitItems, commitCounts, commitTotal, commitPendingUndo],
  );

  const changeStatus = useCallback(
    (id: string, nextStatus: FeedbackStatus): Promise<void> => applyStatusChange(id, nextStatus, false),
    [applyStatusChange],
  );

  const undo = useCallback(async (): Promise<void> => {
    const pending = pendingUndoRef.current;
    if (!pending) return;
    await applyStatusChange(pending.id, pending.previousStatus, true);
  }, [applyStatusChange]);

  const deleteFeedback = useCallback(
    async (id: string): Promise<void> => {
      const record =
        itemsRef.current.find((f) => f.id === id) ??
        (openedCacheRef.current?.id === id ? openedCacheRef.current : null);
      if (!record) return;

      const snapshot = {
        items: itemsRef.current,
        counts: countsRef.current,
        total: totalRef.current,
        focusedId: focusedIdRef.current,
        openedId: openedIdRef.current,
        pendingUndo: pendingUndoRef.current,
        undoRecord: undoRecordRef.current,
        openedCache: openedCacheRef.current,
        token: tokenRef.current,
      };

      const index = itemsRef.current.findIndex((f) => f.id === id);
      if (index !== -1) {
        const nextItems = itemsRef.current.filter((f) => f.id !== id);
        commitItems(nextItems);
        commitTotal(totalRef.current === null ? null : Math.max(0, totalRef.current - 1));
        if (snapshot.focusedId === id) moveFocusAfterRemoval(nextItems, index);
      }
      commitCounts(
        adjustCounts(countsRef.current, [
          [record.status, -1],
          ["all", -1],
        ]),
      );
      if (openedIdRef.current === id) {
        openedIdRef.current = null;
        setOpenedId(null);
      }
      if (openedCacheRef.current?.id === id) openedCacheRef.current = null;
      if (pendingUndoRef.current?.id === id) {
        commitPendingUndo(null);
        undoRecordRef.current = null;
      }

      try {
        await srcRef.current.remove(id, projectRef.current);
        callbacksRef.current.onDelete?.(record);
      } catch (cause) {
        if (tokenRef.current === snapshot.token) {
          commitItems(snapshot.items);
          commitCounts(snapshot.counts);
          commitTotal(snapshot.total);
          focusedIdRef.current = snapshot.focusedId;
          setFocusedId(snapshot.focusedId);
          openedIdRef.current = snapshot.openedId;
          setOpenedId(snapshot.openedId);
          openedCacheRef.current = snapshot.openedCache;
        }
        commitPendingUndo(snapshot.pendingUndo);
        undoRecordRef.current = snapshot.undoRecord;
        const err = toError(cause);
        callbacksRef.current.onError?.(err);
        throw err;
      }
    },
    [moveFocusAfterRemoval, commitItems, commitCounts, commitTotal, commitPendingUndo],
  );

  // -------------------------------------------------------------------------
  // Public setters
  // -------------------------------------------------------------------------

  const setProject = useCallback((p: string) => {
    setProjectState(p);
    setFocusedId(null);
    setOpenedId(null);
    setPendingUndo(null);
    undoRecordRef.current = null;
    openedCacheRef.current = null;
  }, []);

  const setStatus = useCallback((s: InboxStatusFilter) => setStatusFilter(s), []);
  const setType = useCallback((t: InboxTypeFilter) => setTypeFilter(t), []);
  const setSearch = useCallback((s: string) => setSearchState(s), []);

  const hasMore = !exhausted && total !== null && items.length < total;

  // High-level view resolution — the exact algebra the shipped component
  // renders from, exposed so headless consumers don't re-derive it. Stale
  // rows stay visible during a refetch, hence "ready" whenever rows exist.
  const view: InboxState["view"] =
    items.length > 0 ? "ready" : loading ? "loading" : error !== null ? "error" : "empty";

  return {
    project,
    projects,
    setProject,
    status,
    setStatus,
    type,
    setType,
    search,
    setSearch,
    items,
    total,
    counts,
    loading,
    loadingMore,
    error,
    hasMore,
    view,
    loadMore,
    refresh: load,
    focusedId,
    focus,
    focusNext,
    focusPrev,
    openedId,
    opened,
    openFeedback,
    closeFeedback,
    changeStatus,
    deleteFeedback,
    pendingUndo,
    undo,
  };
}
