import { existsSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { syncPrismaModels } from "../generators/prisma.js";

export function syncCommand(options: { schema?: string }): void {
  const cwd = process.cwd();
  const schemaPath = options.schema ?? findPrismaSchema(cwd);

  if (!schemaPath) {
    p.log.error("Aucun fichier schema.prisma trouvé.");
    p.log.info("Spécifiez le chemin avec --schema <path>");
    process.exit(1);
  }

  if (!existsSync(schemaPath)) {
    p.log.error(`Fichier introuvable : ${schemaPath}`);
    process.exit(1);
  }

  try {
    const { addedModels, changes } = syncPrismaModels(schemaPath);

    if (addedModels.length === 0 && changes.length === 0) {
      p.log.info("✓ Le schema est déjà à jour.");
      return;
    }

    if (addedModels.length > 0) {
      p.log.success(`Modèles créés : ${addedModels.join(", ")}`);
    }

    for (const change of changes) {
      const icon = change.action === "added" ? "+" : "~";
      p.log.success(
        `${icon} ${change.model}.${change.field} — ${change.action === "added" ? "ajouté" : "mis à jour"} (${change.detail})`,
      );
    }

    p.log.info("N'oubliez pas : npx prisma db push");
  } catch (error) {
    p.log.error(`Erreur : ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function findPrismaSchema(cwd: string): string | null {
  const candidates = [
    join(cwd, "prisma", "schema.prisma"),
    join(cwd, "schema.prisma"),
    join(cwd, "prisma", "schema", "schema.prisma"),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}
