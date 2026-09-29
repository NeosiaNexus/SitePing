import {
  type CommentCreateInput,
  type CommentRecord,
  clampPagination,
  type FeedbackCreateInput,
  type FeedbackPage,
  type FeedbackPayload,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackStatus,
  type FeedbackType,
  type FeedbackUpdateInput,
  hasOwn,
  isStoreDuplicate,
  isStoreNotFound,
  isUnreachableOffset,
  MAX_COMMENTS_PER_FEEDBACK,
  SCREENSHOT_DELETE_CONCURRENCY,
  type ScreenshotStorage,
  type SitepingStore,
  StoreDuplicateError,
  StoreLimitError,
  StoreNotFoundError,
  screenshotMimeType,
  settleWithConcurrencyLimit,
} from "@siteping/core";
import {
  createSitepingHandler as createServerHandler,
  type SitepingAccessHandlerOptions,
  type SitepingApiKeyHandlerOptions,
  type SitepingHandler,
  type SitepingPrincipal,
} from "@siteping/server";

export type {
  CommentCreateInput,
  FeedbackCreateInput,
  FeedbackRecord,
  ScreenshotStorage,
  SitepingStore,
} from "@siteping/core";
export {
  flattenAnnotation,
  isStorePersistence,
  StoreDuplicateError,
  StoreLimitError,
  StoreNotFoundError,
  StorePersistenceError,
} from "@siteping/core";
export type { FeedbackDeleteInput, FeedbackPatchInput, GetQueryInput } from "@siteping/server";

/**
 * @deprecated The create wire shape is core's `FeedbackPayload` — import
 * that instead. This alias is kept for one release cycle.
 */
export type FeedbackCreateSchemaInput = FeedbackPayload;
// The server's option types, so a strict linker (pnpm, Bun's isolated
// installs) never needs @siteping/server as a direct dependency to type them.
export type {
  DiscordWebhookPayload,
  GenericWebhookPayload,
  SitepingAccessControl,
  SitepingAction,
  SitepingAuthorizationContext,
  SitepingDeletionTarget,
  SitepingHandler,
  SitepingHandlerBaseOptions,
  SitepingHttpMethod,
  SitepingLifecycleHooks,
  SitepingLogger,
  SitepingPrincipal,
  SitepingRequestContext,
  SlackWebhookPayload,
  WebhookConfig,
  WebhookPayloadMap,
  WebhookType,
} from "@siteping/server";
export { dispatchWebhook, dispatchWebhooks } from "@siteping/server";

// ---------------------------------------------------------------------------
// Minimal PrismaClient shape expected by this adapter
// ---------------------------------------------------------------------------

/**
 * Structural type for a Prisma model delegate (`prisma.sitepingFeedback`).
 *
 * Arguments are kept `unknown` so any Prisma version's generated client
 * satisfies the constraint; the adapter assembles type-safe payloads
 * internally before forwarding them.
 *
 * Members use **method syntax** (`create(args)`) rather than function-property
 * syntax (`create: (args) => ...`) on purpose: under `strictFunctionTypes`,
 * function-property parameters are checked *contravariantly*, so a real
 * generated delegate — whose `create(args: SpecificArgs)` takes a type narrower
 * than `unknown` — would fail to assign to `PrismaModelDelegate`. Method
 * signatures are checked *bivariantly* on parameters, which is exactly what we
 * want for structurally matching a third-party generated client (#99).
 */
