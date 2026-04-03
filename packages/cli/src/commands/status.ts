import { type Dirent, existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import * as p from "@clack/prompts";
import type { Field, Model } from "@mrleebo/prisma-ast";
import { getSchema } from "@mrleebo/prisma-ast";
import { SITEPING_MODELS } from "@siteping/core";

// ── Helpers ────────────────────────────────────────────────────────────

function findPrismaSchema(cwd: string): string | null {
  const candidates = [
    join(cwd, "prisma", "schema.prisma"),
    join(cwd, "schema.prisma"),
    join(cwd, "prisma", "schema", "schema.prisma"),
  ];
  return candidates.find((c) => existsSync(c)) ?? null;
}

function findApiRoute(cwd: string): string | null {
  const candidates = [
    join(cwd, "app", "api", "siteping", "route.ts"),
    join(cwd, "src", "app", "api", "siteping", "route.ts"),
  ];
  return candidates.find((c) => existsSync(c)) ?? null;
}

function readPackageJson(cwd: string): Record<string, unknown> | null {
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Recursively search source directories for widget usage. */
function findWidgetUsage(cwd: string): string | null {
  const searchDirs = [join(cwd, "src"), join(cwd, "app"), join(cwd, "pages")];
  const extensions = [".ts", ".tsx", ".js", ".jsx"];
  const patterns = ["initSiteping", "@siteping/widget"];

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;
    const match = searchInDir(dir, extensions, patterns);
    if (match) return match;
  }
  return null;
}

function searchInDir(dir: string, extensions: string[], patterns: string[]): string | null {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    const name = entry.name;
    const fullPath = join(dir, name);

    if (entry.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      const match = searchInDir(fullPath, extensions, patterns);
      if (match) return match;
    } else if (extensions.some((ext) => name.endsWith(ext))) {
      try {
        const content = readFileSync(fullPath, "utf-8");
        if (patterns.some((pat) => content.includes(pat))) return fullPath;
      } catch {
        // skip unreadable files
      }
    }
  }
  return null;
}

// ── Schema check ───────────────────────────────────────────────────────

interface SchemaCheckResult {
  found: boolean;
  path: string | null;
  missingModels: string[];
  missingFields: string[];
  outdatedFields: string[];
}

function checkSchema(schemaPath: string | null): SchemaCheckResult {
  if (!schemaPath || !existsSync(schemaPath)) {
    return { found: false, path: null, missingModels: [], missingFields: [], outdatedFields: [] };
  }

  const source = readFileSync(schemaPath, "utf-8");
  const schema = getSchema(source);

  const existingModels = new Map<string, Model>();
  for (const item of schema.list) {
    if (item.type === "model") {
      existingModels.set(item.name, item as Model);
    }
  }

  const missingModels: string[] = [];
  const missingFields: string[] = [];
  const outdatedFields: string[] = [];

  for (const [modelName, modelDef] of Object.entries(SITEPING_MODELS)) {
    const model = existingModels.get(modelName);

    if (!model) {
      missingModels.push(modelName);
      continue;
    }

    const existingFields = new Map<string, Field>();
    for (const prop of model.properties) {
      if (prop.type === "field") {
        existingFields.set((prop as Field).name, prop as Field);
      }
    }

    for (const [fieldName, fieldDef] of Object.entries(modelDef.fields)) {
      const existing = existingFields.get(fieldName);

      if (!existing) {
        missingFields.push(`${modelName}.${fieldName}`);
        continue;
      }

      // Check type match
      const expectedType = fieldDef.relation ? fieldDef.relation.model : fieldDef.type;
      const expectedOptional = fieldDef.optional ?? false;
      const expectedArray = fieldDef.relation?.kind === "1-to-many";

      const typeMatch = existing.fieldType === expectedType;
      const optionalMatch = (existing.optional ?? false) === expectedOptional;
      const arrayMatch = (existing.array ?? false) === expectedArray;

      if (!typeMatch || !optionalMatch || !arrayMatch) {
        outdatedFields.push(`${modelName}.${fieldName}`);
      }
    }
  }

  return { found: true, path: schemaPath, missingModels, missingFields, outdatedFields };
}

