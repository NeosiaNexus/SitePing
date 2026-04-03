import { FEEDBACK_STATUSES, FEEDBACK_TYPES } from "@siteping/core";
import * as zod from "zod";

// Namespace import required: Zod publishes dual CJS/ESM, and bundlers (tsup, vitest) may
// resolve the CJS entry where `import { z } from "zod"` fails because CJS wraps
// the entire module under a default/namespace key. This workaround normalizes access
// regardless of which entry point the bundler resolves.
// See: https://github.com/colinhacks/zod/issues/2697
const z: typeof zod.z = ("z" in zod ? zod.z : zod) as typeof zod.z;

const anchorSchema = z.object({
  cssSelector: z.string().min(1),
  xpath: z.string().min(1),
  textSnippet: z.string(),
  elementTag: z.string().min(1),
  elementId: z.string().optional(),
  textPrefix: z.string(),
  textSuffix: z.string(),
  fingerprint: z.string(),
  neighborText: z.string(),
});

const rectSchema = z.object({
  xPct: z.number(),
  yPct: z.number(),
  wPct: z.number().positive(),
  hPct: z.number().positive(),
});

const annotationSchema = z.object({
  anchor: anchorSchema,
  rect: rectSchema,
  scrollX: z.number(),
  scrollY: z.number(),
  viewportW: z.number().int().positive(),
  viewportH: z.number().int().positive(),
  devicePixelRatio: z.number().positive().default(1),
});

export const feedbackCreateSchema = z.object({
  projectName: z.string().min(1),
  type: z.enum(FEEDBACK_TYPES),
  message: z.string().min(1).max(5000),
  url: z.string().url(),
  viewport: z.string().min(1),
  userAgent: z.string().min(1),
  authorName: z.string().min(1).max(200),
  authorEmail: z.string().email().max(200),
  annotations: z.array(annotationSchema),
  clientId: z.string().min(1),
});

export const feedbackPatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(FEEDBACK_STATUSES),
});

export const feedbackDeleteSchema = z.union([
  z.object({ id: z.string().min(1) }),
  z.object({ projectName: z.string().min(1), deleteAll: z.literal(true) }),
]);

export const getQuerySchema = z.object({
  projectName: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  type: z.enum(FEEDBACK_TYPES).optional(),
  status: z.enum(FEEDBACK_STATUSES).optional(),
  search: z.string().max(200).optional(),
});

export type FeedbackCreateInput = zod.z.infer<typeof feedbackCreateSchema>;
export type FeedbackPatchInput = zod.z.infer<typeof feedbackPatchSchema>;
export type FeedbackDeleteInput = zod.z.infer<typeof feedbackDeleteSchema>;
export type GetQueryInput = zod.z.infer<typeof getQuerySchema>;

/**
 * Map Zod errors to a flat array of { field, message } objects.
 * Safe: does not leak input values or schema structure.
 */
export function formatValidationErrors(error: zod.z.ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue: { path: Array<string | number>; message: string }) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}