export interface PrismaModelDelegate {
  create(args: unknown): Promise<unknown>;
  findMany(args: unknown): Promise<unknown[]>;
  findUnique(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
  deleteMany(args: unknown): Promise<unknown>;
  count(args: unknown): Promise<number>;
}

/**
 * Compile-time regression guard for #99 — intentionally in `src/` because the
 * package's `check` script (`tsc --noEmit`) only type-checks `src/`, and
 * vitest transpiles tests without type-checking.
 *
 * `GeneratedDelegateProbe` mirrors a real generated client: every method
 * declares args NARROWER than `unknown`. With method syntax the conditional
 * below resolves to `true`; if `PrismaModelDelegate` ever regresses to
 * function-property syntax (contravariant under `strictFunctionTypes`), it
 * resolves to `false` and the `AssertTrue` constraint fails the build.
 */
type AssertTrue<T extends true> = T;
interface GeneratedDelegateProbe {
  create(args: { data: unknown; include?: unknown }): Promise<{ id: string }>;
  findMany(args: { where?: unknown; include?: unknown }): Promise<{ id: string }[]>;
  findUnique(args: { where: unknown }): Promise<{ id: string } | null>;
  update(args: { where: unknown; data: unknown }): Promise<{ id: string }>;
  delete(args: { where: unknown }): Promise<{ id: string }>;
  deleteMany(args: { where?: unknown }): Promise<{ count: number }>;
  count(args: { where?: unknown }): Promise<number>;
}
type _AssertDelegateBivariance = AssertTrue<GeneratedDelegateProbe extends PrismaModelDelegate ? true : false>;

/**
 * Minimal Prisma client shape expected by this adapter.
 * Consumers pass their own `PrismaClient` instance at runtime — this interface
 * defines the subset of methods the adapter actually uses, so it can be
 * referenced in handler option types without importing `@prisma/client`.
 */
export interface SitepingPrismaClient {
  sitepingFeedback: PrismaModelDelegate;
  /**
   * Generated once the schema declares the `SitepingComment` model
   * (`npx @siteping/cli sync`). Optional, so a client generated from an older
   * schema keeps type-checking: `PrismaStore` then has no threads and the
   * handler answers comment writes with 501.
   */
  sitepingComment?: PrismaModelDelegate | undefined;
}

// ---------------------------------------------------------------------------
// PrismaStore — SitepingStore implementation backed by Prisma
// ---------------------------------------------------------------------------

const INCLUDE_ANNOTATIONS = { annotations: true } as const;
/**
 * Read shape once the client has the `SitepingComment` model: the thread
 * oldest first, `id` breaking `createdAt` ties (SQL leaves them unordered).
 */
const INCLUDE_ANNOTATIONS_AND_COMMENTS = {
  annotations: true,
  comments: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
} as const;

/**
 * Prisma datasource providers whose generated client exposes `mode?: QueryMode`
 * on string filters. Verified against Prisma 6.x by inspecting the generated
 * `StringFilter` type per provider:
 *   - postgresql, mongodb, cockroachdb → emit `mode?: QueryMode`
 *   - mysql, sqlite, sqlserver → no `mode` field; passing it raises
 *     `PrismaClientValidationError: Unknown argument 'mode'` at runtime.
 * `postgres` is kept as a defensive alias in case `_activeProvider` ever
 * surfaces the legacy spelling.
 */
const PROVIDERS_SUPPORTING_INSENSITIVE_MODE: ReadonlySet<string> = new Set([
  "postgresql",
  "postgres",
  "mongodb",
  "cockroachdb",
]);

/** Internal shape used to probe `PrismaClient` for the active provider. */
interface PrismaClientProbe {
  _activeProvider?: unknown;
  _engineConfig?: { activeProvider?: unknown };
  _engine?: { config?: { activeProvider?: unknown } };
}

/**
 * Best-effort detection of the active Prisma provider for a runtime client.
 *
 * The provider is not part of any public API on `PrismaClient`. We probe a
 * few known internal locations across Prisma 5.x and 6.x and fall back to
 * `null` (treated as "unknown — assume default Postgres-style behaviour")
 * when none match.
 */
function detectActiveProvider(prisma: unknown): string | null {
  try {
    const candidate = prisma as PrismaClientProbe | null | undefined;
    const fromActive = candidate?._activeProvider;
    if (typeof fromActive === "string") return fromActive;
    const fromEngineConfig = candidate?._engineConfig?.activeProvider;
    if (typeof fromEngineConfig === "string") return fromEngineConfig;
    const fromEngine = candidate?._engine?.config?.activeProvider;
    if (typeof fromEngine === "string") return fromEngine;
    return null;
  } catch {
    return null;
  }
}

/**
 * Options accepted by `PrismaStore`.
 */
export interface PrismaStoreOptions {
  /**
   * When `true`, the `?search=` filter is built with `mode: "insensitive"`
   * (case-insensitive across all letters, including non-ASCII).
   *
   * When `false`, the filter is built without `mode` — uses each database's
   * default `LIKE` semantics (case-insensitive ASCII on SQLite by default;
   * case-sensitive on PostgreSQL with the standard `LIKE` operator;
   * collation-driven on MySQL and SQL Server).
   *
   * When omitted, the value is auto-detected from the Prisma client's active
   * provider: providers whose generated client exposes `mode?: QueryMode`
   * (`postgresql`, `mongodb`, `cockroachdb`) get `true`; others (`mysql`,
   * `sqlite`, `sqlserver`) get `false`. Unknown / undetectable providers
   * default to `false` — `contains` without `mode` works on every provider;
   * `mode: "insensitive"` throws on MySQL/SQLite/SQL Server, so the safer
   * default is to omit it.
   */
  caseInsensitiveSearch?: boolean;
  /**
   * Optional storage backend for screenshots. Without it, the data URL is
   * persisted inline on `Feedback.screenshotUrl` with a one-time warn.
   */
  screenshotStorage?: ScreenshotStorage | undefined;
}

/** `where` filter shape passed to `findMany` / `count`. Each field maps to a typed Prisma filter. */
interface FeedbackWhereInput {
  projectName: string;
  type?: FeedbackType;
  // Exact match (`status`) or bucket match (`{ in: [...] }` from `statuses`).
  status?: FeedbackStatus | { in: FeedbackStatus[] };
  url?: string;
  urlPattern?: string;
  message?: { contains: string; mode?: "insensitive" };
}

/**
 * Translate Prisma's coded errors into the store contract's classes (the
 * handler layer and the dashboard are ORM-agnostic and only know these).
 * Anything else — connection failures, validation errors — passes through.
 */
function toStoreError(error: unknown): unknown {
  if (error instanceof StoreNotFoundError || error instanceof StoreDuplicateError) return error;
  if (isStoreNotFound(error)) return new StoreNotFoundError(undefined, { cause: error });
  if (isStoreDuplicate(error)) return new StoreDuplicateError(undefined, { cause: error });
  return error;
}

/**
 * Whether a persisted `screenshotUrl` points at an object a `ScreenshotStorage`
 * owns — inline `data:` URLs were never uploaded, so there is nothing to delete.
 */
function isStoredScreenshotUrl(url: unknown): url is string {
  return typeof url === "string" && url.length > 0 && !url.startsWith("data:");
}

/**
 * Prisma-backed implementation of `SitepingStore`.
 *
 * Wraps a PrismaClient to satisfy the abstract store interface.
 *
 * Pass `screenshotStorage` to externalise screenshots (S3, R2, B2, …) — the
 * widget's data URL is uploaded and only the returned URL is persisted, so
 * the database stays small. Without `screenshotStorage`, the data URL is
 * persisted inline (logged once on first use as a heads-up).
 */
export class PrismaStore implements SitepingStore {
  /** @internal */
  private prisma: SitepingPrismaClient;
  private readonly screenshotStorage: ScreenshotStorage | undefined;
  /** Module-level flag would leak across PrismaStore instances in tests; use per-instance. */
  private inlineFallbackWarned = false;
  /** @internal */
  private caseInsensitiveSearch: boolean;
  /** Read shape of every feedback query — with the thread once the client has the comment model. */
  private readonly include: typeof INCLUDE_ANNOTATIONS | typeof INCLUDE_ANNOTATIONS_AND_COMMENTS;

