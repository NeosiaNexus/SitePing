import { hasOwn, type Prettify } from "./type-utils.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** FAB anchor — bottom-corner placement supported by the widget. */
export type SitepingPosition = "bottom-right" | "bottom-left";

/** Visual theme — `auto` resolves to `light` or `dark` via system preference. */
export type SitepingTheme = "light" | "dark" | "auto";

/** Built-in UI locales shipped with the widget. */
export const BUILTIN_LOCALES = ["en", "fr", "de", "es", "it", "pt", "ru"] as const;
export type BuiltinLocale = (typeof BUILTIN_LOCALES)[number];

/**
 * Locale identifier accepted by the widget. Built-in locales are kept as
 * literal strings so editors auto-complete them, but arbitrary BCP-47 tags
 * are also accepted (custom dictionaries registered via `registerLocale`).
 */
export type SitepingLocale = BuiltinLocale | (string & {});

/** Reasons reported through `SitepingConfig.onSkip`. */
export type SitepingSkipReason = "production" | "mobile";

/** Per-channel + per-buffer-size diagnostics configuration. */
export interface DiagnosticsCaptureOptions {
  console?: boolean;
  network?: boolean;
  maxConsoleEntries?: number;
  maxNetworkEntries?: number;
}

/** Identity payload supplied by the host application — bypasses the modal. */
export interface SitepingIdentity {
  name: string;
  email: string;
}

/** Deep-link configuration — controls how a feedback id is read from the URL. */
export interface SitepingDeepLinkOptions {
  /** Query parameter name carrying the feedback id. Defaults to `"siteping"`. */
  param?: string;
}

