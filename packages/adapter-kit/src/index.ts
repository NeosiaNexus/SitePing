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
export type {
  AnchorData,
  AnnotationCreateInput,
  AnnotationPayload,
  AnnotationRecord,
  AnnotationResponse,
  ClosedFeedbackStatus,
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
  NetworkDiagnosticEntry,
  OpenFeedbackStatus,
  RectData,
  ScreenshotRegion,
  ScreenshotStorage,
  Serialized,
  SitepingStore,
} from "@siteping/core";

// Status/type constants + helpers
export {
  CLOSED_FEEDBACK_STATUSES,
  CONSOLE_DIAGNOSTIC_LEVELS,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  flattenAnnotation,
  isClosedStatus,
  OPEN_FEEDBACK_STATUSES,
  toFeedbackUpdate,
} from "@siteping/core";

// Store errors — throw these from adapter implementations
export {
  isStoreDuplicate,
  isStoreNotFound,
  isStorePersistence,
  StoreDuplicateError,
  StoreNotFoundError,
  StorePersistenceError,
} from "@siteping/core";

// Building blocks — record construction, the shared filter pipeline, and
// the full collection-store engine
export type { CollectionStore, CollectionStoreBackend, FilterResult } from "@siteping/core";
export {
  applyFeedbackFilters,
  buildAnnotationRecord,
  buildFeedbackRecord,
  createCollectionStore,
} from "@siteping/core";