  /**
   * Add a comment to a feedback's thread — defined only when the client has
   * the `SitepingComment` delegate, unless a subclass defines its own. Without
   * it the store has no threads, and the handler answers comment writes with
   * 501 instead of every post failing with a Prisma error. Declared, not a
   * field: a field would set it on every instance, hiding a subclass's method.
   */
  declare readonly addComment?: (feedbackId: string, data: CommentCreateInput) => Promise<CommentRecord>;
  /** Delete one comment from a feedback's thread — defined under the same condition as {@link addComment}. */
  declare readonly deleteComment?: (feedbackId: string, commentId: string) => Promise<void>;

  constructor(prisma: SitepingPrismaClient, options: PrismaStoreOptions = {}) {
    this.prisma = prisma;
    this.screenshotStorage = options.screenshotStorage;
    const comments = prisma.sitepingComment;
    this.include = comments ? INCLUDE_ANNOTATIONS_AND_COMMENTS : INCLUDE_ANNOTATIONS;
    if (comments) {
      this.addComment ??= (feedbackId, data) => this.insertComment(comments, feedbackId, data);
      this.deleteComment ??= (feedbackId, commentId) => this.removeComment(comments, feedbackId, commentId);
    }
    if (typeof options.caseInsensitiveSearch === "boolean") {
      this.caseInsensitiveSearch = options.caseInsensitiveSearch;
    } else {
      const provider = detectActiveProvider(prisma);
      // When the provider can't be detected, default to `false`: `contains`
      // without `mode` works on every Prisma provider; `mode: "insensitive"`
      // throws on MySQL/SQLite/SQL Server. Trades non-ASCII case-insensitivity
      // on undetectable Postgres clients (rare — _activeProvider is set on
      // every real Prisma 5/6 client) for not crashing on the others.
      this.caseInsensitiveSearch = provider !== null && PROVIDERS_SUPPORTING_INSENSITIVE_MODE.has(provider);
    }
  }

