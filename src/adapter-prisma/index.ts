import {
  feedbackCreateSchema,
  feedbackPatchSchema,
  formatValidationErrors,
} from "./validation.js";

export type { FeedbackCreateInput, FeedbackPatchInput } from "./validation.js";
export { SITEPING_MODELS } from "./schema.js";

interface PrismaClient {
  sitepingFeedback: {
    create: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    findUnique: (args: unknown) => Promise<unknown | null>;
    update: (args: unknown) => Promise<unknown>;
    count: (args: unknown) => Promise<number>;
  };
}

interface HandlerOptions {
  prisma: PrismaClient;
}

const INCLUDE_ANNOTATIONS = { annotations: true };

/**
 * Create request handlers for the Siteping API endpoint.
 *
 * @example Next.js App Router — `app/api/siteping/route.ts`
 * ```ts
 * import { createSitepingHandler } from '@neosianexus/siteping/adapter-prisma'
 * import { prisma } from '@/lib/prisma'
 *
 * export const { GET, POST, PATCH } = createSitepingHandler({ prisma })
 * ```
 */
export function createSitepingHandler({ prisma }: HandlerOptions) {
  return {
    POST: async (request: Request): Promise<Response> => {
      const body = await request.json().catch(() => null);
      if (!body) {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }

      const parsed = feedbackCreateSchema.safeParse(body);
      if (!parsed.success) {
        return Response.json(
          { errors: formatValidationErrors(parsed.error) },
          { status: 400 },
        );
      }

      const data = parsed.data;

      try {
        const feedback = await prisma.sitepingFeedback.create({
          data: {
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
            annotations: {
              create: data.annotations.map((ann) => ({
                cssSelector: ann.anchor.cssSelector,
                xpath: ann.anchor.xpath,
                textSnippet: ann.anchor.textSnippet,
                elementTag: ann.anchor.elementTag,
                elementId: ann.anchor.elementId,
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
            },
          },
          include: INCLUDE_ANNOTATIONS,
        });

        return Response.json(feedback, { status: 201 });
      } catch (error) {
        // Handle unique constraint violation (clientId dedup)
        if (isDuplicateError(error)) {
          const existing = await prisma.sitepingFeedback.findUnique({
            where: { clientId: data.clientId },
            include: INCLUDE_ANNOTATIONS,
          });
          if (existing) return Response.json(existing, { status: 201 });
        }

        console.error("[siteping] Failed to create feedback:", error);
        return Response.json(
          { error: "Internal server error" },
          { status: 500 },
        );
      }
    },

    GET: async (request: Request): Promise<Response> => {
      const url = new URL(request.url);
      const projectName = url.searchParams.get("projectName");

      if (!projectName) {
        return Response.json(
          { error: "projectName is required" },
          { status: 400 },
        );
      }

      const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
      const type = url.searchParams.get("type") ?? undefined;
      const status = url.searchParams.get("status") ?? undefined;
      const search = url.searchParams.get("search") ?? undefined;

      const where: Record<string, unknown> = { projectName };
      if (type) where.type = type;
      if (status) where.status = status;
      if (search) {
        where.message = { contains: search, mode: "insensitive" };
      }

      try {
        const [feedbacks, total] = await Promise.all([
          prisma.sitepingFeedback.findMany({
            where,
            include: INCLUDE_ANNOTATIONS,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.sitepingFeedback.count({ where }),
        ]);

        return Response.json({ feedbacks, total });
      } catch (error) {
        console.error("[siteping] Failed to fetch feedbacks:", error);
        return Response.json(
          { error: "Internal server error" },
          { status: 500 },
        );
      }
    },

    PATCH: async (request: Request): Promise<Response> => {
      const body = await request.json().catch(() => null);
      if (!body) {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }

      const parsed = feedbackPatchSchema.safeParse(body);
      if (!parsed.success) {
        return Response.json(
          { errors: formatValidationErrors(parsed.error) },
          { status: 400 },
        );
      }

      try {
        const feedback = await prisma.sitepingFeedback.update({
          where: { id: parsed.data.id },
          data: {
            status: parsed.data.status,
            resolvedAt:
              parsed.data.status === "resolved" ? new Date() : null,
          },
          include: INCLUDE_ANNOTATIONS,
        });

        return Response.json(feedback);
      } catch (error) {
        console.error("[siteping] Failed to update feedback:", error);
        return Response.json(
          { error: "Internal server error" },
          { status: 500 },
        );
      }
    },
  };
}

function isDuplicateError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}
