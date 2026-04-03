import type {
  FeedbackCreateInput,
  FeedbackQuery,
  FeedbackRecord,
  FeedbackUpdateInput,
  SitepingStore,
} from "@siteping/core";
import {
  feedbackCreateSchema,
  feedbackDeleteSchema,
  feedbackPatchSchema,
  formatValidationErrors,
  getQuerySchema,
} from "./validation.js";

export { SITEPING_MODELS } from "@siteping/core";
export type {
  FeedbackCreateInput as FeedbackCreateSchemaInput,
  FeedbackDeleteInput,
  FeedbackPatchInput,
  GetQueryInput,
} from "./validation.js";
export type { SitepingStore } from "@siteping/core";

// ---------------------------------------------------------------------------
// Internal PrismaClient shape — kept private, not exported in .d.ts
// ---------------------------------------------------------------------------

/**
 * @internal Minimal Prisma client shape used internally.
 * Not part of the public API — consumers pass their own PrismaClient instance.
 */
interface _PrismaClient {
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
 * Prisma-backed implementation of `SitepingStore`.
 *
 * Wraps a PrismaClient to satisfy the abstract store interface.
 */
export class PrismaStore implements SitepingStore {
  /** @internal */
  private prisma: _PrismaClient;

  constructor(prisma: _PrismaClient) {
    this.prisma = prisma;
  }