  async createFeedback(data: FeedbackCreateInput): Promise<FeedbackRecord> {
    const screenshotUrl = await this.persistScreenshot(data.screenshotDataUrl, data.clientId);

    try {
      return await this.insertFeedback(data, screenshotUrl);
    } catch (error) {
      if (isStoreDuplicate(error)) await this.discardUnreferencedUpload(screenshotUrl, data.clientId);
      throw toStoreError(error);
    }
  }

  /**
   * Drop the screenshot uploaded by a replay of a stored clientId — unless the
   * stored row references it. Uploads are keyed on clientId, so with a
   * deterministic key (`feedback/${feedbackId}.jpg`) the replay wrote to the
   * very object the existing row points at: deleting it would strip the
   * surviving feedback of its screenshot. If the lookup itself fails the
   * object is kept — an orphan beats data loss. Other insert failures never
   * get here: with such a key, a retry on another instance may have rewritten
   * the object and not yet inserted the row that will point at it.
   */
  private async discardUnreferencedUpload(url: string | null, clientId: string): Promise<void> {
    if (!isStoredScreenshotUrl(url) || !this.screenshotStorage?.delete) return;
    let existing: { screenshotUrl: string | null } | null;
    try {
      existing = (await this.prisma.sitepingFeedback.findUnique({
        where: { clientId },
        select: { screenshotUrl: true },
      })) as { screenshotUrl: string | null } | null;
    } catch {
      return;
    }
    if (existing?.screenshotUrl === url) return;
    await this.discardScreenshots([url]);
  }

