import { timingSafeEqual } from "node:crypto";
import {
  type FeedbackCreateInput,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackUpdateInput,
  flattenAnnotation,
  isStoreDuplicate,
  isStoreNotFound,
  type ScreenshotStorage,
  type SitepingStore,
} from "@siteping/core";
import {
  feedbackCreateSchema,
  feedbackDeleteSchema,
  feedbackPatchSchema,
  formatValidationErrors,
  getQuerySchema,
} from "./validation.js";

export type { ScreenshotStorage, SitepingStore } from "@siteping/core";
export { flattenAnnotation, StoreDuplicateError, StoreNotFoundError } from "@siteping/core";
export type {
  FeedbackCreateInput as FeedbackCreateSchemaInput,
  FeedbackDeleteInput,
  FeedbackPatchInput,
  GetQueryInput,
} from "./validation.js";

// ---------------------------------------------------------------------------
// Minimal PrismaClient shape expected by this adapter
// ---------------------------------------------------------------------------

/**
 * Minimal Prisma client shape expected by this adapter.
 * Consumers pass their own `PrismaClient` instance at runtime — this interface
 * defines the subset of methods the adapter actually uses, so it can be
 * referenced in handler option types without importing `@prisma/client`.
 */
export interface SitepingPrismaClient {
  sitepingFeedback: {
    create: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    findUnique: (args: unknown) => Promise<unknown | null>;
    update: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
    deleteMany: (args: unknown) => Promise<unknown>;
    count: (args: unknown) => Promise<number>;
  };
}

// ---------------------------------------------------------------------------
// PrismaStore — SitepingStore implementation backed by Prisma
// ---------------------------------------------------------------------------

const INCLUDE_ANNOTATIONS = { annotations: true };

/**
 * Prisma datasource providers that support the `mode: "insensitive"` option
 * on string filters. SQLite, MongoDB, and SQL Server do not — using `mode`
 * against them raises `Unsupported('Argument mode is not supported.')` for
 * SQLite, and similar errors elsewhere. Source: Prisma docs §case-sensitivity.
 */
const PROVIDERS_SUPPORTING_INSENSITIVE_MODE = new Set(["postgresql", "postgres", "mysql", "cockroachdb"]);

/**
 * Best-effort detection of the active Prisma provider for a runtime client.
 *
 * The provider is not part of any public API on `PrismaClient`. We probe a
 * few known internal locations across Prisma 5.x and 6.x and fall back to
 * `null` (treated as "unknown — assume default Postgres-style behaviour")
 * when none match.
 */
