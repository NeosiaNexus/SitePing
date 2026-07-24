import type {
  FeedbackPage,
  FeedbackQuery,
  FeedbackRecord,
  FeedbackStatus,
  FeedbackType,
  SitepingLocale,
  SitepingStore,
} from "@siteping/core";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Data source
// ---------------------------------------------------------------------------

/**
 * Abstract data source consumed by `useSitepingInbox`.
 *
 * Two built-in factories exist — `createEndpointSource` (HTTP, talks to the
 * adapter request handlers) and `createStoreSource` (direct `SitepingStore`,
 * client-side mode) — but consumers can hand-roll one to plug the inbox into
 * any backend (tRPC, GraphQL, server actions, …).
 */
export interface InboxSource {
  /** Paginated, filtered feedback query. Must resolve real `Date` objects on records. */
  list(query: FeedbackQuery): Promise<FeedbackPage>;
  /**
   * Persist a status change. Closure semantics (`resolvedAt`) are derived at
   * this edge — callers only pass the target status.
   */
  setStatus(id: string, projectName: string, status: FeedbackStatus): Promise<FeedbackRecord>;
  /** Permanently delete a feedback. */
  remove(id: string, projectName: string): Promise<void>;
}

/** Options accepted by `createEndpointSource`. */
export interface EndpointSourceOptions {
  /** HTTP endpoint exposing the Siteping request handlers (e.g. `/api/siteping`). */
  endpoint: string;
  /** Convenience auth — sent as `Authorization: Bearer <apiKey>` on every request. */
  apiKey?: string | undefined;
  /**
   * Extra request headers, static or lazily computed (sync or async) per
   * request — e.g. a fresh session token. An explicit `Authorization` entry
   * here takes precedence over `apiKey`.
   */
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>) | undefined;
  /** Test seam — defaults to `globalThis.fetch`. */
  fetchFn?: typeof fetch | undefined;
}

// ---------------------------------------------------------------------------
// Hook contract
// ---------------------------------------------------------------------------

/** Status filter — a concrete status, or `"all"`. */
export type InboxStatusFilter = FeedbackStatus | "all";

/** Type filter — a concrete feedback type, or `"all"`. */
export type InboxTypeFilter = FeedbackType | "all";

/** Options accepted by `useSitepingInbox` (and, by extension, `<SitepingInbox />`). */
export interface UseSitepingInboxOptions {
  /** Project name(s) to triage. The first entry is selected initially. */
  projects: string | readonly string[];
  /** Custom data source — wins over `store`/`endpoint` when provided. */
  source?: InboxSource | undefined;
  /** Direct store for client-side mode (no server round-trip). */
  store?: SitepingStore | undefined;
  /** HTTP endpoint exposing the Siteping request handlers. */
  endpoint?: string | undefined;
  /** Sent as `Authorization: Bearer <apiKey>` (endpoint mode only). */
  apiKey?: string | undefined;
  /** Extra request headers (endpoint mode only) — see `EndpointSourceOptions.headers`. */
  headers?: EndpointSourceOptions["headers"];
  /** Page size for list queries. Defaults to 50, clamped to 1..100. */
  pageSize?: number | undefined;
  /** Called after a status change is persisted, with the saved record and the status it had before. */
  onStatusChange?: ((feedback: FeedbackRecord, previous: FeedbackStatus) => void) | undefined;
  /** Called after a feedback is permanently deleted. */
  onDelete?: ((feedback: FeedbackRecord) => void) | undefined;
  /** Called on every load or mutation failure, with a typed `SitepingError` where available. */
  onError?: ((error: Error) => void) | undefined;
}

/**
 * Full state + actions returned by `useSitepingInbox` — everything needed to
 * render a triage inbox. Mutations are optimistic: state updates immediately,
 * rolls back on failure (the rejected promise carries the error so UIs can
 * surface a toast on top of the `onError` callback).
 */
export interface InboxState {
  /** Currently selected project. */
  project: string;
  /** All configured projects (normalized to an array). */
  projects: readonly string[];
  /** Switch project — resets focus, drawer and pending undo. */
  setProject(p: string): void;
  /** Active status tab. */
  status: InboxStatusFilter;
  setStatus(s: InboxStatusFilter): void;
  /** Active type filter. */
  type: InboxTypeFilter;
  setType(t: InboxTypeFilter): void;
  /** Raw search input — updates synchronously; the refetch is debounced 250ms. */
  search: string;
  setSearch(s: string): void;
  /** Currently loaded rows (page 1..n concatenated). */
  items: FeedbackRecord[];
  /** Total matching the current filters — `null` until the first page resolves. */
  total: number | null;
  /** Per-status tab counts — refreshed with the list; adjusted locally on mutations. */
  counts: Partial<Record<"all" | FeedbackStatus, number>>;
  /** True while page 1 is (re)loading. */
  loading: boolean;
  /** True while an additional page is loading. */
  loadingMore: boolean;
  /** Last load failure for the current filters — cleared on refetch. */
  error: Error | null;
  /** Whether more pages exist beyond the loaded rows. */
  hasMore: boolean;
  /** Fetch the next page and append it. */
  loadMore(): Promise<void>;
  /** Re-fetch page 1 + counts for the current filters. */
  refresh(): Promise<void>;
  /** Keyboard-focused row id (aria-activedescendant target). */
  focusedId: string | null;
  focus(id: string): void;
  focusNext(): void;
  focusPrev(): void;
  /** Id of the feedback opened in the drawer, or `null`. */
  openedId: string | null;
  /** The opened record — survives leaving the filtered list while the drawer stays open. */
  opened: FeedbackRecord | null;
  openFeedback(id: string): void;
  closeFeedback(): void;
  /** Optimistic status change with rollback on error. Rejects after rolling back. */
  changeStatus(id: string, status: FeedbackStatus): Promise<void>;
  /** Optimistic delete (no undo — confirm in the UI) with rollback on error. Rejects after rolling back. */
  deleteFeedback(id: string): Promise<void>;
  /** Last status change eligible for undo, or `null`. */
  pendingUndo: { id: string; previousStatus: FeedbackStatus } | null;
  /** Revert the pending status change. Clears `pendingUndo` without creating a new one. */
  undo(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

/** Props accepted by `<SitepingInbox />`. */
export interface SitepingInboxProps extends UseSitepingInboxOptions {
  /** Accent color (any `#RGB`/`#RRGGBB`/`#RRGGBBAA` hex) — defaults to `"#0066ff"`. */
  accentColor?: string | undefined;
  /** Color theme — defaults to `"auto"`, which tracks the system preference live. */
  theme?: "light" | "dark" | "auto" | undefined;
  /** Row density — defaults to `"comfortable"`. */
  density?: "comfortable" | "compact" | undefined;
  /** UI locale — defaults to `"en"`; non-English built-ins are lazy-loaded. */
  locale?: SitepingLocale | undefined;
  /** Extra class name(s) appended to the root element. */
  className?: string | undefined;
  /** Query parameter used by "Open on page" deep links — defaults to `"siteping"`. */
  deepLinkParam?: string | undefined;
  /** Replaces the default empty state shown when the project has no feedback at all. */
  emptyState?: ReactNode | undefined;
}
