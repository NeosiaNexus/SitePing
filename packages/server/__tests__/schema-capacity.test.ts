import { type FieldDef, isScalarField, SITEPING_MODELS, type SitepingModelName } from "@siteping/core";
import { describe, expect, it } from "vitest";
import type * as zod from "zod";
import { commentCreateSchema, feedbackCreateSchema } from "../src/validation.js";
import { validAnnotation, validPayload } from "./fixtures.js";

// `SITEPING_MODELS` declares, as `maxLength`, the longest value each column
// must hold — the CLI sizes the MySQL columns from it. These tests pin it to
// what the HTTP schemas actually accept, field by field: a cap raised here
// without its column would pass validation and fail the insert (a 422 on
// MySQL), and a new free-text field needs a column sized for it.

type AnySchema = zod.z.ZodType;

/** The request fields that land in one model's columns. */
interface Surface {
  model: SitepingModelName;
  /** The object schema those fields are declared in. */
  fields: zod.z.ZodObject;
  /** Parse a whole request built by `build`. */
  parse(input: unknown): { success: boolean; data?: unknown };
  /** A valid request with `field` set to `value`. */
  build(field: string, value: string): unknown;
  /** `field`, read back from the parsed request. */
  read(parsed: unknown, field: string): unknown;
}

const validComment = {
  projectName: "test-project",
  feedbackId: "feedback-1",
  body: "Fixed on staging?",
  authorName: "Alice",
  authorEmail: "alice@example.com",
  clientId: "comment-1",
};

const SURFACES: Surface[] = [
  {
    model: "SitepingFeedback",
    fields: feedbackCreateSchema,
    parse: (input) => feedbackCreateSchema.safeParse(input),
    build: (field, value) => ({ ...validPayload, [field]: value }),
    read: (parsed, field) => (parsed as Record<string, unknown>)[field],
  },
  {
    model: "SitepingAnnotation",
    fields: feedbackCreateSchema.shape.annotations.def.out.def.element.shape.anchor,
    parse: (input) => feedbackCreateSchema.safeParse(input),
    build: (field, value) => ({
      ...validPayload,
      annotations: [{ ...validAnnotation, anchor: { ...validAnnotation.anchor, [field]: value } }],
    }),
    read: (parsed, field) =>
      (parsed as { annotations: Array<{ anchor: Record<string, unknown> }> }).annotations[0]?.anchor[field],
  },
  {
    model: "SitepingComment",
    fields: commentCreateSchema,
    parse: (input) => commentCreateSchema.safeParse(input),
    build: (field, value) => ({ ...validComment, [field]: value }),
    read: (parsed, field) => (parsed as Record<string, unknown>)[field],
  },
];

/** The request field a column is filled from, where the names differ. */
const SOURCE_FIELD: Partial<Record<string, string>> = { screenshotUrl: "screenshotDataUrl" };

/**
 * Request fields not stored as sent: a comment's `projectName` only scopes
 * the request, and its `feedbackId` is resolved against a stored feedback,
 * whose generated id is what the row keeps.
 */
const NOT_STORED_AS_SENT: Partial<Record<SitepingModelName, readonly string[]>> = {
  SitepingComment: ["projectName", "feedbackId"],
};

/** `String` columns never filled from free text: generated ids and enum values. */
const GENERATED_OR_ENUM = new Set(["id", "feedbackId", "type", "status", "authorRole"]);

/** The parts of a zod `def` the walk below reads. */
interface SchemaDef {
  type: string;
  innerType?: AnySchema;
  in?: AnySchema;
  options?: readonly AnySchema[];
}

/** Whether `schema`, its optional/nullable/default/transform wrappers peeled, takes free text. */
function isFreeText(schema: AnySchema | undefined): boolean {
  const def = schema?.def as SchemaDef | undefined;
  switch (def?.type) {
    case "string":
      return true;
    case "optional":
    case "nullable":
    case "default":
      return isFreeText(def.innerType);
    case "pipe":
      return isFreeText(def.in);
    case "union":
      return def.options?.some(isFreeText) ?? false;
    default:
      return false;
  }
}

/** A value of exactly `length` characters that the field's format accepts. */
function valueOfLength(field: string, length: number): string {
  if (field === "screenshotDataUrl") {
    const prefix = "data:image/jpeg;base64,";
    return prefix + "a".repeat(length - prefix.length);
  }
  if (field === "authorEmail") {
    // A 64-character local part, then domain labels of at most 63.
    const local = "a".repeat(64);
    const labels: string[] = [];
    let left = length - local.length - 1;
    while (left > 63) {
      labels.push("b".repeat(63));
      left -= 64;
    }
    labels.push("c".repeat(left));
    return `${local}@${labels.join(".")}`;
  }
  return "a".repeat(length);
}

describe.each(SURFACES)("$model columns hold what the HTTP schema accepts", (surface) => {
  const columns: Record<string, FieldDef> = SITEPING_MODELS[surface.model].fields;
  const notStored = NOT_STORED_AS_SENT[surface.model] ?? [];
  const freeText = Object.entries(surface.fields.shape)
    .filter(([field, schema]) => isFreeText(schema as AnySchema) && !notStored.includes(field))
    .map(([field]) => field);
  const columnOf = (field: string) =>
    Object.keys(columns).find((column) => (SOURCE_FIELD[column] ?? column) === field) ?? field;

  it.each(freeText)("%s: the column's maxLength is the longest value the schema keeps", (field) => {
    const column = columnOf(field);
    const maxLength = columns[column]?.maxLength;
    if (maxLength === undefined) throw new Error(`${surface.model}.${column} declares no maxLength`);

    const atLimit = surface.parse(surface.build(field, valueOfLength(field, maxLength)));
    expect(atLimit.success, `a ${maxLength}-character ${field} is refused`).toBe(true);
    expect(surface.read(atLimit.data, field)).toHaveLength(maxLength);

    // One character more is refused, or dropped (an over-long `elementId`).
    const over = surface.parse(surface.build(field, valueOfLength(field, maxLength + 1)));
    if (over.success) {
      const kept = surface.read(over.data, field);
      expect(kept, `a ${maxLength + 1}-character ${field} is kept: the column must grow with the cap`).toBeUndefined();
    }
  });

  it("fills every String column from one of those fields, unless it never takes free text", () => {
    const filled = new Set(freeText.map(columnOf));
    for (const [column, def] of Object.entries(columns)) {
      if (!isScalarField(def) || def.type !== "String") continue;
      if (GENERATED_OR_ENUM.has(column)) {
        expect(def.maxLength, `${surface.model}.${column}`).toBeUndefined();
      } else {
        expect(filled, `${surface.model}.${column} is filled from no request field`).toContain(column);
      }
    }
  });
});