  private async insertFeedback(data: FeedbackCreateInput, screenshotUrl: string | null): Promise<FeedbackRecord> {
    return (await this.prisma.sitepingFeedback.create({
      data: {
        projectName: data.projectName,
        type: data.type,
        message: data.message,
        status: data.status,
        url: data.url,
        urlPattern: data.urlPattern ?? null,
        screenshotUrl,
        // Persisted as JSON when the model has a `screenshotRegion Json?`
        // column — same omit-when-null contract as `diagnostics` below, so
        // hosts that haven't run `npx siteping sync` keep working.
        ...(data.screenshotRegion ? { screenshotRegion: data.screenshotRegion } : {}),
        // Persisted as JSON when the model has a `diagnostics Json?` column.
        // Hosts that haven't run `npx siteping sync` keep their schema as-is
        // and Prisma will throw if we pass an unknown column, so omit the
        // key entirely when diagnostics is null.
        ...(data.diagnostics ? { diagnostics: data.diagnostics } : {}),
        viewport: data.viewport,
        userAgent: data.userAgent,
        authorName: data.authorName,
        authorEmail: data.authorEmail,
        clientId: data.clientId,
        annotations: {
          create: data.annotations.map((ann) => ({
            cssSelector: ann.cssSelector,
            xpath: ann.xpath,
            textSnippet: ann.textSnippet,
            elementTag: ann.elementTag,
            elementId: ann.elementId,
            textPrefix: ann.textPrefix,
            textSuffix: ann.textSuffix,
            fingerprint: ann.fingerprint,
            neighborText: ann.neighborText,
            anchorKey: ann.anchorKey ?? null,
            xPct: ann.xPct,
            yPct: ann.yPct,
            wPct: ann.wPct,
            hPct: ann.hPct,
            scrollX: ann.scrollX,
            scrollY: ann.scrollY,
            viewportW: ann.viewportW,
            viewportH: ann.viewportH,
            devicePixelRatio: ann.devicePixelRatio,
          })),
        },
      },
      include: this.include,
    })) as FeedbackRecord;
  }

  /**
   * Resolve the value to persist on `Feedback.screenshotUrl`.
   *
   * - No data URL → null
   * - Storage configured → upload, return remote URL. Upload failures
   *   persist `null` (drop the screenshot) rather than silently inlining
   *   the data URL — an inline fallback would bloat Postgres unnoticed
   *   during a multi-minute storage outage. The feedback message itself is
   *   preserved; only the screenshot is missing, and the warn surfaces it.
   * - No storage → inline base64, with a one-time warn so prod operators
   *   notice the footgun.
   *
   * Operators who prefer the legacy inline-on-failure behaviour can wrap
   * their `ScreenshotStorage.upload` with their own catch + return the
   * data URL — the adapter treats whatever the storage returns as final.
   */
  private async persistScreenshot(dataUrl: string | null | undefined, clientId: string): Promise<string | null> {
    if (!dataUrl) return null;

    if (this.screenshotStorage) {
      try {
        // Use clientId as the upload-time identifier — the feedback row's
        // own id isn't created yet and clientId is unique + stable.
        // NOTE: clientId is client-supplied; storage implementations that
        // map it to a filesystem path MUST sanitize against path traversal.
        const { url } = await this.screenshotStorage.upload(dataUrl, {
          feedbackId: clientId,
          mimeType: screenshotMimeType(dataUrl),
        });
        return url;
      } catch (err) {
        console.warn(
          "[siteping] screenshotStorage.upload failed — feedback will be saved without a screenshot. Wrap your storage's upload to handle this differently:",
          err,
        );
        return null;
      }
    }

    if (!this.inlineFallbackWarned) {
      this.inlineFallbackWarned = true;
      console.warn(
        "[siteping] enableScreenshot is on but no `screenshotStorage` is configured — base64 data URLs will be persisted inline on Feedback.screenshotUrl. Configure a ScreenshotStorage (S3/R2/…) for production.",
      );
    }
    return dataUrl;
  }