/** Configuration options for the Siteping widget. */
export interface SitepingConfig {
  /** HTTP endpoint that receives feedbacks (e.g. '/api/siteping'). Required unless `store` is provided. */
  endpoint?: string | undefined;
  /** Required — project identifier used to scope feedbacks */
  projectName: string;
  /** Direct store for client-side mode. When set, bypasses HTTP and uses the store directly in the browser. */
  store?: SitepingStore | undefined;
  /** FAB position — defaults to 'bottom-right' */
  position?: SitepingPosition;
  /**
   * Show the "toggle markers visibility" item in the FAB radial menu.
   * Defaults to `true` (current behavior). Set to `false` to hide that
   * item entirely — useful for hosts that always want markers visible
   * (e.g. dedicated review tools) or that find the eye icon redundant
   * when no marker is on screen.
   *
   * Hiding the item also removes its keyboard navigation slot — the
   * remaining two items still respond to ArrowUp/ArrowDown/Home/End.
   * The marker-visibility state itself is unaffected; markers stay
   * visible (the previous default state) and `annotations:toggle` is
   * simply never emitted from the FAB.
   */
  showAnnotationsToggle?: boolean | undefined;
  /** Accent color for the widget UI — defaults to '#0066ff' */
  accentColor?: string;
  /**
   * Render the widget even when it would normally be skipped — this bypasses
   * BOTH the production-environment guard AND the mobile-viewport guard.
   * Defaults to false. Use it for dedicated review tools, staging environments,
   * or responsive testing where you always want the widget present.
   */
  forceShow?: boolean;
  /**
   * Minimum viewport width (px) at or above which the widget renders. Below it,
   * the widget is skipped and `onSkip("mobile")` fires. Defaults to `768`.
   *
   * Set lower (e.g. `0`) to allow narrow/mobile viewports, or use `forceShow`
   * to bypass the viewport check entirely.
   */
  minViewportWidth?: number | undefined;
  /** Enable debug logging of lifecycle events — defaults to false */
  debug?: boolean;
  /** Color theme — defaults to 'light' */
  theme?: SitepingTheme;
  /** UI locale — defaults to 'en'. Built-in: en, fr, de, es, it, pt (Brazilian), ru. Any other string falls back to English. */
  locale?: SitepingLocale | undefined;
  /**
   * Returns the current page scope for annotations and panel filtering.
   * Called on initial markers load and on `instance.refresh()`.
   *
   * Default: `{ url: window.location.pathname, urlPattern: null }` — annotations
   * are scoped strictly to the current pathname.
   *
   * Apps with parameterized routes (e.g. React Router) should return both the
   * concrete URL and the route template (e.g. `/orders/:orderId`) so the panel
   * can offer a "this type of page" filter that groups feedbacks by template.
   */
  getPageScope?: (() => PageScope) | undefined;
  /**
   * When true (default), the widget filters initial markers and panel results
   * by `feedback.url === scope.url`, so annotations created on one page never
   * leak to other pages — even if their CSS selector accidentally matches.
   * Set to `false` to revert to the legacy project-wide behavior.
   */
  scopeAnnotationsByUrl?: boolean | undefined;
  /**
   * Capture a JPEG screenshot of the annotated area on submit. Defaults to
   * `false` — opt-in because:
   *
   * - it adds runtime weight (~40 KB gzip dynamic chunk for html2canvas,
   *   loaded only on first capture),
   * - it embeds page content in the feedback (privacy/GDPR consideration —
   *   inform end users in your widget host UI when enabling).
   *
   * `html2canvas` ships as a regular dependency of `@siteping/widget` so the
   * dynamic import always resolves; you don't need to install anything extra.
   *
   * **Masking sensitive elements:** add `data-siteping-ignore="true"` to any
   * element you do NOT want captured (password fields, credit-card forms,
   * API tokens shown in the UI, etc.). The capture predicate skips matching
   * elements *and their descendants*. Do this BEFORE turning on screenshots
   * in production — once a feedback is saved, the screenshot is in your DB
   * (or object storage) regardless of what was on the page.
   */
  enableScreenshot?: boolean | undefined;
  /**
   * Capture the last few `console.*` calls and failed network requests
   * (HTTP >= 400 or network error) at the moment a feedback is submitted.
   *
   * Lets reviewers replay the technical context that led to the report —
   * stack traces, 500 responses, dead third-party scripts. Great for the
   * "the page just doesn't work" feedback that contains zero detail.
   *
   * - `true` — capture with defaults (50 console / 20 network entries).
   * - `false` (default) — no capture, no monkey-patching.
   * - object — per-channel toggles + custom buffer sizes.
   *
   * **Privacy considerations:** console messages may contain anything the
   * host page logs, including user data. Failed network requests record the
   * URL (with query string) but never the response body. Inform end users
   * before enabling in environments where they might log sensitive values.
   */
  captureDiagnostics?: boolean | DiagnosticsCaptureOptions | undefined;
  /** Called when the widget is skipped (production mode, mobile viewport) */
  onSkip?: (reason: SitepingSkipReason) => void;
  /**
   * Auto-focus a specific annotation when its ID appears in the URL query
   * string. Lets hosts deeplink directly into a feedback from external
   * systems (Zammad tickets, Slack notifications, dashboard rows).
   *
   * When enabled, the widget reads the configured query parameter from
   * `window.location.search` right after the initial markers load. If the
   * value matches a visible feedback ID, the widget scrolls the annotation
   * into view, pins its highlight, and pulses the marker — the same visual
   * affordance a marker click produces.
   *
   * - `false` / `undefined` (default): no URL parsing. Existing behavior
   *   unchanged, no host URL inspection.
   * - `true`: enabled with default query parameter name `siteping`.
   * - object: enabled with a custom parameter name. Use this to avoid
   *   clashes with host-app query keys.
   *
   * Only the initial load triggers focus. Subsequent URL changes (SPA
   * navigation, `history.pushState`, hash updates) are ignored —
   * deliberate, to avoid surprising re-scrolls during normal browsing.
   * Hosts that need re-focus on route change can call
   * `instance.focusFeedback(id)` explicitly.
   */
  deepLink?: boolean | SitepingDeepLinkOptions | undefined;
  /**
   * Automatically re-fetch feedbacks when the page changes during client-side
   * (SPA) navigation. Enabled by default.
   *
   * The widget is normally mounted once (singleton) inside a persistent layout
   * — e.g. a Next.js App Router `layout.tsx`, which does NOT remount on
   * client-side navigation. Without this, init runs a single time and both the
   * panel list and the page markers stay frozen on the page where the widget
   * first mounted. With it on, the widget patches the History API
   * (`pushState`/`replaceState`, which SPA routers call instead of triggering
   * `popstate`) and listens for `popstate`/`hashchange`, then re-fetches when
   * the scope key (`getPageScope().url` + template) actually changes.
   *
   * This re-fetches data only — it deliberately does NOT re-focus or re-scroll
   * to an annotation (deep-link focus stays initial-load only; see `deepLink`),
   * so normal browsing is never interrupted by a surprise scroll.
   *
   * - `true` (default) — watch navigation and re-fetch on route change.
   * - `false` — never touch the History API; hosts drive updates manually via
   *   `instance.refresh()`.
   */
  watchNavigation?: boolean | undefined;
  /**
   * Pre-fill author identity from the host application — typically the
   * currently signed-in user. When set, the widget uses these values
   * directly and never shows the identity modal, even on first feedback.
   *
   * Use case: SSO-integrated apps where the end user is already
   * authenticated by the host. Avoids the awkward "enter your name and
   * email" prompt for users the host already knows.
   *
   * When unset (default), the widget falls back to localStorage and shows
   * the modal on first feedback as before — existing behavior unchanged.
   *
   * Note: `config.identity` is **not** persisted to localStorage. It is
   * read at widget init time, not on every render. Hosts that need live
   * identity updates after sign-in/sign-out should currently remount the
   * widget (e.g. via a React `key` on the wrapping component). See
   * https://github.com/NeosiaNexus/SitePing/issues/85 for tracking a
   * future enhancement that propagates identity updates without a remount.
   */
  identity?: SitepingIdentity | undefined;

