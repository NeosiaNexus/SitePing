// Must run before prisma-ast: chevrotain needs Object.groupBy (Node 21+).
import "../utils/object-group-by-polyfill.js";
import { readFileSync, writeFileSync } from "node:fs";
import type {
  Attribute,
  AttributeArgument,
  BlockAttribute,
  Field,
  Func,
  KeyValue,
  Model,
  ObjectValue,
  Property,
  RelationArray,
  Schema,
} from "@mrleebo/prisma-ast";
import { getSchema, printSchema } from "@mrleebo/prisma-ast";
import { type FieldDef, type IndexDef, SITEPING_MODELS, type SitepingModelName } from "@siteping/core";

const DEFAULT_SCHEMA_PATH = "prisma/schema.prisma";

export interface FieldChange {
  model: string;
  field: string;
  action: "added" | "updated";
  detail: string;
}

/** What reconciling a schema with `SITEPING_MODELS` had to change — empty means up to date. */
export interface SchemaReconciliation {
  addedModels: string[];
  changes: FieldChange[];
}

export interface SyncResult extends SchemaReconciliation {
  schemaPath: string;
}

/**
 * Sync Siteping models into an existing Prisma schema.
 *
 * Uses prisma-ast for AST-level manipulation (no regex/string concat).
 * - Missing models are created
 * - Missing fields are added
 * - Fields with wrong type/optional/attributes are updated (user-owned parts kept)
 * - User-added fields outside Siteping's definition are left untouched
 */
export function syncPrismaModels(schemaPath: string = DEFAULT_SCHEMA_PATH): SyncResult {
  const schema = getSchema(readSchemaSource(schemaPath));
  const { addedModels, changes } = reconcileSitepingModels(schema);

  if (addedModels.length > 0 || changes.length > 0) {
    // prisma-ast's printSchema() unconditionally prepends a newline, and prints
    // blank lines as os.EOL ("\r\n" on Windows) -- strip both forms (#98)
    const output = printPreservingDocs(schema).replace(/^(\r?\n)+/, "");
    try {
      writeFileSync(schemaPath, output, "utf-8");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EACCES" || code === "EPERM") {
        throw new Error(`Permission denied: cannot write to ${schemaPath}. Check file permissions.`);
      }
      throw error;
    }
  }

  return { schemaPath, addedModels, changes };
}

/** Private-use sentinel: can't occur in a schema, survives printSchema() verbatim. */
const ATTACHED_DOC = "\uE000";

/**
 * printSchema(), keeping `///` doc comments on their block. It opens every
 * block with a blank line, which detaches a doc from the model/enum below it
 * (Prisma then drops the documentation). The docs that sit directly on a
 * block are marked and the gap closed after printing; a doc the user had
 * already separated by a blank line stays separated.
 */
function printPreservingDocs(schema: Schema): string {
  const list = schema.list.map((block, i) => {
    const next = schema.list[i + 1];
    const attached = next !== undefined && next.type !== "comment" && next.type !== "break";
    return block.type === "comment" && block.text.startsWith("///") && attached
      ? { ...block, text: block.text + ATTACHED_DOC }
      : block;
  });
  return printSchema({ ...schema, list })
    .replace(new RegExp(`${ATTACHED_DOC}(\\r?\\n)(?:[ \\t]*\\r?\\n)+`, "g"), "$1")
    .replaceAll(ATTACHED_DOC, "");
}

/**
 * Read the schema file, turning a missing file into the CLI's own error. The
 * read itself is the existence check — a separate existence probe followed
 * by the read would be a check-then-act race on a user-controlled path.
 */
function readSchemaSource(schemaPath: string): string {
  try {
    return readFileSync(schemaPath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }
    throw error;
  }
}

