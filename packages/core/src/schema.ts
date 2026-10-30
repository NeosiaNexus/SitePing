/**
 * Siteping database models — single source of truth.
 *
 * Used by:
 * - CLI to generate Prisma schema (via prisma-ast)
 * - Adapter for Zod validation
 * - Type exports
 *
 * This is a TS representation, NOT a .prisma file.
 * The CLI generates the actual Prisma schema from this definition.
 */

import type { AssertEqual } from "./type-utils.js";
import {
  ANCHOR_ELEMENT_ID_MAX,
  ANCHOR_ELEMENT_TAG_MAX,
  type AnnotationRecord,
  CLIENT_ID_MAX_LENGTH,
  COMMENT_BODY_MAX_LENGTH,
  type CommentRecord,
  type FeedbackRecord,
  IDENTITY_FIELD_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
} from "./types.js";

/** Prisma scalar types supported by Siteping field definitions. */
export type PrismaScalarType =
  | "String"
  | "Boolean"
  | "Int"
  | "BigInt"
  | "Float"
  | "Decimal"
  | "DateTime"
  | "Json"
  | "Bytes";

/** Prisma native column hints applied via `@db.<NativeType>`. */
export type PrismaNativeType = "Text" | "VarChar" | "Char" | "MediumText" | "LongText" | (string & {});

/** Relation cardinality between two Siteping models. */
export type RelationKind = "1-to-many" | "many-to-1";

/** Prisma `onDelete` referential action. */
export type RelationOnDelete = "Cascade" | "Restrict" | "NoAction" | "SetNull" | "SetDefault";

/**
 * Relation metadata attached to a {@link FieldDef}.
 *
 * - `1-to-many` fields point at the related model and require no inverse
 *   column on this side (`fields`/`references` are inferred by Prisma).
 * - `many-to-1` fields own the foreign key — Prisma needs `fields` and
 *   `references` to wire it up.
 */
export interface RelationDef {
  kind: RelationKind;
  model: string;
  fields?: readonly string[];
  references?: readonly string[];
  onDelete?: RelationOnDelete;
}

/**
 * Definition of a single field in a Siteping database model.
 *
 * The interface intentionally keeps a wide structural shape so it stays
 * easy to extend, but consumers can narrow via {@link isRelationField} /
 * {@link isScalarField} when relation vs. scalar logic diverges.
 */
export interface FieldDef {
  /** Prisma type (e.g. "String", "Int") for scalars, model name for relations. */
  type: PrismaScalarType | (string & {});
  /** Default literal (`"open"`) or function call (`now()`, `cuid()`). */
  default?: string;
  /** Whether the column is nullable. */
  optional?: boolean;
  /** Set on relation fields — absent on scalars. */
  relation?: RelationDef;
  isId?: boolean;
  isUnique?: boolean;
  /** Prisma native type attribute (e.g. "Text" for @db.Text) — used for MySQL compatibility on long strings */
  nativeType?: PrismaNativeType;
  /**
   * Longest value the HTTP handler accepts for this column, in characters —
   * set on every `String` column filled from a request body, and checked
   * against the handler's own caps. The CLI sizes the column from it where a
   * plain `String` is shorter: on MySQL, a `VARCHAR(191)`.
   */
  maxLength?: number;
  /** Prisma @updatedAt attribute */
  isUpdatedAt?: boolean;
}

/** Narrowing predicate: returns `true` when `field` declares a Prisma relation. */
export function isRelationField(field: FieldDef): field is FieldDef & { relation: RelationDef } {
  return field.relation !== undefined;
}

/** Narrowing predicate: returns `true` when `field` is a Prisma scalar (no relation metadata). */
export function isScalarField(field: FieldDef): field is FieldDef & { relation?: undefined } {
  return field.relation === undefined;
}

/** Definition of a composite index on a Siteping database model. */
export interface IndexDef {
  fields: readonly string[];
}

/** Definition of a single Siteping database model (fields + indexes). */
export interface ModelDef {
  fields: Record<string, FieldDef>;
  indexes?: readonly IndexDef[];
}