  // Events
  /** Called when the feedback panel is opened. */
  onOpen?: () => void;
  /** Called when the feedback panel is closed. */
  onClose?: () => void;
  onFeedbackSent?: (feedback: FeedbackResponse) => void;
  /**
   * Called when a feedback API call fails.
   *
   * The widget always emits a `SitepingError` (or a subclass:
   * `SitepingNetworkError`, `SitepingValidationError`, `SitepingAuthError`)
   * for HTTP-mode failures — host apps can `instanceof` to drive retry
   * logic, or read `error.code` (`"NETWORK" | "VALIDATION" | "AUTH" |
   * "SERVER"`) and `error.retryable`. The type is widened to `Error` so
   * direct-store callers can still surface raw errors without breaking the
   * contract.
   */
  onError?: (error: Error) => void;
  /** Called when the user starts drawing an annotation. */
  onAnnotationStart?: () => void;
  /** Called when the user finishes drawing an annotation. */
  onAnnotationEnd?: () => void;
}

/** Instance returned by initSiteping() with lifecycle methods. */
export interface SitepingInstance {
  /** Remove the widget from the DOM and clean up all listeners. */
  destroy: () => void;
  /** Open the panel programmatically */
  open: () => void;
  /** Close the panel */
  close: () => void;
  /** Reload feedbacks from server */
  refresh: () => void;
  /**
   * Scroll the matching annotation into view, pin its highlight, and
   * pulse its marker. Returns `true` when a visible feedback matched the
   * given ID, `false` otherwise (unknown ID, feedback on another URL when
   * `scopeAnnotationsByUrl` filtered it out, or markers not yet loaded).
   *
   * Counterpart to the `deepLink` config option for hosts that prefer to
   * drive focus from JS (e.g., a notification click handler) instead of a
   * URL query parameter.
   */
  focusFeedback: (feedbackId: string) => boolean;
  /** Subscribe to a public widget event */
  on: <K extends keyof SitepingPublicEvents>(event: K, listener: SitepingPublicEventListener<K>) => SitepingUnsubscribe;
  /** Unsubscribe from a public widget event */
  off: <K extends keyof SitepingPublicEvents>(event: K, listener: SitepingPublicEventListener<K>) => void;
}

/** Listener signature for a single `SitepingPublicEvents` key. */
export type SitepingPublicEventListener<K extends keyof SitepingPublicEvents> = (
  ...args: SitepingPublicEvents[K]
) => void;

/** Disposer returned by `SitepingInstance.on` — call once to detach the listener. */
export type SitepingUnsubscribe = () => void;