/**
 * Reconcile a parsed Prisma schema with the Siteping model definitions,
 * updating the AST in place, and report what had to change. This is the one
 * definition of "up to date" — `sync` writes the reconciled schema back,
 * `status` only reads the report — so both commands agree on type,
 * optionality, cardinality, attributes and their arguments (`@unique`,
 * `@db.Text`, `@default(…)`, `@updatedAt`, `@relation(…)`) and `@@index` blocks.
 */
export function reconcileSitepingModels(schema: Schema): SchemaReconciliation {
  const existingModelsMap = new Map<string, Model>();
  for (const item of schema.list) {
    if (item.type === "model") {
      existingModelsMap.set(item.name, item as Model);
    }
  }

  const provider = datasourceProvider(schema);
  const addedModels: string[] = [];
  const changes: FieldChange[] = [];

  for (const [modelName, modelDef] of Object.entries(SITEPING_MODELS)) {
    const existingModel = existingModelsMap.get(modelName);

    if (!existingModel) {
      const model: Model = { type: "model", name: modelName, properties: [] };
      for (const [fieldName, fieldDef] of Object.entries(modelDef.fields)) {
        model.properties.push(buildField(fieldName, fieldDef, provider));
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
      const expected = buildField(fieldName, fieldDef, provider);
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
        fieldsToUpdate.push({ index: existing.index, field: withUserOwnedParts(expected, existing.field) });
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

    // Insert new fields before createdAt (or at end) — above the comments
    // right over createdAt, which would otherwise document the new field
    if (fieldsToAdd.length > 0) {
      let createdAtIdx = existingModel.properties.findIndex(
        (p) => p.type === "field" && (p as Field).name === "createdAt",
      );
      if (createdAtIdx >= 0) {
        while (existingModel.properties[createdAtIdx - 1]?.type === "comment") createdAtIdx--;
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

  return { addedModels, changes };
}

// ── User-owned parts of a Siteping field ───────────────────────────────
// The column name (`@map`), `@ignore`, the relation name, constraint names
// (`map:` arguments) and the field's comment belong to the user: they're never
// compared, and a rewrite carries them over. Dropping a `@map` makes
// `prisma db push` rename/drop the column; dropping a relation name on one
// side only leaves the schema invalid.

const USER_OWNED_ATTRIBUTES: ReadonlySet<string> = new Set(["map", "ignore"]);

function isUserOwnedAttribute(attr: Attribute): boolean {
  return !attr.group && USER_OWNED_ATTRIBUTES.has(attr.name);
}

function isRelation(attr: Attribute): boolean {
  return !attr.group && attr.name === "relation";
}

function isKeyValue(value: unknown): value is KeyValue {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "keyValue";
}

/** `map: "…"` — a database constraint name (`@id(map: …)`, `@relation(…, map: …)`). */
function isConstraintName(arg: AttributeArgument): boolean {
  return isKeyValue(arg.value) && arg.value.key === "map";
}

/** A constraint name, or the relation name: `@relation("Name", …)` / `@relation(name: "Name", …)`. */
function isUserOwnedArg(attr: Attribute, arg: AttributeArgument): boolean {
  if (isConstraintName(arg)) return true;
  return isRelation(attr) && (typeof arg.value === "string" || (isKeyValue(arg.value) && arg.value.key === "name"));
}

/**
 * The attributes `sync` owns on a field — user-owned ones left out. A
 * `@relation` that only carries a name says nothing Siteping owns, so it's
 * left out too (`annotations SitepingAnnotation[] @relation("X")` is up to date).
 */
function sitepingAttributes(field: Field): Attribute[] {
  return (field.attributes ?? []).filter(
    (attr) =>
      !isUserOwnedAttribute(attr) && !(isRelation(attr) && (attr.args ?? []).every((arg) => isUserOwnedArg(attr, arg))),
  );
}

/** `expected`, carrying over the user-owned parts of the field it replaces. */
function withUserOwnedParts(expected: Field, existing: Field): Field {
  const existingAttrs = existing.attributes ?? [];
  const ownedArgs = (attr: Attribute): AttributeArgument[] => {
    const same = existingAttrs.find((a) => a.name === attr.name && a.group === attr.group);
    return same?.args?.filter((arg) => isUserOwnedArg(same, arg)) ?? [];
  };
  const attributes = (expected.attributes ?? []).map((attr) => {
    const owned = ownedArgs(attr);
    if (owned.length === 0) return attr;
    // The relation name leads (`@relation("Name", …)`), constraint names trail.
    const args = [
      ...owned.filter((a) => !isConstraintName(a)),
      ...(attr.args ?? []),
      ...owned.filter(isConstraintName),
    ];
    return { ...attr, args };
  });
  const relation = existingAttrs.find(isRelation);
  if (relation && !attributes.some(isRelation) && ownedArgs(relation).length > 0) {
    attributes.push({ type: "attribute", name: "relation", kind: "field", args: ownedArgs(relation) });
  }
  attributes.push(...existingAttrs.filter(isUserOwnedAttribute));
  return { ...expected, attributes, ...(existing.comment ? { comment: existing.comment } : {}) };
}

/** Canonical text of an attribute argument value: `cuid()`, `[feedbackId]`, `1.0` → `1`. */
function printValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(printValue).join(", ")}]`;
  if (typeof value === "object" && value !== null) {
    const v = value as Func | RelationArray | KeyValue | ObjectValue;
    switch (v.type) {
      case "array":
        return `[${v.args.map(printValue).join(", ")}]`;
      case "function":
        return `${v.name}(${(v.params ?? []).map(printValue).join(", ")})`;
      case "keyValue":
        return `${v.key}: ${printValue(v.value)}`;
      case "object":
        return `{ ${v.properties.map(printValue).join(", ")} }`;
    }
  }
  // prisma-ast hands numbers over as their source text
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return String(Number(value));
  return String(value);
}

/**
 * Canonical form of a Siteping-owned attribute — name plus arguments, so a
 * removed `onDelete: Cascade` or a `@default(uuid())` counts as drift. User-owned
 * arguments are left out; keyed arguments are order-insensitive, so they're sorted.
 */
function attrKey(attr: Attribute): string {
  const name = attr.group ? `${attr.group}.${attr.name}` : attr.name;
  const args = (attr.args ?? []).filter((arg) => !isUserOwnedArg(attr, arg));
  const positional = args.filter((arg) => !isKeyValue(arg.value)).map((arg) => printValue(arg.value));
  const keyed = args.filter((arg) => isKeyValue(arg.value)).map((arg) => printValue(arg.value));
  const printed = [...positional, ...keyed.sort()];
  return printed.length > 0 ? `${name}(${printed.join(", ")})` : name;
}

/** Check if two fields have the same type, optionality, and Siteping-owned attributes. */
function fieldsMatch(existing: Field, expected: Field): boolean {
  if (existing.fieldType !== expected.fieldType) return false;
  if ((existing.optional ?? false) !== (expected.optional ?? false)) return false;
  if ((existing.array ?? false) !== (expected.array ?? false)) return false;

  const existingAttrs = sitepingAttributes(existing).map(attrKey).sort();
  const expectedAttrs = sitepingAttributes(expected).map(attrKey).sort();

  if (existingAttrs.length !== expectedAttrs.length) return false;
  return existingAttrs.every((key, i) => key === expectedAttrs[i]);
}

/** Human-readable description of what changed. */
function describeChange(existing: Field, expected: Field): string {
  const parts: string[] = [];

  if (existing.fieldType !== expected.fieldType) {
    parts.push(`${existing.fieldType} → ${expected.fieldType}`);
  }
  if ((existing.optional ?? false) !== (expected.optional ?? false)) {
    parts.push(expected.optional ? "required \u2192 optional" : "optional \u2192 required");
  }

  const existingAttrs = sitepingAttributes(existing).map(attrKey);
  const expectedAttrs = sitepingAttributes(expected).map(attrKey);
  const nameOf = (key: string) => key.split("(")[0];
  const removed = existingAttrs.filter((key) => !expectedAttrs.includes(key));
  for (const key of expectedAttrs) {
    if (existingAttrs.includes(key)) continue;
    // Same attribute, different arguments: one change, not a -/+ pair.
    const was = removed.find((old) => nameOf(old) === nameOf(key));
    parts.push(was ? `@${was} → @${key}` : `+@${key}`);
  }
  for (const key of removed) {
    if (!expectedAttrs.some((k) => nameOf(k) === nameOf(key))) parts.push(`-@${key}`);
  }

  return parts.join(", ") || "attributes changed";
}

/** Format a field definition for display. */
function formatFieldSignature(def: FieldDef): string {
  let sig = def.type;
  if (def.optional) sig += "?";
  return sig;
}

// ── Native types per connector ─────────────────────────────────────────

type SitepingFieldDef = {
  [M in SitepingModelName]: (typeof SITEPING_MODELS)[M]["fields"][keyof (typeof SITEPING_MODELS)[M]["fields"]];
}[SitepingModelName];

/**
 * Connectors that accept each native type the Siteping models use — typed
 * off `SITEPING_MODELS`, so a new `nativeType` there needs an entry here.
 * SQLite, CockroachDB and MongoDB reject `@db.Text` ("Native type Text is not
 * supported"); their plain `String` is unbounded already.
 */
const NATIVE_TYPE_PROVIDERS: Record<
  Extract<SitepingFieldDef, { nativeType: string }>["nativeType"],
  ReadonlySet<string>
> = {
  Text: new Set(["postgresql", "postgres", "mysql", "sqlserver"]),
};

/** The datasource `provider`, or `undefined` when this file declares none. */
function datasourceProvider(schema: Schema): string | undefined {
  const datasource = schema.list.find((block) => block.type === "datasource");
  const provider = datasource?.assignments.find((a) => a.type === "assignment" && a.key === "provider");
  return provider?.type === "assignment" && typeof provider.value === "string"
    ? provider.value.replace(/^"|"$/g, "")
    : undefined;
}

function supportsNativeType(nativeType: string, provider: string | undefined): boolean {
  // No datasource to go by: emit it, as sync always has.
  if (provider === undefined) return true;
  return NATIVE_TYPE_PROVIDERS[nativeType as keyof typeof NATIVE_TYPE_PROVIDERS]?.has(provider) ?? false;
}

function buildField(name: string, def: FieldDef, provider: string | undefined): Field {
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

  if (def.nativeType && supportsNativeType(def.nativeType, provider)) {
    field.attributes!.push({ type: "attribute", name: def.nativeType, kind: "field", group: "db" });
  }

  if (def.isUpdatedAt) {
    field.attributes!.push({ type: "attribute", name: "updatedAt", kind: "field" });
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

/**
 * Whether the model already indexes `idx`'s columns — in any spelling Prisma
 * accepts: `@@index([a, b])`, `@@index(fields: [a, b])`, or with a column
 * carrying options (`b(sort: Desc)`). A second index on the same columns
 * would clash on the default constraint name (P1012).
 */
function hasBlockIndex(model: Model, idx: IndexDef): boolean {
  const key = idx.fields.join(",");
  return model.properties.some((p) => {
    if (p.type !== "attribute" || (p as BlockAttribute).name !== "index") return false;
    // `args` is absent on a bare `@@index()`, whatever the type says
    return ((p as BlockAttribute).args ?? []).some((arg) => {
      const val = isKeyValue(arg.value) ? (arg.value.key === "fields" ? arg.value.value : undefined) : arg.value;
      if (typeof val !== "object" || val === null || !("type" in val) || val.type !== "array") return false;
      return val.args.map((col) => (typeof col === "string" ? col : (col as Func).name)).join(",") === key;
    });
  });
}