// ── Formatting helpers ─────────────────────────────────────────────────

function pad(label: string, width: number): string {
  return label + " ".repeat(Math.max(1, width - label.length));
}

// ── Command ────────────────────────────────────────────────────────────

export function statusCommand(options: { schema?: string }): void {
  const cwd = process.cwd();

  p.intro("siteping — Diagnostic");

  // 1. Prisma schema
  const schemaPath = options.schema ?? findPrismaSchema(cwd);
  const schemaResult = checkSchema(schemaPath);

  if (!schemaResult.found) {
    p.log.error(`${pad("Prisma schema", 25)}✗ Non trouvé`);
  } else {
    const issues = [
      ...schemaResult.missingModels.map((m) => `modèle ${m}`),
      ...schemaResult.missingFields,
      ...schemaResult.outdatedFields,
    ];

    if (issues.length === 0) {
      p.log.success(`${pad("Prisma schema", 25)}✓ À jour`);
    } else {
      const missingCount = schemaResult.missingModels.length + schemaResult.missingFields.length;
      const outdatedCount = schemaResult.outdatedFields.length;
      const parts: string[] = [];
      if (missingCount > 0)
        parts.push(`${missingCount} champ${missingCount > 1 ? "s" : ""} manquant${missingCount > 1 ? "s" : ""}`);
      if (outdatedCount > 0)
        parts.push(`${outdatedCount} champ${outdatedCount > 1 ? "s" : ""} obsolète${outdatedCount > 1 ? "s" : ""}`);
      p.log.warn(`${pad("Prisma schema", 25)}⚠ ${parts.join(", ")} (${issues.join(", ")})`);
    }
  }

  // 2. API route
  const routePath = findApiRoute(cwd);

  if (routePath) {
    p.log.success(`${pad("Route API", 25)}✓ ${relative(cwd, routePath)}`);
  } else {
    p.log.error(`${pad("Route API", 25)}✗ Non trouvée`);
  }

  // 3. Package in dependencies
  const pkg = readPackageJson(cwd);

  if (pkg) {
    const deps = (pkg.dependencies ?? {}) as Record<string, string>;
    const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
    const version = deps["@siteping/widget"] ?? devDeps["@siteping/widget"];

    if (version) {
      p.log.success(`${pad("Package", 25)}✓ @siteping/widget@${version}`);
    } else {
      p.log.error(`${pad("Package", 25)}✗ @siteping/widget non trouvé dans package.json`);
    }
  } else {
    p.log.error(`${pad("Package", 25)}✗ package.json non trouvé`);
  }

  // 4. Widget integration
  const widgetFile = findWidgetUsage(cwd);

  if (widgetFile) {
    p.log.success(`${pad("Widget intégré", 25)}✓ trouvé dans ${relative(cwd, widgetFile)}`);
  } else {
    p.log.warn(`${pad("Widget intégré", 25)}⚠ initSiteping non trouvé dans les sources`);
  }

  // Outro
  const hasError =
    !schemaResult.found ||
    !routePath ||
    !pkg ||
    (pkg &&
      !(
        (pkg.dependencies as Record<string, string> | undefined)?.["@siteping/widget"] ??
        (pkg.devDependencies as Record<string, string> | undefined)?.["@siteping/widget"]
      ));
  const hasWarning =
    schemaResult.missingModels.length > 0 ||
    schemaResult.missingFields.length > 0 ||
    schemaResult.outdatedFields.length > 0 ||
    !widgetFile;

  if (hasError) {
    p.outro("Des éléments sont manquants — lancez `siteping init` pour configurer.");
  } else if (hasWarning) {
    p.outro("Quelques ajustements nécessaires — lancez `siteping sync` pour mettre à jour.");
  } else {
    p.outro("Tout est configuré !");
  }
}
