import {
  FEEDBACK_STATUSES,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackStatus,
  isClosedStatus,
  matchesFeedbackQuery,
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

/** Per-tab count adjustments made by one optimistic step. */
type CountDeltas = readonly (readonly ["all" | FeedbackStatus, number])[];

/**
 * Rollback data for one in-flight optimistic mutation. Mutations on the same
 * feedback chain through `next`: a failure that a still-pending mutation has
 * built on hands it `prev` and its deltas, so the chain reverts as one.
 */
interface InFlight {
  /** The record before the optimistic step — what a failure puts back. */
  prev: FeedbackRecord;
  /** Count deltas still to invert on failure, each tagged with the counts generation it was applied to. */
  undo: { deltas: CountDeltas; countsGen: number }[];
  /** List generation at the optimistic step — a page 1 committed since then already dropped the edit. */
  listGen: number;
  state: "pending" | "ok" | "failed";
  next: InFlight | null;
}

/** Apply deltas to the count keys that are known — unknown (undefined) counts stay unknown. */
function adjustCounts(counts: InboxState["counts"], deltas: CountDeltas): InboxState["counts"] {
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
  /**
   * Bumped when load() COMMITS page 1 / counts (tokens bump at fetch start).
   * Optimistic edits made before a commit are gone from the committed data,
   * so a failing mutation must not invert them there.
   */
  const listGenRef = useRef(0);
  const countsGenRef = useRef(0);
  /** Latest in-flight mutation per feedback id. */
  const inFlightRef = useRef(new Map<string, InFlight>());
  /** Bumped on every project switch — a mutation failing after one must not touch the new project's state. */
  const projectEpochRef = useRef(0);
  /** Bumped on every `pendingUndo` write — a failed mutation restores the undo only if nothing replaced its own. */
  const undoGenRef = useRef(0);
  /** Set when a loadMore page returned nothing new — the server has no more rows for us. */
  const [exhausted, setExhausted] = useState(false);
  /** The opened record — kept so the drawer survives its row leaving the filtered list. */
  const openedCacheRef = useRef<FeedbackRecord | null>(null);
  /** Full record behind `pendingUndo` — undo must work after the row left the list. */
  const undoRecordRef = useRef<FeedbackRecord | null>(null);
  const commitPendingUndo = useCallback((next: InboxState["pendingUndo"]) => {
    undoGenRef.current += 1;
    pendingUndoRef.current = next;
    setPendingUndo(next);
  }, []);

  // Keep the selected project valid when the `projects` prop changes.
  useEffect(() => {
    if (!projects.includes(projectRef.current)) {
      projectEpochRef.current += 1;
      setProjectState(firstProject);
      setFocusedId(null);
      setOpenedId(null);
      commitPendingUndo(null);
      undoRecordRef.current = null;
      openedCacheRef.current = null;
    }
  }, [projects, firstProject, commitPendingUndo]);

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
      listGenRef.current += 1;
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
    countsGenRef.current += 1;
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
  // Mutations — optimistic, per-record rollback on error
  // -------------------------------------------------------------------------

  /** After removing the row at `index`, focus the row now sitting at that index (or the new last). Returns the new focus. */
  const moveFocusAfterRemoval = useCallback((nextItems: FeedbackRecord[], index: number): string | null => {
    const fallback = index === -1 ? null : (nextItems[Math.min(index, nextItems.length - 1)] ?? null);
    const next = fallback ? fallback.id : null;
    focusedIdRef.current = next;
    setFocusedId(next);
    return next;
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

  /**
   * Whether a record matches the current project / type / search — the query
   * the tab counts describe. Uses the stores' own predicate so search
   * semantics (case-insensitive substring of the message) can't drift.
   */
  const matchesBase = useCallback(
    (record: FeedbackRecord): boolean => matchesFeedbackQuery(record, queryBaseRef.current),
    [],
  );

  /** Whether a record belongs in the currently loaded list (base query + status tab). */
  const belongsInList = useCallback(
    (record: FeedbackRecord): boolean => {
      const filter = statusRef.current;
      return (filter === "all" || filter === record.status) && matchesBase(record);
    },
    [matchesBase],
  );

  /**
   * Put one feedback where the current list wants it: replace its row, insert
   * it (newest-first) or remove it — `null` always removes. Keeps `total` in
   * step and returns the removed row's former index (-1 if none) plus whether
   * a row was inserted.
   */
  const placeRecord = useCallback(
    (id: string, record: FeedbackRecord | null): { removedAt: number; inserted: boolean } => {
      const list = itemsRef.current;
      const index = list.findIndex((f) => f.id === id);
      const keep = record !== null && belongsInList(record);
      if (index !== -1 && !keep) {
        commitItems(list.filter((f) => f.id !== id));
        commitTotal(totalRef.current === null ? null : Math.max(0, totalRef.current - 1));
        return { removedAt: index, inserted: false };
      }
      if (index !== -1 && record !== null) {
        commitItems(list.map((f) => (f.id === id ? record : f)));
      } else if (keep) {
        commitItems(insertByCreatedAtDesc(list, record));
        commitTotal(totalRef.current === null ? null : totalRef.current + 1);
        return { removedAt: -1, inserted: true };
      }
      return { removedAt: -1, inserted: false };
    },
    [belongsInList, commitItems, commitTotal],
  );

  /** Register an optimistic step, chained behind any mutation still pending on the same feedback. */
  const beginMutation = useCallback((id: string, prev: FeedbackRecord, deltas: CountDeltas): InFlight => {
    const handle: InFlight = {
      prev,
      undo: [{ deltas, countsGen: countsGenRef.current }],
      listGen: listGenRef.current,
      state: "pending",
      next: null,
    };
    const prior = inFlightRef.current.get(id);
    if (prior) prior.next = handle;
    inFlightRef.current.set(id, handle);
    return handle;
  }, []);

  /**
   * Settle a mutation. Returns true when its outcome is the record's latest
   * word — no later mutation on the same feedback is pending or succeeded —
   * so the caller may write the record back to the list. A failure that a
   * pending mutation has built on hands that one its base and deltas instead:
   * that later mutation's success keeps them, its failure reverts both.
   */
  const settleMutation = useCallback((id: string, handle: InFlight, ok: boolean): boolean => {
    handle.state = ok ? "ok" : "failed";
    if (inFlightRef.current.get(id) === handle) inFlightRef.current.delete(id);
    let later = handle.next;
    while (later !== null && later.state === "failed") later = later.next;
    if (later === null) return true;
    if (!ok && later.state === "pending") {
      later.prev = handle.prev;
      later.undo = [...handle.undo, ...later.undo];
    }
    return false;
  }, []);

  /**
   * Revert a failed mutation for its own record only, against the CURRENT
   * state — concurrent mutations on other rows and fetches that landed
   * meanwhile stay intact. A page 1 or counts committed after the optimistic
   * step already hold the server's view, so nothing is inverted in them.
   */
  const rollback = useCallback(
    (id: string, handle: InFlight, optimistic: FeedbackRecord | null, focusMovedTo: string | null | undefined) => {
      if (handle.listGen === listGenRef.current) {
        const { inserted } = placeRecord(id, handle.prev);
        if (inserted && focusMovedTo !== undefined && focusedIdRef.current === focusMovedTo) {
          focusedIdRef.current = id;
          setFocusedId(id);
        }
      }
      let nextCounts = countsRef.current;
      for (const { deltas, countsGen } of handle.undo) {
        if (countsGen !== countsGenRef.current) continue;
        nextCounts = adjustCounts(
          nextCounts,
          deltas.map(([key, delta]) => [key, -delta] as const),
        );
      }
      commitCounts(nextCounts);
      if (optimistic !== null && openedCacheRef.current === optimistic) openedCacheRef.current = handle.prev;
    },
    [placeRecord, commitCounts],
  );

  const applyStatusChange = useCallback(
    async (id: string, nextStatus: FeedbackStatus, isUndo: boolean): Promise<void> => {
      const record =
        itemsRef.current.find((f) => f.id === id) ??
        (undoRecordRef.current?.id === id ? undoRecordRef.current : null) ??
        (openedCacheRef.current?.id === id ? openedCacheRef.current : null);
      if (!record || record.status === nextStatus) {
        if (isUndo) commitPendingUndo(null);
        return;
      }

      const epoch = projectEpochRef.current;
      // Captured for undos too: a FAILED undo leaves the status change
      // standing, so the undo affordance must survive the rollback.
      const undoBefore = { pending: pendingUndoRef.current, record: undoRecordRef.current };

      const previous = record.status;
      const now = new Date();
      const optimistic: FeedbackRecord = {
        ...record,
        status: nextStatus,
        // Closure semantics derived at the edge: resolvedAt = closure timestamp.
        resolvedAt: isClosedStatus(nextStatus) ? now : null,
        updatedAt: now,
      };
      // A record outside the current type/search (reached via the drawer or
      // undo) is not part of the counts either.
      const deltas: CountDeltas = matchesBase(record)
        ? [
            [previous, -1],
            [nextStatus, +1],
          ]
        : [];

      const wasFocused = focusedIdRef.current === id;
      const { removedAt } = placeRecord(id, optimistic);
      const focusMovedTo =
        wasFocused && removedAt !== -1 ? moveFocusAfterRemoval(itemsRef.current, removedAt) : undefined;
      if (openedCacheRef.current?.id === id) openedCacheRef.current = optimistic;
      commitCounts(adjustCounts(countsRef.current, deltas));
      const handle = beginMutation(id, record, deltas);
      if (isUndo) {
        commitPendingUndo(null);
        undoRecordRef.current = null;
      } else {
        commitPendingUndo({ id, previousStatus: previous });
        undoRecordRef.current = optimistic;
      }
      const undoGen = undoGenRef.current;

      try {
        const saved = await srcRef.current.setStatus(id, projectRef.current, nextStatus);
        // A later mutation on this feedback owns the row now — don't clobber its optimistic state.
        if (settleMutation(id, handle, true)) {
          commitItems(itemsRef.current.map((f) => (f.id === id ? saved : f)));
          if (openedCacheRef.current?.id === id) openedCacheRef.current = saved;
          if (undoRecordRef.current?.id === id) undoRecordRef.current = saved;
        }
        // `prev` may have been rebased onto an earlier failed change — it is what the server held.
        callbacksRef.current.onStatusChange?.(saved, handle.prev.status);
      } catch (cause) {
        const latest = settleMutation(id, handle, false);
        // After a project switch the list, counts and undo belong to another project.
        if (projectEpochRef.current === epoch) {
          if (latest) rollback(id, handle, optimistic, focusMovedTo);
          if (undoGenRef.current === undoGen) {
            commitPendingUndo(undoBefore.pending);
            undoRecordRef.current = undoBefore.record;
          }
        }
        const err = toError(cause);
        callbacksRef.current.onError?.(err);
        throw err;
      }
    },
    [
      matchesBase,
      placeRecord,
      moveFocusAfterRemoval,
      beginMutation,
      settleMutation,
      rollback,
      commitItems,
      commitCounts,
      commitPendingUndo,
    ],
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

      const epoch = projectEpochRef.current;
      const undoBefore = { pending: pendingUndoRef.current, record: undoRecordRef.current };
      const deltas: CountDeltas = matchesBase(record)
        ? [
            [record.status, -1],
            ["all", -1],
          ]
        : [];

      const wasFocused = focusedIdRef.current === id;
      const wasOpened = openedIdRef.current === id;
      const { removedAt } = placeRecord(id, null);
      const focusMovedTo =
        wasFocused && removedAt !== -1 ? moveFocusAfterRemoval(itemsRef.current, removedAt) : undefined;
      commitCounts(adjustCounts(countsRef.current, deltas));
      const handle = beginMutation(id, record, deltas);
      if (wasOpened) {
        openedIdRef.current = null;
        setOpenedId(null);
      }
      if (openedCacheRef.current?.id === id) openedCacheRef.current = null;
      if (pendingUndoRef.current?.id === id) {
        commitPendingUndo(null);
        undoRecordRef.current = null;
      }
      const undoGen = undoGenRef.current;

      try {
        await srcRef.current.remove(id, projectRef.current);
        settleMutation(id, handle, true);
        callbacksRef.current.onDelete?.(record);
      } catch (cause) {
        const latest = settleMutation(id, handle, false);
        if (projectEpochRef.current === epoch) {
          if (latest) {
            rollback(id, handle, null, focusMovedTo);
            // Reopen the drawer unless another feedback was opened meanwhile.
            if (wasOpened && openedIdRef.current === null) {
              openedCacheRef.current = handle.prev;
              openedIdRef.current = id;
              setOpenedId(id);
            }
          }
          if (undoGenRef.current === undoGen) {
            commitPendingUndo(undoBefore.pending);
            undoRecordRef.current = undoBefore.record;
          }
        }
        const err = toError(cause);
        callbacksRef.current.onError?.(err);
        throw err;
      }
    },
    [
      matchesBase,
      placeRecord,
      moveFocusAfterRemoval,
      beginMutation,
      settleMutation,
      rollback,
      commitCounts,
      commitPendingUndo,
    ],
  );

  // -------------------------------------------------------------------------
  // Public setters
  // -------------------------------------------------------------------------

  const setProject = useCallback(
    (p: string) => {
      projectEpochRef.current += 1;
      setProjectState(p);
      setFocusedId(null);
      setOpenedId(null);
      commitPendingUndo(null);
      undoRecordRef.current = null;
      openedCacheRef.current = null;
    },
    [commitPendingUndo],
  );

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
