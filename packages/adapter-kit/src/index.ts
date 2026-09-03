/**
 * Everything needed to build a custom Siteping store adapter, published —
 * `@siteping/core` is an internal (unpublished) package, so this kit is the
 * supported dependency for third-party adapters.
 *
 * Two ways to implement a store:
 *
 * 1. **Snapshot backends** (KV, flat file, IndexedDB, …): hand
 *    {@link createCollectionStore} a `load`/`persist`/`generateId` trio and
 *    every store semantic (clientId dedup, filtering, pagination, error
 *    contract) comes built-in — an adapter is ~20 lines plus its storage
 *    specifics.
 * 2. **Query backends** (SQL, ORMs): implement {@link SitepingStore}
 *    directly; {@link buildFeedbackRecord} / {@link buildAnnotationRecord}
 *    handle input→record construction, and the JSDoc on `SitepingStore`
 *    documents the exact error contract.
 *
 * Either way, verify with the conformance suite from
 * `@siteping/adapter-kit/testing`:
 *
 * @example
 * ```ts
 * import { testSitepingStore } from "@siteping/adapter-kit/testing";
 * import { MyStore } from "../src/index.js";
 *
 * testSitepingStore(() => new MyStore());
 * ```
 */

// The store contract and its data model
// Building blocks — record construction, the shared filter pipeline, and
// the full collection-store engine
export type {
  AnchorData,
  AnnotationCreateInput,
  AnnotationPayload,
  AnnotationRecord,
  AnnotationResponse,
  ClosedFeedbackStatus,
  CollectionStore,
  CollectionStoreBackend,
  ConsoleDiagnosticEntry,
  ConsoleDiagnosticLevel,
  DiagnosticsSnapshot,
  FeedbackCreateInput,
  FeedbackPage,
  FeedbackPayload,
  FeedbackQuery,
  FeedbackRecord,
  FeedbackResponse,
  FeedbackResponseList,
  FeedbackStatus,
  FeedbackType,
  FeedbackUpdateInput,
  FilterResult,
  NetworkDiagnosticEntry,
  OpenFeedbackStatus,
  Pagination,
  RectData,
  ScreenshotRegion,
  ScreenshotStorage,
  Serialized,
  SitepingStore,
} from "@siteping/core";
// Status/type constants + helpers
// Store errors — throw these from adapter implementations
export {
  applyFeedbackFilters,
  buildAnnotationRecord,
  buildFeedbackRecord,
  CLOSED_FEEDBACK_STATUSES,
  CONSOLE_DIAGNOSTIC_LEVELS,
  clampPagination,
  createCollectionStore,
  DEFAULT_PAGE_LIMIT,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  flattenAnnotation,
  isClosedStatus,
  isStoreDuplicate,
  isStoreNotFound,
  isStorePersistence,
  MAX_PAGE_LIMIT,
  OPEN_FEEDBACK_STATUSES,
  StoreDuplicateError,
  StoreNotFoundError,
  StorePersistenceError,
  toFeedbackUpdate,
} from "@siteping/core";
