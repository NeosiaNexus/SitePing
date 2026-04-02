import { getSchema, printSchema } from "@mrleebo/prisma-ast";
import type { Model, Field, AttributeArgument } from "@mrleebo/prisma-ast";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { SITEPING_MODELS, type FieldDef } from "../../adapter-prisma/schema.js";

const DEFAULT_SCHEMA_PATH = "prisma/schema.prisma";

/**
 * Inject Siteping models into an existing Prisma schema.
 *
 * Uses prisma-ast for AST-level manipulation (no regex/string concat).
 * Idempotent: skips models that already exist.
 *
 * @returns List of added model names (empty if nothing was added)
 */
export function injectPrismaModels(
  schemaPath: string = DEFAULT_SCHEMA_PATH,
): { added: string[]; schemaPath: string } {
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const source = readFileSync(schemaPath, "utf-8");
  const schema = getSchema(source);

  const existingModels = new Set(
    schema.list
      .filter((item): item is Model => item.type === "model")
      .map((m) => m.name),
  );

  const added: string[] = [];

  for (const [modelName, modelDef] of Object.entries(SITEPING_MODELS)) {
    if (existingModels.has(modelName)) continue;

    const model: Model = {
      type: "model",
      name: modelName,
      properties: [],
    };

    for (const [fieldName, fieldDef] of Object.entries(modelDef.fields)) {
      const field = buildField(fieldName, fieldDef);
      model.properties.push(field);
    }

    schema.list.push(model);
    added.push(modelName);
  }

  if (added.length > 0) {
    const output = printSchema(schema);
    writeFileSync(schemaPath, output, "utf-8");
  }

  return { added, schemaPath };
}

function buildField(name: string, def: FieldDef): Field {
  const field: Field = {
    type: "field",
    name,
    fieldType: def.relation ? def.relation.model : def.type,
    optional: def.optional ?? false,
    array: def.relation?.kind === "1-to-many",
    attributes: [],
  };

  if (def.isId) {
    field.attributes!.push({ type: "attribute", name: "id", kind: "field" });
    if (def.default) {
      field.attributes!.push({
        type: "attribute",
        name: "default",
        kind: "field",
        args: [{ type: "attributeArgument", value: { type: "function", name: def.default.replace("()", ""), params: [] } } as AttributeArgument],
      });
    }
  } else if (def.default && !def.relation) {
    const isFunction = def.default.endsWith("()");
    field.attributes!.push({
      type: "attribute",
      name: "default",
      kind: "field",
      args: [
        {
          type: "attributeArgument",
          value: isFunction
            ? { type: "function", name: def.default.replace("()", ""), params: [] }
            : def.default,
        } as AttributeArgument,
      ],
    });
  }

  if (def.isUnique) {
    field.attributes!.push({ type: "attribute", name: "unique", kind: "field" });
  }

  if (def.relation?.kind === "many-to-1") {
    const args: AttributeArgument[] = [];
    if (def.relation.fields) {
      args.push({
        type: "attributeArgument",
        value: { type: "keyValue", key: "fields", value: { type: "array", args: def.relation.fields } },
      } as AttributeArgument);
    }
    if (def.relation.references) {
      args.push({
        type: "attributeArgument",
        value: { type: "keyValue", key: "references", value: { type: "array", args: def.relation.references } },
      } as AttributeArgument);
    }
    if (def.relation.onDelete) {
      args.push({
        type: "attributeArgument",
        value: { type: "keyValue", key: "onDelete", value: def.relation.onDelete },
      } as AttributeArgument);
    }
    field.attributes!.push({
      type: "attribute",
      name: "relation",
      kind: "field",
      args,
    });
  }

  return field;
}