  /**
   * Best-effort cleanup of stored screenshots through `ScreenshotStorage.delete`
   * — the hook the interface documents for feedback deletion. Failures are
   * logged and swallowed: an orphaned object is preferable to a delete that
   * reports failure after the row is already gone. Inline `data:` URLs and
   * stores without a `delete` hook are skipped.
   *
   * Deletes run through a pool of at most {@link SCREENSHOT_DELETE_CONCURRENCY}
   * concurrent calls: a project delete may free thousands of objects, and one
   * socket each at once would exhaust the file descriptors of a serverless
   * function, orphaning most of them.
   */
  private async discardScreenshots(urls: ReadonlyArray<unknown>): Promise<void> {
    const remove = this.screenshotStorage?.delete?.bind(this.screenshotStorage);
    if (!remove) return;
    const stored = urls.filter(isStoredScreenshotUrl);
    if (stored.length === 0) return;

    const results = await settleWithConcurrencyLimit(stored, SCREENSHOT_DELETE_CONCURRENCY, async (url) => remove(url));
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.warn(
          `[siteping] screenshotStorage.delete failed for ${stored[index]} — object left in place:`,
          result.reason,
        );
      }
    });
  }

  /** URLs of the stored screenshots in `projectName` — only fetched when a `delete` hook can use them. */
  private async storedScreenshotUrls(projectName: string): Promise<string[]> {
    if (!this.screenshotStorage?.delete) return [];
    const rows = (await this.prisma.sitepingFeedback.findMany({
      where: { projectName, screenshotUrl: { not: null } },
      select: { screenshotUrl: true },
    })) as ReadonlyArray<{ screenshotUrl: string | null }>;
    return rows.map((row) => row.screenshotUrl).filter(isStoredScreenshotUrl);
  }

  async findByClientId(clientId: string): Promise<FeedbackRecord | null> {
    return (await this.prisma.sitepingFeedback.findUnique({
      where: { clientId },
      include: this.include,
    })) as FeedbackRecord | null;
  }

  async getFeedbacks(query: FeedbackQuery): Promise<FeedbackPage> {
    const { projectName, type, status, statuses, search, url, urlPattern } = query;
    // Same clamp as the in-memory pipeline: the HTTP schema already bounds
    // page/limit, but direct callers reach the store without it.
    const { limit, skip } = clampPagination(query);

    const where: FeedbackWhereInput = { projectName };
    if (type) where.type = type;
    // Bucket filter (`statuses`) wins over the exact `status` filter; an empty
    // array is treated as absent so no status constraint is applied.
    if (statuses && statuses.length > 0) {
      where.status = { in: [...statuses] };
    } else if (status) {
      where.status = status;
    }
    if (url) where.url = url;
    if (urlPattern) where.urlPattern = urlPattern;
    if (search) {
      where.message = this.caseInsensitiveSearch ? { contains: search, mode: "insensitive" } : { contains: search };
    }

    // A huge `page` from a direct caller yields a `skip` Prisma rejects
    // (non-integer or past 64 bits): answer the empty page the in-memory
    // stores return, with the real total, without issuing `findMany`.
    if (isUnreachableOffset(skip)) {
      return { feedbacks: [], total: await this.prisma.sitepingFeedback.count({ where }) };
    }

    const [feedbacks, total] = await Promise.all([
      this.prisma.sitepingFeedback.findMany({
        where,
        include: this.include,
        // `id` breaks createdAt ties: SQL leaves equal rows unordered, so
        // OFFSET pages could otherwise repeat one row and skip another.
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: limit,
      }),
      this.prisma.sitepingFeedback.count({ where }),
    ]);

    return { feedbacks: feedbacks as FeedbackRecord[], total };
  }

  async updateFeedback(id: string, data: FeedbackUpdateInput): Promise<FeedbackRecord> {
    try {
      return (await this.prisma.sitepingFeedback.update({
        where: { id },
        data: {
          status: data.status,
          resolvedAt: data.resolvedAt,
        },
        include: this.include,
      })) as FeedbackRecord;
    } catch (error) {
      throw toStoreError(error);
    }
  }

  /**
   * Insert a comment. A replayed `clientId` returns the stored comment, looked
   * up first so a replay never runs into the thread cap; a concurrent replay
   * that wins the insert race surfaces as P2002 and is read back the same
   * way. The `connect` turns a missing feedback into Prisma's P2025 on every
   * provider, rather than each database's own foreign-key error. The cap is a
   * count before the insert, so posts racing for the last free slot may
   * overshoot it.
   */
  private async insertComment(
    comments: PrismaModelDelegate,
    feedbackId: string,
    data: CommentCreateInput,
  ): Promise<CommentRecord> {
    const replayed = await this.findComment(comments, data.clientId);
    if (replayed) return replayed;
    if ((await comments.count({ where: { feedbackId } })) >= MAX_COMMENTS_PER_FEEDBACK) {
      throw new StoreLimitError(`A thread holds at most ${MAX_COMMENTS_PER_FEEDBACK} comments`);
    }

    try {
      return (await comments.create({
        data: {
          feedback: { connect: { id: feedbackId } },
          body: data.body,
          authorName: data.authorName,
          authorEmail: data.authorEmail,
          authorRole: data.authorRole,
          clientId: data.clientId,
        },
      })) as CommentRecord;
    } catch (error) {
      const winner = isStoreDuplicate(error) ? await this.findComment(comments, data.clientId) : null;
      if (winner) return winner;
      throw toStoreError(error);
    }
  }

  private async findComment(comments: PrismaModelDelegate, clientId: string): Promise<CommentRecord | null> {
    return (await comments.findUnique({ where: { clientId } })) as CommentRecord | null;
  }

  /**
   * Delete one comment. Both ids go in one `deleteMany`, so a comment of
   * another thread and an unknown one are the same zero-row miss.
   */
  private async removeComment(comments: PrismaModelDelegate, feedbackId: string, commentId: string): Promise<void> {
    const { count } = (await comments.deleteMany({ where: { id: commentId, feedbackId } })) as { count: number };
    if (count === 0) throw new StoreNotFoundError();
  }

  async deleteFeedback(id: string): Promise<void> {
    let deleted: { screenshotUrl?: string | null } | null;
    try {
      // Prisma returns the deleted row — the only chance to learn which
      // screenshot object the feedback owned.
      deleted = (await this.prisma.sitepingFeedback.delete({ where: { id } })) as {
        screenshotUrl?: string | null;
      } | null;
    } catch (error) {
      throw toStoreError(error);
    }
    await this.discardScreenshots([deleted?.screenshotUrl]);
  }

  async deleteAllFeedbacks(projectName: string): Promise<void> {
    // Rows first, storage second: a failed storage cleanup leaves orphaned
    // objects (acceptable), the reverse would leave rows pointing at deleted
    // screenshots.
    const screenshotUrls = await this.storedScreenshotUrls(projectName);
    await this.prisma.sitepingFeedback.deleteMany({ where: { projectName } });
    await this.discardScreenshots(screenshotUrls);
  }

  /**
   * Verify that a feedback record with `id` belongs to `projectName`.
   * Returns `true` when the record exists and matches, `false` otherwise.
   */
  async verifyProjectOwnership(id: string, projectName: string): Promise<boolean> {
    const record = (await this.prisma.sitepingFeedback.findUnique({
      where: { id },
      // Only need projectName for the check — not the annotations, nor an
      // inline screenshot data URL or the diagnostics JSON
      select: { projectName: true },
    })) as { projectName: string } | null;
    return record !== null && record.projectName === projectName;
  }
}

