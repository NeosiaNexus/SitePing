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
}

export interface IndexDef {
  fields: string[];
}

interface ModelDef {
  fields: Record<string, FieldDef>;
  indexes?: IndexDef[];
}

export const SITEPING_MODELS: Record<string, ModelDef> = {
  SitepingFeedback: {
    fields: {
      id: { type: "String", isId: true, default: "cuid()" },
      projectName: { type: "String" },
      type: { type: "String" },
      message: { type: "String" },
      status: { type: "String", default: '"open"' },
      url: { type: "String" },
      viewport: { type: "String" },
      userAgent: { type: "String" },
      authorName: { type: "String" },
      authorEmail: { type: "String" },
      clientId: { type: "String", isUnique: true },
      resolvedAt: { type: "DateTime", optional: true },
      createdAt: { type: "DateTime", default: "now()" },
      annotations: {
        type: "SitepingAnnotation",
        relation: { kind: "1-to-many", model: "SitepingAnnotation" },
      },
    },
    indexes: [{ fields: ["projectName"] }],
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
      cssSelector: { type: "String" },
      xpath: { type: "String" },
      textSnippet: { type: "String" },
      elementTag: { type: "String" },
      elementId: { type: "String", optional: true },
      textPrefix: { type: "String" },
      textSuffix: { type: "String" },
      fingerprint: { type: "String" },
      neighborText: { type: "String" },
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
};
