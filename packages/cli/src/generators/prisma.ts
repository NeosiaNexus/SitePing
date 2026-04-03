import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { AttributeArgument, BlockAttribute, Field, Model, Property } from "@mrleebo/prisma-ast";
import { getSchema, printSchema } from "@mrleebo/prisma-ast";
import { type FieldDef, type IndexDef, SITEPING_MODELS } from "@siteping/core";

const DEFAULT_SCHEMA_PATH = "prisma/schema.prisma";

export interface FieldChange {
  model: string;
  field: string;
  action: "added" | "updated";
  detail: string;
}

export interface SyncResult {
  schemaPath: string;
  addedModels: string[];
  changes: FieldChange[];
}

/**
 * Sync Siteping models into an existing Prisma schema.
 *
 * Uses prisma-ast for AST-level manipulation (no regex/string concat).
 * - Missing models are created
 * - Missing fields are added
 * - Fields with wrong type/optional/attributes are updated
 * - User-added fields outside Siteping's definition are left untouched
 */
export function syncPrismaModels(schemaPath: string = DEFAULT_SCHEMA_PATH): SyncResult {
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const source = readFileSync(schemaPath, "utf-8");
  const schema = getSchema(source);

  const existingModelsMap = new Map<string, Model>();
  for (const item of schema.list) {
    if (item.type === "model") {
      existingModelsMap.set(item.name, item as Model);
    }
  }

  const addedModels: string[] = [];
  const changes: FieldChange[] = [];

  for (const [modelName, modelDef] of Object.entries(SITEPING_MODELS)) {
    const existingModel = existingModelsMap.get(modelName);

    if (!existingModel) {
      const model: Model = { type: "model", name: modelName, properties: [] };
      for (const [fieldName, fieldDef] of Object.entries(modelDef.fields)) {
        model.properties.push(buildField(fieldName, fieldDef));
      }
      if (modelDef.indexes) {
        for (const idx of modelDef.indexes) {
          model.properties.push(buildBlockIndex(idx));
        }
      }
      schema.list.push(model);
      addedModels.push(modelName);
      continue;
    }

    // Model exists — diff fields
    const existingFields = new Map<string, { field: Field; index: number }>();
    existingModel.properties.forEach((prop, idx) => {
      if (prop.type === "field") {
        existingFields.set((prop as Field).name, { field: prop as Field, index: idx });
      }
    });

    const fieldsToAdd: Field[] = [];
    const fieldsToUpdate: Array<{ index: number; field: Field }> = [];

    for (const [fieldName, fieldDef] of Object.entries(modelDef.fields)) {
      const expected = buildField(fieldName, fieldDef);
      const existing = existingFields.get(fieldName);

      if (!existing) {
        fieldsToAdd.push(expected);
        changes.push({
          model: modelName,
          field: fieldName,
          action: "added",
          detail: formatFieldSignature(fieldDef),
        });
      } else if (!fieldsMatch(existing.field, expected)) {
        fieldsToUpdate.push({ index: existing.index, field: expected });
        changes.push({
          model: modelName,
          field: fieldName,
          action: "updated",
          detail: describeChange(existing.field, expected),
        });
      }
    }

    // Apply updates in-place (doesn't shift indices)
    for (const { index, field } of fieldsToUpdate) {
      existingModel.properties[index] = field;
    }

    // Insert new fields before createdAt (or at end)
    if (fieldsToAdd.length > 0) {
      const createdAtIdx = existingModel.properties.findIndex(
        (p) => p.type === "field" && (p as Field).name === "createdAt",
      );
      if (createdAtIdx >= 0) {
        existingModel.properties.splice(createdAtIdx, 0, ...fieldsToAdd);
      } else {
        existingModel.properties.push(...fieldsToAdd);
      }
    }

    // Sync @@index block attributes
    if (modelDef.indexes) {
      for (const idx of modelDef.indexes) {
        if (!hasBlockIndex(existingModel, idx)) {
          existingModel.properties.push(buildBlockIndex(idx));
          changes.push({
            model: modelName,
            field: `@@index([${idx.fields.join(", ")}])`,
            action: "added",
            detail: "index",
          });
        }
      }
    }
  }

  if (addedModels.length > 0 || changes.length > 0) {
    const output = printSchema(schema);
    writeFileSync(schemaPath, output, "utf-8");
  }

  return { schemaPath, addedModels, changes };
}

/** Check if two fields have the same type, optionality, and attributes. */
function fieldsMatch(existing: Field, expected: Field): boolean {
  if (existing.fieldType !== expected.fieldType) return false;
  if ((existing.optional ?? false) !== (expected.optional ?? false)) return false;
  if ((existing.array ?? false) !== (expected.array ?? false)) return false;

  const existingAttrs = (existing.attributes ?? []).map((a) => a.name).sort();
  const expectedAttrs = (expected.attributes ?? []).map((a) => a.name).sort();

  if (existingAttrs.length !== expectedAttrs.length) return false;
  return existingAttrs.every((name, i) => name === expectedAttrs[i]);
}

/** Human-readable description of what changed. */
function describeChange(existing: Field, expected: Field): string {
  const parts: string[] = [];

  if (existing.fieldType !== expected.fieldType) {
    parts.push(`${existing.fieldType} → ${expected.fieldType}`);
  }
  if ((existing.optional ?? false) !== (expected.optional ?? false)) {
    parts.push(expected.optional ? "required → optional" : "optional → required");
  }

  const existingAttrs = new Set((existing.attributes ?? []).map((a) => a.name));
  const expectedAttrs = new Set((expected.attributes ?? []).map((a) => a.name));
  for (const attr of expectedAttrs) {
    if (!existingAttrs.has(attr)) parts.push(`+@${attr}`);
  }
  for (const attr of existingAttrs) {
    if (!expectedAttrs.has(attr)) parts.push(`-@${attr}`);
  }

  return parts.join(", ") || "attributes changed";
}

/** Format a field definition for display. */
function formatFieldSignature(def: FieldDef): string {
  let sig = def.type;
  if (def.optional) sig += "?";
  return sig;
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
        args: [
          {
            type: "attributeArgument",
            value: { type: "function", name: def.default.replace("()", ""), params: [] },
          } as AttributeArgument,
        ],
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
          value: isFunction ? { type: "function", name: def.default.replace("()", ""), params: [] } : def.default,
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

function buildBlockIndex(idx: IndexDef): Property {
  return {
    type: "attribute",
    kind: "object",
    name: "index",
    args: [
      {
        type: "attributeArgument",
        value: { type: "array", args: idx.fields },
      } as AttributeArgument,
    ],
  } as BlockAttribute;
}

function hasBlockIndex(model: Model, idx: IndexDef): boolean {
  const key = idx.fields.join(",");
  return model.properties.some((p) => {
    if (p.type !== "attribute" || (p as BlockAttribute).name !== "index") return false;
    const attr = p as BlockAttribute;
    const firstArg = attr.args?.[0];
    if (!firstArg || firstArg.type !== "attributeArgument") return false;
    const val = firstArg.value;
    if (typeof val === "object" && val !== null && "type" in val && val.type === "array") {
      return (val as { type: "array"; args: string[] }).args.join(",") === key;
    }
    return false;
  });
}