// ---------------------------------------------------------------------------
// Handler — @siteping/server behind the Prisma store
// ---------------------------------------------------------------------------

/** How the handler reaches its data: a Prisma client, or any store. */
interface PrismaHandlerStoreOptions {
  /** Prisma client — used when `store` is not provided. Wrapped in a `PrismaStore` internally. */
  prisma?: SitepingPrismaClient;
  /** Abstract store — when provided, takes precedence over `prisma`. */
  store?: SitepingStore;
  /**
   * Optional storage backend for screenshots. Used only with `prisma`
   * (ignored when a custom `store` is passed — that store is responsible
   * for its own screenshot strategy). Without a storage, the data URL is
   * persisted inline on `Feedback.screenshotUrl` with a one-time warn.
   */
  screenshotStorage?: ScreenshotStorage;
  /**
   * Override case-insensitive search behaviour for the built-in `PrismaStore`.
   *
   * Only applied when `prisma` is provided (not when a custom `store` is
   * passed). See `PrismaStoreOptions.caseInsensitiveSearch` for details on
   * auto-detection and per-provider semantics.
   */
  caseInsensitiveSearch?: boolean;
}

/** Options of `createSitepingHandler` under the `apiKey` policy — every `@siteping/server` option. */
export interface HandlerOptions extends Omit<SitepingApiKeyHandlerOptions, "store">, PrismaHandlerStoreOptions {}

