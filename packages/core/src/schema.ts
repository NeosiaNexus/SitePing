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

/** Definition of a single field in a Siteping database model. */
export interface FieldDef {
  type: string;
  default?: string;
  optional?: boolean;
  relation?: {
    kind: "1-to-many" | "many-to-1";
    model: string;
    fields?: string[];
    references?: string[];
    onDelete?: string;
  };
  isId?: boolean;
  isUnique?: boolean;
  /** Prisma native type attribute (e.g. "Text" for @db.Text) — used for MySQL compatibility on long strings */
  nativeType?: string;
  /** Prisma @updatedAt attribute */
  isUpdatedAt?: boolean;
}

/** Definition of a composite index on a Siteping database model. */
export interface IndexDef {
  fields: string[];
}

/** Definition of a single Siteping database model (fields + indexes). */
export interface ModelDef {
  fields: Record<string, FieldDef>;
  indexes?: IndexDef[];
}

const _SITEPING_MODELS = {
  SitepingFeedback: {
    fields: {
      id: { type: "String", isId: true, default: "cuid()" },
      projectName: { type: "String" },
      type: { type: "String" },
      message: { type: "String", nativeType: "Text" },
      status: { type: "String", default: '"open"' },
      url: { type: "String" },
      urlPattern: { type: "String", optional: true },
      screenshotUrl: { type: "String", optional: true, nativeType: "Text" },
      viewport: { type: "String" },
      userAgent: { type: "String" },
      authorName: { type: "String" },
      authorEmail: { type: "String" },
      clientId: { type: "String", isUnique: true },
      resolvedAt: { type: "DateTime", optional: true },
      createdAt: { type: "DateTime", default: "now()" },
      updatedAt: { type: "DateTime", isUpdatedAt: true },
      annotations: {
        type: "SitepingAnnotation",
        relation: { kind: "1-to-many", model: "SitepingAnnotation" },
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
      cssSelector: { type: "String", nativeType: "Text" },
      xpath: { type: "String", nativeType: "Text" },
      textSnippet: { type: "String", nativeType: "Text" },
      elementTag: { type: "String" },
      elementId: { type: "String", optional: true },
      textPrefix: { type: "String", nativeType: "Text" },
      textSuffix: { type: "String", nativeType: "Text" },
      fingerprint: { type: "String" },
      neighborText: { type: "String", nativeType: "Text" },
      anchorKey: { type: "String", optional: true },
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
} as const satisfies Record<string, ModelDef>;

export const SITEPING_MODELS = Object.freeze(_SITEPING_MODELS);