/** Events exposed to consumers via SitepingInstance.on / .off */
export interface SitepingPublicEvents {
  "feedback:sent": [FeedbackResponse];
  "feedback:deleted": [FeedbackResponse["id"]];
  "panel:open": [];
  "panel:close": [];
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

/** Single source of truth for feedback types — used by both TS types and Zod schemas. */
export const FEEDBACK_TYPES = ["question", "change", "bug", "other"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

/** Single source of truth for feedback statuses. */
export const FEEDBACK_STATUSES = ["open", "resolved"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

/**
 * Page scope returned by `SitepingConfig.getPageScope()`.
 *
 * - `url`: concrete page identifier — usually `window.location.pathname`,
 *   used as the strict scope for marker rendering.
 * - `urlPattern`: optional parameterized template (e.g. `/orders/:orderId`)
 *   used by the panel's "this type of page" filter to group feedbacks across
 *   instances of the same page kind.
 */
export interface PageScope {
  url: string;
  urlPattern: string | null;
}

// ---------------------------------------------------------------------------
// Abstract Store — adapter pattern
// ---------------------------------------------------------------------------

/** Input for creating a feedback record in the store. */
export interface FeedbackCreateInput {
  projectName: string;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  url: string;
  /**
   * Optional parameterized URL template (e.g. `/orders/:orderId`) for the page
   * where the feedback was created. Allows the panel to filter feedbacks by
   * "this type of page" across different instances. Null when the host did not
   * provide a `getPageScope` callback or the route has no template.
   */
  urlPattern?: string | null | undefined;
  viewport: string;
  userAgent: string;
  authorName: string;
  authorEmail: string;
  clientId: string;
  annotations: AnnotationCreateInput[];
  /**
   * Base64 JPEG `data:` URL captured by the widget at submit time.
   *
   * Adapters with a configured `ScreenshotStorage` are expected to upload
   * this and persist the returned URL on `FeedbackRecord.screenshotUrl`.
   * Adapters without storage may persist the data URL inline (memory /
   * localStorage / dev) — the widget then renders it directly.
   */
  screenshotDataUrl?: string | null | undefined;
  /**
   * Optional console + failed-network snapshot captured by the widget when
   * `SitepingConfig.captureDiagnostics` is enabled. Stored as JSON on
   * `FeedbackRecord.diagnostics` so reviewers can replay the context.
   */
  diagnostics?: DiagnosticsSnapshot | null | undefined;
}

/** Input for a single annotation when creating a feedback. */
export interface AnnotationCreateInput {
  cssSelector: string;
  xpath: string;
  textSnippet: string;
  elementTag: string;
  elementId?: string | undefined;
  textPrefix: string;
  textSuffix: string;
  fingerprint: string;
  neighborText: string;
  /**
   * Semantic anchor identifier from the closest ancestor's `data-feedback-anchor`
   * attribute. When set, this is the most stable re-anchoring signal because
   * hosts deliberately place these on layout/section roots that survive DOM
   * refactors and viewport changes. Null when no semantic ancestor exists.
   */
  anchorKey?: string | null | undefined;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  scrollX: number;
  scrollY: number;
  viewportW: number;
  viewportH: number;
  devicePixelRatio: number;
}

/** Query parameters for fetching feedbacks. */
export interface FeedbackQuery {
  projectName: string;
  type?: FeedbackType | undefined;
  status?: FeedbackStatus | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  /**
   * Filter to feedbacks created on this exact URL (path). Used by the panel's
   * "this page" filter and by the markers loader to keep page scopes isolated.
   */
  url?: string | undefined;
  /**
   * Filter to feedbacks created on this URL pattern (e.g. `/orders/:orderId`).
   * Used by the panel's "this type of page" filter to group feedbacks across
   * different concrete instances of the same template.
   */
  urlPattern?: string | undefined;
}

/** Update payload for patching a feedback. */
export interface FeedbackUpdateInput {
  status: FeedbackStatus;
  resolvedAt: Date | null;
}

/** A persisted feedback record returned by the store. */
export interface FeedbackRecord {
  id: string;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  projectName: string;
  url: string;
  /**
   * Parameterized URL template the feedback was created on.
   * Null for legacy records or hosts without `getPageScope`.
   */
  urlPattern: string | null;
  authorName: string;
  authorEmail: string;
  viewport: string;
  userAgent: string;
  clientId: string;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  annotations: AnnotationRecord[];
  /**
   * URL the widget renders as `<img src>`. Either an `https://...` from a
   * configured `ScreenshotStorage`, or a `data:image/jpeg;base64,...` URL
   * inline-persisted by adapters without storage. Null when no screenshot
   * was captured (legacy records, capture failed, or host disabled it).
   */
  screenshotUrl: string | null;
  /**
   * Console + failed-network snapshot captured at submit time. Null when
   * diagnostics weren't enabled on the widget side.
   */
  diagnostics: DiagnosticsSnapshot | null;
}

/** A persisted annotation record returned by the store. */
export interface AnnotationRecord {
  id: string;
  feedbackId: string;
  cssSelector: string;
  xpath: string;
  textSnippet: string;
  elementTag: string;
  elementId: string | null;
  textPrefix: string;
  textSuffix: string;
  fingerprint: string;
  neighborText: string;
  /**
   * Semantic anchor identifier from `data-feedback-anchor`. Null for legacy
   * annotations or those drawn outside any anchored region.
   */
  anchorKey: string | null;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  scrollX: number;
  scrollY: number;
  viewportW: number;
  viewportH: number;
  devicePixelRatio: number;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Store errors — throw these from adapter implementations
// ---------------------------------------------------------------------------

/**
 * Thrown when a record is not found during update or delete.
 *
 * Handlers translate this to HTTP 404. Adapters MUST throw this (not
 * ORM-specific errors) so the handler layer remains ORM-agnostic.
 */
export class StoreNotFoundError extends Error {
  readonly code = "STORE_NOT_FOUND" as const;
  constructor(message = "Record not found") {
    super(message);
    this.name = "StoreNotFoundError";
  }
}

/**
 * Thrown when a unique constraint is violated (e.g. duplicate `clientId`).
 *
 * Handlers use this to return the existing record instead of failing.
 */
export class StoreDuplicateError extends Error {
  readonly code = "STORE_DUPLICATE" as const;
  constructor(message = "Duplicate record") {
    super(message);
    this.name = "StoreDuplicateError";
  }
}

/**
 * Thrown when a store accepts a mutation but cannot persist it — e.g.
 * `localStorage` is full (QuotaExceededError). Adapters MUST throw this rather
 * than swallow the failure, so callers learn the write was lost instead of
 * seeing a phantom success.
 */
export class StorePersistenceError extends Error {
  readonly code = "STORE_PERSISTENCE" as const;
  constructor(message = "Failed to persist store mutation", options?: ErrorOptions) {
    super(message, options);
    this.name = "StorePersistenceError";
  }
}

/** Shape of any ORM error that carries a Prisma-style `code` field. */
type CodedError<C extends string = string> = { code: C };

function hasErrorCode<C extends string>(error: unknown, code: C): error is CodedError<C> {
  return hasOwn(error, "code") && (error as { code: unknown }).code === code;
}

/** Type guard — works for `StoreNotFoundError` and ORM-specific equivalents (e.g. Prisma P2025). */
export function isStoreNotFound(error: unknown): error is StoreNotFoundError | CodedError<"P2025"> {
  if (error instanceof StoreNotFoundError) return true;
  // Backwards compat: Prisma's P2025
  return hasErrorCode(error, "P2025");
}

/** Type guard — works for `StoreDuplicateError` and ORM-specific equivalents (e.g. Prisma P2002). */
export function isStoreDuplicate(error: unknown): error is StoreDuplicateError | CodedError<"P2002"> {
  if (error instanceof StoreDuplicateError) return true;
  // Backwards compat: Prisma's P2002
  return hasErrorCode(error, "P2002");
}

/**
 * Type guard for `StorePersistenceError`. Matches on the stable `code` field
 * in addition to `instanceof`: every consumer package bundles its own copy of
 * core (tsup `noExternal`), so an instance thrown by one package fails an
 * `instanceof` check against another package's class identity.
 */
export function isStorePersistence(error: unknown): error is StorePersistenceError | CodedError<"STORE_PERSISTENCE"> {
  if (error instanceof StorePersistenceError) return true;
  return hasErrorCode(error, "STORE_PERSISTENCE");
}

// ---------------------------------------------------------------------------
// Store helpers — shared conversion logic for adapters
// ---------------------------------------------------------------------------

/** Flatten a widget `AnnotationPayload` (nested anchor + rect) into a flat `AnnotationCreateInput`. */
export function flattenAnnotation(ann: AnnotationPayload): Prettify<AnnotationCreateInput> {
  return {
    cssSelector: ann.anchor.cssSelector,
    xpath: ann.anchor.xpath,
    textSnippet: ann.anchor.textSnippet,
    elementTag: ann.anchor.elementTag,
    elementId: ann.anchor.elementId,
    textPrefix: ann.anchor.textPrefix,
    textSuffix: ann.anchor.textSuffix,
    fingerprint: ann.anchor.fingerprint,
    neighborText: ann.anchor.neighborText,
    anchorKey: ann.anchor.anchorKey ?? null,
    xPct: ann.rect.xPct,
    yPct: ann.rect.yPct,
    wPct: ann.rect.wPct,
    hPct: ann.rect.hPct,
    scrollX: ann.scrollX,
    scrollY: ann.scrollY,
    viewportW: ann.viewportW,
    viewportH: ann.viewportH,
    devicePixelRatio: ann.devicePixelRatio,
  };
}

// ---------------------------------------------------------------------------
// Abstract Store — adapter pattern
// ---------------------------------------------------------------------------

/** Paginated result returned by `SitepingStore.getFeedbacks`. */
export interface FeedbackPage {
  feedbacks: FeedbackRecord[];
  total: number;
}

/**
 * Abstract storage interface for Siteping.
 *
 * Any adapter (Prisma, Drizzle, raw SQL, localStorage, etc.) implements this
 * interface. The HTTP handler and widget `StoreClient` operate against
 * `SitepingStore`, decoupled from the storage backend.
 *
 * ## Error contract
 *
 * - **`updateFeedback` / `deleteFeedback`**: throw `StoreNotFoundError` when
 *   the record does not exist.
 * - **`createFeedback`**: either return the existing record on duplicate
 *   `clientId` (idempotent) or throw `StoreDuplicateError`. The handler
 *   handles both patterns.
 * - **All mutations**: when a write is accepted but cannot be persisted
 *   (e.g. storage quota), throw `StorePersistenceError` instead of reporting
 *   a phantom success. Detect it with `isStorePersistence`.
 * - Other methods should not throw on empty results — return empty arrays or `null`.
 */
export interface SitepingStore {
  /** Create a feedback with its annotations. Idempotent on `clientId` — return existing record on duplicate, or throw `StoreDuplicateError`. Throws `StorePersistenceError` when the write cannot be persisted. */
  createFeedback(data: FeedbackCreateInput): Promise<FeedbackRecord>;
  /** Paginated query with optional filters. Returns empty array (not error) when no results. */
  getFeedbacks(query: FeedbackQuery): Promise<FeedbackPage>;
  /** Lookup by client-generated UUID. Returns `null` (not error) when not found. */
  findByClientId(clientId: string): Promise<FeedbackRecord | null>;
  /** Update status/resolvedAt. Throws `StoreNotFoundError` if `id` does not exist, `StorePersistenceError` when the write cannot be persisted. */
  updateFeedback(id: string, data: FeedbackUpdateInput): Promise<FeedbackRecord>;
  /** Delete a single record. Throws `StoreNotFoundError` if `id` does not exist, `StorePersistenceError` when the write cannot be persisted. */
  deleteFeedback(id: string): Promise<void>;
  /** Bulk delete all feedbacks for a project. No-op (not error) if none exist. Throws `StorePersistenceError` when the write cannot be persisted. */
  deleteAllFeedbacks(projectName: string): Promise<void>;
}

/** Payload sent from the widget to the server when submitting feedback. */
export interface FeedbackPayload {
  projectName: string;
  type: FeedbackType;
  message: string;
  url: string;
  /**
   * Parameterized URL template (e.g. `/orders/:orderId`) supplied by
   * `SitepingConfig.getPageScope()`. Null when the host did not provide one.
   */
  urlPattern?: string | null | undefined;
  viewport: string;
  userAgent: string;
  authorName: string;
  authorEmail: string;
  annotations: AnnotationPayload[];
  /** Client-generated UUID for deduplication */
  clientId: string;
  /**
   * Base64 JPEG `data:` URL of the annotated area. Captured by the widget
   * when `enableScreenshot: true` is set in `SitepingConfig`. Null when
   * disabled or when capture failed silently.
   */
  screenshotDataUrl?: string | null | undefined;
  /**
   * Snapshot of the last few console messages and failed network requests
   * captured at submit time when `captureDiagnostics` is enabled.
   */
  diagnostics?: DiagnosticsSnapshot | null | undefined;
}

/** Severity levels persisted in `ConsoleDiagnosticEntry`. */
export type ConsoleDiagnosticLevel = "log" | "info" | "warn" | "error";

/** A single console entry captured by `ConsoleBuffer`. */
export interface ConsoleDiagnosticEntry {
  level: ConsoleDiagnosticLevel;
  /** ISO 8601 timestamp captured at log time. */
  timestamp: string;
  /** Best-effort string representation of the original console args. */
  message: string;
}

/** A single failed network request captured by `NetworkBuffer`. */
export interface NetworkDiagnosticEntry {
  url: string;
  method: string;
  /** HTTP status; 0 when the request never reached the server. */
  status: number;
  /** End-to-end duration in ms. */
  durationMs: number;
  /** ISO 8601 timestamp at the moment the request was initiated. */
  timestamp: string;
}

/**
 * Diagnostics captured by the widget when `captureDiagnostics` is enabled.
 *
 * Both arrays are bounded (default: 50 console / 20 network). Adapters that
 * support diagnostics should persist this as a JSON blob alongside the
 * feedback so reviewers can replay the context that led to the report.
 */
export interface DiagnosticsSnapshot {
  console: ConsoleDiagnosticEntry[];
  network: NetworkDiagnosticEntry[];
}

// ---------------------------------------------------------------------------
// Annotation — multi-selector anchoring (Hypothesis / W3C Web Annotation)
// ---------------------------------------------------------------------------

/** DOM anchoring data for re-attaching annotations to page elements. */
export interface AnchorData {
  /** CSS selector generated by @medv/finder — primary anchor */
  cssSelector: string;
  /** XPath — fallback 1 */
  xpath: string;
  /** First ~120 chars of element innerText — empty string if none */
  textSnippet: string;
  /** Tag name for validation (e.g. "DIV", "SECTION") */
  elementTag: string;
  /** Element id attribute if available — most stable */
  elementId?: string | undefined;
  /** ~32 chars of text before this element in document flow (disambiguation) */
  textPrefix: string;
  /** ~32 chars of text after this element in document flow (disambiguation) */
  textSuffix: string;
  /** Structural fingerprint: "childCount:siblingIdx:attrHash" */
  fingerprint: string;
  /** Text content of adjacent sibling elements (context) */
  neighborText: string;
  /**
   * Semantic anchor identifier from the closest ancestor's `data-feedback-anchor`
   * attribute. When set, this is the highest-priority re-anchoring signal —
   * hosts deliberately place these on layout/section roots that survive
   * viewport changes and DOM refactors.
   */
  anchorKey?: string | null | undefined;
}

/** Drawn rectangle coordinates as percentages relative to the anchor element. */
export interface RectData {
  /** X offset as fraction of anchor element width — must be in range [0, 1] */
  xPct: number;
  /** Y offset as fraction of anchor element height — must be in range [0, 1] */
  yPct: number;
  /** Width as fraction of anchor element width — must be in range [0, 1] */
  wPct: number;
  /** Height as fraction of anchor element height — must be in range [0, 1] */
  hPct: number;
}

/** Annotation data sent as part of a feedback submission. */
export interface AnnotationPayload {
  anchor: AnchorData;
  rect: RectData;
  scrollX: number;
  scrollY: number;
  viewportW: number;
  viewportH: number;
  devicePixelRatio: number;
}

// ---------------------------------------------------------------------------
// API responses
// ---------------------------------------------------------------------------

/** Feedback record as returned by the API (dates serialized as strings). */
export interface FeedbackResponse {
  id: string;
  projectName: string;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  url: string;
  /** Parameterized URL template the feedback was created on, or null. */
  urlPattern: string | null;
  viewport: string;
  userAgent: string;
  authorName: string;
  authorEmail: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  annotations: AnnotationResponse[];
  /** Screenshot URL (data: or http:) — see `FeedbackRecord.screenshotUrl`. */
  screenshotUrl: string | null;
  /** Console + failed-network snapshot, or null when diagnostics weren't captured. */
  diagnostics: DiagnosticsSnapshot | null;
}

/** Annotation record as returned by the API. */
export interface AnnotationResponse {
  id: string;
  feedbackId: string;
  cssSelector: string;
  xpath: string;
  textSnippet: string;
  elementTag: string;
  elementId: string | null;
  textPrefix: string;
  textSuffix: string;
  fingerprint: string;
  neighborText: string;
  /** Semantic anchor identifier from `data-feedback-anchor`, or null. */
  anchorKey: string | null;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  scrollX: number;
  scrollY: number;
  viewportW: number;
  viewportH: number;
  devicePixelRatio: number;
  createdAt: string;
}

/** Paginated `FeedbackResponse` shape returned by the API. */
export interface FeedbackResponseList {
  feedbacks: FeedbackResponse[];
  total: number;
}