/** Options of `createSitepingHandler` under a custom `access` policy (see `@siteping/server`). */
export interface PrismaAccessHandlerOptions<Principal extends SitepingPrincipal>
  extends Omit<SitepingAccessHandlerOptions<Principal>, "store">,
    PrismaHandlerStoreOptions {}

/**
 * Setup hint for Prisma's "table does not exist" error (P2021) — any SitePing
 * table: a client generated after `sync` also reads `SitepingComment`.
 */
function describePrismaError(error: unknown): string | undefined {
  if (hasOwn(error, "code") && error.code === "P2021") {
    return "A SitePing table is missing. Run 'npx prisma db push' (or apply your migrations) to create it.";
  }
  return undefined;
}

/**
 * Create request handlers for the Siteping API endpoint — `@siteping/server`'s
 * `createSitepingHandler` over a Prisma-backed store, with every server option.
 *
 * Accepts either a `store` (abstract) or a `prisma` client (backwards compatible).
 * When `prisma` is provided without `store`, it is wrapped in a `PrismaStore`.
 *
 * **Rate limiting** is not handled by this library. Apply rate limiting at the
 * framework or reverse-proxy level (e.g. Next.js middleware, Nginx, Cloudflare).
 * The POST endpoint in particular should be rate-limited to prevent abuse, since
 * the widget typically calls it from unauthenticated browser contexts.
 *
 * @example Next.js App Router — `app/api/siteping/route.ts`
 * ```ts
 * import { createSitepingHandler } from '@siteping/adapter-prisma'
 * import { prisma } from '@/lib/prisma'
 *
 * export const { GET, POST, PATCH, DELETE, OPTIONS } = createSitepingHandler({ prisma })
 * ```
 *
 * @example With abstract store
 * ```ts
 * import { createSitepingHandler, PrismaStore } from '@siteping/adapter-prisma'
 * import { prisma } from '@/lib/prisma'
 *
 * const store = new PrismaStore(prisma)
 * export const { GET, POST, PATCH, DELETE, OPTIONS } = createSitepingHandler({ store })
 * ```
 */
export function createSitepingHandler<Principal extends SitepingPrincipal>(
  options: PrismaAccessHandlerOptions<Principal>,
): SitepingHandler;
export function createSitepingHandler(options: HandlerOptions): SitepingHandler;
/** Options assembled at runtime, either policy. */
export function createSitepingHandler<Principal extends SitepingPrincipal>(
  options: HandlerOptions | PrismaAccessHandlerOptions<Principal>,
): SitepingHandler;
export function createSitepingHandler<Principal extends SitepingPrincipal>({
  prisma,
  store: providedStore,
  screenshotStorage,
  caseInsensitiveSearch,
  describeError,
  ...serverOptions
}: HandlerOptions | PrismaAccessHandlerOptions<Principal>): SitepingHandler {
  if (!providedStore && !prisma) {
    throw new Error("[siteping] createSitepingHandler requires either `store` or `prisma`.");
  }

  // Safe: the throw above guarantees at least one is defined
  const store: SitepingStore =
    providedStore ??
    new PrismaStore(prisma as NonNullable<typeof prisma>, {
      screenshotStorage,
      ...(typeof caseInsensitiveSearch === "boolean" ? { caseInsensitiveSearch } : {}),
    });

  return createServerHandler({
    ...serverOptions,
    store,
    describeError: (error) => describeError?.(error) ?? describePrismaError(error),
  });
}
