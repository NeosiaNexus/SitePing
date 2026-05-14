import type { FeedbackStatus, FeedbackType } from "@siteping/core";
import { FEEDBACK_STATUSES, FEEDBACK_TYPES } from "@siteping/core";
import * as zod from "zod";

// Namespace import required: Zod publishes dual CJS/ESM, and bundlers (tsup, vitest) may
// resolve the CJS entry where `import { z } from "zod"` fails because CJS wraps
// the entire module under a default/namespace key. This workaround normalizes access
// regardless of which entry point the bundler resolves.
// See: https://github.com/colinhacks/zod/issues/2697
const z: typeof zod.z = ("z" in zod ? zod.z : zod) as typeof zod.z;

const anchorSchema = z.object({
  cssSelector: z.string().min(1).max(2000),
  xpath: z.string().min(1).max(2000),
  textSnippet: z.string().max(500),
  elementTag: z.string().min(1),
  elementId: z.string().optional(),
  textPrefix: z.string().max(200),
  textSuffix: z.string().max(200),
  fingerprint: z.string().max(200),
  neighborText: z.string().max(500),
  // Optional semantic anchor identifier from `data-feedback-anchor`.
  // Null when no semantic ancestor exists; widget always sends this field.
  anchorKey: z.string().max(200).nullable().optional(),
});

const rectSchema = z.object({
  xPct: z.number().min(0).max(1),
  yPct: z.number().min(0).max(1),
  wPct: z.number().min(0).max(1),
  hPct: z.number().min(0).max(1),
});

const annotationSchema = z.object({
  anchor: anchorSchema,
  rect: rectSchema,
  scrollX: z.number().min(0),
  scrollY: z.number().min(0),
  viewportW: z.number().int().positive(),
  viewportH: z.number().int().positive(),
  devicePixelRatio: z.number().positive().default(1),
});

export const feedbackCreateSchema = z.object({
  projectName: z.string().min(1).max(200),
  type: z.enum(FEEDBACK_TYPES),
  message: z.string().min(1).max(5000),
  // Page-scope identifier the widget uses to group feedbacks. Defaults to
  // `window.location.pathname` ("/orders/42"), but hosts can override
  // `getPageScope()` to return a full URL, an opaque slug, anything they
  // want. We trim + require non-empty so whitespace-only payloads don't
  // leak into the DB; otherwise the value is opaque to the server and only
  // used as a literal Prisma equality filter, so the loose shape is safe.
  url: z.string().trim().min(1).max(2000),
  // Optional parameterized URL template (e.g. "/orders/:orderId") provided
  // by the host via `getPageScope()`. Null when host omits it.
  urlPattern: z.string().max(2000).nullable().optional(),
  viewport: z.string().min(1).max(50),
  userAgent: z.string().min(1).max(500),
  authorName: z.string().min(1).max(200),
  authorEmail: z.string().email().max(200),
  annotations: z.array(annotationSchema).max(50),
  // Restrict to URL-safe identifiers. The widget generates UUIDs (or a
  // Date+Math.random fallback), both of which match. Anything outside this
  // alphabet — `..`, `/`, NUL, etc. — would be a path-traversal vector once
  // the adapter forwards clientId to `screenshotStorage.upload({ feedbackId })`
  // (e.g. an S3 key prefix or a local FS path).
  clientId: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-zA-Z0-9_-]+$/, "clientId must be alphanumeric (a-z, A-Z, 0-9, _, -)"),
  // Optional base64 JPEG data URL captured by the widget when
  // `enableScreenshot: true`. ~1.5 MB cap = roughly a 1.1 MB JPEG, well
  // above typical sizes (the widget downscales to 1200px). Rejects abuse
  // without truncating legitimate captures.
  screenshotDataUrl: z
    .string()
    .max(1_500_000)
    .regex(/^data:image\/(jpeg|png|webp);base64,/, "screenshotDataUrl must be a data:image/* base64 URL")
    .nullable()
    .optional(),
});

export const feedbackPatchSchema = z.object({
  id: z.string().min(1),
  projectName: z.string().min(1).max(200),
  status: z.enum(FEEDBACK_STATUSES),
});

