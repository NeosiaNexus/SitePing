import {
  type CommentPermissions,
  FEEDBACK_STATUSES,
  type FeedbackPermissions,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackStatus,
  isClosedStatus,
  isCommentGone,
  matchesFeedbackQuery,
  newClientId,
  type SitepingCapabilities,
} from "@siteping/core";
import { untrack } from "svelte";
import { createEndpointSource, createStoreSource } from "./source.js";
import type {
  InboxComment,
  InboxRecord,
  InboxSource,
  InboxState,
  InboxStatusFilter,
  InboxTypeFilter,
  UseSitepingInboxOptions,
} from "./types.js";

const DEFAULT_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Every local thread write (a reply stored, one deleted) takes the next
 * number, in every inbox on the page: only their order counts.
 */
let threadWriteCount = 0;

/** Debounced-search + counts keys — the 4 statuses plus the "all" tab. */
const COUNT_KEYS: readonly ("all" | FeedbackStatus)[] = ["all", ...FEEDBACK_STATUSES];

function clampPageSize(pageSize: number | undefined): number {
  if (pageSize === undefined || Number.isNaN(pageSize)) return DEFAULT_PAGE_SIZE;
  return Math.min(100, Math.max(1, Math.floor(pageSize)));
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

function toProjects(projects: UseSitepingInboxOptions["projects"]): readonly string[] {
  const list = typeof projects === "string" ? [projects] : [...projects];
  if (list[0] === undefined) {
    throw new Error("[siteping] createSitepingInbox: `projects` must contain at least one project name.");
  }
  return list;
}

/**
 * The source the options select. Endpoint headers are read per request
 * through `headers`, so a changed `headers` option applies without a new source.
 */
function buildSource(
  { source, store, endpoint, apiKey }: UseSitepingInboxOptions,
  headers: () => UseSitepingInboxOptions["headers"],
): InboxSource {
  if (source) return source;
  if (store) return createStoreSource(store);
  if (endpoint) {
    return createEndpointSource({
      endpoint,
      apiKey,
      headers: () => {
        const h = headers();
        return typeof h === "function" ? h() : (h ?? {});
      },
    });
  }
  throw new Error("[siteping] createSitepingInbox requires one of `source`, `store` or `endpoint`.");
}

/** Per-tab count adjustments made by one optimistic step. */
type CountDeltas = readonly (readonly ["all" | FeedbackStatus, number])[];

/** The query every list and count request shares: project, type and debounced search. */
interface QueryBase {
  projectName: string;
  type: FeedbackRecord["type"] | undefined;
  search: string | undefined;
}

/**
 * Rollback data for one in-flight optimistic mutation. Mutations on the same
 * feedback chain through `next`: a failure that a still-pending mutation has
 * built on hands it `prev`, `wasListed` and its deltas, so the chain reverts
 * as one.
 */
interface InFlight {
  /** The record before the optimistic step — what a failure puts back. */
  prev: FeedbackRecord;
  /** Whether its row was listed before the step — a failure puts a row back only then. */
  wasListed: boolean;
  /** The record the step put in the drawer — a failure restores the drawer only while it still shows it. */
  shown: FeedbackRecord | null;
  /** Count deltas still to invert on failure, each tagged with the counts generation it was applied to. */
  undo: { deltas: CountDeltas; countsGen: number }[];
  /** List generation at the optimistic step — a page 1 committed since then already dropped the edit. */
  listGen: number;
  state: "pending" | "ok" | "failed";
  next: InFlight | null;
  /** The mutation this one chained behind — the feedback's again if this one fails as the latest. */
  prior: InFlight | null;
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
 * Headless triage-inbox controller — full state + actions behind `<SitepingInbox />`,
 * the Svelte counterpart of the React package's `useSitepingInbox`.
 *
 * Call it during component initialisation (it owns `$effect`s, torn down with
 * the component). Pass a getter — `createSitepingInbox(() => props)` — for
 * options that change over time; a plain object is read once. Every field of
 * the returned object is a live, reactive getter, and every method is bound,
 * so it can be destructured for actions (not for state).
 *
 * - Fetches on mount and whenever project / status / type / debounced search
 *   change; stale responses are discarded via a request token (latest wins).
 * - Tab counts are refreshed alongside page 1 (limit-1 queries, best-effort)
 *   and adjusted locally on mutations.
 * - `changeStatus` / `deleteFeedback` are optimistic with rollback on error;
 *   the rejected promise carries the error so UIs can toast on top of the
 *   `onError` callback.
 */
export function createSitepingInbox(options: UseSitepingInboxOptions | (() => UseSitepingInboxOptions)): InboxState {
  const opts: () => UseSitepingInboxOptions = typeof options === "function" ? options : () => options;

  // Read once up front: a missing project or source fails at creation, like the React hook's first render.
  toProjects(opts().projects);

  const projects = $derived(toProjects(opts().projects));
  const firstProject = $derived(projects[0] as string);
  const pageSize = $derived(clampPageSize(opts().pageSize));
  const readOnly = $derived(opts().readOnly);

  const src = $derived(buildSource(opts(), () => untrack(() => opts().headers)));
  // Fail fast, like the React hook's first render: a missing source throws at creation.
  buildSource(untrack(opts), () => undefined);

  /** An option read at call time (callbacks, `author`) — never tracked by an effect. */
  function option<K extends keyof UseSitepingInboxOptions>(key: K): UseSitepingInboxOptions[K] {
    return untrack(() => opts()[key]);
  }

  // -------------------------------------------------------------------------
  // State — `$state.raw`: records are compared by identity, never proxied
  // -------------------------------------------------------------------------

  let project = $state(untrack(() => firstProject));
  let status = $state<InboxStatusFilter>("open");
  let type = $state<InboxTypeFilter>("all");
  let search = $state("");
  let debouncedSearch = $state("");
  let items = $state.raw<FeedbackRecord[]>([]);
  let total = $state<number | null>(null);
  let counts = $state.raw<InboxState["counts"]>({});
  let loading = $state(true);
  let loadingMore = $state(false);
  let error = $state.raw<Error | null>(null);
  let focusedId = $state<string | null>(null);
  let openedId = $state<string | null>(null);
  let pendingUndo = $state.raw<InboxState["pendingUndo"]>(null);
  /** What the last list advertised — the endpoint's store may keep no comments, or not delete them. */
  let advertised = $state.raw<SitepingCapabilities | undefined>(undefined);
  /** Set when a loadMore page returned nothing new — the server has no more rows for us. */
  let exhausted = $state(false);
  /** The opened record — kept so the drawer survives its row leaving the filtered list. */
  let openedCache = $state.raw<FeedbackRecord | null>(null);

  const canComment = $derived(
    opts().author !== undefined && src.addComment !== undefined && advertised?.comments !== false,
  );
  const canDeleteComment = $derived(
    canComment && !readOnly && src.removeComment !== undefined && advertised?.deleteComments !== false,
  );

  function permissionsOf({ permissions }: InboxRecord): FeedbackPermissions {
    return {
      canChangeStatus: !readOnly && permissions?.canChangeStatus !== false,
      canDelete: !readOnly && permissions?.canDelete !== false,
      canComment: canComment && permissions?.canComment !== false,
      canDeleteComment: canDeleteComment && permissions?.canDeleteComment !== false,
    };
  }

  function commentPermissionsOf(record: InboxRecord, { permissions }: InboxComment): CommentPermissions {
    return {
      // The server's answer for this reply already counts the thread's.
      canDelete:
        canDeleteComment && (permissions ? permissions.canDelete : record.permissions?.canDeleteComment !== false),
    };
  }

  // Plain bookkeeping — never rendered, so never reactive.

  /** Monotonic request token — any newer fetch invalidates older in-flight results. */
  let token = 0;
  /**
   * Counts freshness token — only full loads produce counts, so only load()
   * bumps it. loadMore() must not discard an in-flight counts result.
   */
  let countsToken = 0;
  /**
   * Bumped when load() COMMITS page 1 / counts (tokens bump at fetch start).
   * Optimistic edits made before a commit are gone from the committed data,
   * so a failing mutation must not invert them there.
   */
  let listGen = 0;
  let countsGen = 0;
  /** Latest in-flight mutation per feedback id. */
  const inFlight = new Map<string, InFlight>();
  /** Pending-mutation count and start sequence — tell loadMore its page may predate an optimistic edit. */
  let pendingMutations = 0;
  let mutationSeq = 0;
  /** loadMore's own token: appending must not invalidate anything else, only an older append. */
  let loadMoreToken = 0;
  /**
   * Saves that landed — a status change, a delete — each numbered, with what
   * the server now holds (`null` once deleted). A page 1 requested before a
   * save may have been read before the server applied it, so `load()`
   * re-places the records saved since it started once its page commits (#402).
   */
  let saveSeq = 0;
  const saved = new Map<string, { seq: number; record: FeedbackRecord | null }>();
  /** Bumped on every project switch — a mutation failing after one must not touch the new project's state. */
  let projectEpoch = 0;
  /**
   * Identity of the current `pendingUndo` entry, fresh on every write. A failed
   * mutation restores the undo only while its own entry stands, and puts back
   * the one it replaced as that same entry, which its writer still owns.
   */
  let undoEntry: object = {};
  /** Full record behind `pendingUndo` — undo must work after the row left the list. */
  let undoRecord: FeedbackRecord | null = null;
  /** Set when a load's counts raced a mutation — recounted once no mutation is pending. */
  let countsStale = false;
  /** A mutation can settle after teardown: its recount must not outlive the component. */
  let mounted = false;
  /**
   * The number of each feedback's last local thread write. A response read
   * before that write — a list, a page, a status change's record — holds an
   * older thread: the one kept here wins.
   */
  const threadWrites = new Map<string, number>();

  function commitPendingUndo(next: InboxState["pendingUndo"], entry: object = {}): void {
    undoEntry = entry;
    pendingUndo = next;
  }

  function resetForProject(): void {
    projectEpoch += 1;
    focusedId = null;
    openedId = null;
    commitPendingUndo(null);
    undoRecord = null;
    openedCache = null;
  }

  $effect(() => {
    mounted = true;
    return () => {
      mounted = false;
    };
  });

  // Keep the selected project valid when the `projects` option changes.
  $effect(() => {
    const list = projects;
    const first = firstProject;
    untrack(() => {
      if (!list.includes(project)) {
        resetForProject();
        project = first;
      }
    });
  });

  // Debounce search → refetch trigger. `search` itself updates synchronously.
  $effect(() => {
    const value = search;
    const timer = setTimeout(() => {
      debouncedSearch = value;
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  });

  // -------------------------------------------------------------------------
  // Fetching — page 1 + counts, latest wins
  // -------------------------------------------------------------------------

  const queryBase = $derived.by<QueryBase>(() => {
    const trimmed = debouncedSearch.trim();
    return {
      projectName: project,
      type: type === "all" ? undefined : type,
      // Clamped to the adapter query schema's 200-char cap — longer input
      // would 400 the whole request instead of returning "no results".
      search: trimmed === "" ? undefined : trimmed.slice(0, 200),
    };
  });

  /**
   * Ids the server listed under a query base. Its search can be broader than
   * the local predicate (accent-insensitive collations, full-text, a custom
   * source), so a record it listed stays in that query even once its row left.
   */
  let listed: { base: QueryBase | null; ids: Set<string> } = { base: null, ids: new Set() };
  function rememberListed(base: QueryBase, records: readonly FeedbackRecord[]): void {
    if (listed.base !== base) listed = { base, ids: new Set() };
    for (const record of records) listed.ids.add(record.id);
  }

  function recountIfIdle(): void {
    if (!countsStale || pendingMutations > 0 || !mounted) return;
    countsStale = false;
    void loadCounts(queryBase, ++countsToken);
  }

  /**
   * Tab counts — limit-1 queries per status + all. Best-effort: a failed
   * count stays undefined (tab shows a placeholder), never fails the list.
   */
  async function loadCounts(base: QueryBase, requestToken: number): Promise<void> {
    const seqAtStart = mutationSeq;
    const mutationPending = pendingMutations > 0;
    const source = src;
    const totals = await Promise.all(
      COUNT_KEYS.map((key) =>
        source
          .list({ ...base, status: key === "all" ? undefined : key, page: 1, limit: 1 })
          .then((page) => page.total)
          .catch(() => undefined),
      ),
    );
    if (requestToken !== countsToken || !mounted) return;
    const next: InboxState["counts"] = {};
    COUNT_KEYS.forEach((key, index) => {
      const value = totals[index];
      if (typeof value === "number") next[key] = value;
    });
    countsGen += 1;
    counts = next;
    // A mutation overlapped these queries: they may predate it, and this
    // commit just replaced its local adjustment — recount once it settled.
    if (mutationPending || mutationSeq !== seqAtStart) {
      countsStale = true;
      recountIfIdle();
    }
  }

  /** The record `updateRecord` would reach — what a thread action reads the permissions of. */
  function heldRecord(id: string): FeedbackRecord | undefined {
    return (
      items.find((f) => f.id === id) ??
      [openedCache, undoRecord, inFlight.get(id)?.prev].find((f): f is FeedbackRecord => f?.id === id)
    );
  }

  /**
   * Call when a request starts, and pass each record it brings back to the
   * function it returns: a record whose thread was written locally since
   * keeps the thread held here.
   */
  function keepThreads() {
    const since = threadWriteCount;
    return <R extends FeedbackRecord>(record: R): R =>
      (threadWrites.get(record.id) ?? 0) > since ? { ...record, comments: heldRecord(record.id)?.comments } : record;
  }

  async function load(): Promise<void> {
    const requestToken = ++token;
    const keepThread = keepThreads();
    const savedSince = saveSeq;
    const requestCountsToken = ++countsToken;
    const base = queryBase;
    const source = src;
    loading = true;
    error = null;
    const query: FeedbackQuery = {
      ...base,
      status: status === "all" ? undefined : status,
      page: 1,
      limit: pageSize,
    };
    try {
      const page = await source.list(query);
      if (requestToken !== token) return;
      const feedbacks = page.feedbacks.map(keepThread);
      exhausted = false;
      advertised = page.capabilities;
      listGen += 1;
      rememberListed(base, feedbacks);
      items = feedbacks;
      total = page.total;
      replaceSavedSince(savedSince);
      loading = false;
      // A focus left on a row the new list doesn't contain would point
      // aria-activedescendant at nothing and make Enter open an invisible drawer.
      const focused = focusedId;
      if (focused !== null && !items.some((f) => f.id === focused)) focusedId = null;
    } catch (cause) {
      if (requestToken !== token) return;
      const err = toError(cause);
      loading = false;
      error = err;
      option("onError")?.(err);
      return;
    }
    await loadCounts(base, requestCountsToken);
  }

  // Refetch whenever the source or the query changes — `load` itself is untracked.
  $effect(() => {
    void src;
    void queryBase;
    void status;
    void pageSize;
    untrack(() => void load());
  });

  async function loadMore(): Promise<void> {
    if (loading || loadingMore) return;
    if (total === null || items.length >= total) return;
    // Appending doesn't bump the list token — only a newer load() (or append) supersedes it.
    const listToken = token;
    const requestToken = ++loadMoreToken;
    const seqAtStart = mutationSeq;
    const mutationPending = pendingMutations > 0;
    const keepThread = keepThreads();
    const superseded = () => listToken !== token || requestToken !== loadMoreToken;
    loadingMore = true;
    try {
      // Derive the page from what is actually loaded, not a counter —
      // optimistic removals shrink the server set, and a stale counter would
      // skip the rows that slid into already-consumed offsets.
      const nextPage = Math.floor(items.length / pageSize) + 1;
      const currentStatus = status;
      const base = queryBase;
      const page = await src.list({
        ...base,
        status: currentStatus === "all" ? undefined : currentStatus,
        page: nextPage,
        limit: pageSize,
      });
      if (superseded()) return;
      rememberListed(base, page.feedbacks);
      // A mutation in flight during the fetch: the server may not have applied
      // it yet, so the page can repeat rows removed optimistically and its
      // total can still count them — the local total already accounts for it.
      const racing = mutationPending || mutationSeq !== seqAtStart;
      const seen = new Set(items.map((f) => f.id));
      // A row with a mutation in flight is that mutation's to place (on
      // success or rollback) — the page's copy may predate it.
      const fresh = page.feedbacks.filter((f) => !seen.has(f.id) && !inFlight.has(f.id)).map(keepThread);
      // Out of rows only when nothing new came back from a short page, or from
      // any page no racing mutation can explain — a duplicate-only page caused
      // by an in-flight removal must not end pagination for good.
      if (fresh.length === 0 && (page.feedbacks.length < pageSize || !racing)) exhausted = true;
      items = [...items, ...fresh];
      if (!racing) total = page.total;
    } catch (cause) {
      if (superseded()) return;
      const err = toError(cause);
      error = err;
      option("onError")?.(err);
    } finally {
      loadingMore = false;
    }
  }

  // -------------------------------------------------------------------------
  // Focus & drawer
  // -------------------------------------------------------------------------

  function focus(id: string): void {
    focusedId = id;
  }

  function step(delta: 1 | -1): void {
    if (items.length === 0) return;
    const index = items.findIndex((f) => f.id === focusedId);
    const next = index === -1 ? items[0] : items[Math.min(Math.max(index + delta, 0), items.length - 1)];
    if (next) focusedId = next.id;
  }

  function openFeedback(id: string): void {
    const record = items.find((f) => f.id === id);
    if (record) openedCache = record;
    openedId = id;
    focusedId = id;
  }

  function closeFeedback(): void {
    openedId = null;
  }

  const opened = $derived.by<FeedbackRecord | null>(() => {
    if (openedId === null) return null;
    const inList = items.find((f) => f.id === openedId);
    if (inList) return inList;
    return openedCache?.id === openedId ? openedCache : null;
  });

  // -------------------------------------------------------------------------
  // Mutations — optimistic, per-record rollback on error
  // -------------------------------------------------------------------------

  /** After removing the row at `index`, focus the row now sitting at that index (or the new last). Returns the new focus. */
  function moveFocusAfterRemoval(index: number): string | null {
    const fallback = index === -1 ? null : (items[Math.min(index, items.length - 1)] ?? null);
    const next = fallback ? fallback.id : null;
    focusedId = next;
    return next;
  }

  /**
   * Whether a record matches the current project / type / search — the query
   * the tab counts describe. The server's word for a record it listed under
   * it; otherwise the stores' own predicate (case-insensitive substring of
   * the message), which a broader server search can outmatch.
   */
  function matchesBase(record: FeedbackRecord): boolean {
    const base = queryBase;
    return (listed.base === base && listed.ids.has(record.id)) || matchesFeedbackQuery(record, base);
  }

  /** Whether a record belongs in the currently loaded list (base query + status tab). */
  function belongsInList(record: FeedbackRecord): boolean {
    return (status === "all" || status === record.status) && matchesBase(record);
  }

  /**
   * Put one feedback where the current list wants it: replace its row, insert
   * it (newest-first) or remove it — `null` always removes. Keeps `total` in
   * step and returns the removed row's former index (-1 if none) plus whether
   * a row was inserted.
   */
  function placeRecord(id: string, record: FeedbackRecord | null): { removedAt: number; inserted: boolean } {
    const list = items;
    const index = list.findIndex((f) => f.id === id);
    const keep = record !== null && belongsInList(record);
    if (index !== -1 && !keep) {
      items = list.filter((f) => f.id !== id);
      total = total === null ? null : Math.max(0, total - 1);
      return { removedAt: index, inserted: false };
    }
    if (index !== -1 && record !== null) {
      items = list.map((f) => (f.id === id ? record : f));
    } else if (keep) {
      items = insertByCreatedAtDesc(list, record);
      total = total === null ? null : total + 1;
      return { removedAt: -1, inserted: true };
    }
    return { removedAt: -1, inserted: false };
  }

  /**
   * Whether `record` falls inside the loaded window: newer than some loaded
   * row, or anywhere once the whole list is loaded. An older one sits on a
   * page not loaded yet, where appending it would misplace it.
   */
  function fitsLoadedWindow(record: FeedbackRecord): boolean {
    const createdAt = record.createdAt.getTime();
    return (
      items.some((f) => f.id === record.id || f.createdAt.getTime() < createdAt) ||
      (total !== null && items.length >= total)
    );
  }

  /** Note a save that is its record's latest word, for the load that may have read the list before it. */
  function noteSaved(id: string, record: FeedbackRecord | null): void {
    saved.set(id, { seq: ++saveSeq, record });
  }

  /** Once a page 1 commits: re-place what was saved since its request started. */
  function replaceSavedSince(since: number): void {
    for (const [id, { seq, record }] of saved) {
      if (seq <= since) {
        saved.delete(id); // the page was read after it: nothing to re-place
        continue;
      }
      // A row with a mutation still pending is that mutation's to place.
      if (inFlight.has(id)) continue;
      // The page already holds this save — its copy of the row may be newer still.
      if (record !== null && items.find((f) => f.id === id)?.status === record.status) continue;
      if (record === null || fitsLoadedWindow(record)) placeRecord(id, record);
    }
  }

  /** Register an optimistic step, chained behind any mutation still pending on the same feedback. */
  function beginMutation(
    id: string,
    prev: FeedbackRecord,
    wasListed: boolean,
    shown: FeedbackRecord | null,
    deltas: CountDeltas,
  ): InFlight {
    const prior = inFlight.get(id) ?? null;
    const handle: InFlight = {
      prev,
      wasListed,
      shown,
      undo: [{ deltas, countsGen }],
      listGen,
      state: "pending",
      next: null,
      prior,
    };
    if (prior) prior.next = handle;
    inFlight.set(id, handle);
    pendingMutations += 1;
    mutationSeq += 1;
    return handle;
  }

  /**
   * Settle a mutation. Returns true when its outcome is the record's latest
   * word — no later mutation on the same feedback is pending or succeeded —
   * so the caller may write the record back to the list. A failure that a
   * pending mutation has built on hands that one its base and deltas instead:
   * that later mutation's success keeps them, its failure reverts both.
   */
  function settleMutation(id: string, handle: InFlight, ok: boolean): boolean {
    handle.state = ok ? "ok" : "failed";
    pendingMutations -= 1;
    recountIfIdle();
    if (inFlight.get(id) === handle) {
      // Failing as the latest hands the feedback back to the nearest earlier
      // mutation still pending: the rollback shows its optimistic record, so
      // the next mutation must chain behind it.
      let prior = ok ? null : handle.prior;
      while (prior !== null && prior.state !== "pending") prior = prior.prior;
      if (prior === null) inFlight.delete(id);
      else inFlight.set(id, prior);
    }
    let later = handle.next;
    while (later !== null && later.state === "failed") later = later.next;
    if (later === null) return true;
    if (!ok && later.state === "pending") {
      later.prev = handle.prev;
      later.wasListed = handle.wasListed;
      later.undo = [...handle.undo, ...later.undo];
    }
    return false;
  }

  /**
   * Revert a failed mutation for its own record only, against the CURRENT
   * state — concurrent mutations on other rows and fetches that landed
   * meanwhile stay intact. A page 1 or counts committed after the optimistic
   * step already hold the server's view, so nothing is inverted in them.
   */
  function rollback(id: string, handle: InFlight, focusMovedTo: string | null | undefined): void {
    if (handle.listGen === listGen) {
      // A row the step brought in (a drawer change, an undo) leaves again.
      const { removedAt, inserted } = placeRecord(id, handle.wasListed ? handle.prev : null);
      if (removedAt !== -1 && focusedId === id) moveFocusAfterRemoval(removedAt);
      if (inserted && focusMovedTo !== undefined && focusedId === focusMovedTo) focusedId = id;
    }
    let nextCounts = counts;
    for (const entry of handle.undo) {
      if (entry.countsGen !== countsGen) continue;
      nextCounts = adjustCounts(
        nextCounts,
        entry.deltas.map(([key, delta]) => [key, -delta] as const),
      );
    }
    counts = nextCounts;
    if (handle.shown !== null && openedCache === handle.shown) openedCache = handle.prev;
  }

  async function applyStatusChange(id: string, nextStatus: FeedbackStatus, isUndo: boolean): Promise<void> {
    const record: InboxRecord | null =
      items.find((f) => f.id === id) ??
      (undoRecord?.id === id ? undoRecord : null) ??
      (openedCache?.id === id ? openedCache : null);
    if (!record || record.status === nextStatus || !permissionsOf(record).canChangeStatus) {
      if (isUndo) commitPendingUndo(null);
      return;
    }

    const epoch = projectEpoch;
    // Captured for undos too: a FAILED undo leaves the status change
    // standing, so the undo affordance must survive the rollback.
    const undoBefore = { pending: pendingUndo, record: undoRecord, entry: undoEntry };

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

    const wasFocused = focusedId === id;
    const wasListed = items.some((f) => f.id === id);
    const { removedAt } = placeRecord(id, optimistic);
    const focusMovedTo = wasFocused && removedAt !== -1 ? moveFocusAfterRemoval(removedAt) : undefined;
    if (openedCache?.id === id) openedCache = optimistic;
    counts = adjustCounts(counts, deltas);
    const handle = beginMutation(id, record, wasListed, optimistic, deltas);
    if (isUndo) {
      commitPendingUndo(null);
      undoRecord = null;
    } else {
      commitPendingUndo({ id, previousStatus: previous });
      undoRecord = optimistic;
    }
    const ownUndoEntry = undoEntry;

    const keepThread = keepThreads();
    try {
      const stored = await src.setStatus(id, project, nextStatus);
      // A source that saves the plain record leaves the listed permissions in
      // force; a reply stored or deleted meanwhile, the thread held here.
      const savedRecord = keepThread(
        stored.permissions || !record.permissions ? stored : { ...stored, permissions: record.permissions },
      );
      // A later mutation on this feedback owns the row now — don't clobber its optimistic state.
      if (settleMutation(id, handle, true)) {
        // Place, not map: a page refetched meanwhile may still hold the
        // pre-change row, which must leave if the saved status doesn't fit,
        // or lack it although it now fits. Such a row comes back only inside
        // the loaded window. A page 1 still loading may predate the save
        // too: it re-places it once it commits.
        if (fitsLoadedWindow(savedRecord)) {
          const placed = placeRecord(id, savedRecord);
          if (placed.removedAt !== -1 && focusedId === id) moveFocusAfterRemoval(placed.removedAt);
        }
        noteSaved(id, savedRecord);
        if (openedCache?.id === id) openedCache = savedRecord;
        if (undoRecord?.id === id) undoRecord = savedRecord;
      }
      // `prev` may have been rebased onto an earlier failed change — it is what the server held.
      option("onStatusChange")?.(savedRecord, handle.prev.status);
    } catch (cause) {
      const latest = settleMutation(id, handle, false);
      // After a project switch the list, counts and undo belong to another project.
      if (projectEpoch === epoch) {
        if (latest) rollback(id, handle, focusMovedTo);
        if (undoEntry === ownUndoEntry) {
          commitPendingUndo(undoBefore.pending, undoBefore.entry);
          // `prev` holds the same record, with any reply stored meanwhile.
          undoRecord = undoBefore.record?.id === id ? handle.prev : undoBefore.record;
        }
      }
      const err = toError(cause);
      option("onError")?.(err);
      throw err;
    }
  }

  function changeStatus(id: string, nextStatus: FeedbackStatus): Promise<void> {
    return applyStatusChange(id, nextStatus, false);
  }

  async function undo(): Promise<void> {
    const pending = pendingUndo;
    if (!pending) return;
    await applyStatusChange(pending.id, pending.previousStatus, true);
  }

  async function deleteFeedback(id: string): Promise<void> {
    const record = items.find((f) => f.id === id) ?? (openedCache?.id === id ? openedCache : null);
    if (!record || !permissionsOf(record).canDelete) return;

    const epoch = projectEpoch;
    const undoBefore = { pending: pendingUndo, record: undoRecord, entry: undoEntry };
    const deltas: CountDeltas = matchesBase(record)
      ? [
          [record.status, -1],
          ["all", -1],
        ]
      : [];

    const wasFocused = focusedId === id;
    const wasOpened = openedId === id;
    const wasListed = items.some((f) => f.id === id);
    const { removedAt } = placeRecord(id, null);
    const focusMovedTo = wasFocused && removedAt !== -1 ? moveFocusAfterRemoval(removedAt) : undefined;
    counts = adjustCounts(counts, deltas);
    const handle = beginMutation(id, record, wasListed, null, deltas);
    if (wasOpened) openedId = null;
    if (openedCache?.id === id) openedCache = null;
    if (pendingUndo?.id === id) {
      commitPendingUndo(null);
      undoRecord = null;
    }
    const ownUndoEntry = undoEntry;

    try {
      await src.remove(id, project);
      // A page 1 still loading may predate the delete: it drops the row on commit.
      if (settleMutation(id, handle, true)) noteSaved(id, null);
      option("onDelete")?.(record);
    } catch (cause) {
      const latest = settleMutation(id, handle, false);
      if (projectEpoch === epoch) {
        if (latest) {
          rollback(id, handle, focusMovedTo);
          // Reopen the drawer unless another feedback was opened meanwhile.
          if (wasOpened && openedId === null) {
            openedCache = handle.prev;
            openedId = id;
          }
        }
        if (undoEntry === ownUndoEntry) {
          commitPendingUndo(undoBefore.pending, undoBefore.entry);
          undoRecord = undoBefore.record?.id === id ? handle.prev : undoBefore.record;
        }
      }
      const err = toError(cause);
      option("onError")?.(err);
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // Discussion thread — not optimistic: a reply shows once stored
  // -------------------------------------------------------------------------

  /**
   * Rewrite one feedback's thread wherever it is held: its row, the drawer,
   * the undo record, and what a status change still in flight rolls back from
   * and to — so a rollback does not drop a reply stored meanwhile, and a
   * response read before this write does not either. Each record object
   * gets one copy: a rollback recognizes the drawer it left by identity.
   */
  function updateRecord(id: string, update: (record: FeedbackRecord) => FeedbackRecord): void {
    const copies = new Map<FeedbackRecord, FeedbackRecord>();
    const rewrite = (record: FeedbackRecord): FeedbackRecord => {
      const copy = copies.get(record) ?? update(record);
      copies.set(record, copy);
      return copy;
    };
    if (items.some((f) => f.id === id)) items = items.map((f) => (f.id === id ? rewrite(f) : f));
    if (openedCache?.id === id) openedCache = rewrite(openedCache);
    if (undoRecord?.id === id) undoRecord = rewrite(undoRecord);
    for (let handle = inFlight.get(id) ?? null; handle; handle = handle.prior) {
      handle.prev = rewrite(handle.prev);
      if (handle.shown !== null) handle.shown = rewrite(handle.shown);
    }
    threadWrites.set(id, ++threadWriteCount);
  }

  async function addComment(id: string, body: string, clientId: string = newClientId()): Promise<void> {
    const source = src;
    const replier = option("author");
    const text = body.trim();
    const record = heldRecord(id);
    if (!source.addComment || !replier || !text || !record || !permissionsOf(record).canComment) return;
    try {
      const comment = await source.addComment(id, project, {
        body: text,
        authorName: replier.name,
        authorEmail: replier.email ?? "",
        authorRole: "team",
        clientId,
      });
      // A resend can answer with a reply a refetch has already brought in.
      const others = (r: FeedbackRecord) => (r.comments ?? []).filter((c) => c.id !== comment.id);
      updateRecord(id, (r) => ({ ...r, comments: [...others(r), comment] }));
    } catch (cause) {
      const err = toError(cause);
      option("onError")?.(err);
      throw err;
    }
  }

  async function deleteComment(id: string, commentId: string): Promise<void> {
    const source = src;
    const record = heldRecord(id);
    const comment = record?.comments?.find((c) => c.id === commentId);
    const allowed =
      record && (comment ? commentPermissionsOf(record, comment).canDelete : permissionsOf(record).canDeleteComment);
    if (!source.removeComment || !allowed) return;
    const drop = () => updateRecord(id, (f) => ({ ...f, comments: f.comments?.filter((c) => c.id !== commentId) }));
    try {
      await source.removeComment(id, project, commentId);
      drop();
    } catch (cause) {
      // Gone already — a teammate's delete, or ours whose answer was lost:
      // what the user asked for holds, and a retry would only 404 again.
      if (isCommentGone(cause)) return drop();
      const err = toError(cause);
      option("onError")?.(err);
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // Public surface — live getters + bound actions
  // -------------------------------------------------------------------------

  function setProject(p: string): void {
    resetForProject();
    project = p;
  }

  return {
    get project() {
      return project;
    },
    get projects() {
      return projects;
    },
    setProject,
    get status() {
      return status;
    },
    setStatusFilter: (s: InboxStatusFilter) => {
      status = s;
    },
    get type() {
      return type;
    },
    setTypeFilter: (t: InboxTypeFilter) => {
      type = t;
    },
    get search() {
      return search;
    },
    setSearch: (s: string) => {
      search = s;
    },
    get items() {
      return items;
    },
    get total() {
      return total;
    },
    get counts() {
      return counts;
    },
    get loading() {
      return loading;
    },
    get loadingMore() {
      return loadingMore;
    },
    get error() {
      return error;
    },
    get hasMore() {
      return !exhausted && total !== null && items.length < total;
    },
    // High-level view resolution — the exact algebra the shipped component
    // renders from, exposed so headless consumers don't re-derive it. Stale
    // rows stay visible during a refetch, hence "ready" whenever rows exist.
    get view(): InboxState["view"] {
      return items.length > 0 ? "ready" : loading ? "loading" : error !== null ? "error" : "empty";
    },
    loadMore,
    refresh: load,
    get focusedId() {
      return focusedId;
    },
    focus,
    focusNext: () => step(1),
    focusPrev: () => step(-1),
    get openedId() {
      return openedId;
    },
    get opened() {
      return opened;
    },
    openFeedback,
    closeFeedback,
    changeStatus,
    deleteFeedback,
    get canComment() {
      return canComment;
    },
    get canDeleteComment() {
      return canDeleteComment;
    },
    permissionsOf,
    commentPermissionsOf,
    addComment,
    deleteComment,
    get pendingUndo() {
      return pendingUndo;
    },
    undo,
  };
}
