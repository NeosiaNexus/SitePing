import * as zod from "zod";

// Zod v3.25+ compat: vitest resolves the module differently than Node ESM
const z: typeof zod.z = ((zod as Record<string, unknown>).z ?? zod) as typeof zod.z;

const anchorSchema = z.object({
  cssSelector: z.string().min(1),
  xpath: z.string().min(1),
  textSnippet: z.string().optional(),
  elementTag: z.string().min(1),
  elementId: z.string().optional(),
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
  type: z.enum(["question", "changement", "bug", "autre"]),
  message: z.string().min(1).max(5000),
  url: z.string().url(),
  viewport: z.string().min(1),
  userAgent: z.string().min(1),
  authorName: z.string().min(1).max(200),
  authorEmail: z.string().email().max(200),
  annotations: z.array(annotationSchema).min(0),
  clientId: z.string().min(1),
});

export const feedbackPatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["open", "resolved"]),
});

export type FeedbackCreateInput = zod.z.infer<typeof feedbackCreateSchema>;
export type FeedbackPatchInput = zod.z.infer<typeof feedbackPatchSchema>;

/**
 * Map Zod errors to a flat array of { field, message } objects.
 * Safe: does not leak input values or schema structure.
 */
export function formatValidationErrors(
  error: zod.z.ZodError,
): Array<{ field: string; message: string }> {
  return error.issues.map((issue: { path: Array<string | number>; message: string }) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}