export const feedbackDeleteSchema = z.union([
  z.object({ id: z.string().min(1), projectName: z.string().min(1).max(200) }),
  z.object({ projectName: z.string().min(1).max(200), deleteAll: z.literal(true) }),
]);

export const getQuerySchema = z.object({
  projectName: z.string().min(1).max(200),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  type: z.enum(FEEDBACK_TYPES).optional(),
  status: z.enum(FEEDBACK_STATUSES).optional(),
  search: z.string().max(200).optional(),
  // Page scope filters — used by the panel's "this page / this type" controls
  url: z.string().max(2000).optional(),
  urlPattern: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Explicit public interfaces — decoupled from Zod to keep .d.ts clean
// ---------------------------------------------------------------------------

export interface AnchorInput {
  cssSelector: string;
  xpath: string;
  textSnippet: string;
  elementTag: string;
  elementId?: string | undefined;
  textPrefix: string;
  textSuffix: string;
  fingerprint: string;
  neighborText: string;
  anchorKey?: string | null | undefined;
}

export interface RectInput {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

export interface AnnotationInput {
  anchor: AnchorInput;
  rect: RectInput;
  scrollX: number;
  scrollY: number;
  viewportW: number;
  viewportH: number;
  /** Set to 1 by schema default when omitted from raw input. */
  devicePixelRatio: number;
}

export interface FeedbackCreateInput {
  projectName: string;
  type: FeedbackType;
  message: string;
  url: string;
  urlPattern?: string | null | undefined;
  viewport: string;
  userAgent: string;
  authorName: string;
  authorEmail: string;
  annotations: AnnotationInput[];
  clientId: string;
  screenshotDataUrl?: string | null | undefined;
}

export interface FeedbackPatchInput {
  id: string;
  projectName: string;
  status: FeedbackStatus;
}

export interface FeedbackDeleteSingle {
  id: string;
  projectName: string;
}

export interface FeedbackDeleteAll {
  projectName: string;
  deleteAll: true;
}

export type FeedbackDeleteInput = FeedbackDeleteSingle | FeedbackDeleteAll;

export interface GetQueryInput {
  projectName: string;
  /** Set to 1 by schema default when omitted from raw input. */
  page: number;
  /** Set to 50 by schema default when omitted from raw input. */
  limit: number;
  type?: FeedbackType | undefined;
  status?: FeedbackStatus | undefined;
  search?: string | undefined;
  url?: string | undefined;
  urlPattern?: string | undefined;
}

// ---------------------------------------------------------------------------
// Type-level assertions: manual interfaces stay in sync with schemas.
// If a field is added/removed/changed in the schema but not the interface
// (or vice versa), these lines produce a compile error.
// ---------------------------------------------------------------------------

type _AssertCreate = zod.z.infer<typeof feedbackCreateSchema> extends FeedbackCreateInput ? true : never;
type _AssertCreateReverse = FeedbackCreateInput extends zod.z.infer<typeof feedbackCreateSchema> ? true : never;
type _AssertPatch = zod.z.infer<typeof feedbackPatchSchema> extends FeedbackPatchInput ? true : never;
type _AssertPatchReverse = FeedbackPatchInput extends zod.z.infer<typeof feedbackPatchSchema> ? true : never;
type _AssertDelete = zod.z.infer<typeof feedbackDeleteSchema> extends FeedbackDeleteInput ? true : never;
type _AssertDeleteReverse = FeedbackDeleteInput extends zod.z.infer<typeof feedbackDeleteSchema> ? true : never;
type _AssertQuery = zod.z.infer<typeof getQuerySchema> extends GetQueryInput ? true : never;
type _AssertQueryReverse = GetQueryInput extends zod.z.infer<typeof getQuerySchema> ? true : never;

// Suppress unused-variable warnings — assertions are compile-time only
void (0 as unknown as _AssertCreate);
void (0 as unknown as _AssertCreateReverse);
void (0 as unknown as _AssertPatch);
void (0 as unknown as _AssertPatchReverse);
void (0 as unknown as _AssertDelete);
void (0 as unknown as _AssertDeleteReverse);
void (0 as unknown as _AssertQuery);
void (0 as unknown as _AssertQueryReverse);

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