function detectActiveProvider(prisma: unknown): string | null {
  const candidate = prisma as
    | {
        _activeProvider?: unknown;
        _engineConfig?: { activeProvider?: unknown };
        _engine?: { config?: { activeProvider?: unknown } };
      }
    | null
    | undefined;
  const fromActive = candidate?._activeProvider;
  if (typeof fromActive === "string") return fromActive;
  const fromEngineConfig = candidate?._engineConfig?.activeProvider;
  if (typeof fromEngineConfig === "string") return fromEngineConfig;
  const fromEngine = candidate?._engine?.config?.activeProvider;
  if (typeof fromEngine === "string") return fromEngine;
  return null;
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
   * case-sensitive on MySQL/PostgreSQL with the standard `LIKE` operator).
   *
   * When omitted, the value is auto-detected from the Prisma client's active
   * provider: providers known to support `mode: "insensitive"` (`postgresql`,
   * `mysql`, `cockroachdb`) get `true`; others (`sqlite`, `sqlserver`,
   * `mongodb`) get `false`. Unknown providers default to `true` to preserve
   * the historical behaviour.
   */
  caseInsensitiveSearch?: boolean;
  /**
   * Optional storage backend for screenshots. Without it, the data URL is
   * persisted inline on `Feedback.screenshotUrl` with a one-time warn.
   */
  screenshotStorage?: ScreenshotStorage | undefined;
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

  constructor(prisma: SitepingPrismaClient, options: PrismaStoreOptions = {}) {
    this.prisma = prisma;
    this.screenshotStorage = options.screenshotStorage;
    if (typeof options.caseInsensitiveSearch === "boolean") {
      this.caseInsensitiveSearch = options.caseInsensitiveSearch;
    } else {
      const provider = detectActiveProvider(prisma);
      // Default true when the provider can't be detected — preserves the
      // historical Postgres-first behaviour for unknown setups.
      this.caseInsensitiveSearch = provider === null || PROVIDERS_SUPPORTING_INSENSITIVE_MODE.has(provider);
    }
  }

  async createFeedback(data: FeedbackCreateInput): Promise<FeedbackRecord> {
    const screenshotUrl = await this.persistScreenshot(data.screenshotDataUrl, data.clientId);

    return (await this.prisma.sitepingFeedback.create({
      data: {
        projectName: data.projectName,
        type: data.type,
        message: data.message,
        status: data.status,
        url: data.url,
        urlPattern: data.urlPattern ?? null,
        screenshotUrl,
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
      include: INCLUDE_ANNOTATIONS,
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
          mimeType: "image/jpeg",
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

  async findByClientId(clientId: string): Promise<FeedbackRecord | null> {
    return (await this.prisma.sitepingFeedback.findUnique({
      where: { clientId },
      include: INCLUDE_ANNOTATIONS,
    })) as FeedbackRecord | null;
  }

  async getFeedbacks(query: FeedbackQuery): Promise<{ feedbacks: FeedbackRecord[]; total: number }> {
    const { projectName, type, status, search, url, urlPattern, page = 1, limit = 50 } = query;

    const where: Record<string, unknown> = { projectName };
    if (type) where.type = type;
    if (status) where.status = status;
    if (url) where.url = url;
    if (urlPattern) where.urlPattern = urlPattern;
    if (search) {
      where.message = this.caseInsensitiveSearch
        ? { contains: search, mode: "insensitive" as const }
        : { contains: search };
    }

    const [feedbacks, total] = await Promise.all([
      this.prisma.sitepingFeedback.findMany({
        where,
        include: INCLUDE_ANNOTATIONS,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sitepingFeedback.count({ where }),
    ]);

    return { feedbacks: feedbacks as FeedbackRecord[], total };
  }

  async updateFeedback(id: string, data: FeedbackUpdateInput): Promise<FeedbackRecord> {
    return (await this.prisma.sitepingFeedback.update({
      where: { id },
      data: {
        status: data.status,
        resolvedAt: data.resolvedAt,
      },
      include: INCLUDE_ANNOTATIONS,
    })) as FeedbackRecord;
  }

  async deleteFeedback(id: string): Promise<void> {
    await this.prisma.sitepingFeedback.delete({ where: { id } });
  }

  async deleteAllFeedbacks(projectName: string): Promise<void> {
    await this.prisma.sitepingFeedback.deleteMany({ where: { projectName } });
  }

  /**
   * Verify that a feedback record with `id` belongs to `projectName`.
   * Returns `true` when the record exists and matches, `false` otherwise.
   */
  async verifyProjectOwnership(id: string, projectName: string): Promise<boolean> {
    const record = (await this.prisma.sitepingFeedback.findUnique({
      where: { id },
      // Only need projectName for the check — skip annotations
    })) as { projectName: string } | null;
    return record !== null && record.projectName === projectName;
  }
}

// ---------------------------------------------------------------------------
// Handler options — backwards compatible
// ---------------------------------------------------------------------------

export interface HandlerOptions {
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
   * Optional API key for bearer-token authentication.
   *
   * - **When set:** every request not listed in `publicEndpoints` must include an
   *   `Authorization: Bearer {apiKey}` header. Requests without a valid token
   *   receive a 401 Unauthorized response.
   * - **When not set:** the API is fully public — anyone can create, read,
   *   update, and delete feedbacks (including destructive DELETE operations).
   * - **Recommendation:** always set `apiKey` in production environments.
   */
  apiKey?: string | undefined;
  /**
   * HTTP methods that don't require API key authentication.
   * Defaults to `['POST', 'OPTIONS']` when `apiKey` is set — POST must stay open
   * because the browser widget submits feedback from unauthenticated contexts.
   */
  publicEndpoints?: Array<"GET" | "POST" | "PATCH" | "DELETE" | "OPTIONS">;
  /** Allowed CORS origins — when set, validates the Origin header */
  allowedOrigins?: string[] | undefined;
  /**
   * Override case-insensitive search behaviour for the built-in `PrismaStore`.
   *
   * Only applied when `prisma` is provided (not when a custom `store` is
   * passed). See `PrismaStoreOptions.caseInsensitiveSearch` for details on
   * auto-detection and per-provider semantics.
   */
  caseInsensitiveSearch?: boolean;
}

/**
 * Object returned by `createSitepingHandler` — one handler per HTTP method.
 */
export interface SitepingHandler {
  OPTIONS: (request: Request) => Response;
  POST: (request: Request) => Promise<Response>;
  GET: (request: Request) => Promise<Response>;
  PATCH: (request: Request) => Promise<Response>;
  DELETE: (request: Request) => Promise<Response>;
}

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------

/**
 * Build CORS headers for a given request.
 * When `allowedOrigins` is set, only matching origins get reflected.
 * When unset, no CORS headers are added (no permissive wildcard by default).
 */
function buildCorsHeaders(request: Request, allowedOrigins: string[] | undefined): Record<string, string> {
  if (!allowedOrigins) return {};

  const origin = request.headers.get("Origin");
  if (!origin) return {};

  if (!allowedOrigins.includes(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/**
 * Attach CORS headers to an existing Response.
 */
function withCors(response: Response, corsHeaders: Record<string, string>): Response {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

/**
 * Perform a constant-time string comparison to prevent timing attacks on API key validation.
 * Returns `false` immediately when lengths differ (unavoidable length leak), but the
 * byte-level comparison itself is timing-safe.
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Create request handlers for the Siteping API endpoint.
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
export function createSitepingHandler({
  prisma,
  store: providedStore,
  screenshotStorage,
  apiKey,
  publicEndpoints = apiKey ? ["POST", "OPTIONS"] : undefined,
  allowedOrigins,
  caseInsensitiveSearch,
}: HandlerOptions): SitepingHandler {
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

  const publicMethods = publicEndpoints ? new Set(publicEndpoints) : null;

  /** Verify Bearer token when apiKey is configured. Skips methods listed in `publicEndpoints`. */
  function authenticate(request: Request, method: string): Response | null {
    if (!apiKey) return null;
    if (publicMethods?.has(method as "GET" | "POST" | "PATCH" | "DELETE" | "OPTIONS")) return null;
    const header = request.headers.get("Authorization");
    if (!header || !safeCompare(header, `Bearer ${apiKey}`)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
  }

  return {
    /**
     * CORS preflight handler. In production, always configure `allowedOrigins`
     * to restrict which domains can make cross-origin requests to the API.
     * Without it, no CORS headers are emitted and browsers will block widget requests.
     */
    OPTIONS: (request: Request): Response => {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      return new Response(null, { status: 204, headers: corsHeaders });
    },

    POST: async (request: Request): Promise<Response> => {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      const authError = authenticate(request, "POST");
      if (authError) return withCors(authError, corsHeaders);
      const body = await request.json().catch(() => null);
      if (!body) {
        return withCors(Response.json({ error: "Invalid JSON" }, { status: 400 }), corsHeaders);
      }

      const parsed = feedbackCreateSchema.safeParse(body);
      if (!parsed.success) {
        return withCors(Response.json({ errors: formatValidationErrors(parsed.error) }, { status: 400 }), corsHeaders);
      }

      const data = parsed.data;

      // Defense-in-depth: enforce annotation limit at handler level in addition to schema validation
      if (data.annotations.length > 50) {
        return withCors(Response.json({ error: "Too many annotations (max 50)" }, { status: 400 }), corsHeaders);
      }

      try {
        const feedback = await store.createFeedback({
          projectName: data.projectName,
          type: data.type,
          message: data.message,
          status: "open",
          url: data.url,
          urlPattern: data.urlPattern ?? null,
          viewport: data.viewport,
          userAgent: data.userAgent,
          authorName: data.authorName,
          authorEmail: data.authorEmail,
          clientId: data.clientId,
          annotations: data.annotations.map(flattenAnnotation),
          screenshotDataUrl: data.screenshotDataUrl ?? null,
        });

        return withCors(Response.json(feedback, { status: 201 }), corsHeaders);
      } catch (error) {
        // Handle unique constraint violation (clientId dedup)
        if (isStoreDuplicate(error)) {
          const existing = await store.findByClientId(data.clientId);
          if (existing) return withCors(Response.json(existing, { status: 201 }), corsHeaders);
        }

        const message = actionableErrorMessage(error);
        console.error("[siteping] Failed to create feedback:", error);
        return withCors(Response.json({ error: message }, { status: 500 }), corsHeaders);
      }
    },

    GET: async (request: Request): Promise<Response> => {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      const authError = authenticate(request, "GET");
      if (authError) return withCors(authError, corsHeaders);

      const url = new URL(request.url);
      const rawQuery: Record<string, unknown> = {};
      for (const key of ["projectName", "page", "limit", "type", "status", "search", "url", "urlPattern"]) {
        const val = url.searchParams.get(key);
        if (val !== null) rawQuery[key] = val;
      }

      const parsed = getQuerySchema.safeParse(rawQuery);
      if (!parsed.success) {
        return withCors(Response.json({ errors: formatValidationErrors(parsed.error) }, { status: 400 }), corsHeaders);
      }

      try {
        const result = await store.getFeedbacks(parsed.data);
        return withCors(Response.json(result, { headers: { "Cache-Control": "private, max-age=5" } }), corsHeaders);
      } catch (error) {
        const message = actionableErrorMessage(error);
        console.error("[siteping] Failed to fetch feedbacks:", error);
        return withCors(Response.json({ error: message }, { status: 500 }), corsHeaders);
      }
    },

    PATCH: async (request: Request): Promise<Response> => {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      const authError = authenticate(request, "PATCH");
      if (authError) return withCors(authError, corsHeaders);

      const body = await request.json().catch(() => null);
      if (!body) {
        return withCors(Response.json({ error: "Invalid JSON" }, { status: 400 }), corsHeaders);
      }

      const parsed = feedbackPatchSchema.safeParse(body);
      if (!parsed.success) {
        return withCors(Response.json({ errors: formatValidationErrors(parsed.error) }, { status: 400 }), corsHeaders);
      }

      try {
        // Verify project ownership before updating — PrismaStore can do a
        // lightweight findUnique check; for other store implementations the
        // projectName in the schema is still validated but the DB-level check
        // is skipped (the store itself should enforce isolation).
        if (store instanceof PrismaStore) {
          const owns = await store.verifyProjectOwnership(parsed.data.id, parsed.data.projectName);
          if (!owns) {
            return withCors(Response.json({ error: "Feedback not found" }, { status: 404 }), corsHeaders);
          }
        }

        const feedback = await store.updateFeedback(parsed.data.id, {
          status: parsed.data.status,
          resolvedAt: parsed.data.status === "resolved" ? new Date() : null,
        });

        return withCors(Response.json(feedback), corsHeaders);
      } catch (error) {
        if (isStoreNotFound(error)) {
          return withCors(Response.json({ error: "Feedback not found" }, { status: 404 }), corsHeaders);
        }
        const message = actionableErrorMessage(error);
        console.error("[siteping] Failed to update feedback:", error);
        return withCors(Response.json({ error: message }, { status: 500 }), corsHeaders);
      }
    },

    DELETE: async (request: Request): Promise<Response> => {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      const authError = authenticate(request, "DELETE");
      if (authError) return withCors(authError, corsHeaders);

      const body = await request.json().catch(() => null);
      if (!body) {
        return withCors(Response.json({ error: "Invalid JSON" }, { status: 400 }), corsHeaders);
      }

      const parsed = feedbackDeleteSchema.safeParse(body);
      if (!parsed.success) {
        return withCors(Response.json({ errors: formatValidationErrors(parsed.error) }, { status: 400 }), corsHeaders);
      }

      try {
        if ("deleteAll" in parsed.data) {
          await store.deleteAllFeedbacks(parsed.data.projectName);
          return withCors(Response.json({ deleted: true }), corsHeaders);
        }

        // Verify project ownership before deleting — PrismaStore can do a
        // lightweight findUnique check; for other store implementations the
        // projectName in the schema is still validated but the DB-level check
        // is skipped (the store itself should enforce isolation).
        if (store instanceof PrismaStore) {
          const owns = await store.verifyProjectOwnership(parsed.data.id, parsed.data.projectName);
          if (!owns) {
            return withCors(Response.json({ error: "Feedback not found" }, { status: 404 }), corsHeaders);
          }
        }

        await store.deleteFeedback(parsed.data.id);
        return withCors(Response.json({ deleted: true }), corsHeaders);
      } catch (error) {
        if (isStoreNotFound(error)) {
          return withCors(Response.json({ error: "Feedback not found" }, { status: 404 }), corsHeaders);
        }
        const message = actionableErrorMessage(error);
        console.error("[siteping] Failed to delete feedback:", error);
        return withCors(Response.json({ error: message }, { status: 500 }), corsHeaders);
      }
    },
  };
}

function isTableNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2021";
}

/**
 * Return an actionable error message for known Prisma error codes.
 * Falls back to a generic message for unknown errors.
 */
function actionableErrorMessage(error: unknown): string {
  if (isTableNotFoundError(error)) {
    return "Table 'SitepingFeedback' not found. Run 'npx prisma db push' to create it.";
  }
  return "Internal server error";
}