  async createFeedback(data: FeedbackCreateInput): Promise<FeedbackRecord> {
    return (await this.prisma.sitepingFeedback.create({
      data: {
        projectName: data.projectName,
        type: data.type,
        message: data.message,
        status: data.status,
        url: data.url,
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

  async findByClientId(clientId: string): Promise<FeedbackRecord | null> {
    return (await this.prisma.sitepingFeedback.findUnique({
      where: { clientId },
      include: INCLUDE_ANNOTATIONS,
    })) as FeedbackRecord | null;
  }

  async getFeedbacks(query: FeedbackQuery): Promise<{ feedbacks: FeedbackRecord[]; total: number }> {
    const { projectName, type, status, search, page = 1, limit = 50 } = query;

    const where: Record<string, unknown> = { projectName };
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) where.message = { contains: search };

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
}

// ---------------------------------------------------------------------------
// Handler options — backwards compatible
// ---------------------------------------------------------------------------

export interface HandlerOptions {
  /** Prisma client — used when `store` is not provided. Wrapped in a `PrismaStore` internally. */
  prisma?: _PrismaClient;
  /** Abstract store — when provided, takes precedence over `prisma`. */
  store?: SitepingStore;
  /** Optional API key — when set, all requests must include `Authorization: Bearer <token>` */
  apiKey?: string | undefined;
  /** Allowed CORS origins — when set, validates the Origin header */
  allowedOrigins?: string[] | undefined;
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
 * Create request handlers for the Siteping API endpoint.
 *
 * Accepts either a `store` (abstract) or a `prisma` client (backwards compatible).
 * When `prisma` is provided without `store`, it is wrapped in a `PrismaStore`.
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
export function createSitepingHandler({ prisma, store: providedStore, apiKey, allowedOrigins }: HandlerOptions) {
  if (!providedStore && !prisma) {
    throw new Error("[siteping] createSitepingHandler requires either `store` or `prisma`.");
  }

  const store: SitepingStore = providedStore ?? new PrismaStore(prisma!);

  // For clientId dedup lookups we need PrismaStore-specific method
  const prismaStore = store instanceof PrismaStore ? store : null;

  /** Verify Bearer token when apiKey is configured. Returns a 401 Response on failure, or null on success. */
  function authenticate(request: Request): Response | null {
    if (!apiKey) return null;
    const header = request.headers.get("Authorization");
    if (!header || header !== `Bearer ${apiKey}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
  }

  return {
    OPTIONS: (request: Request): Response => {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      return new Response(null, { status: 204, headers: corsHeaders });
    },

    POST: async (request: Request): Promise<Response> => {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      const authError = authenticate(request);
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

      try {
        const feedback = await store.createFeedback({
          projectName: data.projectName,
          type: data.type,
          message: data.message,
          status: "open",
          url: data.url,
          viewport: data.viewport,
          userAgent: data.userAgent,
          authorName: data.authorName,
          authorEmail: data.authorEmail,
          clientId: data.clientId,
          annotations: data.annotations.map((ann) => ({
            cssSelector: ann.anchor.cssSelector,
            xpath: ann.anchor.xpath,
            textSnippet: ann.anchor.textSnippet,
            elementTag: ann.anchor.elementTag,
            elementId: ann.anchor.elementId,
            textPrefix: ann.anchor.textPrefix,
            textSuffix: ann.anchor.textSuffix,
            fingerprint: ann.anchor.fingerprint,
            neighborText: ann.anchor.neighborText,
            xPct: ann.rect.xPct,
            yPct: ann.rect.yPct,
            wPct: ann.rect.wPct,
            hPct: ann.rect.hPct,
            scrollX: ann.scrollX,
            scrollY: ann.scrollY,
            viewportW: ann.viewportW,
            viewportH: ann.viewportH,
            devicePixelRatio: ann.devicePixelRatio,
          })),
        });

        return withCors(Response.json(feedback, { status: 201 }), corsHeaders);
      } catch (error) {
        // Handle unique constraint violation (clientId dedup)
        if (isDuplicateError(error) && prismaStore) {
          const existing = await prismaStore.findByClientId(data.clientId);
          if (existing) return withCors(Response.json(existing, { status: 201 }), corsHeaders);
        }

        const message = actionableErrorMessage(error);
        console.error("[siteping] Failed to create feedback:", error);
        return withCors(Response.json({ error: message }, { status: 500 }), corsHeaders);
      }
    },

    GET: async (request: Request): Promise<Response> => {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      const authError = authenticate(request);
      if (authError) return withCors(authError, corsHeaders);

      const url = new URL(request.url);
      const rawQuery: Record<string, unknown> = {};
      for (const key of ["projectName", "page", "limit", "type", "status", "search"]) {
        const val = url.searchParams.get(key);
        if (val !== null) rawQuery[key] = val;
      }

      const parsed = getQuerySchema.safeParse(rawQuery);
      if (!parsed.success) {
        return withCors(
          Response.json({ errors: formatValidationErrors(parsed.error) }, { status: 400 }),
          corsHeaders,
        );
      }

      try {
        const result = await store.getFeedbacks(parsed.data);
        return withCors(Response.json(result), corsHeaders);
      } catch (error) {
        const message = actionableErrorMessage(error);
        console.error("[siteping] Failed to fetch feedbacks:", error);
        return withCors(Response.json({ error: message }, { status: 500 }), corsHeaders);
      }
    },

    PATCH: async (request: Request): Promise<Response> => {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      const authError = authenticate(request);
      if (authError) return withCors(authError, corsHeaders);

      const body = await request.json().catch(() => null);
      if (!body) {
        return withCors(Response.json({ error: "Invalid JSON" }, { status: 400 }), corsHeaders);
      }

      const parsed = feedbackPatchSchema.safeParse(body);
      if (!parsed.success) {
        return withCors(
          Response.json({ errors: formatValidationErrors(parsed.error) }, { status: 400 }),
          corsHeaders,
        );
      }

      try {
        const feedback = await store.updateFeedback(parsed.data.id, {
          status: parsed.data.status,
          resolvedAt: parsed.data.status === "resolved" ? new Date() : null,
        });

        return withCors(Response.json(feedback), corsHeaders);
      } catch (error) {
        const message = actionableErrorMessage(error);
        console.error("[siteping] Failed to update feedback:", error);
        return withCors(Response.json({ error: message }, { status: 500 }), corsHeaders);
      }
    },

    DELETE: async (request: Request): Promise<Response> => {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      const authError = authenticate(request);
      if (authError) return withCors(authError, corsHeaders);

      const body = await request.json().catch(() => null);
      if (!body) {
        return withCors(Response.json({ error: "Invalid JSON" }, { status: 400 }), corsHeaders);
      }

      const parsed = feedbackDeleteSchema.safeParse(body);
      if (!parsed.success) {
        return withCors(
          Response.json({ errors: formatValidationErrors(parsed.error) }, { status: 400 }),
          corsHeaders,
        );
      }

      try {
        if ("deleteAll" in parsed.data) {
          await store.deleteAllFeedbacks(parsed.data.projectName);
          return withCors(Response.json({ deleted: true }), corsHeaders);
        }

        await store.deleteFeedback(parsed.data.id);
        return withCors(Response.json({ deleted: true }), corsHeaders);
      } catch (error) {
        if (isNotFoundError(error)) {
          return withCors(Response.json({ error: "Feedback not found" }, { status: 404 }), corsHeaders);
        }
        const message = actionableErrorMessage(error);
        console.error("[siteping] Failed to delete feedback:", error);
        return withCors(Response.json({ error: message }, { status: 500 }), corsHeaders);
      }
    },
  };
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === code;
}

function isDuplicateError(error: unknown): boolean {
  return isPrismaError(error, "P2002");
}

function isNotFoundError(error: unknown): boolean {
  return isPrismaError(error, "P2025");
}

function isTableNotFoundError(error: unknown): boolean {
  return isPrismaError(error, "P2021");
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