const _SITEPING_MODELS = {
  SitepingFeedback: {
    fields: {
      id: { type: "String", isId: true, default: "cuid()" },
      projectName: { type: "String", maxLength: PROJECT_NAME_MAX_LENGTH },
      type: { type: "String" },
      message: { type: "String", nativeType: "Text", maxLength: 5000 },
      status: { type: "String", default: '"open"' },
      url: { type: "String", maxLength: 2000 },
      urlPattern: { type: "String", optional: true, maxLength: 2000 },
      // The data URL itself when no `ScreenshotStorage` is plugged in.
      screenshotUrl: { type: "String", optional: true, nativeType: "Text", maxLength: 1_500_000 },
      screenshotRegion: { type: "Json", optional: true },
      diagnostics: { type: "Json", optional: true },
      viewport: { type: "String", maxLength: 50 },
      userAgent: { type: "String", maxLength: 500 },
      authorName: { type: "String", maxLength: IDENTITY_FIELD_MAX_LENGTH },
      authorEmail: { type: "String", maxLength: IDENTITY_FIELD_MAX_LENGTH },
      clientId: { type: "String", isUnique: true, maxLength: CLIENT_ID_MAX_LENGTH },
      resolvedAt: { type: "DateTime", optional: true },
      createdAt: { type: "DateTime", default: "now()" },
      updatedAt: { type: "DateTime", isUpdatedAt: true },
      annotations: {
        type: "SitepingAnnotation",
        relation: { kind: "1-to-many", model: "SitepingAnnotation" },
      },
      comments: {
        type: "SitepingComment",
        relation: { kind: "1-to-many", model: "SitepingComment" },
      },
    },
    indexes: [
      { fields: ["projectName"] },
      { fields: ["projectName", "status", "createdAt"] },
      { fields: ["projectName", "url"] },
    ],
  },
  SitepingAnnotation: {
    fields: {
      id: { type: "String", isId: true, default: "cuid()" },
      feedbackId: { type: "String" },
      feedback: {
        type: "SitepingFeedback",
        relation: {
          kind: "many-to-1",
          model: "SitepingFeedback",
          fields: ["feedbackId"],
          references: ["id"],
          onDelete: "Cascade",
        },
      },
      cssSelector: { type: "String", nativeType: "Text", maxLength: 2000 },
      xpath: { type: "String", nativeType: "Text", maxLength: 2000 },
      textSnippet: { type: "String", nativeType: "Text", maxLength: 500 },
      elementTag: { type: "String", maxLength: ANCHOR_ELEMENT_TAG_MAX },
      elementId: { type: "String", optional: true, maxLength: ANCHOR_ELEMENT_ID_MAX },
      textPrefix: { type: "String", nativeType: "Text", maxLength: 200 },
      textSuffix: { type: "String", nativeType: "Text", maxLength: 200 },
      fingerprint: { type: "String", maxLength: 200 },
      neighborText: { type: "String", nativeType: "Text", maxLength: 500 },
      anchorKey: { type: "String", optional: true, maxLength: 200 },
      xPct: { type: "Float" },
      yPct: { type: "Float" },
      wPct: { type: "Float" },
      hPct: { type: "Float" },
      scrollX: { type: "Float" },
      scrollY: { type: "Float" },
      viewportW: { type: "Int" },
      viewportH: { type: "Int" },
      devicePixelRatio: { type: "Float", default: "1" },
      createdAt: { type: "DateTime", default: "now()" },
    },
    indexes: [{ fields: ["feedbackId"] }],
  },
  SitepingComment: {
    fields: {
      id: { type: "String", isId: true, default: "cuid()" },
      feedbackId: { type: "String" },
      feedback: {
        type: "SitepingFeedback",
        relation: {
          kind: "many-to-1",
          model: "SitepingFeedback",
          fields: ["feedbackId"],
          references: ["id"],
          onDelete: "Cascade",
        },
      },
      body: { type: "String", nativeType: "Text", maxLength: COMMENT_BODY_MAX_LENGTH },
      authorName: { type: "String", maxLength: IDENTITY_FIELD_MAX_LENGTH },
      authorEmail: { type: "String", maxLength: IDENTITY_FIELD_MAX_LENGTH },
      authorRole: { type: "String", default: '"client"' },
      clientId: { type: "String", isUnique: true, maxLength: CLIENT_ID_MAX_LENGTH },
      createdAt: { type: "DateTime", default: "now()" },
    },
    // A thread is read oldest first, one feedback at a time.
    indexes: [{ fields: ["feedbackId", "createdAt"] }],
  },
} as const satisfies Record<string, ModelDef>;

/** Map of Siteping models keyed by model name — frozen at runtime. */
export const SITEPING_MODELS: typeof _SITEPING_MODELS = Object.freeze(_SITEPING_MODELS);

/** Union of every Siteping model name as a string literal. */
export type SitepingModelName = keyof typeof SITEPING_MODELS;

/** Field names declared on a specific Siteping model. */
export type SitepingModelFieldName<M extends SitepingModelName> = keyof (typeof SITEPING_MODELS)[M]["fields"];

// ---------------------------------------------------------------------------
// Compile-time locks — the Prisma model definitions and the store record
// interfaces describe the same columns. Adding a field to one side without
// the other is a compile error here (the CLI generates the actual Prisma
// schema from SITEPING_MODELS, so a missed column would otherwise only
// surface as a runtime Prisma error).
// ---------------------------------------------------------------------------

const _feedbackModelMatchesRecord: AssertEqual<SitepingModelFieldName<"SitepingFeedback">, keyof FeedbackRecord> = true;
void _feedbackModelMatchesRecord;

// `feedback` is the relation back-reference — the only field with no record
// counterpart.
const _annotationModelMatchesRecord: AssertEqual<
  Exclude<SitepingModelFieldName<"SitepingAnnotation">, "feedback">,
  keyof AnnotationRecord
> = true;
void _annotationModelMatchesRecord;

const _commentModelMatchesRecord: AssertEqual<
  Exclude<SitepingModelFieldName<"SitepingComment">, "feedback">,
  keyof CommentRecord
> = true;
void _commentModelMatchesRecord;
