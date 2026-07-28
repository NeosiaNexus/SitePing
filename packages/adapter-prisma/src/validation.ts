import type { AssertEqual, FeedbackPayload, FeedbackStatus, FeedbackType, Prettify } from "@siteping/core";
import { CONSOLE_DIAGNOSTIC_LEVELS, FEEDBACK_STATUSES, FEEDBACK_TYPES } from "@siteping/core";
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

// Diagnostics caps mirror the widget defaults — the widget never sends more
// than these, but the schema enforces it server-side too so a tampered
// client can't blow up the JSON column with megabytes of garbage.
const consoleEntrySchema = z.object({
  level: z.enum(CONSOLE_DIAGNOSTIC_LEVELS),
  timestamp: z.string().max(50),
  message: z.string().max(600),
});

const networkEntrySchema = z.object({
  url: z.string().max(2000),
  method: z.string().max(20),
  status: z.number().int().min(0).max(599),
  durationMs: z.number().min(0).max(600_000),
  timestamp: z.string().max(50),
});

const diagnosticsSchema = z.object({
  console: z.array(consoleEntrySchema).max(50),
  network: z.array(networkEntrySchema).max(20),
});

// Annotation rect position within the screenshot image, as fractions [0, 1]
// of the image dimensions (see `ScreenshotRegion` in core). Strict: this is
// persisted verbatim into a JSON column, so unknown keys are rejected rather
// than silently stored.
export const screenshotRegionSchema = z.strictObject({
  xPct: z.number().min(0).max(1),
  yPct: z.number().min(0).max(1),
  wPct: z.number().min(0).max(1),
  hPct: z.number().min(0).max(1),
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
  authorEmail: z.email().max(200),
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
  // Optional annotation-rect position within the screenshot. Sent by widgets
  // that capture context around the drawn rect; null + omitted are both
  // accepted so legacy clients (and captures without a screenshot) keep
  // working unchanged.
  screenshotRegion: screenshotRegionSchema.nullable().optional(),
  // Optional console + failed-network snapshot. The widget only attaches
  // this when `captureDiagnostics` is enabled; null + omitted are both
  // accepted so existing clients keep working unchanged.
  diagnostics: diagnosticsSchema.nullable().optional(),
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
  // Bucket status filter serialized as CSV over the wire (e.g.
  // `statuses=open,in_progress`). Non-empty strings are split before each value
  // is validated against the known statuses; `statuses` wins over the exact
  // `status` filter downstream. Capped at 4 — the number of known statuses.
  statuses: z
    .preprocess(
      (val) => (typeof val === "string" && val.length > 0 ? val.split(",") : val),
      z.array(z.enum(FEEDBACK_STATUSES)).max(4),
    )
    .optional(),
  search: z.string().max(200).optional(),
  // Page scope filters — used by the panel's "this page / this type" controls
  url: z.string().max(2000).optional(),
  urlPattern: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Explicit public interfaces — decoupled from Zod to keep .d.ts clean.
//
// The create payload needs no local interface at all: the schema validates
// core's `FeedbackPayload` wire shape, and the compile-time lock below keeps
// the two identical. Only the wire shapes that exist solely at this HTTP
// boundary (PATCH / DELETE / GET query) are declared here.
// ---------------------------------------------------------------------------

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
  statuses?: FeedbackStatus[] | undefined;
  search?: string | undefined;
  url?: string | undefined;
  urlPattern?: string | undefined;
}

// ---------------------------------------------------------------------------
// Type-level locks: the Zod schemas validate exactly the shapes the rest of
// the monorepo speaks.
//
// The create schema is locked against core's `FeedbackPayload` — the actual
// wire contract the widget sends — so schema drift from the real payload is
// a compile error, not a runtime 400. The boundary-only shapes (PATCH /
// DELETE / GET query) are locked against their local interfaces the same
// way. `Prettify<>` flattens the inferred shape so the equality check
// compares clean object types rather than intersection chains.
// ---------------------------------------------------------------------------

const _createSchemaMatchesPayload: AssertEqual<Prettify<zod.z.infer<typeof feedbackCreateSchema>>, FeedbackPayload> =
  true;
void _createSchemaMatchesPayload;
const _patchSchemaMatchesInput: AssertEqual<Prettify<zod.z.infer<typeof feedbackPatchSchema>>, FeedbackPatchInput> =
  true;
void _patchSchemaMatchesInput;
const _deleteSchemaMatchesInput: AssertEqual<
  Prettify<zod.z.infer<typeof feedbackDeleteSchema>>,
  FeedbackDeleteInput
> = true;
void _deleteSchemaMatchesInput;
const _querySchemaMatchesInput: AssertEqual<Prettify<zod.z.infer<typeof getQuerySchema>>, GetQueryInput> = true;
void _querySchemaMatchesInput;

/** Single validation issue extracted from a `ZodError`. */
export interface ValidationIssue {
  field: string;
  message: string;
}

/**
 * Map Zod errors to a flat array of `{ field, message }` objects.
 * Safe: does not leak input values or schema structure.
 */
export function formatValidationErrors(error: zod.z.ZodError): ValidationIssue[] {
  // Zod 4 types `issue.path` as PropertyKey[] (symbols possible in theory);
  // String() keeps the join total instead of throwing on non-string keys.
  return error.issues.map((issue) => ({
    field: issue.path.map(String).join("."),
    message: issue.message,
  }));
}
